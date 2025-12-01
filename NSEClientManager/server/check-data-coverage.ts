/**
 * Quick test to check data coverage
 */

import { storage } from './storage';

async function checkCoverage() {
  console.log('Checking data coverage...\n');

  try {
    const allStocks = await storage.getAllStocks();
    console.log(`Total stocks: ${allStocks.length}\n`);

    let withCandles = 0;
    let withDelivery = 0;

    // Check first 10 stocks as sample
    for (let i = 0; i < Math.min(10, allStocks.length); i++) {
      const stock = allStocks[i];
      const candles = await storage.getCandlestickData(stock.id, 1);
      const delivery = await storage.getDeliveryVolume(stock.id, 1);
      
      console.log(`${stock.symbol}: Candles=${candles.length}, Delivery=${delivery.length}`);
      
      if (candles.length > 0) withCandles++;
      if (delivery.length > 0) withDelivery++;
    }

    console.log(`\nSample of 10 stocks:`);
    console.log(`  With candlestick data: ${withCandles}/10`);
    console.log(`  With delivery data: ${withDelivery}/10`);

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

checkCoverage();
