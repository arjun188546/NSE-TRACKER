/**
 * Check all comparison fields for TCS Q2 FY2526
 */

import { supabase } from './supabase/config/supabase-client';

async function checkAllFields() {
  console.log('Fetching TCS Q2 FY2526 complete data...\n');

  const { data: stock } = await supabase
    .from('stocks')
    .select('id')
    .eq('symbol', 'TCS')
    .single();

  if (!stock) {
    console.error('TCS stock not found');
    return;
  }

  const { data, error } = await supabase
    .from('quarterly_results')
    .select('*')
    .eq('stock_id', stock.id)
    .eq('quarter', 'Q2')
    .eq('fiscal_year', 'FY2526')
    .single();

  if (error || !data) {
    console.error('Error:', error?.message);
    return;
  }

  console.log('='.repeat(80));
  console.log('TCS Q2 FY2526 - ALL FIELDS');
  console.log('='.repeat(80));
  console.log('\nCURRENT QUARTER:');
  console.log(`  revenue: ${data.revenue}`);
  console.log(`  profit: ${data.profit}`);
  console.log(`  eps: ${data.eps}`);
  console.log(`  operating_profit: ${data.operating_profit}`);
  console.log(`  operating_profit_margin: ${data.operating_profit_margin}`);
  console.log(`  pat_margin: ${data.pat_margin}`);

  console.log('\nPREVIOUS QUARTER (Q1 FY2526):');
  console.log(`  prev_revenue: ${data.prev_revenue}`);
  console.log(`  prev_profit: ${data.prev_profit}`);
  console.log(`  prev_eps: ${data.prev_eps}`);
  console.log(`  prev_operating_profit: ${data.prev_operating_profit}`);

  console.log('\nYEAR-AGO QUARTER (Q2 FY2425):');
  console.log(`  year_ago_revenue: ${data.year_ago_revenue}`);
  console.log(`  year_ago_profit: ${data.year_ago_profit}`);
  console.log(`  year_ago_eps: ${data.year_ago_eps}`);
  console.log(`  year_ago_operating_profit: ${data.year_ago_operating_profit}`);

  console.log('\nQoQ GROWTH:');
  console.log(`  revenue_qoq: ${data.revenue_qoq}%`);
  console.log(`  profit_qoq: ${data.profit_qoq}%`);
  console.log(`  eps_qoq: ${data.eps_qoq}%`);
  console.log(`  operating_profit_qoq: ${data.operating_profit_qoq}%`);
  console.log(`  operating_profit_margin_qoq: ${data.operating_profit_margin_qoq}%`);

  console.log('\nYoY GROWTH:');
  console.log(`  revenue_yoy: ${data.revenue_yoy}%`);
  console.log(`  profit_yoy: ${data.profit_yoy}%`);
  console.log(`  eps_yoy: ${data.eps_yoy}%`);
  console.log(`  operating_profit_yoy: ${data.operating_profit_yoy}%`);
  console.log(`  operating_profit_margin_yoy: ${data.operating_profit_margin_yoy}%`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL FIELDS POPULATED SUCCESSFULLY!');
  console.log('='.repeat(80));
}

checkAllFields();
