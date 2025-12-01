/**
 * Check all EMMVEE data in Supabase
 */

import { supabase } from './supabase-storage';

async function checkEmmveeData() {
  console.log('🔍 Checking EMMVEE data in database...\n');

  try {
    // 1. Check stocks table
    const { data: stockData } = await supabase
      .from('stocks')
      .select('*')
      .ilike('symbol', '%EMMVEE%');

    console.log('📊 Stocks table:');
    if (stockData && stockData.length > 0) {
      stockData.forEach(stock => {
        console.log(`  ID: ${stock.id}`);
        console.log(`  Symbol: ${stock.symbol}`);
        console.log(`  Name: ${stock.company_name}`);
        console.log();
      });

      // 2. Check quarterly_results for each stock
      for (const stock of stockData) {
        const { data: results } = await supabase
          .from('quarterly_results')
          .select('*')
          .eq('stock_id', stock.id);

        console.log(`📈 Quarterly Results for ${stock.symbol} (stock_id: ${stock.id}):`);
        if (results && results.length > 0) {
          results.forEach(result => {
            console.log(`  - ${result.quarter} ${result.fiscal_year}`);
            console.log(`    Revenue: ₹${result.revenue} Cr`);
            console.log(`    Net Profit: ₹${result.net_profit} Cr`);
            console.log(`    EPS: ₹${result.eps}`);
            console.log(`    Operating Profit: ₹${result.operating_profit} Cr`);
            console.log(`    Operating Margin: ${result.operating_profit_margin}%`);
            console.log();
          });
        } else {
          console.log('  No quarterly results found\n');
        }
      }
    } else {
      console.log('  No EMMVEE stock found in database\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkEmmveeData();
