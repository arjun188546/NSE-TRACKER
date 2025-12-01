import { supabase } from './supabase/config/supabase-client.js';

async function checkCalendar() {
    console.log('Checking results calendar entries...\\n');

    // Check all calendar entries
    const { data: calendar, error } = await supabase
        .from('results_calendar')
        .select(`
      *,
      stocks (symbol, company_name)
    `)
        .order('announcement_date', { ascending: true })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${calendar?.length} calendar entries:\\n`);
    calendar?.forEach(entry => {
        console.log(`${entry.stocks?.symbol} (${entry.stocks?.company_name})`);
        console.log(`  Date: ${entry.announcement_date}`);
        console.log(`  Quarter: ${entry.quarter} ${entry.fiscal_year}`);
        console.log(`  Status: ${entry.result_status}`);
        console.log(`  PDF: ${entry.pdf_url ? 'Available' : 'Pending'}`);
        console.log();
    });

    // Search for Emmvee
    console.log('\\nSearching for EMMVEE...');
    const { data: emmvee } = await supabase
        .from('stocks')
        .select('*')
        .ilike('symbol', '%EMMVEE%')
        .or('company_name.ilike.%emmvee%');

    console.log('Emmvee results:', emmvee);

    // Search for Pine Labs
    console.log('\\nSearching for PINE LABS...');
    const { data: pinelabs } = await supabase
        .from('stocks')
        .select('*')
        .ilike('symbol', '%PINE%')
        .or('company_name.ilike.%pine%');

    console.log('Pine Labs results:', pinelabs);
}

checkCalendar().catch(console.error);
