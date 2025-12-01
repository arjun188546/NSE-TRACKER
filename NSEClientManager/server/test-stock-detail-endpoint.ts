import { SupabaseStorage } from "./supabase-storage.js";

async function testStockDetailEndpoint() {
  const storage = new SupabaseStorage();
  
  console.log("Testing getStockDetail for TCS...\n");
  const stockDetail = await storage.getStockDetail("TCS");
  
  if (!stockDetail) {
    console.log("❌ Stock detail not found!");
    return;
  }

  console.log("✅ Stock detail found!");
  console.log("\nStock Info:");
  console.log("  Symbol:", stockDetail.symbol);
  console.log("  Company:", stockDetail.companyName);
  
  console.log("\n📊 Results object:");
  if (stockDetail.results) {
    console.log("  Quarter:", stockDetail.results.quarter);
    console.log("  Fiscal Year:", stockDetail.results.fiscalYear);
    console.log("  Revenue:", stockDetail.results.revenue);
    console.log("  Profit:", stockDetail.results.profit);
    console.log("  EPS:", stockDetail.results.eps);
    console.log("  Operating Profit:", stockDetail.results.operatingProfit);
    console.log("  Operating Profit Margin:", stockDetail.results.operatingProfitMargin);
    console.log("\n  Growth Percentages:");
    console.log("    revenueQoQ:", stockDetail.results.revenueQoQ);
    console.log("    profitQoQ:", stockDetail.results.profitQoQ);
    console.log("    epsQoQ:", stockDetail.results.epsQoQ);
    console.log("    operatingProfitQoQ:", stockDetail.results.operatingProfitQoQ);
    console.log("    operatingProfitMarginQoQ:", stockDetail.results.operatingProfitMarginQoQ);
    console.log("\n    revenueYoY:", stockDetail.results.revenueYoY);
    console.log("    profitYoY:", stockDetail.results.profitYoY);
    console.log("    epsYoY:", stockDetail.results.epsYoY);
    console.log("    operatingProfitYoY:", stockDetail.results.operatingProfitYoY);
    console.log("    operatingProfitMarginYoY:", stockDetail.results.operatingProfitMarginYoY);
    
    console.log("\n  Historical Data:");
    console.log("    prevRevenue:", stockDetail.results.prevRevenue);
    console.log("    prevProfit:", stockDetail.results.prevProfit);
    console.log("    prevEps:", stockDetail.results.prevEps);
    console.log("    prevOperatingProfit:", stockDetail.results.prevOperatingProfit);
    
    console.log("\n    yearAgoRevenue:", stockDetail.results.yearAgoRevenue);
    console.log("    yearAgoProfit:", stockDetail.results.yearAgoProfit);
    console.log("    yearAgoEps:", stockDetail.results.yearAgoEps);
    console.log("    yearAgoOperatingProfit:", stockDetail.results.yearAgoOperatingProfit);
  } else {
    console.log("  ❌ No results found!");
  }
  
  console.log("\n\n📄 Full JSON response:");
  console.log(JSON.stringify(stockDetail.results, null, 2));
  
  process.exit(0);
}

testStockDetailEndpoint().catch(console.error);
