/**
 * QUARTERLY RESULTS MANAGEMENT GUIDE
 * 
 * This system automatically calculates all quarterly comparison data including:
 * - Operating profit margins for all quarters
 * - QoQ (Quarter-over-Quarter) growth percentages
 * - YoY (Year-over-Year) growth percentages
 * 
 * USAGE EXAMPLES:
 * ===============
 */

import { calculateQuarterlyComparisons, QuarterlyDataInput } from './utils/quarterly-calculations.js';

// Example 1: Adding a new quarterly result with minimal data
// The system will auto-calculate all growth percentages
async function addNewQuarterlyResult() {
  const data: QuarterlyDataInput = {
    stockId: "YOUR_STOCK_ID_HERE",
    quarter: "Q3",
    fiscalYear: "FY2526",
    
    // Required: Current quarter data
    revenue: 67000,
    profit: 12500,
    eps: 34.50,
    operatingProfit: 18200,
    // operatingProfitMargin: 27.16, // Optional - will be auto-calculated
    
    // Optional: Previous quarter data (for QoQ calculations)
    prevRevenue: 65799,
    prevProfit: 12131,
    prevEps: 33.37,
    prevOperatingProfit: 17978,
    
    // Optional: Year-ago data (for YoY calculations)
    yearAgoRevenue: 61237,
    yearAgoProfit: 12502,
    yearAgoEps: 34.37,
    yearAgoOperatingProfit: 17164,
  };
  
  const result = await calculateQuarterlyComparisons(data);
  console.log("✅ Added quarterly result with auto-calculated comparisons!");
  return result;
}

// Example 2: Using the recalculation script for bulk updates
// Run: npx tsx server/recalculate-all-quarterly-results.ts
// This will update ALL existing quarterly results with correct calculations

// Example 3: Adding data from screener.in
async function addFromScreener() {
  // Get data from screener.in quarterly results table
  const data: QuarterlyDataInput = {
    stockId: "658fe225-13ea-4014-8532-4cded564f416", // TCS
    quarter: "Q3",
    fiscalYear: "FY2526",
    
    // Copy values from screener columns
    revenue: 67000,        // Sales column
    profit: 12500,         // Net Profit column  
    eps: 34.50,            // EPS column
    operatingProfit: 18200, // Operating Profit column
    operatingProfitMargin: 27, // OPM % column (optional)
    
    // Previous quarter (one column to the left)
    prevRevenue: 65799,
    prevProfit: 12131,
    prevEps: 33.37,
    prevOperatingProfit: 17978,
    
    // Year ago quarter (same quarter, previous year)
    yearAgoRevenue: 59162,
    yearAgoProfit: 11436,
    yearAgoEps: 31.13,
    yearAgoOperatingProfit: 15774,
  };
  
  await calculateQuarterlyComparisons(data);
  console.log("✅ Added from screener data!");
}

// Example 4: Quick add with just current quarter data
async function addQuickQuarter() {
  // Minimal data - no comparisons will be calculated
  const data: QuarterlyDataInput = {
    stockId: "SOME_STOCK_ID",
    quarter: "Q1",
    fiscalYear: "FY2526",
    revenue: 50000,
    profit: 8000,
    eps: 25.50,
    operatingProfit: 13000,
  };
  
  await calculateQuarterlyComparisons(data);
}

export {
  addNewQuarterlyResult,
  addFromScreener,
  addQuickQuarter,
};

// To use in scripts:
// import { addNewQuarterlyResult } from './quarterly-results-usage-examples.js';
// await addNewQuarterlyResult();
