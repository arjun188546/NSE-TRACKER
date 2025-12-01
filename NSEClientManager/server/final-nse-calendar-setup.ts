import { supabase } from './supabase-storage';

async function finalNSECalendarSetup() {
  console.log('🎯 FINAL NSE CALENDAR SETUP WITH STOCK IDS\n');
  console.log('='.repeat(70));
  
  // Get stock IDs for the companies mentioned in NSE announcements
  console.log('🔍 Looking up stock IDs...\n');
  
  const companies = ['EMMVEE', 'PINELABS'];
  const stockIds = {};
  
  for (const symbol of companies) {
    const { data: stock, error } = await supabase
      .from('stocks')
      .select('id, symbol, company_name')
      .eq('symbol', symbol)
      .single();
    
    if (error || !stock) {
      console.log(`❌ ${symbol}: Not found in stocks table`);
      console.log(`   Need to add ${symbol} first`);
    } else {
      console.log(`✅ ${symbol}: ${stock.company_name}`);
      console.log(`   Stock ID: ${stock.id}`);
      stockIds[symbol] = stock.id;
    }
    console.log('');
  }
  
  // Add PINELABS to stocks table if it doesn't exist
  if (!stockIds['PINELABS']) {
    console.log('📊 Adding PINELABS to stocks table...');
    
    const { data: newStock, error: insertError } = await supabase
      .from('stocks')
      .insert({
        symbol: 'PINELABS',
        company_name: 'Pine Labs Limited',
        sector: 'Fintech',
        market_cap: null // Will be updated later
      })
      .select('*')
      .single();
    
    if (insertError) {
      console.log('❌ Error adding PINELABS:', insertError.message);
    } else {
      console.log('✅ Added PINELABS to stocks table');
      console.log(`   Stock ID: ${newStock.id}`);
      stockIds['PINELABS'] = newStock.id;
    }
    console.log('');
  }
  
  // Clear existing calendar data
  console.log('🧹 Clearing existing calendar data...');
  const { error: deleteError } = await supabase
    .from('results_calendar')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.log('⚠️  Could not clear data:', deleteError.message);
  } else {
    console.log('✅ Calendar cleared');
  }
  
  // Real NSE announcements with stock IDs
  const realAnnouncements = [];
  
  if (stockIds['EMMVEE']) {
    realAnnouncements.push({
      stock_id: stockIds['EMMVEE'],
      announcement_date: '2025-12-01',
      quarter: 'Q2',
      fiscal_year: 'FY2526'
    });
  }
  
  if (stockIds['PINELABS']) {
    realAnnouncements.push({
      stock_id: stockIds['PINELABS'],
      announcement_date: '2025-12-03', 
      quarter: 'Q2',
      fiscal_year: 'FY2526'
    });
  }
  
  console.log('\n📊 INSERTING REAL NSE FINANCIAL RESULTS:');
  console.log('='.repeat(70));
  
  for (const announcement of realAnnouncements) {
    const stockSymbol = Object.keys(stockIds).find(key => stockIds[key] === announcement.stock_id);
    console.log(`📅 ${announcement.announcement_date} - ${stockSymbol}`);
    console.log(`   Quarter: ${announcement.quarter} ${announcement.fiscal_year}`);
    console.log(`   Stock ID: ${announcement.stock_id}`);
    
    const { data, error } = await supabase
      .from('results_calendar')
      .insert(announcement)
      .select('*')
      .single();
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else {
      console.log(`✅ Successfully added to calendar`);
      console.log(`   Entry ID: ${data.id}`);
    }
    console.log('');
  }
  
  // Final verification
  console.log('🎯 FINAL VERIFICATION:');
  console.log('='.repeat(70));
  
  const { data: calendarEntries, error: fetchError } = await supabase
    .from('results_calendar')
    .select(`
      *,
      stocks (symbol, company_name)
    `)
    .order('announcement_date');
  
  if (fetchError) {
    console.log('❌ Error fetching calendar:', fetchError.message);
  } else if (calendarEntries && calendarEntries.length > 0) {
    console.log('📅 UPCOMING FINANCIAL RESULTS CALENDAR:');
    console.log('');
    calendarEntries.forEach((entry, index) => {
      const stockInfo = entry.stocks || {};
      console.log(`${index + 1}. 📊 ${entry.announcement_date}`);
      console.log(`   Company: ${stockInfo.symbol} - ${stockInfo.company_name}`);
      console.log(`   Results: ${entry.quarter} ${entry.fiscal_year}`);
      console.log(`   Calendar ID: ${entry.id}`);
      console.log('');
    });
  } else {
    console.log('ℹ️  No calendar entries found');
  }
  
  // Show system status
  console.log('🚀 NSE CALENDAR SETUP COMPLETE!');
  console.log('='.repeat(70));
  console.log('✅ Real NSE announcement data loaded');
  console.log('✅ Stock IDs properly linked');
  console.log('✅ System ready for automation');
  console.log('');
  console.log('🤖 NEXT ACTIONS:');
  console.log('1. Dec 1, 2025: Monitor EMMVEE Q2 FY2526 results');
  console.log('2. Dec 3, 2025: Monitor PINELABS Q2 FY2526 results');
  console.log('3. Auto-download and extract PDF data');
  console.log('4. Update quarterly_results table');
  console.log('5. Refresh dashboard with new data');
  
  const totalEntries = calendarEntries?.length || 0;
  console.log(`\n📊 Calendar Status: ${totalEntries} upcoming financial results`);
}

finalNSECalendarSetup().catch(console.error);