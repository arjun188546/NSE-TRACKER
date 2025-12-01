/**
 * Count quarterly results coverage across all stocks
 */

import { storage } from './storage';

async function main() {
  console.log('Checking quarterly results coverage...\n');
  
  const stocks = await storage.getAllStocks();
  console.log(`Total stocks in database: ${stocks.length}`);
  
  let stocksWithResults = 0;
  let stocksWithoutResults = 0;
  
  for (const stock of stocks) {
    const detail = await storage.getStockDetail(stock.symbol);
    if (detail?.results) {
      stocksWithResults++;
    } else {
      stocksWithoutResults++;
      if (stocksWithoutResults <= 10) {
        console.log(`  - ${stock.symbol}: No results`);
      }
    }
  }
  
  console.log(`\nResults:`);
  console.log(`  ✅ Stocks WITH quarterly results: ${stocksWithResults}`);
  console.log(`  ⚠️  Stocks WITHOUT quarterly results: ${stocksWithoutResults}`);
  console.log(`  📊 Coverage: ${((stocksWithResults / stocks.length) * 100).toFixed(1)}%`);
  
  process.exit(0);
}

main();
