/**
 * Populate Results Calendar for Dec 1-3, 2025
 * EMMVEE (Dec 1) and PINELABS (Dec 3)
 */

import { supabase } from './supabase-storage';

async function populateCalendar() {
  console.log('📅 Populating Results Calendar...\n');

  try {
    // 1. Get EMMVEE stock
    const { data: emmveeStock } = await supabase
      .from('stocks')
      .select('*')
      .ilike('symbol', 'EMMVEE')
      .single();

    if (emmveeStock) {
      console.log(`✅ Found EMMVEE (${emmveeStock.id})`);
      
      // Insert EMMVEE calendar entry for Dec 1, 2025
      const { error: emmveeError } = await supabase
        .from('results_calendar')
        .upsert({
          stock_id: emmveeStock.id,
          announcement_date: '2025-12-01',
          quarter: 'Q2',
          fiscal_year: 'FY2526',
          result_status: 'waiting',
          processing_status: 'waiting',
          pdf_download_status: 'pending',
        }, {
          onConflict: 'stock_id,announcement_date'
        });

      if (emmveeError) {
        console.error('❌ Error inserting EMMVEE:', emmveeError);
      } else {
        console.log('✅ Added EMMVEE calendar entry (Dec 1, 2025)');
      }
    } else {
      console.log('⚠️  EMMVEE stock not found');
    }

    // 2. Get PINELABS stock
    const { data: pinelabsStock } = await supabase
      .from('stocks')
      .select('*')
      .ilike('symbol', 'PINELABS')
      .single();

    if (pinelabsStock) {
      console.log(`✅ Found PINELABS (${pinelabsStock.id})`);
      
      // Insert PINELABS calendar entry for Dec 3, 2025
      const { error: pinelabsError } = await supabase
        .from('results_calendar')
        .upsert({
          stock_id: pinelabsStock.id,
          announcement_date: '2025-12-03',
          quarter: 'Q2',
          fiscal_year: 'FY2526',
          result_status: 'waiting',
          processing_status: 'waiting',
          pdf_download_status: 'pending',
        }, {
          onConflict: 'stock_id,announcement_date'
        });

      if (pinelabsError) {
        console.error('❌ Error inserting PINELABS:', pinelabsError);
      } else {
        console.log('✅ Added PINELABS calendar entry (Dec 3, 2025)');
      }
    } else {
      console.log('⚠️  PINELABS stock not found');
    }

    // 3. Verify entries
    console.log('\n📊 Current Calendar Entries:');
    const { data: entries } = await supabase
      .from('results_calendar')
      .select(`
        *,
        stocks (
          symbol,
          company_name
        )
      `)
      .order('announcement_date');

    if (entries && entries.length > 0) {
      entries.forEach((entry: any) => {
        const date = new Date(entry.announcement_date);
        console.log(`  ${date.toLocaleDateString()}: ${entry.stocks.symbol} - ${entry.stocks.company_name}`);
        console.log(`    Quarter: ${entry.quarter} ${entry.fiscal_year}`);
        console.log(`    Status: ${entry.result_status} / ${entry.processing_status}`);
      });
    } else {
      console.log('  No entries found');
    }

    console.log('\n✅ Calendar population complete!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

populateCalendar();
