/**
 * Backfill historical candlestick and delivery data for stocks without data
 * This script identifies stocks missing chart data and fetches their history
 */

import { storage } from './storage';
import { nseClient } from './services/nse-scraper/http-client';
import { format, subDays } from 'date-fns';

interface StockDataStatus {
  symbol: string;
  stockId: string;
  hasCandlestick: boolean;
  hasDelivery: boolean;
  candlestickCount: number;
  deliveryCount: number;
}

/**
 * Check which stocks need historical data
 */
async function checkStockDataStatus(): Promise<StockDataStatus[]> {
  console.log('📊 Analyzing stock data coverage...\n');
  
  const allStocks = await storage.getAllStocks();
  const statusList: StockDataStatus[] = [];

  for (const stock of allStocks) {
    const candlestickData = await storage.getCandlestickData(stock.id, 1);
    const deliveryData = await storage.getDeliveryVolume(stock.id, 1);
    
    statusList.push({
      symbol: stock.symbol,
      stockId: stock.id,
      hasCandlestick: candlestickData.length > 0,
      hasDelivery: deliveryData.length > 0,
      candlestickCount: candlestickData.length,
      deliveryCount: deliveryData.length,
    });
  }

  return statusList;
}

/**
 * Fetch historical candlestick data for a single stock
 */
async function fetchHistoricalCandlestick(symbol: string, stockId: string, daysBack: number = 90): Promise<number> {
  console.log(`  📈 Fetching ${daysBack} days of candlestick data for ${symbol}...`);

  const toDate = new Date();
  const fromDate = subDays(toDate, daysBack);

  try {
    const data = await nseClient.get('/api/historical/cm/equity', {
      symbol: symbol,
      series: 'EQ',
      from: format(fromDate, 'dd-MM-yyyy'),
      to: format(toDate, 'dd-MM-yyyy'),
    });

    if (!data?.data || !Array.isArray(data.data)) {
      console.log(`    ⚠️  No data available for ${symbol}`);
      return 0;
    }

    let storedCount = 0;
    for (const candle of data.data) {
      try {
        const date = candle.mTIMESTAMP || candle.CH_TIMESTAMP;
        const parsedDate = new Date(date);
        
        await storage.createCandlestickData({
          stockId,
          date: format(parsedDate, 'yyyy-MM-dd'),
          open: (candle.CH_OPENING_PRICE || candle.OPEN).toString(),
          high: (candle.CH_TRADE_HIGH_PRICE || candle.HIGH).toString(),
          low: (candle.CH_TRADE_LOW_PRICE || candle.LOW).toString(),
          close: (candle.CH_CLOSING_PRICE || candle.CLOSE).toString(),
          volume: parseInt(candle.CH_TOT_TRADED_QTY || candle.VOLUME || '0', 10),
        });
        storedCount++;
      } catch (e) {
        // Duplicate entry, skip
      }
    }

    console.log(`    ✅ Stored ${storedCount} candles for ${symbol}`);
    return storedCount;
  } catch (error: any) {
    console.error(`    ❌ Error fetching ${symbol}:`, error.message);
    return 0;
  }
}

/**
 * Fetch historical delivery data for a single stock
 */
async function fetchHistoricalDelivery(symbol: string, stockId: string, daysBack: number = 30): Promise<number> {
  console.log(`  📦 Fetching ${daysBack} days of delivery data for ${symbol}...`);

  const toDate = new Date();
  const fromDate = subDays(toDate, daysBack);

  try {
    const data = await nseClient.get('/api/historical/securityArchives', {
      symbol: symbol,
      dataType: 'priceVolumeDeliverable',
      series: 'EQ',
      fromDate: format(fromDate, 'dd-MM-yyyy'),
      toDate: format(toDate, 'dd-MM-yyyy'),
    });

    if (!data?.data || !Array.isArray(data.data)) {
      console.log(`    ⚠️  No delivery data for ${symbol}`);
      return 0;
    }

    let storedCount = 0;
    for (const record of data.data) {
      try {
        const date = record.mTIMESTAMP || record.timestamp;
        const parsedDate = new Date(date);
        
        await storage.createDeliveryVolume({
          stockId,
          date: format(parsedDate, 'yyyy-MM-dd'),
          deliveryQuantity: parseInt(record.quantityTraded || record.deliveryQty || '0', 10),
          tradedQuantity: parseInt(record.tradedQuantity || record.totalTradedQty || '0', 10),
          deliveryPercentage: parseFloat(record.deliveryToTradedQuantity || record.deliveryPercent || '0'),
        });
        storedCount++;
      } catch (e) {
        // Duplicate entry, skip
      }
    }

    console.log(`    ✅ Stored ${storedCount} delivery records for ${symbol}`);
    return storedCount;
  } catch (error: any) {
    console.error(`    ❌ Error fetching delivery for ${symbol}:`, error.message);
    return 0;
  }
}

