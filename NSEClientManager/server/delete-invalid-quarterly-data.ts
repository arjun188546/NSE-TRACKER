import { supabase } from "./supabase-storage.js";

async function deleteInvalidQuarterlyData() {
  console.log("🗑️  DELETING INVALID QUARTERLY DATA\n");
  console.log("=".repeat(80));
  
  // Get all results
  const { data: allResults } = await supabase
    .from('quarterly_results')
    .select('*, stock:stocks(symbol)');
  
  if (!allResults) {
    console.log("No data found");
    process.exit(1);
  }
  
  const toDelete: string[] = [];
  
  for (const result of allResults) {
    const symbol = result.stock?.symbol || 'Unknown';
    let isInvalid = false;
    
    // Check for invalid fiscal year format (should be FY2526, FY2425, etc.)
    if (!result.fiscal_year || !result.fiscal_year.match(/^FY\d{4}$/)) {
      isInvalid = true;
    }
    
    // Check for invalid quarter
    if (!result.quarter || !result.quarter.match(/^Q[1-4]$/)) {
      isInvalid = true;
    }
    
    // Check for missing critical fields
    if (!result.revenue || !result.profit || !result.eps) {
      isInvalid = true;
    }
    
    if (isInvalid) {
      toDelete.push(result.id);
      console.log(`   🗑️  Marking for deletion: ${symbol} ${result.quarter} ${result.fiscal_year}`);
    }
  }
  
  console.log(`\nFound ${toDelete.length} invalid records to delete\n`);
  
  if (toDelete.length === 0) {
    console.log("✅ No invalid data to delete!");
    process.exit(0);
  }
  
  console.log("Deleting...\n");
  
  // Delete in batches
  for (const id of toDelete) {
    const { error } = await supabase
      .from('quarterly_results')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.log(`   ❌ Error deleting ${id}: ${error.message}`);
    } else {
      console.log(`   ✅ Deleted ${id}`);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log(`\n✅ Deleted ${toDelete.length} invalid records!`);
  console.log("\n💡 Next steps:");
  console.log("   1. Add real quarterly data from screener.in");
  console.log("   2. Use format: FY2526 for fiscal year, Q1/Q2/Q3/Q4 for quarter");
  console.log("   3. Ensure all fields are filled: revenue, profit, eps, operating_profit");
  console.log("   4. Then run: npx tsx server/auto-populate-all-comparisons.ts");
  
  process.exit(0);
}

deleteInvalidQuarterlyData().catch(console.error);
