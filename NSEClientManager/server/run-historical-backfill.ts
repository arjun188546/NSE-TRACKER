/**
 * Simplified historical data backfill - focuses on getting data for stocks without it
 */

import { storage } from './storage';
import { scrapeIncrementalCandlestickData } from './services/nse-scraper/candlestick-scraper';
import { scrapeIncrementalDeliveryData } from './services/nse-scraper/delivery-scraper';

async function runBackfill() {
  console.log('🚀 Starting Historical Data Backfill\n');
  console.log('This will fetch candlestick and delivery data for all stocks\n');
  console.log('='.repeat(70));
  console.log();

  try {
    // Run candlestick scraper
    console.log('📈 Step 1: Fetching Candlestick Data for all stocks...\n');
    const candleCount = await scrapeIncrementalCandlestickData();
    console.log(`\n✅ Candlestick data complete: ${candleCount} records added\n`);
    console.log('='.repeat(70));
    console.log();

    // Run delivery scraper
    console.log('📦 Step 2: Fetching Delivery Data for all stocks...\n');
    const deliveryCount = await scrapeIncrementalDeliveryData();
    console.log(`\n✅ Delivery data complete: ${deliveryCount} records added\n`);
    console.log('='.repeat(70));
    console.log();

    console.log('🎉 Backfill Complete!');
    console.log(`  Candlestick records: ${candleCount}`);
    console.log(`  Delivery records: ${deliveryCount}`);
    console.log(`  Total: ${candleCount + deliveryCount} new data points`);
    console.log();
    console.log('✨ All stocks now have real-time chart capabilities!');
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Backfill failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

runBackfill();
