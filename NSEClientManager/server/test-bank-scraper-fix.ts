import { ScreenerScraper } from './services/web-scrapers/screener-scraper';

async function testBankScraper() {
  console.log('\n🏦 TESTING BANK SCRAPER WITH FIX\n');
  
  const scraper = new ScreenerScraper();
  
  const banks = ['HDFCBANK', 'ICICIBANK', 'AXISBANK'];
  
  for (const symbol of banks) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Testing ${symbol}`);
    console.log('='.repeat(70));
    
    const data = await scraper.getQuarterlyResults(symbol);
    
    if (data.length > 0) {
      console.log(`\n✅ Scraped ${data.length} quarters\n`);
      console.log('Latest quarter:');
      const latest = data[0];
      console.log(`  Quarter: ${latest.quarter} ${latest.fiscalYear}`);
      console.log(`  Revenue: ₹${latest.revenue.toLocaleString()} Cr`);
      console.log(`  Profit: ₹${latest.profit.toLocaleString()} Cr`);
      console.log(`  EPS: ₹${latest.eps}`);
      console.log(`  Operating Profit: ₹${latest.operatingProfit.toLocaleString()} Cr ${latest.operatingProfit > 0 ? '✅' : '❌'}`);
      
      if (latest.operatingProfit > 0) {
        const margin = (latest.operatingProfit / latest.revenue) * 100;
        console.log(`  Operating Margin: ${margin.toFixed(2)}%`);
      }
    } else {
      console.log('❌ No data found');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Compare with non-bank
  console.log(`\n${'='.repeat(70)}`);
  console.log(`COMPARISON: Non-Bank (TCS)`);
  console.log('='.repeat(70));
  
  const tcsData = await scraper.getQuarterlyResults('TCS');
  if (tcsData.length > 0) {
    const latest = tcsData[0];
    console.log(`\n✅ Scraped ${tcsData.length} quarters\n`);
    console.log('Latest quarter:');
    console.log(`  Quarter: ${latest.quarter} ${latest.fiscalYear}`);
    console.log(`  Revenue: ₹${latest.revenue.toLocaleString()} Cr`);
    console.log(`  Profit: ₹${latest.profit.toLocaleString()} Cr`);
    console.log(`  EPS: ₹${latest.eps}`);
    console.log(`  Operating Profit: ₹${latest.operatingProfit.toLocaleString()} Cr ${latest.operatingProfit > 0 ? '✅' : '❌'}`);
    
    if (latest.operatingProfit > 0) {
      const margin = (latest.operatingProfit / latest.revenue) * 100;
      console.log(`  Operating Margin: ${margin.toFixed(2)}%`);
    }
  }
}

testBankScraper().catch(console.error);
