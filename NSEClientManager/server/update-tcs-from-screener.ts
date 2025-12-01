/**
 * Update TCS Q2 FY2526 with accurate data from screener
 * Cross-verified data from the quarterly results table
 */

import { storage } from './storage';

async function updateFromScreener() {
  console.log('='.repeat(80));
  console.log('📊 UPDATING TCS Q2 FY2526 WITH SCREENER-VERIFIED DATA');
  console.log('='.repeat(80));
  console.log();

  try {
    const tcs = await storage.getStockBySymbol('TCS');
    if (!tcs) {
      console.error('❌ TCS stock not found');
      return;
    }

    // Data from screener (Sep 2025 = Q2 FY2526)
    const q2FY2526 = {
      // Sep 2025 data
      revenue: 65799, // Sales
      profit: 12131, // Net Profit
      eps: 33.37, // EPS
      operatingProfit: 17978, // Operating Profit from screener (not 16068)
      operatingProfitMargin: 27, // OPM% from screener (not 24.42)
      expenses: 47821, // Expenses
      patMargin: 18.44, // Calculated: (12131/65799)*100
    };

    // Q1 FY2526 (Jun 2025)
    const q1FY2526 = {
      revenue: 63437,
      profit: 12819,
      eps: 35.27,
      operatingProfit: 16875, // From screener
      operatingProfitMargin: 27, // From screener (not 26.75)
    };

    // Q2 FY2425 (Sep 2024)
    const q2FY2425 = {
      revenue: 64259,
      profit: 11955,
      eps: 32.92,
      operatingProfit: 16731, // From screener (not 16032)
      operatingProfitMargin: 26, // From screener (not 24.95)
    };

    // Calculate QoQ growth
    const revenueQoQ = ((q2FY2526.revenue - q1FY2526.revenue) / q1FY2526.revenue * 100).toFixed(2);
    const profitQoQ = ((q2FY2526.profit - q1FY2526.profit) / q1FY2526.profit * 100).toFixed(2);
    const epsQoQ = ((q2FY2526.eps - q1FY2526.eps) / q1FY2526.eps * 100).toFixed(2);
    const operatingProfitQoQ = ((q2FY2526.operatingProfit - q1FY2526.operatingProfit) / q1FY2526.operatingProfit * 100).toFixed(2);
    const operatingMarginQoQ = ((q2FY2526.operatingProfitMargin - q1FY2526.operatingProfitMargin) / q1FY2526.operatingProfitMargin * 100).toFixed(2);

    // Calculate YoY growth
    const revenueYoY = ((q2FY2526.revenue - q2FY2425.revenue) / q2FY2425.revenue * 100).toFixed(2);
    const profitYoY = ((q2FY2526.profit - q2FY2425.profit) / q2FY2425.profit * 100).toFixed(2);
    const epsYoY = ((q2FY2526.eps - q2FY2425.eps) / q2FY2425.eps * 100).toFixed(2);
    const operatingProfitYoY = ((q2FY2526.operatingProfit - q2FY2425.operatingProfit) / q2FY2425.operatingProfit * 100).toFixed(2);
    const operatingMarginYoY = ((q2FY2526.operatingProfitMargin - q2FY2425.operatingProfitMargin) / q2FY2425.operatingProfitMargin * 100).toFixed(2);

    console.log('📊 SCREENER-VERIFIED DATA:');
    console.log();
    console.log('Q2 FY2526 (Sep 2025):');
    console.log(`  Revenue: ₹${q2FY2526.revenue} Cr`);
    console.log(`  Net Profit: ₹${q2FY2526.profit} Cr`);
    console.log(`  EPS: ₹${q2FY2526.eps}`);
    console.log(`  Operating Profit: ₹${q2FY2526.operatingProfit} Cr (corrected from 16068)`);
    console.log(`  Operating Margin: ${q2FY2526.operatingProfitMargin}% (corrected from 24.42%)`);
    console.log();
    console.log('📈 CALCULATED GROWTH:');
    console.log(`  Revenue QoQ: ${revenueQoQ}%`);
    console.log(`  Profit QoQ: ${profitQoQ}%`);
    console.log(`  EPS QoQ: ${epsQoQ}%`);
    console.log(`  Operating Profit QoQ: ${operatingProfitQoQ}%`);
    console.log(`  Operating Margin QoQ: ${operatingMarginQoQ}%`);
    console.log();
    console.log(`  Revenue YoY: ${revenueYoY}%`);
    console.log(`  Profit YoY: ${profitYoY}%`);
    console.log(`  EPS YoY: ${epsYoY}%`);
    console.log(`  Operating Profit YoY: ${operatingProfitYoY}%`);
    console.log(`  Operating Margin YoY: ${operatingMarginYoY}%`);
    console.log();

    // Update Q2 FY2526
    console.log('💾 Updating database with screener-verified data...');
    await storage.upsertQuarterlyResults({
      stockId: tcs.id,
      quarter: 'Q2',
      fiscalYear: 'FY2526',
      // Current quarter
      revenue: q2FY2526.revenue.toString(),
      profit: q2FY2526.profit.toString(),
      eps: q2FY2526.eps.toString(),
      operatingProfit: q2FY2526.operatingProfit.toString(),
      operatingProfitMargin: q2FY2526.operatingProfitMargin.toString(),
      patMargin: q2FY2526.patMargin.toString(),
      // Previous quarter
      prevRevenue: q1FY2526.revenue.toString(),
      prevProfit: q1FY2526.profit.toString(),
      prevEps: q1FY2526.eps.toString(),
      prevOperatingProfit: q1FY2526.operatingProfit.toString(),
      // Year ago
      yearAgoRevenue: q2FY2425.revenue.toString(),
      yearAgoProfit: q2FY2425.profit.toString(),
      yearAgoEps: q2FY2425.eps.toString(),
      yearAgoOperatingProfit: q2FY2425.operatingProfit.toString(),
      // QoQ growth
      revenueQoQ,
      profitQoQ,
      epsQoQ,
      operatingProfitQoQ,
      operatingProfitMarginQoQ: operatingMarginQoQ,
      // YoY growth
      revenueYoY,
      profitYoY,
      epsYoY,
      operatingProfitYoY,
      operatingProfitMarginYoY: operatingMarginYoY,
    });

    console.log('✅ Updated successfully!');
    console.log();
    console.log('='.repeat(80));
    console.log('✅ DATA UPDATED WITH SCREENER VALUES');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ Update failed:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

updateFromScreener();
