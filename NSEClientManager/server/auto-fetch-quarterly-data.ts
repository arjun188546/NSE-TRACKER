import { ScreenerScraper } from './services/web-scrapers/screener-scraper';
import { MoneyControlScraper } from './services/web-scrapers/moneycontrol-scraper';
import { GenericResultsParser } from './services/pdf-parser/generic-results-parser';
import { supabase } from './supabase-storage';
import * as path from 'path';
import * as fs from 'fs';

interface StockConfig {
  symbol: string;
  name: string;
  moneyControlId?: string;
  pdfPath?: string; // Path to Q2 PDF for verification
}

// Configuration for stocks to fetch
const STOCKS_TO_FETCH: StockConfig[] = [
  { 
    symbol: 'TCS', 
    name: 'Tata Consultancy Services',
    moneyControlId: 'TCS',
    pdfPath: 'path/to/tcs-q2-fy2526.pdf' // Optional: for Q2 verification
  },
  { 
    symbol: 'INFY', 
    name: 'Infosys',
    moneyControlId: 'IT',
  },
  { 
    symbol: 'RELIANCE', 
    name: 'Reliance Industries',
    moneyControlId: 'RI',
  },
  { 
    symbol: 'HDFCBANK', 
    name: 'HDFC Bank',
    moneyControlId: 'HDF01',
  },
  { 
    symbol: 'ICICIBANK', 
    name: 'ICICI Bank',
    moneyControlId: 'ICI02',
  },
  { 
    symbol: 'BHARTIARTL', 
    name: 'Bharti Airtel',
    moneyControlId: 'BA15',
  },
  { 
    symbol: 'ITC', 
    name: 'ITC Limited',
    moneyControlId: 'ITC',
  },
  { 
    symbol: 'KOTAKBANK', 
    name: 'Kotak Mahindra Bank',
    moneyControlId: 'KMB',
  },
  { 
    symbol: 'AXISBANK', 
    name: 'Axis Bank',
    moneyControlId: 'AB16',
  },
  { 
    symbol: 'WIPRO', 
    name: 'Wipro',
    moneyControlId: 'W',
  },
];

async function getOrCreateStock(symbol: string, name: string) {
  // Check if stock exists
  const { data: existing } = await supabase
    .from('stocks')
    .select('id')
    .eq('symbol', symbol)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new stock
  const { data: newStock, error } = await supabase
    .from('stocks')
    .insert({
      symbol,
      name,
      sector: 'Technology', // Default, update as needed
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
  // Check if data already exists
  const { data: existing } = await supabase
    .from('quarterly_results')
    .select('id')
    .eq('stock_id', stockId)
    .eq('quarter', data.quarter)
    .eq('fiscal_year', data.fiscalYear)
    .single();

  if (existing) {
    console.log(`  ✓ Quarter ${data.quarter} ${data.fiscalYear} already exists, skipping`);
    return;
  }

  // Calculate operating margin if not provided
  const operatingMargin = data.operatingProfitMargin || 
    (data.operatingProfit && data.revenue ? (data.operatingProfit / data.revenue) * 100 : 0);

  // Insert new data
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

  if (error) {
    console.error(`  ✗ Failed to save ${data.quarter} ${data.fiscalYear}:`, error.message);
  } else {
    console.log(`  ✓ Saved ${data.quarter} ${data.fiscalYear}: Revenue=${data.revenue}, Profit=${data.profit}, EPS=${data.eps}`);
  }
}

async function fetchAndSaveStock(config: StockConfig) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${config.name} (${config.symbol})`);
  console.log('='.repeat(60));

  try {
    // Get or create stock
    const stockId = await getOrCreateStock(config.symbol, config.name);
    console.log(`Stock ID: ${stockId}`);

    // 1. Fetch from Screener (primary source)
    console.log('\n📊 Fetching from Screener.in...');
    const screenerScraper = new ScreenerScraper();
    const screenerData = await screenerScraper.getQuarterlyResults(config.symbol);

    if (screenerData.length > 0) {
      console.log(`Found ${screenerData.length} quarters from Screener`);
      
      // Filter out Q2 FY2526 (current quarter - will get from PDF)
      const historicalData = screenerData.filter(
        q => !(q.quarter === 'Q2' && q.fiscalYear === 'FY2526')
      );

      console.log(`Saving ${historicalData.length} historical quarters (excluding Q2 FY2526)...`);
      for (const data of historicalData) {
        await saveQuarterlyData(stockId, data);
      }
    } else {
      console.log('⚠️  No data found on Screener, trying MoneyControl...');
      
      // 2. Fallback to MoneyControl
      if (config.moneyControlId) {
        const mcScraper = new MoneyControlScraper();
        const mcData = await mcScraper.getQuarterlyResults(config.symbol, config.moneyControlId);
        
        if (mcData.length > 0) {
          console.log(`Found ${mcData.length} quarters from MoneyControl`);
          const historicalData = mcData.filter(
            q => !(q.quarter === 'Q2' && q.fiscalYear === 'FY2526')
          );

          for (const data of historicalData) {
            await saveQuarterlyData(stockId, data);
          }
        }
      }
    }

    // 3. Parse PDF for Q2 FY2526 (if provided)
    if (config.pdfPath && fs.existsSync(config.pdfPath)) {
      console.log('\n📄 Parsing PDF for Q2 FY2526...');
      const parser = new GenericResultsParser();
      const pdfData = await parser.parsePDF(config.pdfPath);

      if (pdfData && pdfData.confidence >= 60) {
        console.log(`✓ PDF parsed with ${pdfData.confidence.toFixed(1)}% confidence`);
        await saveQuarterlyData(stockId, pdfData);
      } else {
        console.log('⚠️  PDF parsing failed or low confidence, skipping Q2 FY2526');
      }
    } else {
      console.log('\n⚠️  No PDF provided for Q2 FY2526 verification');
    }

    console.log(`\n✅ Completed: ${config.symbol}`);

  } catch (error) {
    console.error(`\n❌ Error processing ${config.symbol}:`, error);
  }
}

async function main() {
  console.log('\n🚀 Auto-Fetch Quarterly Data System\n');
  console.log('This script will:');
  console.log('1. Fetch historical data (up to Q1 FY2526) from Screener.in');
  console.log('2. Fallback to MoneyControl if Screener fails');
  console.log('3. Parse PDF for Q2 FY2526 verification (if provided)\n');

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (const stock of STOCKS_TO_FETCH) {
    try {
      await fetchAndSaveStock(stock);
      successCount++;
      
      // Rate limiting: wait 2 seconds between stocks to avoid being blocked
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      failCount++;
      console.error(`Failed to process ${stock.symbol}:`, error);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total stocks: ${STOCKS_TO_FETCH.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Duration: ${duration}s`);
  console.log('\n✨ Now run: npx tsx server/auto-populate-all-comparisons.ts');
  console.log('   to calculate all QoQ/YoY comparisons automatically\n');
}

main().catch(console.error);
