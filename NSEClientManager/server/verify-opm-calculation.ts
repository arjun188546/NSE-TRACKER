import { SupabaseStorage } from "./supabase-storage.js";

async function updateOperatingMargins() {
  const storage = new SupabaseStorage();
  
  const stockId = "658fe225-13ea-4014-8532-4cded564f416";
  const results = await storage.getQuarterlyResultsByQuarter(stockId, "Q2", "FY2526");
  
  if (!results) {
    console.log("❌ Results not found!");
    process.exit(1);
  }

  console.log("Screener Data Verification:");
  console.log("=".repeat(80));
  console.log("\nQ1 FY2526 (Jun 2025):");
  console.log("  Revenue: 63,437 Cr");
  console.log("  Operating Profit: 16,875 Cr");
  console.log("  Calculated OPM: " + ((16875/63437)*100).toFixed(2) + "%");
  console.log("  Screener shows: 27%");
  console.log("  Our stored value:", results.prevOperatingProfitMargin + "%");
  
  console.log("\nQ2 FY2526 (Sep 2025):");
  console.log("  Revenue: 65,799 Cr");
  console.log("  Operating Profit: 17,978 Cr");
  console.log("  Calculated OPM: " + ((17978/65799)*100).toFixed(2) + "%");
  console.log("  Screener shows: 27%");
  console.log("  Our stored value:", results.operatingProfitMargin + "%");
  
  console.log("\nQ2 FY2425 (Sep 2024):");
  console.log("  Revenue: 64,259 Cr");
  console.log("  Operating Profit: 16,731 Cr");
  console.log("  Calculated OPM: " + ((16731/64259)*100).toFixed(2) + "%");
  console.log("  Screener shows: 26%");
  console.log("  Our stored value:", results.yearAgoOperatingProfitMargin + "%");
  
  console.log("\n" + "=".repeat(80));
  console.log("CONCLUSION:");
  console.log("Screener rounds to nearest integer.");
  console.log("Our precise calculations are more accurate.");
  console.log("QoQ Growth: 27.33% - 26.60% = +0.73 percentage points");
  console.log("But if we round both to 27%, then QoQ = 0% (correct!)");
  
  process.exit(0);
}

updateOperatingMargins().catch(console.error);
