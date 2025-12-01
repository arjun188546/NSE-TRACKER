import { SupabaseStorage } from "./supabase-storage.js";

/**
 * Calculates and populates all missing quarterly comparison data for a stock
 * This includes:
 * - Previous quarter operating profit margin
 * - Year-ago operating profit margin
 * - All QoQ and YoY growth percentages
 */

interface QuarterlyDataInput {
  stockId: string;
  quarter: string;
  fiscalYear: string;
  
  // Current quarter data
  revenue: number;
  profit: number;
  eps: number;
  operatingProfit: number;
  operatingProfitMargin?: number;
  
  // Previous quarter data (Q-1)
  prevRevenue?: number;
  prevProfit?: number;
  prevEps?: number;
  prevOperatingProfit?: number;
  
  // Year ago data (same quarter, previous year)
  yearAgoRevenue?: number;
  yearAgoProfit?: number;
  yearAgoEps?: number;
  yearAgoOperatingProfit?: number;
  
  publishedAt?: Date;
}

async function calculateQuarterlyComparisons(data: QuarterlyDataInput) {
  const storage = new SupabaseStorage();
  
  // Calculate current operating profit margin if not provided
  const operatingProfitMargin = data.operatingProfitMargin ?? 
    parseFloat(((data.operatingProfit / data.revenue) * 100).toFixed(2));
  
  // Calculate previous quarter operating profit margin
  const prevOperatingProfitMargin = data.prevRevenue && data.prevOperatingProfit
    ? parseFloat(((data.prevOperatingProfit / data.prevRevenue) * 100).toFixed(2))
    : null;
  
  // Calculate year-ago operating profit margin
  const yearAgoOperatingProfitMargin = data.yearAgoRevenue && data.yearAgoOperatingProfit
    ? parseFloat(((data.yearAgoOperatingProfit / data.yearAgoRevenue) * 100).toFixed(2))
    : null;
  
  // Calculate QoQ growth percentages
  const revenueQoQ = data.prevRevenue
    ? parseFloat((((data.revenue - data.prevRevenue) / data.prevRevenue) * 100).toFixed(2))
    : null;
  
  const profitQoQ = data.prevProfit
    ? parseFloat((((data.profit - data.prevProfit) / data.prevProfit) * 100).toFixed(2))
    : null;
  
  const epsQoQ = data.prevEps
    ? parseFloat((((data.eps - data.prevEps) / data.prevEps) * 100).toFixed(2))
    : null;
  
  const operatingProfitQoQ = data.prevOperatingProfit
    ? parseFloat((((data.operatingProfit - data.prevOperatingProfit) / data.prevOperatingProfit) * 100).toFixed(2))
    : null;
  
  const operatingProfitMarginQoQ = prevOperatingProfitMargin
    ? parseFloat((operatingProfitMargin - prevOperatingProfitMargin).toFixed(2))
    : null;
  
  // Calculate YoY growth percentages
  const revenueYoY = data.yearAgoRevenue
    ? parseFloat((((data.revenue - data.yearAgoRevenue) / data.yearAgoRevenue) * 100).toFixed(2))
    : null;
  
  const profitYoY = data.yearAgoProfit
    ? parseFloat((((data.profit - data.yearAgoProfit) / data.yearAgoProfit) * 100).toFixed(2))
    : null;
  
  const epsYoY = data.yearAgoEps
    ? parseFloat((((data.eps - data.yearAgoEps) / data.yearAgoEps) * 100).toFixed(2))
    : null;
  
  const operatingProfitYoY = data.yearAgoOperatingProfit
    ? parseFloat((((data.operatingProfit - data.yearAgoOperatingProfit) / data.yearAgoOperatingProfit) * 100).toFixed(2))
    : null;
  
  const operatingProfitMarginYoY = yearAgoOperatingProfitMargin
    ? parseFloat((operatingProfitMargin - yearAgoOperatingProfitMargin).toFixed(2))
    : null;
  
  // Prepare complete data object
  const completeData = {
    stockId: data.stockId,
    quarter: data.quarter,
    fiscalYear: data.fiscalYear,
    
    // Current quarter
    revenue: data.revenue,
    profit: data.profit,
    eps: data.eps,
    operatingProfit: data.operatingProfit,
    operatingProfitMargin,
    
    // Previous quarter
    prevRevenue: data.prevRevenue ?? null,
    prevProfit: data.prevProfit ?? null,
    prevEps: data.prevEps ?? null,
    prevOperatingProfit: data.prevOperatingProfit ?? null,
    prevOperatingProfitMargin,
    
    // Year ago
    yearAgoRevenue: data.yearAgoRevenue ?? null,
    yearAgoProfit: data.yearAgoProfit ?? null,
    yearAgoEps: data.yearAgoEps ?? null,
    yearAgoOperatingProfit: data.yearAgoOperatingProfit ?? null,
    yearAgoOperatingProfitMargin,
    
    // QoQ growth
    revenueQoQ,
    profitQoQ,
    epsQoQ,
    operatingProfitQoQ,
    operatingProfitMarginQoQ,
    
    // YoY growth
    revenueYoY,
    profitYoY,
    epsYoY,
    operatingProfitYoY,
    operatingProfitMarginYoY,
    
    publishedAt: data.publishedAt ?? new Date(),
  };
  
  // Upsert to database
  await storage.upsertQuarterlyResults(completeData);
  
  return completeData;
}

