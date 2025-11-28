/**
 * Debug - Check TCS announcements
 */

import { nseClient } from './services/nse-scraper/http-client';
import { format } from 'date-fns';

async function main() {
  try {
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-15');
    
    console.log(`Searching TCS announcements from ${format(startDate, 'dd-MM-yyyy')} to ${format(endDate, 'dd-MM-yyyy')}`);
    
    const announcements = await nseClient.get('/api/corporate-announcements', {
      index: 'equities',
      from_date: format(startDate, 'dd-MM-yyyy'),
      to_date: format(endDate, 'dd-MM-yyyy'),
      symbol: 'TCS'
    });
    
    console.log(`\nFound ${announcements.length} TCS announcements\n`);
    
    for (const ann of announcements) {
      console.log('='.repeat(70));
      console.log(`Date: ${ann.an_dt}`);
      console.log(`Description: ${ann.desc}`);
      console.log(`Attachment Text: ${ann.attchmntText}`);
      console.log(`Has XBRL: ${ann.hasXbrl}`);
      console.log();
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
