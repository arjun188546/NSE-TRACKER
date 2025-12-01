import { nseClient } from './http-client';
import { storage } from '../../storage';

// In-memory cache with 2-minute TTL to reduce API calls
const priceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCachedPrice(symbol: string): any | null {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedPrice(symbol: string, data: any): void {
  priceCache.set(symbol, { data, timestamp: Date.now() });
}

/**
 * Fetch real-time stock price from NSE with comprehensive trading data
 */
export async function fetchStockPrice(symbol: string, useCache = true): Promise<{
  currentPrice: string;
  percentChange: string;
  volume: number;
  lastTradedPrice: string;
  lastTradedQuantity: number;
  lastTradedTime: string;
  dayHigh: string;
  dayLow: string;
  openPrice: string;
  previousClose: string;
  yearHigh: string;
  yearLow: string;
  totalBuyQuantity: number;
  totalSellQuantity: number;
  totalTradedValue: string;
  totalTradedVolume: number;
  averagePrice: string;
  lastUpdated: Date;
} | null> {
  try {
    // Check cache first
    if (useCache) {
      const cached = getCachedPrice(symbol);
      if (cached) {
        return cached;
      }
    }
    
    // NSE quote API endpoint
    const data = await nseClient.get(`/api/quote-equity`, { symbol });
    
    if (!data || !data.priceInfo) {
      console.warn(`[Price Fetcher] No price data for ${symbol}`);
      return null;
    }

    const priceInfo = data.priceInfo;
    const metadata = data.metadata || {};
    const preOpenMarket = data.preOpenMarket || {};
    
    // Extract price information
    const previousClose = parseFloat(priceInfo.previousClose || priceInfo.close || '0');
    const lastPrice = parseFloat(priceInfo.lastPrice || priceInfo.ltp || '0');
    const dayHigh = parseFloat(priceInfo.intraDayHighLow?.max || priceInfo.dayHigh || '0');
    const dayLow = parseFloat(priceInfo.intraDayHighLow?.min || priceInfo.dayLow || '0');
    const openPrice = parseFloat(priceInfo.open || '0');
    const totalTradedVolume = parseInt(priceInfo.totalTradedVolume || '0', 10);
    const totalTradedValue = parseFloat(priceInfo.totalTradedValue || '0');
    
    // Calculate percent change
    const change = lastPrice - previousClose;
    const percentChange = previousClose > 0 
      ? ((change / previousClose) * 100).toFixed(2)
      : '0.00';

    // Calculate average price
    const averagePrice = totalTradedVolume > 0
      ? (totalTradedValue / totalTradedVolume).toFixed(2)
      : lastPrice.toFixed(2);

    // Extract last traded info
    const lastTradedQuantity = parseInt(priceInfo.lastUpdateQuantity || priceInfo.lastQuantity || '0', 10);
    const lastTradedTime = priceInfo.lastUpdateTime || new Date().toLocaleTimeString('en-IN');

    // 52-week high/low
    const yearHigh = parseFloat(priceInfo.weekHighLow?.max || metadata['52WeekHigh'] || '0');
    const yearLow = parseFloat(priceInfo.weekHighLow?.min || metadata['52WeekLow'] || '0');

    // Buy/Sell quantities
    const totalBuyQuantity = parseInt(priceInfo.totalBuyQuantity || '0', 10);
    const totalSellQuantity = parseInt(priceInfo.totalSellQuantity || '0', 10);

    const result = {
      currentPrice: lastPrice.toFixed(2),
      percentChange,
      volume: totalTradedVolume,
      lastTradedPrice: lastPrice.toFixed(2),
      lastTradedQuantity,
      lastTradedTime,
      dayHigh: dayHigh.toFixed(2),
      dayLow: dayLow.toFixed(2),
      openPrice: openPrice.toFixed(2),
      previousClose: previousClose.toFixed(2),
      yearHigh: yearHigh.toFixed(2),
      yearLow: yearLow.toFixed(2),
      totalBuyQuantity,
      totalSellQuantity,
      totalTradedValue: totalTradedValue.toFixed(2),
      totalTradedVolume,
      averagePrice,
      lastUpdated: new Date(),
    };
    
    // Cache the result
    if (useCache) {
      setCachedPrice(symbol, result);
    }
    
    return result;
  } catch (error: any) {
    console.error(`[Price Fetcher] Failed to fetch price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Fetch prices for multiple stocks in batch
 */
export async function fetchMultipleStockPrices(symbols: string[], useCache = true): Promise<Map<string, any>> {
  const results = new Map();
  
  // Fetch in parallel with rate limiting (max 5 concurrent for speed)
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const prices = await Promise.all(
      batch.map(async (symbol) => {
        const price = await fetchStockPrice(symbol, useCache);
        return { symbol, price };
      })
    );
    
    prices.forEach(({ symbol, price }) => {
      if (price) {
        results.set(symbol, price);
      }
    });
    
    // Smaller delay between batches for speed (500ms instead of 1s)
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Update stock prices in storage
 * @param symbols - Array of stock symbols to update
 * @param useCache - Whether to use cache (true for live updates, false for EOD capture)
 */
export async function updateStoredPrices(symbols: string[], useCache: boolean = true): Promise<void> {
  const cacheStatus = useCache ? 'with cache' : 'fresh from NSE';
  console.log(`[Price Fetcher] Updating prices for ${symbols.length} stocks (${cacheStatus})...`);
  
  const priceMap = await fetchMultipleStockPrices(symbols, useCache);
  
  // Convert to array to avoid iterator issues
  const priceEntries = Array.from(priceMap.entries());
  for (const [symbol, priceData] of priceEntries) {
    try {
      const stock = await storage.getStockBySymbol(symbol);
      if (stock) {
        await storage.updateStock(stock.id, {
          currentPrice: priceData.currentPrice,
          percentChange: priceData.percentChange,
          volume: priceData.volume,
          lastTradedPrice: priceData.lastTradedPrice,
          lastTradedQuantity: priceData.lastTradedQuantity,
          lastTradedTime: priceData.lastTradedTime,
          dayHigh: priceData.dayHigh,
          dayLow: priceData.dayLow,
          openPrice: priceData.openPrice,
          previousClose: priceData.previousClose,
          yearHigh: priceData.yearHigh,
          yearLow: priceData.yearLow,
          totalBuyQuantity: priceData.totalBuyQuantity,
          totalSellQuantity: priceData.totalSellQuantity,
          totalTradedValue: priceData.totalTradedValue,
          totalTradedVolume: priceData.totalTradedVolume,
          averagePrice: priceData.averagePrice,
          lastLivePriceUpdate: priceData.lastUpdated,
        });
        console.log(`[Price Fetcher] ✅ Updated ${symbol}: LTP ₹${priceData.lastTradedPrice} @ ${priceData.lastTradedTime} (${priceData.percentChange}%) | Vol: ${priceData.totalTradedVolume.toLocaleString()}`);
      }
    } catch (error: any) {
      console.error(`[Price Fetcher] Failed to update ${symbol}:`, error.message);
    }
  }
  
  console.log(`[Price Fetcher] Price update completed`);
}
