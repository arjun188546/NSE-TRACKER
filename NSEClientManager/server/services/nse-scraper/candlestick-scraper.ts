import { nseClient } from './http-client';
import { storage } from '../../storage';
import { format, subDays } from 'date-fns';

/**
 * Scrape candlestick (OHLCV) data from NSE for all tracked stocks
 * Fetches last 90 days by default
 */
export async function scrapeCandlestickData(daysBack: number = 90): Promise<number> {
  try {
    console.log('[Candlestick Scraper] Starting candlestick data scrape...');
    
    // Get all stocks from database
    const allStocks = await storage.getAllStocks();
    console.log(`[Candlestick Scraper] Found ${allStocks.length} stocks to update`);

    let totalCandlesStored = 0;
    for (const stock of allStocks) {
      try {
        const stored = await scrapeCandlestickForStock(stock.symbol, stock.id, daysBack);
        totalCandlesStored += stored;
      } catch (error: any) {
        console.error(`[Candlestick Scraper] Failed to scrape ${stock.symbol}:`, error.message);
      }
    }

    console.log(`[Candlestick Scraper] ✅ Candlestick data scrape completed. Candles stored: ${totalCandlesStored}`);
    return totalCandlesStored;
  } catch (error: any) {
    console.error('[Candlestick Scraper] ❌ Scraping failed:', error.message);
    throw error;
  }
}

/**
 * Scrape candlestick data for a single stock
 */
async function scrapeCandlestickForStock(symbol: string, stockId: string, daysBack: number): Promise<number> {
  console.log(`[Candlestick Scraper] Fetching data for ${symbol} (last ${daysBack} days)...`);

  const toDate = new Date();
  const fromDate = subDays(toDate, daysBack);

  // NSE API endpoint for historical data
  const endpoint = '/api/historical/cm/equity';
  const params = {
    symbol: symbol,
    series: 'EQ', // Equity series
    from: format(fromDate, 'dd-MM-yyyy'),
    to: format(toDate, 'dd-MM-yyyy'),
  };

  try {
    const data = await nseClient.get(endpoint, params);

    if (!data || !data.data || !Array.isArray(data.data)) {
      console.warn(`[Candlestick Scraper] No data available for ${symbol}`);
      return 0;
    }

    const candles = data.data;
    console.log(`[Candlestick Scraper] Received ${candles.length} data points for ${symbol}`);

    // Process and store each candlestick
    let storedCount = 0;
    for (const candle of candles) {
      try {
        const stored = await processCandlestick(stockId, candle);
        if (stored) storedCount += 1;
      } catch (error: any) {
        console.error(`[Candlestick Scraper] Failed to process candle for ${symbol}:`, error.message);
      }
    }

    console.log(`[Candlestick Scraper] ✅ Stored ${storedCount}/${candles.length} candles for ${symbol}`);
    return storedCount;
  } catch (error: any) {
    // No mock fallbacks permitted in this project
    throw error;
  }
  return 0;
}

/**
 * Process and store individual candlestick data
 */
async function processCandlestick(stockId: string, candle: any): Promise<boolean> {
  const date = parseNSEDate(candle.mTIMESTAMP || candle.date);
  
  // Validate OHLCV data
  const open = parseFloat(candle.CH_OPENING_PRICE || candle.open);
  const high = parseFloat(candle.CH_TOT_TRADED_QTY || candle.high);
  const low = parseFloat(candle.CH_52WEEK_LOW_PRICE || candle.low);
  const close = parseFloat(candle.CH_CLOSING_PRICE || candle.close);
  const volume = parseInt(candle.CH_TOT_TRADED_QTY || candle.volume || '0', 10);

  // Data validation: high should be >= low, close within range
  if (high < low) {
    console.warn(`[Candlestick Scraper] Invalid data: high < low for date ${date}`);
    return;
  }

  if (close > high || close < low) {
    console.warn(`[Candlestick Scraper] Invalid data: close outside range for date ${date}`);
    return;
  }

  try {
    await storage.createCandlestickData({
      stockId,
      date: format(date, 'yyyy-MM-dd'),
      open: open.toString(),
      high: high.toString(),
      low: low.toString(),
      close: close.toString(),
      volume,
    });
    return true;
  } catch (error) {
    // Entry might already exist, that's okay
    // console.log(`[Candlestick Scraper] Data already exists for ${stockId} on ${date}`);
  }
  return false;
}

/**
 * Parse NSE date format
 */
function parseNSEDate(dateStr: string): Date {
  try {
    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try DD-MMM-YYYY format (e.g., "10-Nov-2025")
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const month = months[parts[1].toLowerCase()];
      if (month !== undefined) {
        return new Date(parseInt(parts[2]), month, parseInt(parts[0]));
      }
    }

    // Fallback to current date
    console.warn(`[Candlestick Scraper] Could not parse date: ${dateStr}`);
    return new Date();
  } catch (error) {
    console.error(`[Candlestick Scraper] Date parsing error for ${dateStr}:`, error);
    return new Date();
  }
}

/**
 * Generate mock candlestick data for development
 */
function generateMockCandlestickData(stockId: string, daysBack: number) {
  const mockData = [];
  let basePrice = 1000 + Math.random() * 500; // Random start price between 1000-1500

  for (let i = daysBack; i >= 0; i--) {
    const date = subDays(new Date(), i);
    
    // Random daily movement
    const volatility = 0.02; // 2% daily volatility
    const change = (Math.random() - 0.5) * 2 * volatility;
    
    const open = basePrice;
    const close = basePrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    mockData.push({
      stockId,
      date: format(date, 'yyyy-MM-dd'),
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      volume,
    });

    basePrice = close; // Next day starts at previous close
  }

  return mockData;
}

/**
 * Scrape incremental data (only new days since last update)
 */
export async function scrapeIncrementalCandlestickData(): Promise<number> {
  console.log('[Candlestick Scraper] Running incremental update...');
  // Adaptive incremental: fetch only missing days per stock
  let total = 0;
  const allStocks = await storage.getAllStocks();
  const today = new Date();
  for (const stock of allStocks) {
    try {
      // Get latest date
      // @ts-ignore - storage implementation specific
      const latestDateStr = await (storage as any).getLatestCandlestickDate?.(stock.id);
      let daysNeeded = 7; // default fallback
      if (latestDateStr) {
        const latestDate = new Date(latestDateStr + 'T00:00:00');
        const diffMs = today.getTime() - latestDate.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays <= 0) continue; // up to date
        daysNeeded = diffDays + 1; // include potential current day
        if (daysNeeded > 30) daysNeeded = 30; // cap fetch size
      }
      const storedCount = await scrapeCandlestickForStock(stock.symbol, stock.id, daysNeeded);
      total += storedCount;
    } catch (e:any) {
      console.warn('[Candlestick Scraper] Incremental skip error:', e.message);
    }
  }
  console.log(`[Candlestick Scraper] Incremental adaptive update complete. New candles: ${total}`);
  return total;
}
