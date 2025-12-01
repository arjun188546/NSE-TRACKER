import { supabase } from "./supabase-storage.js";
import * as fs from 'fs';
import * as path from 'path';

/**
 * BULK IMPORT TEMPLATE FOR CSV/EXCEL DATA
 * 
 * Modify this template to match your CSV format from screener.in
 * 
 * CSV Format Expected:
 * Stock Symbol, Quarter, Fiscal Year, Revenue, Profit, EPS, Operating Profit
 * TCS,Q1,FY2425,50000,8000,25.00,13000
 * TCS,Q2,FY2425,52000,8500,26.00,13500
 * ...
 */

interface CSVRow {
  symbol: string;
  quarter: string;
  fiscalYear: string;
  revenue: number;
  profit: number;
  eps: number;
  operatingProfit: number;
}

async function bulkImportFromCSV(csvFilePath: string) {
  console.log("📂 BULK IMPORT FROM CSV\n");
  console.log("=".repeat(80));
  
  // Read CSV file
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  console.log(`\nFound ${lines.length - 1} rows in CSV\n`);
  
  let imported = 0;
  let errors = 0;
  const stockCache = new Map<string, string>(); // symbol -> stock_id
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    const symbol = values[0].trim();
    const quarter = values[1].trim();
    const fiscalYear = values[2].trim();
    const revenue = parseFloat(values[3]);
    const profit = parseFloat(values[4]);
    const eps = parseFloat(values[5]);
    const operatingProfit = parseFloat(values[6]);
    
    try {
      // Get stock_id (with caching)
      let stockId = stockCache.get(symbol);
      if (!stockId) {
        const { data: stock } = await supabase
          .from('stocks')
          .select('id')
          .eq('symbol', symbol)
          .single();
        
        if (!stock) {
          console.log(`   ⚠️  Stock ${symbol} not found in database - skipping`);
          errors++;
          continue;
        }
        stockId = stock.id;
        stockCache.set(symbol, stockId);
      }
      
      // Insert quarterly result (raw data only)
      const { error } = await supabase
        .from('quarterly_results')
        .insert({
          stock_id: stockId,
          quarter,
          fiscal_year: fiscalYear,
          revenue,
          profit,
          eps,
          operating_profit: operatingProfit,
          published_at: new Date(),
        });
      
      if (error) {
        // Check if it's a duplicate
        if (error.code === '23505') {
          console.log(`   ⏭️  ${symbol} ${quarter} ${fiscalYear} already exists - skipping`);
        } else {
          console.log(`   ❌ Error importing ${symbol} ${quarter} ${fiscalYear}: ${error.message}`);
          errors++;
        }
      } else {
        console.log(`   ✅ Imported ${symbol} ${quarter} ${fiscalYear}`);
        imported++;
      }
    } catch (err: any) {
      console.log(`   ❌ Error processing row ${i}: ${err.message}`);
      errors++;
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 IMPORT SUMMARY:");
  console.log(`   Total rows processed: ${lines.length - 1}`);
  console.log(`   Successfully imported: ${imported}`);
  console.log(`   Errors/Skipped: ${errors}`);
  console.log(`   Unique stocks: ${stockCache.size}`);
  
  console.log("\n" + "=".repeat(80));
  console.log("\n🎯 NEXT STEP:");
  console.log("   Run: npx tsx server/auto-populate-all-comparisons.ts");
  console.log("   This will automatically calculate all comparisons!");
  
  process.exit(0);
}

// Usage: node bulk-import-csv.js path/to/your/data.csv
const csvFilePath = process.argv[2] || './quarterly-data.csv';

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ CSV file not found: ${csvFilePath}`);
  console.log("\nUsage: npx tsx server/bulk-import-csv.ts <path-to-csv-file>");
  console.log("\nCSV Format:");
  console.log("Stock Symbol, Quarter, Fiscal Year, Revenue, Profit, EPS, Operating Profit");
  console.log("TCS,Q1,FY2425,50000,8000,25.00,13000");
  process.exit(1);
}

bulkImportFromCSV(csvFilePath).catch(console.error);
