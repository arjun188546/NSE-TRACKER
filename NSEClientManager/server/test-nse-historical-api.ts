/**
 * Test NSE historical API to understand the correct response format
 */

import { nseClient } from './services/nse-scraper/http-client';
import { format, subDays } from 'date-fns';

async function testNSEHistoricalAPI() {
  console.log('Testing NSE Historical API...\n');

  const symbol = 'TCS';
  const toDate = new Date();
  const fromDate = subDays(toDate, 7);

  console.log(`Fetching data for ${symbol}`);
  console.log(`From: ${format(fromDate, 'dd-MM-yyyy')}`);
  console.log(`To: ${format(toDate, 'dd-MM-yyyy')}\n`);

  try {
    const data = await nseClient.get('/api/historical/cm/equity', {
      symbol: symbol,
      series: 'EQ',
      from: format(fromDate, 'dd-MM-yyyy'),
      to: format(toDate, 'dd-MM-yyyy'),
    });

    console.log('API Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log('\nFirst record keys:');
      console.log(Object.keys(data.data[0]));
      
      console.log('\nFirst record:');
      console.log(JSON.stringify(data.data[0], null, 2));
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

testNSEHistoricalAPI();
