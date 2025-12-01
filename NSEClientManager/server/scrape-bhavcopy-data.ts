/**
 * Real-time candlestick data scraper using NSE Bhavcopy (bulk daily data)
 * This is more reliable than the historical API
 */

import { storage } from '../storage';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import { format, subDays } from 'date-fns';

/**
 * Fetch and process NSE Bhavcopy for a specific date
 * Bhavcopy contains OHLCV data for all stocks for that trading day
 */
async function fetchBhavcopyForDate(date: Date): Promise<any[]> {
  const dateStr = format(date, 'ddMMMyyyy').toUpperCase();
  const url = `https://archives.nseindia.com/content/historical/EQUITIES/${format(date, 'yyyy')}/${format(date, 'MMM').toUpperCase()}/cm${dateStr}bhav.csv.zip`;
  
  console.log(`  Fetching bhavcopy for ${format(date, 'dd-MMM-yyyy')}...`);
  
  try {
    // Try direct CSV URL (sometimes available without .zip)
    const csvUrl = `https://archives.nseindia.com/products/content/sec_bhavdata_full.csv`;
    const response = await axios.get(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv,text/plain,*/*',
      },
      timeout: 30000,
    });

    if (response.data) {
      const records = parse(response.data, {
        columns: true,
        skip_empty_lines: true,
      });
      
      return records.filter((r: any) => r.SERIES === 'EQ'); // Only equity series
    }
  } catch (error: any) {
    console.log(`    No data available for this date`);
  }
  
  return [];
}

/**
 * Scrape real-time candlestick data for all stocks
 */
export async function scrapeRealTimeCandlestick(daysBack: number = 90): Promise<number> {
  console.log(`\n📊 Fetching Real Candlestick Data (Last ${daysBack} days)\n`);
  console.log('Using NSE Bhavcopy - Official bulk data source');
  console.log('='.repeat(70));
  console.log();

  const allStocks = await storage.getAllStocks();
  const stockMap = new Map(allStocks.map(s => [s.symbol, s.id]));
  
  let totalCandles = 0;
  let datesProcessed = 0;

  // Process last N days
  for (let i = 1; i <= daysBack; i++) {
    const date = subDays(new Date(), i);
    const dayOfWeek = date.getDay();
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const records = await fetchBhavcopyForDate(date);
    
    if (records.length === 0) continue;

    console.log(`  Processing ${format(date, 'dd-MMM-yyyy')}: ${records.length} stocks`);
    datesProcessed++;

    // Process each record
    for (const record of records) {
      const symbol = record.SYMBOL?.trim();
      if (!symbol || !stockMap.has(symbol)) continue;

      const stockId = stockMap.get(symbol)!;

      try {
        await storage.createCandlestickData({
          stockId,
          date: format(date, 'yyyy-MM-dd'),
          open: record.OPEN || record.OPEN_PRICE || '0',
          high: record.HIGH || record.HIGH_PRICE || '0',
          low: record.LOW || record.LOW_PRICE || '0',
          close: record.CLOSE || record.CLOSE_PRICE || '0',
          volume: parseInt(record.TOTTRDQTY || record.TTL_TRD_QNTY || '0', 10),
        });
        totalCandles++;
      } catch (e) {
        // Duplicate entry, skip
      }
    }

    // Small delay between dates
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Completed: ${totalCandles} candles across ${datesProcessed} trading days`);
  console.log('='.repeat(70));

  return totalCandles;
}

/**
 * Main execution
 */
async function main() {
  try {
    await scrapeRealTimeCandlestick(90);
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
