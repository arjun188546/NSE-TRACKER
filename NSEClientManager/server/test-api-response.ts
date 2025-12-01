/**
 * Test API response to see what frontend receives
 */

import { storage } from './storage';

async function testAPIResponse() {
  const tcs = await storage.getStockBySymbol('TCS');
  if (!tcs) {
    console.error('TCS not found');
    return;
  }

  const stockDetail = await storage.getStockDetail('TCS');
  
  console.log('='.repeat(80));
  console.log('API RESPONSE FOR FRONTEND:');
  console.log('='.repeat(80));
  console.log();
  console.log('stockDetail.results:');
  console.log(JSON.stringify(stockDetail?.results, null, 2));
  console.log();
  console.log('='.repeat(80));
}

testAPIResponse();
