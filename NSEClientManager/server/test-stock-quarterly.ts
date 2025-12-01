/**
 * Test script to check quarterly results for specific stocks
 */

import { storage } from './storage';

async function main() {
  const testSymbols = ['21STCENMGM', 'TCS', 'INFY', 'RELIANCE'];
  
  console.log('Testing quarterly results data retrieval...\n');
  
  for (const symbol of testSymbols) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Stock: ${symbol}`);
    console.log('='.repeat(60));
    
    try {
      const stockDetail = await storage.getStockDetail(symbol);
      
      if (!stockDetail) {
        console.log('❌ Stock not found in database');
        continue;
      }
      
      console.log(`✅ Stock ID: ${stockDetail.id}`);
      console.log(`   Name: ${stockDetail.name}`);
      console.log(`   Current Price: ₹${stockDetail.currentPrice || 'N/A'}`);
      
      if (stockDetail.results) {
        console.log('\n📊 Quarterly Results:');
        console.log(`   Quarter: ${stockDetail.results.quarter}`);
        console.log(`   Fiscal Year: ${stockDetail.results.fiscalYear}`);
        console.log(`   Revenue: ₹${stockDetail.results.revenue} Cr`);
        console.log(`   Profit: ₹${stockDetail.results.profit} Cr`);
        console.log(`   EPS: ₹${stockDetail.results.eps}`);
      } else {
        console.log('\n⚠️  No quarterly results available');
      }
      
      console.log(`\n📈 Candlestick Data: ${stockDetail.candlestickData?.length || 0} records`);
      console.log(`📦 Delivery Data: ${stockDetail.deliveryVolume?.length || 0} records`);
      
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Test completed');
  console.log('='.repeat(60));
  
  process.exit(0);
}

main();
