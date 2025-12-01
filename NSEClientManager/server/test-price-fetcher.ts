/**
 * Test Price Fetcher - Check if NSE price API is working
 */

import { fetchStockPrice, updateStoredPrices } from './services/nse-scraper/price-fetcher';
import { storage } from './storage';

async function testPriceFetcher() {
  console.log('🔍 Testing NSE Price Fetcher\n');
  console.log('═'.repeat(70));

  // Test with a few major stocks
  const testSymbols = ['TCS', 'INFY', 'RELIANCE', 'HDFCBANK', 'ICICIBANK'];

  console.log(`\n📊 Testing individual price fetch for ${testSymbols.length} stocks...\n`);

  for (const symbol of testSymbols) {
    console.log(`[${symbol}] Fetching...`);
    try {
      const priceData = await fetchStockPrice(symbol, false); // No cache
      
      if (priceData) {
        console.log(`✅ ${symbol}:`);
        console.log(`   LTP: ₹${priceData.lastTradedPrice}`);
        console.log(`   Change: ${priceData.percentChange}%`);
        console.log(`   Volume: ${priceData.totalTradedVolume.toLocaleString()}`);
        console.log(`   Day Range: ₹${priceData.dayLow} - ₹${priceData.dayHigh}`);
        console.log(`   Last Updated: ${priceData.lastUpdated.toLocaleTimeString()}`);
      } else {
        console.log(`❌ ${symbol}: No data returned`);
      }
    } catch (error: any) {
      console.log(`❌ ${symbol}: ${error.message}`);
    }
    console.log();
  }

  console.log('═'.repeat(70));
  console.log('\n📝 Testing database update for 5 stocks...\n');

  try {
    await updateStoredPrices(testSymbols, false);
    console.log('✅ Database update completed');

    // Verify updates in database
    console.log('\n🔍 Verifying database updates...\n');
    for (const symbol of testSymbols) {
      const stock = await storage.getStockBySymbol(symbol);
      if (stock) {
        console.log(`${symbol}:`);
        console.log(`   Current Price: ₹${stock.currentPrice || 'N/A'}`);
        console.log(`   Percent Change: ${stock.percentChange || 'N/A'}%`);
        console.log(`   Volume: ${stock.volume?.toLocaleString() || 'N/A'}`);
        console.log(`   Last Update: ${stock.lastLivePriceUpdate ? new Date(stock.lastLivePriceUpdate).toLocaleString() : 'Never'}`);
      } else {
        console.log(`${symbol}: Not found in database`);
      }
      console.log();
    }
  } catch (error: any) {
    console.error('❌ Database update failed:', error.message);
  }

  console.log('═'.repeat(70));
  console.log('\n✅ Test completed\n');
}

testPriceFetcher().catch(console.error);
