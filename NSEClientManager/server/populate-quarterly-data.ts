/**
 * Populate sample quarterly financial data for all stocks
 * This creates realistic quarterly results data for testing
 */

import { supabase } from './supabase/config/supabase-client';

async function populateQuarterlyFinancials() {
  console.log('🚀 Populating sample quarterly financial data...\n');

  try {
    // Get all stocks
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('id, symbol');

    if (stocksError) throw stocksError;
    if (!stocks || stocks.length === 0) {
      console.error('❌ No stocks found in database');
      return;
    }

    console.log(`📊 Found ${stocks.length} stocks\n`);

    let successCount = 0;

    for (const stock of stocks) {
      try {
        // Generate Q2 FY 25-26 data (current quarter)
        const currentRevenue = 50000 + Math.random() * 10000; // 50k-60k Cr
        const currentProfit = currentRevenue * (0.15 + Math.random() * 0.15); // 15-30% margin
        const currentEPS = 40 + Math.random() * 60; // 40-100
        const currentOpProfit = currentRevenue * (0.18 + Math.random() * 0.12); // 18-30% of revenue
        const currentOpMargin = (currentOpProfit / currentRevenue) * 100;

        // Previous quarter data (Q1 FY 25-26)
        const prevRevenue = currentRevenue * (0.95 + Math.random() * 0.05); // Slightly lower
        const prevProfit = prevRevenue * (0.12 + Math.random() * 0.15); 
        const prevEPS = currentEPS * (0.90 + Math.random() * 0.10);
        const prevOpProfit = prevRevenue * (0.16 + Math.random() * 0.12);

        // Year ago data (Q2 FY 24-25)
        const yearAgoRevenue = currentRevenue * (0.85 + Math.random() * 0.10); // 10-15% growth YoY
        const yearAgoProfit = yearAgoRevenue * (0.12 + Math.random() * 0.10);
        const yearAgoEPS = currentEPS * (0.75 + Math.random() * 0.15);
        const yearAgoOpProfit = yearAgoRevenue * (0.16 + Math.random() * 0.10);

        // Calculate QoQ changes
        const revenueQoQ = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
        const profitQoQ = ((currentProfit - prevProfit) / prevProfit) * 100;
        const epsQoQ = ((currentEPS - prevEPS) / prevEPS) * 100;
        const opProfitQoQ = ((currentOpProfit - prevOpProfit) / prevOpProfit) * 100;

        // Calculate YoY changes
        const revenueYoY = ((currentRevenue - yearAgoRevenue) / yearAgoRevenue) * 100;
        const profitYoY = ((currentProfit - yearAgoProfit) / yearAgoProfit) * 100;
        const epsYoY = ((currentEPS - yearAgoEPS) / yearAgoEPS) * 100;
        const opProfitYoY = ((currentOpProfit - yearAgoOpProfit) / yearAgoOpProfit) * 100;

        const quarterlyData = {
          stock_id: stock.id,
          quarter: 'Q2',
          fiscal_year: 'FY 25-26',
          // Current quarter
          revenue: currentRevenue.toFixed(2),
          profit: currentProfit.toFixed(2),
          eps: currentEPS.toFixed(2),
          operating_profit: currentOpProfit.toFixed(2),
          operating_profit_margin: currentOpMargin.toFixed(2),
          // QoQ changes
          revenue_qoq: revenueQoQ.toFixed(2),
          profit_qoq: profitQoQ.toFixed(2),
          eps_qoq: epsQoQ.toFixed(2),
          operating_profit_qoq: opProfitQoQ.toFixed(2),
          // YoY changes
          revenue_yoy: revenueYoY.toFixed(2),
          profit_yoy: profitYoY.toFixed(2),
          eps_yoy: epsYoY.toFixed(2),
          operating_profit_yoy: opProfitYoY.toFixed(2),
          published_at: new Date().toISOString(),
        };

        // Check if data already exists
        const { data: existing } = await supabase
          .from('quarterly_results')
          .select('id')
          .eq('stock_id', stock.id)
          .eq('quarter', 'Q2')
          .eq('fiscal_year', 'FY 25-26')
          .single();

        if (existing) {
          console.log(`  ⏭️  Quarterly data already exists for ${stock.symbol}, skipping`);
          continue;
        }

        const { error } = await supabase
          .from('quarterly_results')
          .insert(quarterlyData);

        if (error) {
          console.error(`  ❌ Error for ${stock.symbol}:`, error.message);
        } else {
          successCount++;
          console.log(`  ✅ Populated quarterly data for ${stock.symbol}`);
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`  ❌ Failed for ${stock.symbol}:`, error.message);
      }
    }

    console.log(`\n✨ Quarterly financial data population completed!`);
    console.log(`📊 Total records created: ${successCount}`);
  } catch (error: any) {
    console.error('❌ Error populating quarterly data:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

populateQuarterlyFinancials();
