import { storage } from './storage';

async function checkStockData() {
  const stocks = await storage.getAllStocks();
  console.log('\n=== Stocks from Database ===\n');
  stocks.forEach(s => {
    console.log(`${s.symbol}:`);
    console.log(`  currentPrice: ${s.currentPrice} (type: ${typeof s.currentPrice})`);
    console.log(`  percentChange: ${s.percentChange} (type: ${typeof s.percentChange})`);
    console.log(`  lastTradedPrice: ${s.lastTradedPrice}`);
    console.log(`  lastTradedTime: ${s.lastTradedTime}`);
    console.log('---');
  });
}

checkStockData().catch(console.error);
