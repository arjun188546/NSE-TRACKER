/**
 * Recalculate Q2 FY 25-26 with QoQ and YoY comparisons
 * Now that historical data exists, we can populate comparison fields
 */

import { storage } from './storage';

function getPreviousQuarter(quarter: string, fiscalYear: string) {
  const qNum = parseInt(quarter.replace('Q', ''));
  if (qNum === 1) {
    // Q1 -> Previous is Q4 of previous FY
    const fy = fiscalYear.replace('FY', '');
    const year1 = parseInt(fy.substring(0, 2)) - 1;
    const year2 = parseInt(fy.substring(2, 4)) - 1;
    return { quarter: 'Q4', fiscalYear: `FY${year1}${year2}` };
  } else {
    return { quarter: `Q${qNum - 1}`, fiscalYear };
  }
}

function getYearAgoQuarter(quarter: string, fiscalYear: string) {
  const fy = fiscalYear.replace('FY', '');
  const year1 = parseInt(fy.substring(0, 2)) - 1;
  const year2 = parseInt(fy.substring(2, 4)) - 1;
  return { quarter, fiscalYear: `FY${year1}${year2}` };
}

function calculatePercentageChange(current?: string, previous?: string): string | undefined {
  if (!current || !previous) return undefined;
  const curr = parseFloat(current);
  const prev = parseFloat(previous);
  if (isNaN(curr) || isNaN(prev) || prev === 0) return undefined;
  const change = ((curr - prev) / prev) * 100;
  return change.toFixed(2);
}

async function recalculateComparisons() {
  console.log('='.repeat(60));
  console.log('Recalculating Q2 FY 25-26 with Historical Comparisons');
  console.log('='.repeat(60));
  console.log();

  try {
    // Get TCS stock
    const tcs = await storage.getStockBySymbol('TCS');
    if (!tcs) {
      console.error('❌ TCS stock not found');
      return;
    }

    console.log(`✅ Found TCS stock (ID: ${tcs.id})`);

    // Get current Q2 FY 25-26 data (check both formats)
    let currentData = await storage.getQuarterlyResultsByQuarter(tcs.id, 'Q2', 'FY2526');
    if (!currentData) {
      currentData = await storage.getQuarterlyResultsByQuarter(tcs.id, 'Q2', 'FY 25-26');
    }
    if (!currentData) {
      console.error('❌ Q2 FY 25-26 data not found');
      return;
    }

    console.log(`✅ Found Q2 FY 25-26 data`);
    console.log(`   Revenue: ₹${currentData.revenue} Cr`);
    console.log(`   Profit: ₹${currentData.profit} Cr`);
    console.log(`   EPS: ₹${currentData.eps}`);
    console.log();

    // Get previous quarter (Q1 FY 25-26)
    const prevQtr = getPreviousQuarter('Q2', 'FY2526');
    const prevData = await storage.getQuarterlyResultsByQuarter(tcs.id, prevQtr.quarter, prevQtr.fiscalYear);
    
    if (prevData) {
      console.log(`✅ Found ${prevQtr.quarter} ${prevQtr.fiscalYear} for QoQ comparison`);
      console.log(`   Revenue: ₹${prevData.revenue} Cr`);
      console.log(`   Profit: ₹${prevData.profit} Cr`);
    } else {
      console.warn(`⚠️  ${prevQtr.quarter} ${prevQtr.fiscalYear} not found`);
    }

    // Get year-ago quarter (Q2 FY 24-25)
    const yearAgoQtr = getYearAgoQuarter('Q2', 'FY2526');
    const yearAgoData = await storage.getQuarterlyResultsByQuarter(tcs.id, yearAgoQtr.quarter, yearAgoQtr.fiscalYear);
    
    if (yearAgoData) {
      console.log(`✅ Found ${yearAgoQtr.quarter} ${yearAgoQtr.fiscalYear} for YoY comparison`);
      console.log(`   Revenue: ₹${yearAgoData.revenue} Cr`);
      console.log(`   Profit: ₹${yearAgoData.profit} Cr`);
    } else {
      console.warn(`⚠️  ${yearAgoQtr.quarter} ${yearAgoQtr.fiscalYear} not found`);
    }

    console.log();
    console.log('📊 Calculating comparisons...');

    // Calculate QoQ and YoY percentages
    const revenueQoQ = calculatePercentageChange(currentData.revenue?.toString(), prevData?.revenue?.toString());
    const profitQoQ = calculatePercentageChange(currentData.profit?.toString(), prevData?.profit?.toString());
    const epsQoQ = calculatePercentageChange(currentData.eps?.toString(), prevData?.eps?.toString());
    
    const revenueYoY = calculatePercentageChange(currentData.revenue?.toString(), yearAgoData?.revenue?.toString());
    const profitYoY = calculatePercentageChange(currentData.profit?.toString(), yearAgoData?.profit?.toString());
    const epsYoY = calculatePercentageChange(currentData.eps?.toString(), yearAgoData?.eps?.toString());

    console.log();
    console.log('💡 QoQ Growth:');
    console.log(`   Revenue: ${revenueQoQ}%`);
    console.log(`   Profit: ${profitQoQ}%`);
    console.log(`   EPS: ${epsQoQ}%`);
    console.log();
    console.log('💡 YoY Growth:');
    console.log(`   Revenue: ${revenueYoY}%`);
    console.log(`   Profit: ${profitYoY}%`);
    console.log(`   EPS: ${epsYoY}%`);
    console.log();

    // Update Q2 FY 25-26 with comparisons
    console.log('💾 Updating Q2 FY 25-26 with comparison data...');
    
    await storage.upsertQuarterlyResults({
      stockId: tcs.id,
      quarter: 'Q2',
      fiscalYear: 'FY2526',
      revenue: currentData.revenue?.toString(),
      profit: currentData.profit?.toString(),
      eps: currentData.eps?.toString(),
      operatingProfit: currentData.operatingProfit?.toString(),
      operatingProfitMargin: currentData.operatingProfitMargin?.toString(),
      patMargin: currentData.patMargin?.toString(),
      // Previous quarter data
      prevRevenue: prevData?.revenue?.toString(),
      prevProfit: prevData?.profit?.toString(),
      prevEps: prevData?.eps?.toString(),
      prevOperatingProfit: prevData?.operatingProfit?.toString(),
      // Year ago data
      yearAgoRevenue: yearAgoData?.revenue?.toString(),
      yearAgoProfit: yearAgoData?.profit?.toString(),
      yearAgoEps: yearAgoData?.eps?.toString(),
      yearAgoOperatingProfit: yearAgoData?.operatingProfit?.toString(),
      // QoQ percentages
      revenueQoQ,
      profitQoQ,
      epsQoQ,
      // YoY percentages
      revenueYoY,
      profitYoY,
      epsYoY,
    });

    console.log();
    console.log('='.repeat(60));
    console.log('✅ Q2 FY 25-26 updated with comparisons!');
    console.log('='.repeat(60));
    console.log();
    console.log('🎯 Next Step:');
    console.log('   Refresh the TCS stock detail page in your dashboard');
    console.log('   You should now see QoQ and YoY growth percentages!');
    console.log();

  } catch (error: any) {
    console.error();
    console.error('='.repeat(60));
    console.error('❌ Recalculation failed!');
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

recalculateComparisons();
