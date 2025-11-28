/**
 * Check what quarterly results exist in the database
 */

import { supabase } from './supabase/config/supabase-client';

async function checkDatabase() {
  console.log('='.repeat(60));
  console.log('Checking Quarterly Results in Database');
  console.log('='.repeat(60));
  console.log();

  try {
    // Get TCS stock
    const { data: stock } = await supabase
      .from('stocks')
      .select('*')
      .eq('symbol', 'TCS')
      .single();

    if (!stock) {
      console.error('❌ TCS stock not found');
      return;
    }

    console.log(`✅ Found TCS stock`);
    console.log(`   ID: ${stock.id}`);
    console.log(`   Symbol: ${stock.symbol}`);
    console.log(`   Name: ${stock.name}`);
    console.log();

    // Get all quarterly results for TCS
    const { data: results, error } = await supabase
      .from('quarterly_results')
      .select('*')
      .eq('stock_id', stock.id)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching results:', error.message);
      return;
    }

    if (!results || results.length === 0) {
      console.log('⚠️  No quarterly results found for TCS');
      return;
    }

    console.log(`📊 Found ${results.length} quarterly result(s):`);
    console.log();

    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.quarter} ${result.fiscal_year}`);
      console.log(`   Revenue: ₹${result.revenue || 'N/A'} Cr`);
      console.log(`   Profit: ₹${result.profit || 'N/A'} Cr`);
      console.log(`   EPS: ₹${result.eps || 'N/A'}`);
      console.log(`   Operating Profit: ₹${result.operating_profit || 'N/A'} Cr`);
      console.log(`   Operating Margin: ${result.operating_profit_margin || 'N/A'}%`);
      console.log(`   PAT Margin: ${result.pat_margin || 'N/A'}%`);
      console.log(`   Published: ${result.published_at}`);
      console.log(`   Comparisons:`);
      console.log(`     QoQ Revenue: ${result.revenue_qoq || 'N/A'}%`);
      console.log(`     YoY Revenue: ${result.revenue_yoy || 'N/A'}%`);
      console.log();
    });

    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

checkDatabase();
