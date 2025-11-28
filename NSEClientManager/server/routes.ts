import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema } from "@shared/schema";
import { requireAuth, requireAdmin, requireActiveSubscription, checkAndEnforceDemoExpiry, sanitizeUser } from "./auth-middleware";
import { triggerResultsScrape, getScraperStatus, getScraperMetrics, scrapeCandlestickData, scrapeDeliveryVolume, fetchStockPrice, updateStoredPrices, pauseJob, resumeJob } from "./services/nse-scraper";
import { priceUpdateService } from "./services/price-update-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (user.role !== "client") {
        return res.status(403).json({ error: "Please use admin login" });
      }

      // Check if demo has expired - reject login if expired
      const { expired, user: checkedUser } = await checkAndEnforceDemoExpiry(user);
      if (expired) {
        return res.status(403).json({ error: "Demo has expired. Please activate your subscription." });
      }

      // Update last login
      await storage.updateUser(checkedUser.id, { lastLogin: new Date() });
      const updatedUser = await storage.getUserByEmail(email);

      // Regenerate session to prevent fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to create session" });
        }

        // Create new session with user ID
        req.session.userId = updatedUser!.id;

        // Return sanitized user without password
        res.json(sanitizeUser(updatedUser!));
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/api/auth/admin-login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      if (user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Check if demo has expired - reject login if expired (even for admins for consistency)
      const { expired, user: checkedUser } = await checkAndEnforceDemoExpiry(user);
      if (expired) {
        return res.status(403).json({ error: "Demo has expired. Please activate your subscription." });
      }

      // Update last login
      await storage.updateUser(checkedUser.id, { lastLogin: new Date() });
      const updatedUser = await storage.getUserByEmail(email);

      // Regenerate session to prevent fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to create session" });
        }

        // Create new session with user ID
        req.session.userId = updatedUser!.id;

        // Return sanitized user without password
        res.json(sanitizeUser(updatedUser!));
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Session endpoint - public to allow anonymous session checks
  app.get("/api/auth/session", async (req, res) => {
    if (!req.session.userId) {
      // Anonymous session - return null user
      return res.json({ user: null });
    }

    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      // Session has user ID but user doesn't exist - clear session
      req.session.userId = undefined;
      return res.json({ user: null });
    }

    // Check demo expiry
    const { expired, user: checkedUser } = await checkAndEnforceDemoExpiry(user);
    if (expired) {
      // Demo expired - clear session and return anonymous
      req.session.userId = undefined;
      return res.json({ user: null });
    }

    // Valid session with active user
    res.json({ user: sanitizeUser(checkedUser) });
  });

  // Helper function to check if prices need refresh (older than 2 minutes)
  function needsPriceRefresh(stocks: any[]): boolean {
    if (stocks.length === 0) return false;
    return stocks.some(stock => {
      if (!stock.lastUpdated) return true;
      const lastUpdate = new Date(stock.lastUpdated);
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      return lastUpdate < twoMinutesAgo;
    });
  }

  // Stock endpoints - require active subscription
  app.get("/api/stocks/portfolio", requireActiveSubscription, async (req, res) => {
    try {
      let stocks = await storage.getPortfolioStocks(10);

      // Only refresh if prices are older than 2 minutes (cache saves API calls)
      if (needsPriceRefresh(stocks)) {
        console.log('[Routes] Portfolio prices stale (>2 min), refreshing...');
        try {
          const { updateStoredPrices } = await import('./services/nse-scraper/price-fetcher');
          const symbols = stocks.map(s => s.symbol);
          await updateStoredPrices(symbols);
          // Refetch stocks with updated prices
          stocks = await storage.getPortfolioStocks(10);
          console.log('[Routes] Portfolio prices refreshed');
        } catch (err: any) {
          console.error('[Routes] Price refresh failed:', err.message);
          // Continue with existing data
        }
      } else {
        console.log('[Routes] Portfolio prices fresh (<2 min), using cached data');
      }

      // No caching - always return fresh data
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio stocks" });
    }
  });

  app.get("/api/stocks/top-performers", requireActiveSubscription, async (req, res) => {
    try {
      let stocks = await storage.getTopPerformers(6);

      // Only refresh if prices are older than 2 minutes (cache saves API calls)
      if (needsPriceRefresh(stocks)) {
        console.log('[Routes] Top performers stale (>2 min), refreshing...');
        try {
          const { updateStoredPrices } = await import('./services/nse-scraper/price-fetcher');
          const symbols = stocks.map(s => s.symbol);
          await updateStoredPrices(symbols);
          // Refetch with updated prices
          stocks = await storage.getTopPerformers(6);
          console.log('[Routes] Top performers refreshed');
        } catch (err: any) {
          console.error('[Routes] Price refresh failed:', err.message);
        }
      } else {
        console.log('[Routes] Top performers fresh (<2 min), using cached data');
      }

      // No caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top performers" });
    }
  });

  app.get("/api/stocks/:symbol", requireActiveSubscription, async (req, res) => {
    try {
      const { symbol } = req.params;
      
      // Check if price needs refresh
      const stock = await storage.getStockBySymbol(symbol);
      if (stock && needsPriceRefresh([stock])) {
        console.log(`[Routes] Price for ${symbol} stale (>2 min), refreshing...`);
        try {
          const { updateStoredPrices } = await import('./services/nse-scraper/price-fetcher');
          await updateStoredPrices([symbol]);
          console.log(`[Routes] Price refreshed for ${symbol}`);
        } catch (err: any) {
          console.error(`[Routes] Price refresh failed for ${symbol}:`, err.message);
        }
      } else if (stock) {
        console.log(`[Routes] Price for ${symbol} fresh (<2 min), using cached data`);
      }
      
      const stockDetail = await storage.getStockDetail(symbol);

      if (!stockDetail) {
        return res.status(404).json({ error: "Stock not found" });
      }

      // No caching for individual stock details
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(stockDetail);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock details" });
    }
  });

  // Manual price refresh endpoint
  app.post("/api/stocks/refresh-prices", requireActiveSubscription, async (req, res) => {
    try {
      console.log('[Routes] Manual price refresh triggered');
      const { updateStoredPrices } = await import('./services/nse-scraper/price-fetcher');
      const stocks = await storage.getAllStocks();
      const symbols = stocks.map(s => s.symbol);
      
      await updateStoredPrices(symbols);
      
      console.log('[Routes] Manual price refresh completed');
      res.json({ success: true, message: `Refreshed prices for ${symbols.length} stocks` });
    } catch (error: any) {
      console.error('[Routes] Manual price refresh failed:', error.message);
      res.status(500).json({ error: "Failed to refresh prices", details: error.message });
    }
  });

  // Candlestick data endpoint with period selection
  app.get('/api/stocks/:symbol/candlesticks', requireActiveSubscription, async (req, res) => {
    try {
      const { symbol } = req.params;
      console.log(`[API] GET /api/stocks/${symbol}/candlesticks`, req.query);
      const period = (req.query.period as string || '1m').toLowerCase();
      const map: Record<string, number> = { '1w': 7, 'tw': 7, '1m': 21, '3m': 63, '6m': 126, '1y': 252, 'ty': 252 };
      const days = map[period] || 21;
      const stock = await storage.getStockBySymbol(symbol.toUpperCase());
      if (!stock) return res.status(404).json({ error: 'Stock not found' });
      // fetch raw candles (limit as days upper bound + small buffer)
      const raw = await (storage as any).getCandlestickData(stock.id, days + 5);
      // Filter & sort ascending
      const data = raw.filter((r: any) => !!r.date).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-days);
      // Indicators: EMA(20), RSI(14)
      const closes = data.map((d: any) => parseFloat(d.close));
      const emaPeriod = 20;
      let emaPrev: number | undefined;
      const calcEMA = (price: number): number => {
        if (emaPrev === undefined) { emaPrev = price; return price; }
        const k = 2 / (emaPeriod + 1);
        emaPrev = price * k + emaPrev * (1 - k);
        return emaPrev;
      };
      const calcRSI = (values: number[], period: number): number[] => {
        const rsis: number[] = []; const gains: number[] = []; const losses: number[] = [];
        for (let i = 1; i < values.length; i++) {
          const diff = values[i] - values[i - 1]; gains.push(Math.max(diff, 0)); losses.push(Math.max(-diff, 0)); if (i < period) { rsis.push(NaN); continue; }
          const avgGain = gains.slice(i - period, i).reduce((a: number, b: number) => a + b, 0) / period; const avgLoss = losses.slice(i - period, i).reduce((a: number, b: number) => a + b, 0) / period; const rs = avgLoss === 0 ? 100 : avgGain / avgLoss; const rsi = 100 - (100 / (1 + rs)); rsis.push(rsi);
        }
        rsis.unshift(NaN); return rsis;
      };
      const rsiArr = calcRSI(closes, 14);
      const enriched = data.map((d: any, idx: number) => ({
        date: d.date,
        open: parseFloat(d.open), high: parseFloat(d.high), low: parseFloat(d.low), close: parseFloat(d.close), volume: parseFloat(d.volume || '0'),
        ema20: calcEMA(parseFloat(d.close)), rsi14: rsiArr[idx] || null
      }));
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=30');
      res.json({ symbol: stock.symbol, period, candles: enriched });
    } catch (e: any) {
      console.error('[API] candlesticks error:', e);
      res.status(500).json({ error: 'Failed to fetch candlestick data', details: e.message });
    }
  });

  // Delivery volume endpoint
  app.get('/api/stocks/:symbol/delivery-volume', requireActiveSubscription, async (req, res) => {
    try {
      const { symbol } = req.params; const period = (req.query.period as string || '3w').toLowerCase();
      console.log(`[API] GET /api/stocks/${symbol}/delivery-volume`, req.query);
      const map: Record<string, number> = { '1w': 7, 'tw': 7, '3w': 21, '1m': 21, '3m': 63, '6m': 126, '1y': 252 };
      const days = map[period] || 21;
      const stock = await storage.getStockBySymbol(symbol.toUpperCase());
      if (!stock) return res.status(404).json({ error: 'Stock not found' });
      const raw = await (storage as any).getDeliveryVolume(stock.id, days + 5);
      const data = raw.filter((r: any) => !!r.date).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-days);
      // Compute 7-day moving average of delivery percentage
      const enriched = data.map((d: any, idx: number) => {
        const perc = parseFloat(d.deliveryPercentage || d.delivery_perc || '0');
        let ma7: number | null = null;
        if (idx >= 6) {
          const window = data.slice(idx - 6, idx + 1).map((x: any) => parseFloat(x.deliveryPercentage || x.delivery_perc || '0'));
          ma7 = parseFloat((window.reduce((a: number, b: number) => a + b, 0) / window.length).toFixed(2));
        }
        return {
          date: d.date,
          deliveryQuantity: parseInt(d.deliveryQuantity || d.delivery_qty || d.delivery_quantity || '0'),
          tradedQuantity: parseInt(d.tradedQuantity || d.traded_qty || d.traded_quantity || '0'),
          deliveryPercentage: perc,
          deliveryPercMA7: ma7
        };
      });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=30');
      res.json({ symbol: stock.symbol, period, delivery: enriched });
    } catch (e: any) {
      console.error('[API] delivery-volume error:', e);
      res.status(500).json({ error: 'Failed to fetch delivery volume', details: e.message });
    }
  });

  // Delivery daily table (proxy live NSE, no DB) for last N days
  app.get('/api/stocks/:symbol/delivery-daily', requireActiveSubscription, async (req, res) => {
    try {
      const { symbol } = req.params;
      console.log(`[API] GET /api/stocks/${symbol}/delivery-daily`, req.query);
      const days = parseInt((req.query.days as string) || '21', 10);
      const { subDays, format } = await import('date-fns');
      const to = new Date(); const from = subDays(to, days);
      const params: any = { symbol, series: 'EQ', dataType: 'priceVolumeDeliverable', from: format(from, 'dd-MM-yyyy'), to: format(to, 'dd-MM-yyyy') };
      const { nseClient } = await import('./services/nse-scraper/http-client');
      let raw: any;
      let fromNSE = false;

      try {
        raw = await nseClient.get('/api/historical/securityArchives', params);
        fromNSE = true;
      } catch (nseErr: any) {
        console.warn(`[API] NSE fetch failed for ${symbol}, falling back to Supabase data:`, nseErr.message);

        // Fallback to Supabase delivery_volume data
        try {
          const stock = await storage.getStockBySymbol(symbol.toUpperCase());
          if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
          }

          const deliveryData = await (storage as any).getDeliveryVolume(stock.id, days);
          const candlestickData = await (storage as any).getCandlestickData(stock.id, days);

          // Merge delivery and candlestick data
          const mergedRows = deliveryData.map((d: any) => {
            const candle = candlestickData.find((c: any) => c.date === d.date);
            return {
              date: d.date,
              prevClose: candle?.close || null,
              open: candle?.open || null,
              high: candle?.high || null,
              low: candle?.low || null,
              last: candle?.close || null,
              close: candle?.close || null,
              vwap: null,
              tradedQty: d.tradedQuantity || 0,
              turnoverCr: null,
              trades: null,
              deliveryQty: d.deliveryQuantity || 0,
              deliveryPerc: parseFloat(d.deliveryPercentage || '0'),
            };
          });

          console.log(`[API] Returning ${mergedRows.length} rows from Supabase for ${symbol}`);
          res.setHeader('Content-Type', 'application/json');
          return res.json({
            symbol: symbol.toUpperCase(),
            days,
            rows: mergedRows,
            count: mergedRows.length,
            source: 'supabase'
          });
        } catch (dbErr: any) {
          console.error(`[API] Supabase fallback also failed for ${symbol}:`, dbErr.message);
          res.setHeader('Content-Type', 'application/json');
          return res.json({ symbol: symbol.toUpperCase(), days, rows: [], error: 'No data available', source: 'none' });
        }
      }

      const rows = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
      console.log(`[API] Received ${rows.length} delivery rows for ${symbol} from NSE`);
      const normalize = (r: any) => ({
        date: r.CH_TIMESTAMP || r.date,
        prevClose: r.PREVCLOSE || r.prev_close || null,
        open: r.OPEN_PRICE || r.open_price || null,
        high: r.HIGH_PRICE || r.high_price || null,
        low: r.LOW_PRICE || r.low_price || null,
        last: r.LT_PRICE || r.last_price || null,
        close: r.CLOSE_PRICE || r.close_price || null,
        vwap: r.AVERAGE_PRICE || r.vwap || null,
        tradedQty: r.TOT_TRADED_QTY || r.tradedQuantity || r.traded_qty || 0,
        turnoverCr: r.TURNOVER_LACS ? (parseFloat(r.TURNOVER_LACS) / 100).toFixed(2) : (r.turnoverInCr || r.turnover_cr || null),
        trades: r.NO_OF_TRADES || r.no_of_trades || null,
        deliveryQty: r.DELIV_QTY || r.deliveryQuantity || r.CH_DELIV_QTY || 0,
        deliveryPerc: r.DELIV_PER || r.deliveryPercentage || r.CH_DELIV_PERC || 0,
      });
      const normalized = rows.map(normalize);
      res.setHeader('Content-Type', 'application/json');
      res.json({ symbol: symbol.toUpperCase(), days, rows: normalized, count: normalized.length, source: 'nse' });
    } catch (e: any) {
      console.error('[API] delivery-daily error:', e);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Failed to fetch delivery daily', details: e.message });
    }
  });

  // Search stocks with pagination (optimized for 3000+ stocks)
  app.get("/api/stocks/search/:query", requireActiveSubscription, async (req, res) => {
    try {
      const { query } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      // Use Supabase's full-text search for performance
      const { data, error, count } = await (await import('./supabase/config/supabase-client')).supabase
        .from('stocks')
        .select('id, symbol, company_name, current_price, percent_change, sector', { count: 'exact' })
        .or(`symbol.ilike.%${query}%,company_name.ilike.%${query}%`)
        .range(offset, offset + limit - 1)
        .order('symbol');

      if (error) throw error;

      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      res.json({
        stocks: data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to search stocks" });
    }
  });

  // Calendar endpoints - require active subscription
  app.get("/api/calendar", requireActiveSubscription, async (req, res) => {
    try {
      const calendarData = await storage.getResultsCalendar();
      res.json(calendarData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar" });
    }
  });

  app.get("/api/calendar/:date", requireActiveSubscription, async (req, res) => {
    try {
      const { date } = req.params;
      const stocks = await storage.getResultsByDate(date);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch results by date" });
    }
  });

  // Admin endpoints - require admin role
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users/:id/activate-demo", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Set demo expiry to 7 days from now
      const demoExpiry = new Date();
      demoExpiry.setDate(demoExpiry.getDate() + 7);

      const updatedUser = await storage.updateUser(id, {
        subscriptionStatus: "demo",
        demoExpiresAt: demoExpiry,
      });

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to activate demo" });
    }
  });

  app.post("/api/admin/users/:id/cancel-demo", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(id, {
        subscriptionStatus: "inactive",
        demoExpiresAt: null,
      });

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel demo" });
    }
  });

  // NSE Scraper endpoints (admin only)
  app.post("/api/admin/scraper/trigger", requireAuth, requireAdmin, async (_req, res) => {
    try {
      console.log('[API] Manual scraper trigger requested');
      // Trigger in background, don't wait
      triggerResultsScrape().catch(error => {
        console.error('[API] Background scraper failed:', error);
      });
      res.json({ message: "Results calendar scraper triggered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to trigger scraper" });
    }
  });

  app.post("/api/admin/scraper/candlesticks", requireAuth, requireAdmin, async (_req, res) => {
    try {
      console.log('[API] Manual candlestick scrape trigger requested');
      scrapeCandlestickData(30).catch(err => console.error('[API] Candlestick scrape failed:', err));
      res.json({ message: "Candlestick scrape triggered" });
    } catch (error) {
      res.status(500).json({ error: "Failed to trigger candlestick scraper" });
    }
  });

  app.post("/api/admin/scraper/delivery", requireAuth, requireAdmin, async (_req, res) => {
    try {
      console.log('[API] Manual delivery scrape trigger requested');
      scrapeDeliveryVolume(15).catch(err => console.error('[API] Delivery scrape failed:', err));
      res.json({ message: "Delivery volume scrape triggered" });
    } catch (error) {
      res.status(500).json({ error: "Failed to trigger delivery scraper" });
    }
  });

  app.get("/api/admin/scraper/status", requireAuth, requireAdmin, async (_req, res) => {
    try {
      res.json(getScraperStatus());
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scraper status" });
    }
  });

  app.get("/api/admin/scraper/metrics", requireAuth, requireAdmin, async (_req, res) => {
    try {
      res.json({ jobs: getScraperMetrics() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scraper metrics" });
    }
  });

  app.get("/api/admin/scraper/metrics/history", requireAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const { supabase } = await import('./supabase/config/supabase-client');
      const { data, error } = await supabase
        .from('job_metrics')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      res.json({ history: data });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch metrics history", details: error.message });
    }
  });

  app.get("/api/admin/scraper/errors", requireAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const { supabase } = await import('./supabase/config/supabase-client');
      const { data, error } = await supabase
        .from('job_metrics')
        .select('*')
        .eq('success', false)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      res.json({ failures: data });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch scraper errors", details: error.message });
    }
  });

  app.get("/api/admin/scraper/summary", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const { supabase } = await import('./supabase/config/supabase-client');
      // Aggregate recent metrics (last 100 runs) for averages per job
      const { data, error } = await supabase
        .from('job_metrics')
        .select('job_name,duration_ms,success,error_message,started_at')
        .order('started_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const grouped: Record<string, { runs: number; successes: number; failures: number; avgDuration: number; lastError?: string; lastRun?: string; }> = {};
      data.forEach(r => {
        const g = grouped[r.job_name] || { runs: 0, successes: 0, failures: 0, avgDuration: 0 };
        g.runs++;
        if (r.success) g.successes++; else { g.failures++; g.lastError = r.error_message || g.lastError; }
        if (typeof r.duration_ms === 'number') {
          g.avgDuration = ((g.avgDuration * (g.runs - 1)) + r.duration_ms) / g.runs;
        }
        if (!g.lastRun) g.lastRun = r.started_at;
        grouped[r.job_name] = g;
      });
      const summary = Object.entries(grouped).map(([job, stats]) => ({
        job,
        runs: stats.runs,
        successes: stats.successes,
        failures: stats.failures,
        successRate: stats.runs ? parseFloat(((stats.successes / stats.runs) * 100).toFixed(2)) : 0,
        avgDurationMs: parseFloat(stats.avgDuration.toFixed(2)),
        lastError: stats.lastError || null,
        lastRun: stats.lastRun || null,
      }));
      res.json({ summary });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to build summary", details: error.message });
    }
  });

  // Monitoring alerts endpoint: aggregates potential issues
  app.get("/api/admin/monitoring/alerts", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const alerts: any[] = [];
      const now = Date.now();

      // Scraper job failures
      const scraperStatus = getScraperStatus();
      Object.values(scraperStatus).forEach(s => {
        if (s.failures > 0) {
          alerts.push({
            type: 'scraper-failure',
            job: s.name,
            failures: s.failures,
            lastError: s.lastError || null,
            severity: s.failures >= 3 ? 'high' : 'medium'
          });
        }
      });

      // Price service stale check
      const priceStatus = priceUpdateService.getStatus();
      // Determine latest stock update timestamp (approx) by inspecting a few stocks
      const stocks = await storage.getAllStocks();
      let staleCount = 0;
      const STALE_THRESHOLD_MIN = parseInt(process.env.STOCK_STALE_MINUTES || '15', 10);
      const thresholdMs = STALE_THRESHOLD_MIN * 60 * 1000;
      const recentCutoff = now - thresholdMs;
      for (const s of stocks) {
        if (s.lastUpdated) {
          const lu = new Date(s.lastUpdated).getTime();
          if (lu < recentCutoff) staleCount++;
        }
      }
      if (staleCount > 0) {
        alerts.push({
          type: 'stale-stocks',
          count: staleCount,
          total: stocks.length,
          thresholdMinutes: STALE_THRESHOLD_MIN,
          severity: staleCount > stocks.length * 0.5 ? 'high' : 'low'
        });
      }

      // If market hours but not updating
      if (priceStatus.isMarketHours && !priceStatus.isUpdating) {
        alerts.push({
          type: 'price-service',
          message: 'Market open but price service not updating',
          severity: 'high'
        });
      }

      // Generic health (no alerts scenario)
      if (alerts.length === 0) {
        alerts.push({ type: 'healthy', message: 'No issues detected', severity: 'none' });
      }

      res.json({ alerts, timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch monitoring alerts', details: error.message });
    }
  });

  // List stale symbols for drill-down
  app.get("/api/admin/monitoring/stale-symbols", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const STALE_THRESHOLD_MIN = parseInt(process.env.STOCK_STALE_MINUTES || '15', 10);
      const cutoff = Date.now() - STALE_THRESHOLD_MIN * 60 * 1000;
      const stocks = await storage.getAllStocks();
      const stale = stocks.filter(s => s.lastUpdated && new Date(s.lastUpdated).getTime() < cutoff)
        .map(s => ({ symbol: s.symbol, lastUpdated: s.lastUpdated }));
      res.json({ stale, thresholdMinutes: STALE_THRESHOLD_MIN });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to list stale symbols', details: e.message });
    }
  });

  // Pause a job
  app.post("/api/admin/scraper/jobs/:job/pause", requireAuth, requireAdmin, async (req, res) => {
    try {
      const job = req.params.job as any;
      pauseJob(job);
      res.json({ message: `Job ${job} paused` });
    } catch (e: any) {
      res.status(400).json({ error: 'Failed to pause job', details: e.message });
    }
  });

  // Resume a job
  app.post("/api/admin/scraper/jobs/:job/resume", requireAuth, requireAdmin, async (req, res) => {
    try {
      const job = req.params.job as any;
      resumeJob(job);
      res.json({ message: `Job ${job} resumed` });
    } catch (e: any) {
      res.status(400).json({ error: 'Failed to resume job', details: e.message });
    }
  });

  // Manual run for specific job type
  app.post("/api/admin/scraper/jobs/:job/run", requireAuth, requireAdmin, async (req, res) => {
    try {
      const job = req.params.job;
      let rows = 0;
      if (job === 'resultsCalendar') rows = await (await import('./services/nse-scraper')).scrapeResultsCalendar();
      else if (job === 'candlesticks') rows = await scrapeCandlestickData(7);
      else if (job === 'delivery') rows = await scrapeDeliveryVolume(7);
      else return res.status(400).json({ error: 'Unknown job' });
      res.json({ message: `Manual run complete`, job, rowsAffected: rows });
    } catch (e: any) {
      res.status(500).json({ error: 'Manual run failed', details: e.message });
    }
  });

  // Real-time price endpoints
  app.get("/api/prices/live/:symbol", requireAuth, async (req, res) => {
    try {
      const { symbol } = req.params;
      const priceData = await fetchStockPrice(symbol.toUpperCase());

      if (!priceData) {
        return res.status(404).json({ error: "Price data not available" });
      }

      res.json(priceData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch live price" });
    }
  });

  app.post("/api/prices/update", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { symbols } = req.body;

      if (!symbols || !Array.isArray(symbols)) {
        return res.status(400).json({ error: "symbols array required" });
      }

      console.log(`[API] Manual price update requested for ${symbols.length} stocks`);
      updateStoredPrices(symbols).catch(err => console.error('[API] Price update failed:', err));
      res.json({ message: `Updating prices for ${symbols.length} stocks` });
    } catch (error) {
      res.status(500).json({ error: "Failed to trigger price update" });
    }
  });

  // Force update all stocks - public endpoint for testing
  app.post("/api/prices/force-update", async (_req, res) => {
    try {
      const stocks = await storage.getAllStocks();
      const symbols = stocks.map(s => s.symbol);

      console.log(`[API] Force updating prices for ${symbols.length} stocks...`);
      await updateStoredPrices(symbols);

      res.json({
        message: "Price update completed",
        stocksUpdated: symbols.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("[API] Price update failed:", error.message);
      res.status(500).json({ error: "Failed to update prices", details: error.message });
    }
  });

  app.get("/api/prices/status", requireAuth, async (_req, res) => {
    try {
      res.json(priceUpdateService.getStatus());
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price service status" });
    }
  });

  // Get latest available data for all stocks (EOD data when market is closed)
  app.get("/api/prices/latest", requireAuth, async (_req, res) => {
    try {
      const stocks = await storage.getAllStocks();
      if (!stocks || stocks.length === 0) {
        return res.json([]);
      }

      // Return stocks with all available price data
      res.json(stocks.map(stock => ({
        symbol: stock.symbol,
        companyName: stock.companyName,
        currentPrice: stock.currentPrice,
        percentChange: stock.percentChange,
        lastTradedPrice: stock.lastTradedPrice,
        lastTradedTime: stock.lastTradedTime,
        lastTradedQuantity: stock.lastTradedQuantity,
        dayHigh: stock.dayHigh,
        dayLow: stock.dayLow,
        openPrice: stock.openPrice,
        previousClose: stock.previousClose,
        volume: stock.volume,
        yearHigh: stock.yearHigh,
        yearLow: stock.yearLow,
        totalTradedValue: stock.totalTradedValue,
        totalTradedVolume: stock.totalTradedVolume,
        averagePrice: stock.averagePrice,
        lastUpdated: stock.lastUpdated
      })));
    } catch (error: any) {
      console.error("[API] Failed to fetch latest prices:", error.message);
      res.status(500).json({ error: "Failed to fetch latest prices" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
