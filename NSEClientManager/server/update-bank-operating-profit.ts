import { ScreenerScraper } from './services/web-scrapers/screener-scraper';
import { supabase } from './supabase-storage';

async function refetchBanks() {
  console.log('\n🏦 RE-FETCHING BANK DATA WITH OPERATING PROFIT FIX\n');
  
  const banks = [
    { symbol: 'HDFCBANK', stockId: '42138852-901c-4724-9463-3a3b9e18173c' },
    { symbol: 'ICICIBANK', stockId: '254902b5-dc24-4823-849d-738d46d9951b' },
    { symbol: 'AXISBANK', stockId: 'afb18e95-384a-4aee-ad3c-d7c691e259f3' },
  ];
  
  const scraper = new ScreenerScraper();
  
  for (const bank of banks) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Updating ${bank.symbol}`);
    console.log('='.repeat(70));
    
    const data = await scraper.getQuarterlyResults(bank.symbol);
    
    if (data.length === 0) {
      console.log('❌ No data found');
      continue;
    }
    
    console.log(`Found ${data.length} quarters, updating database...`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const quarter of data) {
      // Skip Q2 FY2526 (current quarter)
      if (quarter.quarter === 'Q2' && quarter.fiscalYear === 'FY2526') {
        continue;
      }
      
      const operatingMargin = quarter.operatingProfit && quarter.revenue
        ? (quarter.operatingProfit / quarter.revenue) * 100
        : 0;
      
      // Update existing record
      const { error } = await supabase
        .from('quarterly_results')
        .update({
          operating_profit: quarter.operatingProfit,
          operating_profit_margin: operatingMargin,
        })
        .eq('stock_id', bank.stockId)
        .eq('quarter', quarter.quarter)
        .eq('fiscal_year', quarter.fiscalYear);
      
      if (error) {
        console.log(`  ❌ Failed to update ${quarter.quarter} ${quarter.fiscalYear}: ${error.message}`);
        skipped++;
      } else {
        console.log(`  ✅ Updated ${quarter.quarter} ${quarter.fiscalYear}: Operating Profit = ₹${quarter.operatingProfit.toLocaleString()} Cr, Margin = ${operatingMargin.toFixed(2)}%`);
        updated++;
      }
    }
    
    console.log(`\nSummary: ${updated} updated, ${skipped} skipped`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\n✅ BANK DATA UPDATE COMPLETE!');
  console.log('\nNow run: npx tsx server/auto-populate-all-comparisons.ts');
  console.log('to recalculate all comparisons with the new operating profit data.\n');
}

refetchBanks().catch(console.error);
