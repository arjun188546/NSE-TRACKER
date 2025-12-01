import { supabase } from "./supabase-storage.js";

/**
 * AUTO-POPULATION STRATEGY FOR 2000+ STOCKS
 * 
 * This script intelligently links quarterly results:
 * 1. Finds quarters with missing prev/year-ago data
 * 2. Automatically matches with historical quarters from the same stock
 * 3. Updates with calculated comparisons
 * 
 * Works for ANY number of stocks - designed for scale!
 */

interface QuarterData {
  id: string;
  stock_id: string;
  quarter: string;
  fiscal_year: string;
  revenue: number;
  profit: number;
  eps: number;
  operating_profit: number;
  operating_profit_margin: number | null;
  published_at: string;
  [key: string]: any;
}

// Helper to parse fiscal year (FY2526 -> 2025)
function parseFiscalYear(fy: string): number {
  const match = fy.match(/FY(\d{2})(\d{2})/);
  if (!match) return 0;
  return 2000 + parseInt(match[1]);
}

// Helper to get previous quarter
function getPrevQuarter(quarter: string, fiscalYear: string): { quarter: string; fiscalYear: string } {
  const q = parseInt(quarter.replace('Q', ''));
  if (q === 1) {
    // Q1 -> previous Q4 of previous fiscal year
    const year = parseFiscalYear(fiscalYear);
    return { quarter: 'Q4', fiscalYear: `FY${(year - 1 - 2000).toString().padStart(2, '0')}${(year - 2000).toString().padStart(2, '0')}` };
  }
  return { quarter: `Q${q - 1}`, fiscalYear };
}

// Helper to get year-ago quarter
function getYearAgoQuarter(quarter: string, fiscalYear: string): { quarter: string; fiscalYear: string } {
  const year = parseFiscalYear(fiscalYear);
  return { quarter, fiscalYear: `FY${(year - 1 - 2000).toString().padStart(2, '0')}${(year - 2000).toString().padStart(2, '0')}` };
}

