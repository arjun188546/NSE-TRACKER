/**
 * Test Screener.in scraper with a few sample stocks
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function testScreenerScraper() {
  const testSymbols = ['21STCENMGM', 'EMMVEE', 'ZOMATO'];
  
  console.log('Testing Screener.in scraper...\n');

  for (const symbol of testSymbols) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${symbol}`);
    console.log('='.repeat(60));

    try {
      // Try direct URL
      const url = `https://www.screener.in/company/${symbol}/`;
      console.log(`Trying URL: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
        validateStatus: (status) => status < 500,
      });

      console.log(`Response status: ${response.status}`);

      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        
        // Try to find company name
        const companyName = $('#company-name, .company-name, h1').first().text().trim();
        console.log(`Company: ${companyName || 'Not found'}`);

        // Look for quarterly results section
        const quartersSection = $('section#quarters');
        console.log(`Quarters section found: ${quartersSection.length > 0}`);

        if (quartersSection.length > 0) {
          const table = quartersSection.find('table').first();
          const headers: string[] = [];
          
          table.find('thead th').each((idx, th) => {
            if (idx > 0) {
              headers.push($(th).text().trim());
            }
          });

          console.log(`Found ${headers.length} quarters:`, headers.slice(0, 3));

          // Extract first row of data
          const firstRow = table.find('tbody tr').first();
          const metricName = firstRow.find('td').first().text().trim();
          console.log(`First metric: ${metricName}`);
        } else {
          console.log('⚠️  No quarterly data section found');
        }
      } else {
        console.log('❌ Company not found on Screener.in');
      }

    } catch (error: any) {
      console.error(`❌ Error:`, error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test completed');
  console.log('='.repeat(60));
}

testScreenerScraper();
