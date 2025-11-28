/**
 * Import Historical Quarterly Results for TCS
 * This will enable QoQ and YoY comparisons in the dashboard
 */

import { storage } from './storage';

async function importHistoricalResults() {
  console.log('='.repeat(60));
  console.log('Importing Historical Quarterly Results for TCS');
  console.log('='.repeat(60));
  console.log();

  try {
    // Get TCS stock
    const tcs = await storage.getStockBySymbol('TCS');
    if (!tcs) {
      console.error('❌ TCS stock not found in database');
      return;
    }

    console.log(`✅ Found TCS stock (ID: ${tcs.id})`);
    console.log();

    // Historical quarterly results for TCS
    // Source: TCS Investor Relations / NSE Archives
    const historicalResults = [
      {
        quarter: 'Q1',
        fiscalYear: 'FY2526',
        revenue: '63437', // ₹63,437 Cr
        profit: '12819', // ₹12,819 Cr
        eps: '35.27',
        operatingProfit: '16979',
        operatingProfitMargin: '26.75',
        patMargin: '20.20',
        description: 'Q1 FY 25-26 (Apr-Jun 2025)'
      },
      {
        quarter: 'Q2',
        fiscalYear: 'FY2425',
        revenue: '64259', // ₹64,259 Cr
        profit: '11955', // ₹11,955 Cr
        eps: '32.92',
        operatingProfit: '16032',
        operatingProfitMargin: '24.95',
        patMargin: '18.60',
        description: 'Q2 FY 24-25 (Jul-Sep 2024)'
      },
      {
        quarter: 'Q1',
        fiscalYear: 'FY2425',
        revenue: '62613', // ₹62,613 Cr
        profit: '12040', // ₹12,040 Cr
        eps: '33.18',
        operatingProfit: '15940',
        operatingProfitMargin: '25.45',
        patMargin: '19.23',
        description: 'Q1 FY 24-25 (Apr-Jun 2024)'
      },
      {
        quarter: 'Q4',
        fiscalYear: 'FY2324',
        revenue: '61237', // ₹61,237 Cr
        profit: '12434', // ₹12,434 Cr
        eps: '34.27',
        operatingProfit: '16522',
        operatingProfitMargin: '26.98',
        patMargin: '20.30',
        description: 'Q4 FY 23-24 (Jan-Mar 2024)'
      }
    ];

    console.log(`📊 Importing ${historicalResults.length} historical quarters...`);
    console.log();

    for (const result of historicalResults) {
      console.log(`  Processing ${result.description}...`);
      
      try {
        await storage.upsertQuarterlyResults({
          stockId: tcs.id,
          quarter: result.quarter,
          fiscalYear: result.fiscalYear,
          revenue: result.revenue,
          profit: result.profit,
          eps: result.eps,
          operatingProfit: result.operatingProfit,
          operatingProfitMargin: result.operatingProfitMargin,
          patMargin: result.patMargin,
        });
        
        console.log(`    ✅ ${result.quarter} ${result.fiscalYear} imported successfully`);
      } catch (error: any) {
        console.error(`    ❌ Failed: ${error.message}`);
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('✅ Historical data import completed!');
    console.log('='.repeat(60));
    console.log();
    console.log('📌 Next Steps:');
    console.log('  1. Refresh the dashboard to see Q2 FY 25-26 with comparisons');
    console.log('  2. QoQ comparison will use Q1 FY 25-26 data');
    console.log('  3. YoY comparison will use Q2 FY 24-25 data');
    console.log();

  } catch (error: any) {
    console.error();
    console.error('='.repeat(60));
    console.error('❌ Import failed!');
    console.error(`   Error: ${error.message}`);
    console.error('='.repeat(60));
    if (error.stack) {
      console.error();
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

importHistoricalResults();
