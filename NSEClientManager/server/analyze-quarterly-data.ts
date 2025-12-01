import { supabase } from "./supabase-storage.js";

/**
 * Analyzes quarterly results to identify what data is missing
 * and what can be auto-populated from historical quarters
 */

async function analyzeQuarterlyData() {
  console.log("🔍 Analyzing Quarterly Results Data...\n");
  console.log("=".repeat(80));
  
  // Get all quarterly results grouped by stock
  const { data: allResults, error } = await supabase
    .from('quarterly_results')
    .select('*')
    .order('stock_id, published_at');
  
  if (error || !allResults) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
  
  // Group by stock
  const stockMap = new Map<string, any[]>();
  for (const result of allResults) {
    if (!stockMap.has(result.stock_id)) {
      stockMap.set(result.stock_id, []);
    }
    stockMap.get(result.stock_id)!.push(result);
  }
  
  console.log(`\nFound ${stockMap.size} stocks with quarterly results`);
  console.log(`Total quarterly result records: ${allResults.length}\n`);
  
  let stocksWithMultipleQuarters = 0;
  let stocksWithSingleQuarter = 0;
  let canAutoPopulate = 0;
  let needsManualData = 0;
  
  for (const [stockId, quarters] of stockMap.entries()) {
    // Get stock name
    const { data: stock } = await supabase
      .from('stocks')
      .select('symbol, company_name')
      .eq('id', stockId)
      .single();
    
    const symbol = stock?.symbol || 'Unknown';
    const sorted = quarters.sort((a, b) => 
      new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
    );
    
    if (sorted.length === 1) {
      stocksWithSingleQuarter++;
      console.log(`⚠️  ${symbol}: Only 1 quarter - needs manual prev/year-ago data`);
      needsManualData++;
    } else {
      stocksWithMultipleQuarters++;
      
      // Check if we can auto-populate from historical data
      let canAuto = false;
      for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const previous = sorted[i - 1];
        
        // Check if previous quarter data is missing
        if (!current.prev_revenue && previous.revenue) {
          canAuto = true;
          break;
        }
      }
      
      if (canAuto) {
        console.log(`✅ ${symbol}: ${sorted.length} quarters - CAN auto-populate from history`);
        canAutoPopulate++;
      } else {
        console.log(`📊 ${symbol}: ${sorted.length} quarters - already has comparison data`);
      }
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 SUMMARY:");
  console.log(`   Total stocks: ${stockMap.size}`);
  console.log(`   Stocks with multiple quarters: ${stocksWithMultipleQuarters}`);
  console.log(`   Stocks with single quarter: ${stocksWithSingleQuarter}`);
  console.log(`   Can auto-populate from history: ${canAutoPopulate}`);
  console.log(`   Need manual data entry: ${needsManualData}`);
  
  console.log("\n💡 RECOMMENDATION:");
  console.log("   1. Run auto-population script for stocks with multiple quarters");
  console.log("   2. For new stocks, add quarters sequentially (oldest to newest)");
  console.log("   3. System will auto-link quarters as they're added");
  
  process.exit(0);
}

analyzeQuarterlyData().catch(console.error);
