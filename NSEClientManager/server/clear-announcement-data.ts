import { supabase } from './supabase-storage';

async function clearAnnouncementData() {
  console.log('🧹 CLEARING INCORRECT ANNOUNCEMENT DATA\n');
  console.log('='.repeat(60));
  
  // First, let's see what data exists
  const { data: existingData, count } = await supabase
    .from('quarterly_results')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('📊 Current Database Status:');
  console.log(`   • Total Quarterly Results: ${count}`);
  
  if (existingData && existingData.length > 0) {
    console.log('\n📋 Recent Results (Last 10):');
    existingData.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.quarter} ${result.fiscal_year} - Stock ID: ${result.stock_id}`);
    });
  }
  
  // Check if results_calendar table exists and has data
  try {
    const { data: calendarData, count: calendarCount } = await supabase
      .from('results_calendar')
      .select('*', { count: 'exact' });
    
    if (calendarCount && calendarCount > 0) {
      console.log(`\n📅 Found ${calendarCount} calendar entries - clearing them...`);
      
      const { error: deleteError } = await supabase
        .from('results_calendar')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
      
      if (deleteError) {
        console.log('❌ Error clearing calendar data:', deleteError.message);
      } else {
        console.log('✅ Successfully cleared all calendar entries');
      }
    } else {
      console.log('\n📅 No calendar data found to clear');
    }
  } catch (error) {
    console.log('\n📅 Results calendar table does not exist yet');
  }
  
  // Don't delete quarterly_results as they contain real historical data
  // Only clear announcement/calendar data
  
  console.log('\n✅ CLEANUP COMPLETE!');
  console.log('='.repeat(60));
  console.log('📝 Ready to populate with real NSE announcement data');
  console.log('📊 Historical quarterly results preserved');
  console.log('🎯 System ready for accurate upcoming results');
  
  // Show stocks that we can track
  const { data: stocks } = await supabase
    .from('stocks')
    .select('symbol, company_name')
    .order('symbol');
  
  if (stocks) {
    console.log('\n📈 Currently Tracked Stocks:');
    stocks.forEach(stock => {
      console.log(`   • ${stock.symbol} - ${stock.company_name}`);
    });
  }
}

clearAnnouncementData().catch(console.error);