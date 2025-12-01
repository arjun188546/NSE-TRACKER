import { supabase } from './supabase-storage';

async function checkCalendar() {
  const { data } = await supabase
    .from('results_calendar')
    .select(`
      *,
      stocks (
        symbol,
        company_name
      )
    `)
    .order('result_date');

  console.log('\n📅 Results Calendar Entries:\n');
  if (data && data.length > 0) {
    data.forEach((entry: any) => {
      const date = new Date(entry.result_date);
      console.log(`${date.toLocaleDateString()} - ${entry.stocks?.symbol || 'Unknown'}`);
      console.log(`  Company: ${entry.stocks?.company_name || 'Unknown'}`);
      console.log(`  Status: ${entry.status}`);
      console.log(`  Quarter: ${entry.quarter || 'N/A'}`);
      console.log();
    });
  } else {
    console.log('No calendar entries found\n');
  }
}

checkCalendar();
