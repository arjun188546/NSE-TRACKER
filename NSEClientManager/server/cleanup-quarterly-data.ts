import { supabase } from "./supabase-storage.js";

/**
 * DATA CLEANUP AND VALIDATION
 * 
 * This script identifies and optionally removes invalid quarterly data
 */

async function cleanupQuarterlyData() {
  console.log("🧹 QUARTERLY DATA CLEANUP\n");
  console.log("=".repeat(80));
  
  const { data: allResults } = await supabase
    .from('quarterly_results')
    .select('*, stock:stocks(symbol)');
  
  if (!allResults) {
    console.log("No data found");
    process.exit(1);
  }
  
  const issues: any[] = [];
  
  for (const result of allResults) {
    const symbol = result.stock?.symbol || 'Unknown';
    const problems: string[] = [];
    
    // Check for missing required fields
    if (!result.revenue || result.revenue === 0) problems.push("Missing/zero revenue");
    if (!result.profit || result.profit === 0) problems.push("Missing/zero profit");
    if (!result.eps || result.eps === 0) problems.push("Missing/zero EPS");
    if (!result.operating_profit) problems.push("Missing operating profit");
    
    // Check for invalid fiscal year format
    if (!result.fiscal_year || !result.fiscal_year.match(/^FY\d{4}$/)) {
      problems.push(`Invalid fiscal year: ${result.fiscal_year}`);
    }
    
    // Check for invalid quarter
    if (!result.quarter || !result.quarter.match(/^Q[1-4]$/)) {
      problems.push(`Invalid quarter: ${result.quarter}`);
    }
    
    if (problems.length > 0) {
      issues.push({
        id: result.id,
        symbol,
        quarter: result.quarter,
        fiscalYear: result.fiscal_year,
        problems,
      });
    }
  }
  
  console.log(`\nFound ${issues.length} problematic records:\n`);
  
  for (const issue of issues) {
    console.log(`❌ ${issue.symbol} - ${issue.quarter} ${issue.fiscalYear}`);
    for (const problem of issue.problems) {
      console.log(`   • ${problem}`);
    }
  }
  
  if (issues.length === 0) {
    console.log("✅ All quarterly data is valid!");
    process.exit(0);
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("\n🔧 RECOMMENDED ACTIONS:");
  console.log("\n1. DELETE INVALID DATA:");
  console.log("   These appear to be test/dummy records that should be removed.");
  console.log("\n2. TO DELETE, run:");
  console.log("   npx tsx server/delete-invalid-quarterly-data.ts");
  console.log("\n3. THEN RE-ADD with real data from screener.in");
  
  process.exit(0);
}

cleanupQuarterlyData().catch(console.error);
