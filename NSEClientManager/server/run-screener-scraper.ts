/**
 * Trigger Screener.in scraper to populate quarterly data for all stocks
 * Run with: npx tsx server/run-screener-scraper.ts
 */

import { scrapeAllStocksFromScreener } from './services/screener-scraper';

async function main() {
  console.log('Starting Screener.in data extraction...\n');
  console.log('⚠️  This will take approximately 45-60 minutes for remaining stocks');
  console.log('⚠️  Rate limited to 1 request every 3 seconds to avoid blocking\n');
  console.log('💡 Tip: Stocks already scraped will be skipped automatically\n');
  
  try {
    await scrapeAllStocksFromScreener();
  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
