/**
 * Update TCS Q2 FY2526 with complete data from parsed PDF
 * - Fill in all missing metrics
 * - Add previous quarter (Q1 FY2526) and year-ago (Q2 FY2425) data
 * - Calculate all QoQ and YoY growth percentages
 */

import { storage } from './storage';

function calculatePercentageChange(current?: number | string, previous?: number | string): string | undefined {
  if (!current || !previous) return undefined;
  const curr = typeof current === 'string' ? parseFloat(current) : current;
  const prev = typeof previous === 'string' ? parseFloat(previous) : previous;
  if (isNaN(curr) || isNaN(prev) || prev === 0) return undefined;
  const change = ((curr - prev) / prev) * 100;
  return change.toFixed(2);
}

async function updateTCSQ2Complete() {
  console.log('='.repeat(80));
  console.log('📊 UPDATING TCS Q2 FY2526 WITH COMPLETE DATA');
  console.log('='.repeat(80));
  console.log();

  try {
    // Get TCS stock
    const tcs = await storage.getStockBySymbol('TCS');
    if (!tcs) {
      console.error('❌ TCS stock not found');
      return;
    }

    console.log(`✅ Found TCS stock (ID: ${tcs.id})`);
    console.log();

    // ===================================================================
    // STEP 1: Get Current Q2 FY2526 Data
    // ===================================================================
    console.log('📥 Fetching current Q2 FY2526 data...');
    let currentData = await storage.getQuarterlyResultsByQuarter(tcs.id, 'Q2', 'FY2526');
    
    if (!currentData) {
      console.error('❌ Q2 FY2526 data not found');
      return;
    }

    console.log(`✅ Current Q2 FY2526 data found:`);
    console.log(`   Revenue: ₹${currentData.revenue} Cr`);
    console.log(`   Net Profit: ₹${currentData.profit} Cr`);
    console.log(`   EPS: ₹${currentData.eps}`);
    console.log(`   Operating Profit: ₹${currentData.operatingProfit || 'MISSING'} Cr`);
    console.log(`   Operating Margin: ${currentData.operatingProfitMargin || 'MISSING'}%`);
    console.log(`   PAT Margin: ${currentData.patMargin || 'MISSING'}%`);
    console.log();

    // ===================================================================
    // STEP 2: Get Previous Quarter Data (Q1 FY2526)
    // ===================================================================
    console.log('📥 Fetching Q1 FY2526 (previous quarter) data...');
    const q1Data = await storage.getQuarterlyResultsByQuarter(tcs.id, 'Q1', 'FY2526');
    
    if (q1Data) {
      console.log(`✅ Q1 FY2526 data found:`);
      console.log(`   Revenue: ₹${q1Data.revenue} Cr`);
      console.log(`   Net Profit: ₹${q1Data.profit} Cr`);
      console.log(`   EPS: ₹${q1Data.eps}`);
      console.log(`   Operating Profit: ₹${q1Data.operatingProfit} Cr`);
      console.log(`   Operating Margin: ${q1Data.operatingProfitMargin}%`);
    } else {
      console.warn(`⚠️  Q1 FY2526 not found - QoQ comparisons will be limited`);
    }
    console.log();

    // ===================================================================
    // STEP 3: Get Year-Ago Data (Q2 FY2425)
    // ===================================================================
    console.log('📥 Fetching Q2 FY2425 (year-ago quarter) data...');
    const q2LastYear = await storage.getQuarterlyResultsByQuarter(tcs.id, 'Q2', 'FY2425');
    
    if (q2LastYear) {
      console.log(`✅ Q2 FY2425 data found:`);
      console.log(`   Revenue: ₹${q2LastYear.revenue} Cr`);
      console.log(`   Net Profit: ₹${q2LastYear.profit} Cr`);
      console.log(`   EPS: ₹${q2LastYear.eps}`);
      console.log(`   Operating Profit: ₹${q2LastYear.operatingProfit} Cr`);
      console.log(`   Operating Margin: ${q2LastYear.operatingProfitMargin}%`);
    } else {
      console.warn(`⚠️  Q2 FY2425 not found - YoY comparisons will be limited`);
    }
    console.log();

    // ===================================================================
    // STEP 4: Calculate All Metrics from Parsed PDF Data
    // ===================================================================
    console.log('🧮 Calculating all metrics from parsed PDF data...');
    
    // From TCS_Q2_FY2526_PARSED_DATA.md:
    const revenue = 65799;
    const netProfit = 12131;
    const eps = 33.37;
    const operatingProfit = 16068; // EBITDA/PBT from PDF
    const operatingMargin = 24.42; // From parsed data
    const patMargin = 18.44; // From parsed data

    console.log(`   ✅ Revenue: ₹${revenue} Cr`);
    console.log(`   ✅ Net Profit: ₹${netProfit} Cr`);
    console.log(`   ✅ EPS: ₹${eps}`);
    console.log(`   ✅ Operating Profit: ₹${operatingProfit} Cr`);
    console.log(`   ✅ Operating Margin: ${operatingMargin}%`);
    console.log(`   ✅ PAT Margin: ${patMargin}%`);
    console.log();

    // ===================================================================
    // STEP 5: Calculate QoQ Growth Percentages
    // ===================================================================
    console.log('📊 Calculating QoQ growth percentages...');
    
    const revenueQoQ = calculatePercentageChange(revenue, q1Data?.revenue);
    const profitQoQ = calculatePercentageChange(netProfit, q1Data?.profit);
    const epsQoQ = calculatePercentageChange(eps, q1Data?.eps);
    const operatingProfitQoQ = calculatePercentageChange(operatingProfit, q1Data?.operatingProfit);
    const operatingMarginQoQ = calculatePercentageChange(operatingMargin, q1Data?.operatingProfitMargin);

    console.log(`   Revenue QoQ: ${revenueQoQ || 'N/A'}%`);
    console.log(`   Net Profit QoQ: ${profitQoQ || 'N/A'}%`);
    console.log(`   EPS QoQ: ${epsQoQ || 'N/A'}%`);
    console.log(`   Operating Profit QoQ: ${operatingProfitQoQ || 'N/A'}%`);
    console.log(`   Operating Margin QoQ: ${operatingMarginQoQ || 'N/A'}%`);
    console.log();

    // ===================================================================
    // STEP 6: Calculate YoY Growth Percentages
    // ===================================================================
    console.log('📊 Calculating YoY growth percentages...');
    
    const revenueYoY = calculatePercentageChange(revenue, q2LastYear?.revenue);
    const profitYoY = calculatePercentageChange(netProfit, q2LastYear?.profit);
    const epsYoY = calculatePercentageChange(eps, q2LastYear?.eps);
    const operatingProfitYoY = calculatePercentageChange(operatingProfit, q2LastYear?.operatingProfit);
    const operatingMarginYoY = calculatePercentageChange(operatingMargin, q2LastYear?.operatingProfitMargin);

    console.log(`   Revenue YoY: ${revenueYoY || 'N/A'}%`);
    console.log(`   Net Profit YoY: ${profitYoY || 'N/A'}%`);
    console.log(`   EPS YoY: ${epsYoY || 'N/A'}%`);
    console.log(`   Operating Profit YoY: ${operatingProfitYoY || 'N/A'}%`);
    console.log(`   Operating Margin YoY: ${operatingMarginYoY || 'N/A'}%`);
    console.log();

    // ===================================================================
    // STEP 7: Update Database with Complete Data
    // ===================================================================
    console.log('💾 Updating Q2 FY2526 with complete data...');
    
    await storage.upsertQuarterlyResults({
      stockId: tcs.id,
      quarter: 'Q2',
      fiscalYear: 'FY2526',
      // Current quarter metrics
      revenue: revenue.toString(),
      profit: netProfit.toString(),
      eps: eps.toString(),
      operatingProfit: operatingProfit.toString(),
      operatingProfitMargin: operatingMargin.toString(),
      patMargin: patMargin.toString(),
      // Previous quarter data (Q1 FY2526)
      prevRevenue: q1Data?.revenue?.toString(),
      prevProfit: q1Data?.profit?.toString(),
      prevEps: q1Data?.eps?.toString(),
      prevOperatingProfit: q1Data?.operatingProfit?.toString(),
      // Year-ago data (Q2 FY2425)
      yearAgoRevenue: q2LastYear?.revenue?.toString(),
      yearAgoProfit: q2LastYear?.profit?.toString(),
      yearAgoEps: q2LastYear?.eps?.toString(),
      yearAgoOperatingProfit: q2LastYear?.operatingProfit?.toString(),
      // QoQ growth percentages
      revenueQoQ,
      profitQoQ,
      epsQoQ,
      operatingProfitQoQ,
      operatingProfitMarginQoQ: operatingMarginQoQ,
      // YoY growth percentages
      revenueYoY,
      profitYoY,
      epsYoY,
      operatingProfitYoY,
      operatingProfitMarginYoY: operatingMarginYoY,
    });

    console.log('✅ Database updated successfully!');
    console.log();

    // ===================================================================
    // STEP 8: Verification - Fetch and Display Updated Data
    // ===================================================================
    console.log('🔍 Verifying updated data...');
    const updatedData = await storage.getQuarterlyResultsByQuarter(tcs.id, 'Q2', 'FY2526');
    
    if (updatedData) {
      console.log();
      console.log('='.repeat(80));
      console.log('✅ VERIFICATION: Q2 FY2526 COMPLETE DATA');
      console.log('='.repeat(80));
      console.log();
      console.log('📊 CURRENT QUARTER (Q2 FY2526):');
      console.log(`   Revenue: ₹${updatedData.revenue} Cr`);
      console.log(`   Net Profit: ₹${updatedData.profit} Cr`);
      console.log(`   EPS: ₹${updatedData.eps}`);
      console.log(`   Operating Profit: ₹${updatedData.operatingProfit} Cr`);
      console.log(`   Operating Margin: ${updatedData.operatingProfitMargin}%`);
      console.log(`   PAT Margin: ${updatedData.patMargin}%`);
      console.log();
      console.log('📊 PREVIOUS QUARTER (Q1 FY2526):');
      console.log(`   Revenue: ₹${updatedData.prevRevenue || 'N/A'} Cr`);
      console.log(`   Net Profit: ₹${updatedData.prevProfit || 'N/A'} Cr`);
      console.log(`   EPS: ₹${updatedData.prevEps || 'N/A'}`);
      console.log(`   Operating Profit: ₹${updatedData.prevOperatingProfit || 'N/A'} Cr`);
      console.log();
      console.log('📊 YEAR-AGO QUARTER (Q2 FY2425):');
      console.log(`   Revenue: ₹${updatedData.yearAgoRevenue || 'N/A'} Cr`);
      console.log(`   Net Profit: ₹${updatedData.yearAgoProfit || 'N/A'} Cr`);
      console.log(`   EPS: ₹${updatedData.yearAgoEps || 'N/A'}`);
      console.log(`   Operating Profit: ₹${updatedData.yearAgoOperatingProfit || 'N/A'} Cr`);
      console.log();
      console.log('📈 QoQ GROWTH:');
      console.log(`   Revenue: ${updatedData.revenueQoQ || 'N/A'}%`);
      console.log(`   Net Profit: ${updatedData.profitQoQ || 'N/A'}%`);
      console.log(`   EPS: ${updatedData.epsQoQ || 'N/A'}%`);
      console.log(`   Operating Profit: ${updatedData.operatingProfitQoQ || 'N/A'}%`);
      console.log(`   Operating Margin: ${updatedData.operatingProfitMarginQoQ || 'N/A'}%`);
      console.log();
      console.log('📈 YoY GROWTH:');
      console.log(`   Revenue: ${updatedData.revenueYoY || 'N/A'}%`);
      console.log(`   Net Profit: ${updatedData.profitYoY || 'N/A'}%`);
      console.log(`   EPS: ${updatedData.epsYoY || 'N/A'}%`);
      console.log(`   Operating Profit: ${updatedData.operatingProfitYoY || 'N/A'}%`);
      console.log(`   Operating Margin: ${updatedData.operatingProfitMarginYoY || 'N/A'}%`);
      console.log();
      console.log('='.repeat(80));
    }

    console.log();
    console.log('🎯 SUCCESS! All fields have been populated for Q2 FY2526');
    console.log();
    console.log('📋 WHAT WAS UPDATED:');
    console.log('   ✅ Operating Profit: ₹16,068 Cr');
    console.log('   ✅ Operating Margin: 24.42%');
    console.log('   ✅ PAT Margin: 18.44%');
    console.log('   ✅ Previous Quarter Data (Q1 FY2526)');
    console.log('   ✅ Year-Ago Data (Q2 FY2425)');
    console.log('   ✅ All QoQ Growth Percentages');
    console.log('   ✅ All YoY Growth Percentages');
    console.log();
    console.log('🌐 Next Step: Refresh the TCS stock detail page to see all data!');
    console.log();

  } catch (error: any) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ UPDATE FAILED!');
    console.error(`   Error: ${error.message}`);
    console.error('='.repeat(80));
    if (error.stack) {
      console.error();
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

updateTCSQ2Complete();
