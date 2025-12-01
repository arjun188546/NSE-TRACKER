import { SupabaseStorage } from "./supabase-storage.js";
import { supabase } from "./supabase-storage.js";

/**
 * Recalculates and updates all quarterly results with complete comparison data
 * This will:
 * 1. Calculate missing operating profit margins for historical quarters
 * 2. Recalculate all QoQ and YoY growth percentages
 * 3. Update the database with complete data
 */

async function recalculateAllQuarterlyResults() {
  const storage = new SupabaseStorage();
  
  console.log("🔄 Recalculating All Quarterly Results...\n");
  console.log("=".repeat(80));
  
  // Fetch all quarterly results
  const { data: allResults, error } = await supabase
    .from('quarterly_results')
    .select('*')
    .order('published_at', { ascending: false });
  
  if (error || !allResults) {
    console.error("❌ Error fetching quarterly results:", error);
    process.exit(1);
  }
  
  console.log(`\nFound ${allResults.length} quarterly result records\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const result of allResults) {
    try {
      // Calculate operating profit margin
      const operatingProfitMargin = result.operating_profit_margin ?? 
        (result.revenue && result.operating_profit 
          ? parseFloat(((result.operating_profit / result.revenue) * 100).toFixed(2))
          : null);
      
      // Calculate previous quarter operating profit margin
      const prevOperatingProfitMargin = result.prev_revenue && result.prev_operating_profit
        ? parseFloat(((result.prev_operating_profit / result.prev_revenue) * 100).toFixed(2))
        : null;
      
      // Calculate year-ago operating profit margin
      const yearAgoOperatingProfitMargin = result.year_ago_revenue && result.year_ago_operating_profit
        ? parseFloat(((result.year_ago_operating_profit / result.year_ago_revenue) * 100).toFixed(2))
        : null;
      
      // Calculate QoQ growth percentages
      const revenueQoQ = result.prev_revenue
        ? parseFloat((((result.revenue - result.prev_revenue) / result.prev_revenue) * 100).toFixed(2))
        : result.revenue_qoq;
      
      const profitQoQ = result.prev_profit
        ? parseFloat((((result.profit - result.prev_profit) / result.prev_profit) * 100).toFixed(2))
        : result.profit_qoq;
      
      const epsQoQ = result.prev_eps
        ? parseFloat((((result.eps - result.prev_eps) / result.prev_eps) * 100).toFixed(2))
        : result.eps_qoq;
      
      const operatingProfitQoQ = result.prev_operating_profit
        ? parseFloat((((result.operating_profit - result.prev_operating_profit) / result.prev_operating_profit) * 100).toFixed(2))
        : result.operating_profit_qoq;
      
      const operatingProfitMarginQoQ = prevOperatingProfitMargin && operatingProfitMargin
        ? parseFloat((operatingProfitMargin - prevOperatingProfitMargin).toFixed(2))
        : result.operating_profit_margin_qoq;
      
      // Calculate YoY growth percentages
      const revenueYoY = result.year_ago_revenue
        ? parseFloat((((result.revenue - result.year_ago_revenue) / result.year_ago_revenue) * 100).toFixed(2))
        : result.revenue_yoy;
      
      const profitYoY = result.year_ago_profit
        ? parseFloat((((result.profit - result.year_ago_profit) / result.year_ago_profit) * 100).toFixed(2))
        : result.profit_yoy;
      
      const epsYoY = result.year_ago_eps
        ? parseFloat((((result.eps - result.year_ago_eps) / result.year_ago_eps) * 100).toFixed(2))
        : result.eps_yoy;
      
      const operatingProfitYoY = result.year_ago_operating_profit
        ? parseFloat((((result.operating_profit - result.year_ago_operating_profit) / result.year_ago_operating_profit) * 100).toFixed(2))
        : result.operating_profit_yoy;
      
      const operatingProfitMarginYoY = yearAgoOperatingProfitMargin && operatingProfitMargin
        ? parseFloat((operatingProfitMargin - yearAgoOperatingProfitMargin).toFixed(2))
        : result.operating_profit_margin_yoy;
      
      // Check if update is needed
      const needsUpdate = 
        prevOperatingProfitMargin !== result.prev_operating_profit_margin ||
        yearAgoOperatingProfitMargin !== result.year_ago_operating_profit_margin ||
        revenueQoQ !== result.revenue_qoq ||
        profitQoQ !== result.profit_qoq ||
        epsQoQ !== result.eps_qoq ||
        operatingProfitQoQ !== result.operating_profit_qoq ||
        operatingProfitMarginQoQ !== result.operating_profit_margin_qoq ||
        revenueYoY !== result.revenue_yoy ||
        profitYoY !== result.profit_yoy ||
        epsYoY !== result.eps_yoy ||
        operatingProfitYoY !== result.operating_profit_yoy ||
        operatingProfitMarginYoY !== result.operating_profit_margin_yoy;
      
      if (needsUpdate) {
        // Update the record
        const { error: updateError } = await supabase
          .from('quarterly_results')
          .update({
            operating_profit_margin: operatingProfitMargin,
            prev_operating_profit_margin: prevOperatingProfitMargin,
            year_ago_operating_profit_margin: yearAgoOperatingProfitMargin,
            revenue_qoq: revenueQoQ,
            profit_qoq: profitQoQ,
            eps_qoq: epsQoQ,
            operating_profit_qoq: operatingProfitQoQ,
            operating_profit_margin_qoq: operatingProfitMarginQoQ,
            revenue_yoy: revenueYoY,
            profit_yoy: profitYoY,
            eps_yoy: epsYoY,
            operating_profit_yoy: operatingProfitYoY,
            operating_profit_margin_yoy: operatingProfitMarginYoY,
          })
          .eq('id', result.id);
        
        if (updateError) {
          console.error(`❌ Error updating ${result.quarter} ${result.fiscal_year}:`, updateError.message);
        } else {
          console.log(`✅ Updated: ${result.quarter} ${result.fiscal_year} - Stock ID: ${result.stock_id.substring(0, 8)}...`);
          updated++;
        }
      } else {
        skipped++;
      }
    } catch (err: any) {
      console.error(`❌ Error processing result ${result.id}:`, err.message);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Total records: ${allResults.length}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (no changes needed): ${skipped}`);
  console.log(`\n✅ Recalculation complete!`);
  
  process.exit(0);
}

recalculateAllQuarterlyResults().catch(console.error);