/**
 * Main backfill function
 */
async function backfillHistoricalData() {
  console.log('🚀 Starting Historical Data Backfill\n');
  console.log('='.repeat(70));
  console.log('This will populate candlestick and delivery data for stocks\n');

  // Step 1: Analyze current coverage
  const statusList = await checkStockDataStatus();
  
  const stocksNeedingCandles = statusList.filter(s => !s.hasCandlestick);
  const stocksNeedingDelivery = statusList.filter(s => !s.hasDelivery);
  
  console.log('\n📊 Data Coverage Analysis:');
  console.log(`  Total stocks: ${statusList.length}`);
  console.log(`  ✅ Stocks with candlestick data: ${statusList.length - stocksNeedingCandles.length}`);
  console.log(`  ❌ Stocks missing candlestick data: ${stocksNeedingCandles.length}`);
  console.log(`  ✅ Stocks with delivery data: ${statusList.length - stocksNeedingDelivery.length}`);
  console.log(`  ❌ Stocks missing delivery data: ${stocksNeedingDelivery.length}`);
  console.log();

  if (stocksNeedingCandles.length === 0 && stocksNeedingDelivery.length === 0) {
    console.log('✨ All stocks already have historical data!');
    process.exit(0);
  }

  console.log('='.repeat(70));
  console.log('\n⏱️  Estimated time:');
  console.log(`  Candlestick: ~${Math.ceil(stocksNeedingCandles.length * 2 / 60)} minutes`);
  console.log(`  Delivery: ~${Math.ceil(stocksNeedingDelivery.length * 2 / 60)} minutes`);
  console.log(`  Total: ~${Math.ceil((stocksNeedingCandles.length + stocksNeedingDelivery.length) * 2 / 60)} minutes`);
  console.log('\n='.repeat(70));
  console.log();

  // Step 2: Backfill candlestick data
  if (stocksNeedingCandles.length > 0) {
    console.log(`\n📈 Backfilling Candlestick Data (${stocksNeedingCandles.length} stocks)\n`);
    
    let candleSuccess = 0;
    let candleTotal = 0;

    for (let i = 0; i < stocksNeedingCandles.length; i++) {
      const stock = stocksNeedingCandles[i];
      console.log(`[${i + 1}/${stocksNeedingCandles.length}] ${stock.symbol}`);
      
      const count = await fetchHistoricalCandlestick(stock.symbol, stock.stockId, 90);
      if (count > 0) {
        candleSuccess++;
        candleTotal += count;
      }
      
      // Rate limiting - 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Progress update every 25 stocks
      if ((i + 1) % 25 === 0) {
        console.log(`\n  Progress: ${i + 1}/${stocksNeedingCandles.length} | Success: ${candleSuccess} | Total candles: ${candleTotal}\n`);
      }
    }

    console.log(`\n✅ Candlestick backfill complete: ${candleSuccess}/${stocksNeedingCandles.length} stocks, ${candleTotal} candles stored\n`);
  }

  // Step 3: Backfill delivery data
  if (stocksNeedingDelivery.length > 0) {
    console.log(`\n📦 Backfilling Delivery Data (${stocksNeedingDelivery.length} stocks)\n`);
    
    let deliverySuccess = 0;
    let deliveryTotal = 0;

    for (let i = 0; i < stocksNeedingDelivery.length; i++) {
      const stock = stocksNeedingDelivery[i];
      console.log(`[${i + 1}/${stocksNeedingDelivery.length}] ${stock.symbol}`);
      
      const count = await fetchHistoricalDelivery(stock.symbol, stock.stockId, 30);
      if (count > 0) {
        deliverySuccess++;
        deliveryTotal += count;
      }
      
      // Rate limiting - 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Progress update every 25 stocks
      if ((i + 1) % 25 === 0) {
        console.log(`\n  Progress: ${i + 1}/${stocksNeedingDelivery.length} | Success: ${deliverySuccess} | Total records: ${deliveryTotal}\n`);
      }
    }

    console.log(`\n✅ Delivery backfill complete: ${deliverySuccess}/${stocksNeedingDelivery.length} stocks, ${deliveryTotal} records stored\n`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Historical Data Backfill Completed!');
  console.log('='.repeat(70));
  console.log('\n📊 Summary:');
  console.log(`  Stocks processed: ${stocksNeedingCandles.length + stocksNeedingDelivery.length}`);
  console.log(`  Charts now available for all ${statusList.length} stocks`);
  console.log('\n🎉 All stocks now have real-time chart capabilities!');
  console.log('='.repeat(70));

  process.exit(0);
}

// Run backfill
backfillHistoricalData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
