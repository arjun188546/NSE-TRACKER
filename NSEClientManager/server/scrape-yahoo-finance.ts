/**
 * Fetch real-time candlestick data from Yahoo Finance
 * More reliable than NSE's direct API
 */

import { storage } from './storage';
import axios from 'axios';
import { format, subDays } from 'date-fns';

/**
 * Fetch candlestick data from Yahoo Finance for a stock
 */
async function fetchYahooFinanceData(symbol: string, daysBack: number = 90): Promise<any[]> {
  // Yahoo Finance uses .NS suffix for NSE stocks
  const yahooSymbol = `${symbol}.NS`;
  
  const period1 = Math.floor(subDays(new Date(), daysBack).getTime() / 1000);
  const period2 = Math.floor(new Date().getTime() / 1000);
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
  
  try {
    const response = await axios.get(url, {
      params: {
        period1,
        period2,
        interval: '1d',
        events: 'history',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const chart = response.data?.chart?.result?.[0];
    if (!chart || !chart.timestamp) {
      return [];
    }

    const timestamps = chart.timestamp;
    const quotes = chart.indicators?.quote?.[0];
    
    if (!quotes) return [];

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.open[i] && quotes.high[i] && quotes.low[i] && quotes.close[i]) {
        candles.push({
          date: new Date(timestamps[i] * 1000),
          open: quotes.open[i],
          high: quotes.high[i],
          low: quotes.low[i],
          close: quotes.close[i],
          volume: quotes.volume[i] || 0,
        });
      }
    }

    return candles;
  } catch (error: any) {
    if (error.response?.status === 404) {
      // Stock not found on Yahoo Finance
      return [];
    }
    throw error;
  }
}

/**
 * Scrape candlestick data for all stocks from Yahoo Finance
 */
export async function scrapeYahooFinanceCandlestick(daysBack: number = 90): Promise<number> {
  console.log(`\n📊 Fetching Real Candlestick Data from Yahoo Finance (Last ${daysBack} days)\n`);
  console.log('='.repeat(70));
  console.log();

  const allStocks = await storage.getAllStocks();
  console.log(`Total stocks to process: ${allStocks.length}\n`);

  let successCount = 0;
  let totalCandles = 0;
  let errorCount = 0;

  for (let i = 0; i < allStocks.length; i++) {
    const stock = allStocks[i];
    
    try {
      console.log(`[${i + 1}/${allStocks.length}] Fetching ${stock.symbol}...`);
      
      const candles = await fetchYahooFinanceData(stock.symbol, daysBack);
      
      if (candles.length === 0) {
        console.log(`  ⚠️  No data available`);
        continue;
      }

      let storedCount = 0;
      for (const candle of candles) {
        try {
          await storage.createCandlestickData({
            stockId: stock.id,
            date: format(candle.date, 'yyyy-MM-dd'),
            open: candle.open.toFixed(2),
            high: candle.high.toFixed(2),
            low: candle.low.toFixed(2),
            close: candle.close.toFixed(2),
            volume: candle.volume,
          });
          storedCount++;
        } catch (e) {
          // Duplicate entry, skip
        }
      }

      console.log(`  ✅ Stored ${storedCount} candles`);
      successCount++;
      totalCandles += storedCount;

      // Rate limiting - 1 request per second to avoid blocking
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Progress update every 50 stocks
      if ((i + 1) % 50 === 0) {
        console.log(`\n📈 Progress: ${i + 1}/${allStocks.length} | Success: ${successCount} | Total candles: ${totalCandles}\n`);
      }

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      errorCount++;
      
      // Wait longer on error
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Completed!`);
  console.log(`  Success: ${successCount}/${allStocks.length} stocks`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total candles stored: ${totalCandles}`);
  console.log('='.repeat(70));

  return totalCandles;
}

/**
 * Main execution
 */
async function main() {
  try {
    await scrapeYahooFinanceCandlestick(90);
    process.exit(0);
  } catch (error: any) {
    console.error('Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
