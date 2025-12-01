import { SupabaseStorage } from "./supabase-storage.js";

async function addMissingOperatingMargins() {
  const storage = new SupabaseStorage();
  
  console.log("Fetching TCS Q2 FY2526 data...\n");
  const stockId = "658fe225-13ea-4014-8532-4cded564f416";
  const results = await storage.getQuarterlyResultsByQuarter(stockId, "Q2", "FY2526");
  
  if (!results) {
    console.log("❌ Results not found!");
    process.exit(1);
  }

  console.log("Current Q2 FY2526:");
  console.log("  Revenue:", results.revenue);
  console.log("  Operating Profit:", results.operatingProfit);
  console.log("  Operating Profit Margin:", results.operatingProfitMargin);
  
  console.log("\nPrevious Quarter (Q1 FY2526):");
  console.log("  Revenue:", results.prevRevenue);
  console.log("  Operating Profit:", results.prevOperatingProfit);
  
  // Calculate Q1 FY2526 Operating Margin
  const q1Margin = results.prevRevenue && results.prevOperatingProfit 
    ? ((results.prevOperatingProfit / results.prevRevenue) * 100).toFixed(2)
    : null;
  console.log("  Operating Profit Margin (calculated):", q1Margin + "%");
  
  console.log("\nYear Ago Quarter (Q2 FY2425):");
  console.log("  Revenue:", results.yearAgoRevenue);
  console.log("  Operating Profit:", results.yearAgoOperatingProfit);
  
  // Calculate Q2 FY2425 Operating Margin
  const q2LastYearMargin = results.yearAgoRevenue && results.yearAgoOperatingProfit
    ? ((results.yearAgoOperatingProfit / results.yearAgoRevenue) * 100).toFixed(2)
    : null;
  console.log("  Operating Profit Margin (calculated):", q2LastYearMargin + "%");
  
  console.log("\n" + "=".repeat(80));
  console.log("UPDATING DATABASE WITH CALCULATED MARGINS");
  console.log("=".repeat(80));
  
  // Update with new fields for historical operating margins
  const updateData = {
    stockId: results.stockId,
    quarter: results.quarter,
    fiscalYear: results.fiscalYear,
    revenue: results.revenue,
    profit: results.profit,
    eps: results.eps,
    operatingProfit: results.operatingProfit,
    operatingProfitMargin: results.operatingProfitMargin,
    patMargin: results.patMargin,
    
    // Previous quarter data
    prevRevenue: results.prevRevenue,
    prevProfit: results.prevProfit,
    prevEps: results.prevEps,
    prevOperatingProfit: results.prevOperatingProfit,
    prevOperatingProfitMargin: q1Margin ? parseFloat(q1Margin) : null,
    
    // Year ago data
    yearAgoRevenue: results.yearAgoRevenue,
    yearAgoProfit: results.yearAgoProfit,
    yearAgoEps: results.yearAgoEps,
    yearAgoOperatingProfit: results.yearAgoOperatingProfit,
    yearAgoOperatingProfitMargin: q2LastYearMargin ? parseFloat(q2LastYearMargin) : null,
    
    // QoQ changes
    revenueQoQ: results.revenueQoQ,
    profitQoQ: results.profitQoQ,
    epsQoQ: results.epsQoQ,
    operatingProfitQoQ: results.operatingProfitQoQ,
    operatingProfitMarginQoQ: results.operatingProfitMarginQoQ,
    
    // YoY changes
    revenueYoY: results.revenueYoY,
    profitYoY: results.profitYoY,
    epsYoY: results.epsYoY,
    operatingProfitYoY: results.operatingProfitYoY,
    operatingProfitMarginYoY: results.operatingProfitMarginYoY,
    
    publishedAt: results.publishedAt,
  };
  
  await storage.upsertQuarterlyResults(updateData);
  
  console.log("\n✅ Successfully updated operating profit margins!");
  console.log("  Q1 FY2526 Operating Margin:", q1Margin + "%");
  console.log("  Q2 FY2425 Operating Margin:", q2LastYearMargin + "%");
  
  process.exit(0);
}

addMissingOperatingMargins().catch(console.error);