async function autoPopulateQuarterlyComparisons() {
  console.log("🚀 AUTO-POPULATING QUARTERLY COMPARISONS FOR ALL STOCKS\n");
  console.log("=".repeat(80));
  console.log("This works for any number of stocks - from 10 to 2000+!");
  console.log("=".repeat(80) + "\n");
  
  // Get all quarterly results
  const { data: allResults, error } = await supabase
    .from('quarterly_results')
    .select('*')
    .order('stock_id, published_at');
  
  if (error || !allResults) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
  
  // Group by stock
  const stockMap = new Map<string, QuarterData[]>();
  for (const result of allResults) {
    if (!stockMap.has(result.stock_id)) {
      stockMap.set(result.stock_id, []);
    }
    stockMap.get(result.stock_id)!.push(result as QuarterData);
  }
  
  let totalUpdated = 0;
  let totalProcessed = 0;
  
  for (const [stockId, quarters] of stockMap.entries()) {
    // Get stock info
    const { data: stock } = await supabase
      .from('stocks')
      .select('symbol')
      .eq('id', stockId)
      .single();
    
    const symbol = stock?.symbol || 'Unknown';
    console.log(`\n📈 Processing ${symbol} (${quarters.length} quarters)...`);
    
    // Create a map for quick lookup: "Q2_FY2526" -> quarter data
    const quarterMap = new Map<string, QuarterData>();
    for (const q of quarters) {
      const key = `${q.quarter}_${q.fiscal_year}`;
      quarterMap.set(key, q);
    }
    
    for (const current of quarters) {
      totalProcessed++;
      let needsUpdate = false;
      const updates: any = {};
      
      // Find previous quarter
      const prevInfo = getPrevQuarter(current.quarter, current.fiscal_year);
      const prevKey = `${prevInfo.quarter}_${prevInfo.fiscalYear}`;
      const prevQuarter = quarterMap.get(prevKey);
      
      if (prevQuarter && !current.prev_revenue) {
        updates.prev_revenue = prevQuarter.revenue;
        updates.prev_profit = prevQuarter.profit;
        updates.prev_eps = prevQuarter.eps;
        updates.prev_operating_profit = prevQuarter.operating_profit;
        
        const prevOPM = prevQuarter.operating_profit_margin || 
          (prevQuarter.revenue ? parseFloat(((prevQuarter.operating_profit / prevQuarter.revenue) * 100).toFixed(2)) : null);
        updates.prev_operating_profit_margin = prevOPM;
        needsUpdate = true;
      }
      
      // Find year-ago quarter
      const yearAgoInfo = getYearAgoQuarter(current.quarter, current.fiscal_year);
      const yearAgoKey = `${yearAgoInfo.quarter}_${yearAgoInfo.fiscalYear}`;
      const yearAgoQuarter = quarterMap.get(yearAgoKey);
      
      if (yearAgoQuarter && !current.year_ago_revenue) {
        updates.year_ago_revenue = yearAgoQuarter.revenue;
        updates.year_ago_profit = yearAgoQuarter.profit;
        updates.year_ago_eps = yearAgoQuarter.eps;
        updates.year_ago_operating_profit = yearAgoQuarter.operating_profit;
        
        const yearAgoOPM = yearAgoQuarter.operating_profit_margin || 
          (yearAgoQuarter.revenue ? parseFloat(((yearAgoQuarter.operating_profit / yearAgoQuarter.revenue) * 100).toFixed(2)) : null);
        updates.year_ago_operating_profit_margin = yearAgoOPM;
        needsUpdate = true;
      }
      
      // Calculate growth percentages if we have comparison data
      if (needsUpdate || current.prev_revenue || current.year_ago_revenue) {
        const currentOPM = current.operating_profit_margin || 
          parseFloat(((current.operating_profit / current.revenue) * 100).toFixed(2));
        
        updates.operating_profit_margin = currentOPM;
        
        // QoQ calculations
        const prevRev = updates.prev_revenue || current.prev_revenue;
        if (prevRev) {
          updates.revenue_qoq = parseFloat((((current.revenue - prevRev) / prevRev) * 100).toFixed(2));
          updates.profit_qoq = parseFloat((((current.profit - (updates.prev_profit || current.prev_profit)) / (updates.prev_profit || current.prev_profit)) * 100).toFixed(2));
          updates.eps_qoq = parseFloat((((current.eps - (updates.prev_eps || current.prev_eps)) / (updates.prev_eps || current.prev_eps)) * 100).toFixed(2));
          updates.operating_profit_qoq = parseFloat((((current.operating_profit - (updates.prev_operating_profit || current.prev_operating_profit)) / (updates.prev_operating_profit || current.prev_operating_profit)) * 100).toFixed(2));
          
          const prevOPM = updates.prev_operating_profit_margin || current.prev_operating_profit_margin;
          if (prevOPM) {
            updates.operating_profit_margin_qoq = parseFloat((currentOPM - prevOPM).toFixed(2));
          }
          needsUpdate = true;
        }
        
        // YoY calculations
        const yearAgoRev = updates.year_ago_revenue || current.year_ago_revenue;
        if (yearAgoRev) {
          updates.revenue_yoy = parseFloat((((current.revenue - yearAgoRev) / yearAgoRev) * 100).toFixed(2));
          updates.profit_yoy = parseFloat((((current.profit - (updates.year_ago_profit || current.year_ago_profit)) / (updates.year_ago_profit || current.year_ago_profit)) * 100).toFixed(2));
          updates.eps_yoy = parseFloat((((current.eps - (updates.year_ago_eps || current.year_ago_eps)) / (updates.year_ago_eps || current.year_ago_eps)) * 100).toFixed(2));
          updates.operating_profit_yoy = parseFloat((((current.operating_profit - (updates.year_ago_operating_profit || current.year_ago_operating_profit)) / (updates.year_ago_operating_profit || current.year_ago_operating_profit)) * 100).toFixed(2));
          
          const yearAgoOPM = updates.year_ago_operating_profit_margin || current.year_ago_operating_profit_margin;
          if (yearAgoOPM) {
            updates.operating_profit_margin_yoy = parseFloat((currentOPM - yearAgoOPM).toFixed(2));
          }
          needsUpdate = true;
        }
      }
      
      // Update if needed
      if (needsUpdate && Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('quarterly_results')
          .update(updates)
          .eq('id', current.id);
        
        if (updateError) {
          console.log(`   ❌ Error updating ${current.quarter} ${current.fiscal_year}`);
        } else {
          console.log(`   ✅ Updated ${current.quarter} ${current.fiscal_year} with ${Object.keys(updates).length} fields`);
          totalUpdated++;
        }
      }
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 FINAL SUMMARY:");
  console.log(`   Total stocks processed: ${stockMap.size}`);
  console.log(`   Total quarters processed: ${totalProcessed}`);
  console.log(`   Quarters updated: ${totalUpdated}`);
  console.log(`   Quarters skipped (no changes): ${totalProcessed - totalUpdated}`);
  console.log("\n✅ AUTO-POPULATION COMPLETE!");
  console.log("\n💡 For new stocks: Just add quarters chronologically (oldest to newest)");
  console.log("   and this script will automatically link them!");
  
  process.exit(0);
}

autoPopulateQuarterlyComparisons().catch(console.error);
