/**
 * Delete EMMVEE quarterly results before today's announcement
 */

import { supabase } from './supabase-storage';

async function deleteEmmveeResults() {
  console.log('🗑️  Deleting EMMVEE quarterly results...\n');

  try {
    // First get the stock
    const { data: stock } = await supabase
      .from('stocks')
      .select('*')
      .ilike('symbol', 'EMMVEE')
      .single();

    if (!stock) {
      console.log('ℹ️  EMMVEE stock not found in database');
      return;
    }

    console.log(`Found EMMVEE stock (ID: ${stock.id})`);

    // Check what exists
    const { data: existing } = await supabase
      .from('quarterly_results')
      .select('*')
      .eq('stock_id', stock.id);

    console.log(`Found ${existing?.length || 0} quarterly results for EMMVEE\n`);
    
    if (existing && existing.length > 0) {
      console.log('Existing results:');
      existing.forEach(result => {
        console.log(`  - ${result.quarter} ${result.fiscal_year}: Revenue ₹${result.revenue} Cr, Net Profit ₹${result.net_profit} Cr`);
      });
      console.log();

      // Delete all EMMVEE quarterly results by stock_id
      const { error } = await supabase
        .from('quarterly_results')
        .delete()
        .eq('stock_id', stock.id);

      if (error) {
        console.error('❌ Error deleting results:', error);
        process.exit(1);
      }

      console.log('✅ Successfully deleted all EMMVEE quarterly results');
      console.log('📅 Ready for today\'s Q2 FY2526 announcement (December 1, 2025)');
    } else {
      console.log('ℹ️  No quarterly results found for EMMVEE');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteEmmveeResults();
