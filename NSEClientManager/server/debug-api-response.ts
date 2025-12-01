import { SupabaseStorage } from "./supabase-storage.js";

async function debugApiResponse() {
  const storage = new SupabaseStorage();
  
  console.log("Fetching TCS stock detail...\n");
  const stockDetail = await storage.getStockDetail("TCS");
  
  if (!stockDetail) {
    console.log("❌ Stock not found!");
    return;
  }

  console.log("Stock ID:", stockDetail.id);
  console.log("Symbol:", stockDetail.symbol);
  console.log("\nResults object:");
  console.log(JSON.stringify(stockDetail.results, null, 2));
  
  process.exit(0);
}

debugApiResponse().catch(console.error);
