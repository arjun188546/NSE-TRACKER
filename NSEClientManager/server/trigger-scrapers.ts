/**
 * Manual script to trigger scrapers and populate database
 * Run with: npx tsx server/trigger-scrapers.ts
 */

import { scrapeIncrementalCandlestickData } from './services/nse-scraper/candlestick-scraper';
import { scrapeIncrementalDeliveryData } from './services/nse-scraper/delivery-scraper';
import { scrapeQuarterlyFinancials } from './services/nse-scraper/quarterly-financials-scraper';

async function main() {
  console.log('🚀 Starting manual scraper trigger...\n');

  try {
    // Trigger quarterly financials scraper
    console.log('📈 Triggering quarterly financials scraper...');
    console.log('⏱️  This will process all 992 stocks (estimated: 8-10 minutes)\n');
    const quarterlyCount = await scrapeQuarterlyFinancials();
    console.log(`✅ Quarterly financials scraper completed: ${quarterlyCount} stocks updated\n`);
  } catch (error: any) {
    console.error('❌ Quarterly financials scraper failed:', error.message);
    console.error(error.stack);
  }

  try {
    // Trigger candlestick scraper
    console.log('📊 Triggering candlestick data scraper...');
    const candlestickRows = await scrapeIncrementalCandlestickData();
    console.log(`✅ Candlestick scraper completed: ${candlestickRows} rows affected\n`);
  } catch (error: any) {
    console.error('❌ Candlestick scraper failed:', error.message);
    console.error(error.stack);
  }

  try {
    // Trigger delivery volume scraper
    console.log('📦 Triggering delivery volume scraper...');
    const deliveryRows = await scrapeIncrementalDeliveryData();
    console.log(`✅ Delivery scraper completed: ${deliveryRows} rows affected\n`);
  } catch (error: any) {
    console.error('❌ Delivery scraper failed:', error.message);
    console.error(error.stack);
  }

  console.log('✨ Manual scraper trigger completed!');
  process.exit(0);
}

main();
