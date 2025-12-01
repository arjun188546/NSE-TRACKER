import { ScreenerScraper } from './services/web-scrapers/screener-scraper';
import { supabase } from './supabase-storage';
import * as fs from 'fs';
import * as path from 'path';

interface StockFromCSV {
  symbol: string;
  name: string;
}

async function readStocksFromCSV(csvPath: string): Promise<StockFromCSV[]> {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    const [symbol, name] = line.split(',').map(s => s.trim());
    return { symbol, name };
  });
}

async function getOrCreateStock(symbol: string, name: string) {
  const { data: existing } = await supabase
    .from('stocks')
    .select('id')
    .eq('symbol', symbol)
    .single();

  if (existing) {
    return existing.id;
  }

  const { data: newStock, error } = await supabase
    .from('stocks')
    .insert({
      symbol,
      name,
      sector: 'Unknown',
      current_price: 0,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create stock ${symbol}: ${error.message}`);
  }

  return newStock!.id;
}

async function saveQuarterlyData(stockId: number, data: any) {
  const { data: existing } = await supabase
    .from('quarterly_results')
    .select('id')
    .eq('stock_id', stockId)
    .eq('quarter', data.quarter)
    .eq('fiscal_year', data.fiscalYear)
    .single();

  if (existing) {
    return false; // Already exists
  }

  const operatingMargin = data.operatingProfit && data.revenue 
    ? (data.operatingProfit / data.revenue) * 100 
    : 0;

  const { error } = await supabase
    .from('quarterly_results')
    .insert({
      stock_id: stockId,
      quarter: data.quarter,
      fiscal_year: data.fiscalYear,
      revenue: data.revenue,
      profit: data.profit,
      eps: data.eps,
      operating_profit: data.operatingProfit,
      operating_profit_margin: operatingMargin,
    });

  return !error;
}

async function processStock(symbol: string, name: string, index: number, total: number) {
  console.log(`\n[${index + 1}/${total}] Processing ${symbol} (${name})...`);

  try {
    const stockId = await getOrCreateStock(symbol, name);
    
    const scraper = new ScreenerScraper();
    const data = await scraper.getQuarterlyResults(symbol);

    if (data.length === 0) {
      console.log(`  ⚠️  No data found`);
      return { success: false, quarters: 0 };
    }

    // Filter out Q2 FY2526 (will get from PDF separately)
    const historicalData = data.filter(
      q => !(q.quarter === 'Q2' && q.fiscalYear === 'FY2526')
    );

    let savedCount = 0;
    for (const quarter of historicalData) {
      const saved = await saveQuarterlyData(stockId, quarter);
      if (saved) savedCount++;
    }

    console.log(`  ✓ Saved ${savedCount}/${historicalData.length} quarters`);
    return { success: true, quarters: savedCount };

  } catch (error) {
    console.error(`  ✗ Error: ${error}`);
    return { success: false, quarters: 0 };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('\n❌ Please provide CSV file path');
    console.log('\nUsage: npx tsx server/fetch-from-csv.ts <csv-file>');
    console.log('\nExample: npx tsx server/fetch-from-csv.ts nifty-500.csv');
    console.log('\nCSV Format:');
    console.log('Symbol,Name');
    console.log('TCS,Tata Consultancy Services');
    console.log('INFY,Infosys\n');
    process.exit(1);
  }

  const csvPath = args[0];
  
  if (!fs.existsSync(csvPath)) {
    console.log(`\n❌ File not found: ${csvPath}\n`);
    process.exit(1);
  }

  console.log('\n🚀 CSV-Based Quarterly Data Fetcher\n');
  console.log(`Reading from: ${csvPath}`);

  const stocks = await readStocksFromCSV(csvPath);
  console.log(`Found ${stocks.length} stocks in CSV\n`);

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  let totalQuarters = 0;

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    const result = await processStock(stock.symbol, stock.name, i, stocks.length);
    
    if (result.success) {
      successCount++;
      totalQuarters += result.quarters;
    } else {
      failCount++;
    }

    // Rate limiting: 2 seconds between requests
    if (i < stocks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total stocks in CSV: ${stocks.length}`);
  console.log(`Successfully processed: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total quarters saved: ${totalQuarters}`);
  console.log(`Duration: ${duration} minutes`);
  console.log('\n✨ Next step: npx tsx server/auto-populate-all-comparisons.ts\n');
}

main().catch(console.error);