// Example usage and test
async function testCalculations() {
  console.log("Testing Quarterly Comparisons Calculation Engine\n");
  console.log("=".repeat(80));
  
  // TCS Q2 FY2526 example
  const tcsQ2Data: QuarterlyDataInput = {
    stockId: "658fe225-13ea-4014-8532-4cded564f416",
    quarter: "Q2",
    fiscalYear: "FY2526",
    
    // Current quarter (Sep 2025)
    revenue: 65799,
    profit: 12131,
    eps: 33.37,
    operatingProfit: 17978,
    operatingProfitMargin: 27,
    
    // Previous quarter (Jun 2025 - Q1)
    prevRevenue: 63437,
    prevProfit: 12819,
    prevEps: 35.27,
    prevOperatingProfit: 16875,
    
    // Year ago (Sep 2024 - Q2 FY2425)
    yearAgoRevenue: 64259,
    yearAgoProfit: 11955,
    yearAgoEps: 32.92,
    yearAgoOperatingProfit: 16731,
    
    publishedAt: new Date('2025-11-28'),
  };
  
  const result = await calculateQuarterlyComparisons(tcsQ2Data);
  
  console.log("\n✅ Calculated and saved complete quarterly data:");
  console.log("\nCurrent Quarter:");
  console.log(`  Revenue: ₹${result.revenue} Cr`);
  console.log(`  Operating Profit: ₹${result.operatingProfit} Cr`);
  console.log(`  Operating Margin: ${result.operatingProfitMargin}%`);
  
  console.log("\nPrevious Quarter:");
  console.log(`  Revenue: ₹${result.prevRevenue} Cr`);
  console.log(`  Operating Profit: ₹${result.prevOperatingProfit} Cr`);
  console.log(`  Operating Margin: ${result.prevOperatingProfitMargin}%`);
  
  console.log("\nQoQ Growth:");
  console.log(`  Revenue: ${result.revenueQoQ}%`);
  console.log(`  Profit: ${result.profitQoQ}%`);
  console.log(`  Operating Profit: ${result.operatingProfitQoQ}%`);
  console.log(`  Operating Margin: ${result.operatingProfitMarginQoQ} pp`);
  
  console.log("\nYoY Growth:");
  console.log(`  Revenue: ${result.revenueYoY}%`);
  console.log(`  Profit: ${result.profitYoY}%`);
  console.log(`  Operating Profit: ${result.operatingProfitYoY}%`);
  console.log(`  Operating Margin: ${result.operatingProfitMarginYoY} pp`);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ Successfully calculated and stored all quarterly comparisons!");
  
  process.exit(0);
}

// Export for use in other scripts
export { calculateQuarterlyComparisons, QuarterlyDataInput };

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCalculations().catch(console.error);
}
