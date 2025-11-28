/**
 * Recalculate QoQ and YoY comparisons for existing Q2 FY2526 data
 * This script updates Q2 records with comparison data after Q1 and Q2 FY2425 are populated
 */

import { storage } from './storage';

function calculatePercentageChange(current?: string, previous?: string): string | undefined {
  if (!current || !previous) return undefined;
  
  const curr = parseFloat(current);
  const prev = parseFloat(previous);
  
  if (isNaN(curr) || isNaN(prev) || prev === 0) return undefined;
  
  const change = ((curr - prev) / prev) * 100;
  return change.toFixed(2);
}

async function recalculateComparisons() {
  console.log('🔄 Recalculating QoQ and YoY comparisons for Q2 FY2526...\n');

  try {
    const stocks = await storage.getAllStocks();

    for (const stock of stocks) {
      // Get Q2 FY2526 (current quarter)
      const q2Current = await storage.getQuarterlyResultsByQuarter(stock.id, 'Q2', 'FY2526');
      if (!q2Current) {
        console.log(`⚠️  ${stock.symbol}: No Q2 FY2526 data found, skipping`);
        continue;
      }

      // Get Q1 FY2526 (previous quarter)
      const q1Prev = await storage.getQuarterlyResultsByQuarter(stock.id, 'Q1', 'FY2526');
      
      // Get Q2 FY2425 (year ago)
      const q2YearAgo = await storage.getQuarterlyResultsByQuarter(stock.id, 'Q2', 'FY2425');

      // Calculate all comparison metrics
      const revenueQoQ = calculatePercentageChange(q2Current.revenue?.toString(), q1Prev?.revenue?.toString());
      const profitQoQ = calculatePercentageChange(q2Current.profit?.toString(), q1Prev?.profit?.toString());
      const epsQoQ = calculatePercentageChange(q2Current.eps?.toString(), q1Prev?.eps?.toString());
      const operatingProfitQoQ = calculatePercentageChange(q2Current.operatingProfit?.toString(), q1Prev?.operatingProfit?.toString());
      const operatingProfitMarginQoQ = calculatePercentageChange(q2Current.operatingProfitMargin?.toString(), q1Prev?.operatingProfitMargin?.toString());

      const revenueYoY = calculatePercentageChange(q2Current.revenue?.toString(), q2YearAgo?.revenue?.toString());
      const profitYoY = calculatePercentageChange(q2Current.profit?.toString(), q2YearAgo?.profit?.toString());
      const epsYoY = calculatePercentageChange(q2Current.eps?.toString(), q2YearAgo?.eps?.toString());
      const operatingProfitYoY = calculatePercentageChange(q2Current.operatingProfit?.toString(), q2YearAgo?.operatingProfit?.toString());
      const operatingProfitMarginYoY = calculatePercentageChange(q2Current.operatingProfitMargin?.toString(), q2YearAgo?.operatingProfitMargin?.toString());

      // Update Q2 FY2526 with all comparison data
      await storage.upsertQuarterlyResults({
        stockId: stock.id,
        quarter: 'Q2',
        fiscalYear: 'FY2526',
        revenue: q2Current.revenue?.toString(),
        profit: q2Current.profit?.toString(),
        eps: q2Current.eps?.toString(),
        operatingProfit: q2Current.operatingProfit?.toString(),
        operatingProfitMargin: q2Current.operatingProfitMargin?.toString(),
        ebitda: q2Current.ebitda?.toString(),
        // Previous quarter data
        prevRevenue: q1Prev?.revenue?.toString(),
        prevProfit: q1Prev?.profit?.toString(),
        prevEps: q1Prev?.eps?.toString(),
        prevOperatingProfit: q1Prev?.operatingProfit?.toString(),
        // Year ago data
        yearAgoRevenue: q2YearAgo?.revenue?.toString(),
        yearAgoProfit: q2YearAgo?.profit?.toString(),
        yearAgoEps: q2YearAgo?.eps?.toString(),
        yearAgoOperatingProfit: q2YearAgo?.operatingProfit?.toString(),
        // QoQ comparisons
        revenueQoQ,
        profitQoQ,
        epsQoQ,
        operatingProfitQoQ,
        operatingProfitMarginQoQ,
        // YoY comparisons
        revenueYoY,
        profitYoY,
        epsYoY,
        operatingProfitYoY,
        operatingProfitMarginYoY,
      });

      console.log(`✅ ${stock.symbol}: Updated with comparisons`);
      if (revenueQoQ) console.log(`   Revenue QoQ: ${revenueQoQ}%`);
      if (revenueYoY) console.log(`   Revenue YoY: ${revenueYoY}%`);
      if (profitQoQ) console.log(`   Profit QoQ: ${profitQoQ}%`);
      if (profitYoY) console.log(`   Profit YoY: ${profitYoY}%`);
      console.log('');
    }

    console.log('✅ All Q2 FY2526 records updated with comparison data!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
recalculateComparisons()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
