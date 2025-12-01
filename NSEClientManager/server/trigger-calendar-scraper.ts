/**
 * Trigger the NSE results calendar scraper
 */

import { scrapeResultsCalendar } from './services/nse-scraper/results-scraper';

async function main() {
  console.log('🗓️  Triggering NSE Results Calendar Scraper\n');
  console.log('This will fetch upcoming quarterly result announcements from NSE\n');

  try {
    const count = await scrapeResultsCalendar();
    console.log(`\n✅ Completed! Added ${count} new calendar entries`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

main();
