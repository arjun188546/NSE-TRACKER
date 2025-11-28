/**
 * Test NSE Financial Results API
 * Check if NSE provides structured financial data via API
 */

import { nseClient } from './services/nse-scraper/http-client';

async function main() {
  console.log('='.repeat(60));
  console.log('Testing NSE Financial Results APIs');
  console.log('='.repeat(60));
  console.log();

  try {
    const symbol = 'TCS';
    
    // Test different NSE API endpoints for financial data
    const endpoints = [
      `/api/quote-equity?symbol=${symbol}`,
      `/api/financials?symbol=${symbol}`,
      `/api/corporate-info?symbol=${symbol}`,
      `/api/corporates-financial?symbol=${symbol}`,
      `/api/company-info?symbol=${symbol}`,
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`\n[Test] Trying: ${endpoint}`);
        const data = await nseClient.get(endpoint);
        
        if (data) {
          console.log('✅ Success! Data received:');
          console.log(JSON.stringify(data, null, 2).substring(0, 1000) + '...');
        }
      } catch (error: any) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
