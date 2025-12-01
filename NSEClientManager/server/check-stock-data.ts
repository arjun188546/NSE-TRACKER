import { supabase } from "./supabase-storage.js";

async function checkStockData() {
  // Get all stocks except TCS
  const { data: stocks } = await supabase
    .from('stocks')
    .select('id, symbol, company_name')
    .neq('symbol', 'TCS')
    .order('symbol');
  
  if (!stocks) {
    console.log("No stocks found");
    process.exit(1);
  }
  
  console.log("Checking quarterly data for all stocks (excluding TCS):\n");
  console.log("=".repeat(100));
  
  for (const stock of stocks) {
    const { data: quarters } = await supabase
      .from('quarterly_results')
      .select('*')
      .eq('stock_id', stock.id)
      .order('published_at', { ascending: false })
      .limit(1);
    
    if (quarters && quarters.length > 0) {
      const q = quarters[0];
      console.log(`\n📊 ${stock.symbol} - ${q.quarter} ${q.fiscal_year}`);
      console.log(`   Revenue: ${q.revenue || '❌ MISSING'}`);
      console.log(`   Profit: ${q.profit || '❌ MISSING'}`);
      console.log(`   EPS: ${q.eps || '❌ MISSING'}`);
      console.log(`   Operating Profit: ${q.operating_profit || '❌ MISSING'}`);
      console.log(`   Operating Margin: ${q.operating_profit_margin || '❌ MISSING'}`);
      console.log(`   Prev Revenue: ${q.prev_revenue || '—'}`);
      console.log(`   Year Ago Revenue: ${q.year_ago_revenue || '—'}`);
    } else {
      console.log(`\n⚠️  ${stock.symbol} - NO quarterly data`);
    }
  }
  
  console.log("\n" + "=".repeat(100));
  process.exit(0);
}

checkStockData().catch(console.error);
