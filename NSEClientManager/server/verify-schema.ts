import { supabase } from './supabase/config/supabase-client.js';

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n');
  
  // Check quarterly_results table
  const { data: qResults, error: qError } = await supabase
    .from('quarterly_results')
    .select('*')
    .limit(5);
  
  console.log('📊 Quarterly Results Table:');
  console.log(`   - Exists: ${!qError}`);
  console.log(`   - Sample count: ${qResults?.length || 0}`);
  if (qResults?.length) {
    console.log(`   - Sample data:`, qResults[0]);
  }
  
  // Check candlestick_data table
  const { data: candleData, error: candleError } = await supabase
    .from('candlestick_data')
    .select('*')
    .limit(5);
  
  console.log('\n📈 Candlestick Data Table:');
  console.log(`   - Exists: ${!candleError}`);
  console.log(`   - Sample count: ${candleData?.length || 0}`);
  
  // Check delivery_volume table
  const { data: deliveryData, error: deliveryError } = await supabase
    .from('delivery_volume')
    .select('*')
    .limit(5);
  
  console.log('\n📦 Delivery Volume Table:');
  console.log(`   - Exists: ${!deliveryError}`);
  console.log(`   - Sample count: ${deliveryData?.length || 0}`);
  
  // Check results_calendar table
  const { data: calendarData, error: calendarError } = await supabase
    .from('results_calendar')
    .select('*')
    .limit(5);
  
  console.log('\n📅 Results Calendar Table:');
  console.log(`   - Exists: ${!calendarError}`);
  console.log(`   - Sample count: ${calendarData?.length || 0}`);
  
  // Check how many stocks have quarterly results
  const { count: stocksWithResults } = await supabase
    .from('quarterly_results')
    .select('stock_id', { count: 'exact', head: true });
  
  console.log(`\n💡 Summary:`);
  console.log(`   - Total stocks in database: 992`);
  console.log(`   - Stocks with quarterly results: ${stocksWithResults || 0}`);
  
  // Check announcements table for PDF storage
  const { data: announcements, error: announcementsError } = await supabase
    .from('announcements')
    .select('*')
    .limit(3);
  
  console.log('\n📄 Announcements Table (for PDFs):');
  console.log(`   - Exists: ${!announcementsError}`);
  console.log(`   - Sample count: ${announcements?.length || 0}`);
  if (announcements?.length) {
    console.log(`   - Sample:`, announcements[0]);
  }
}

verifySchema().catch(console.error);
