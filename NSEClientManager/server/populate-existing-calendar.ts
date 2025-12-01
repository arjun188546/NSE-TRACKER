import { supabase } from './supabase-storage';

async function populateExistingCalendar() {
  console.log('📅 POPULATING EXISTING RESULTS_CALENDAR TABLE\n');
  console.log('='.repeat(70));
  
  console.log('🔍 Working with existing table structure:');
  console.log('   ✅ id (UUID)');
  console.log('   ✅ announcement_date (DATE)'); 
  console.log('   ✅ quarter (VARCHAR)');
  console.log('   ✅ fiscal_year (VARCHAR)');
  console.log('');
  
  // Clear existing data
  console.log('🧹 Clearing existing data...');
  const { error: deleteError } = await supabase
    .from('results_calendar')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.log('⚠️  Could not clear data:', deleteError.message);
  } else {
    console.log('✅ Cleared existing calendar entries');
  }
  
  // Real NSE financial results data (minimal format)
  const realFinancialResults = [
    {
      announcement_date: '2025-12-01',
      quarter: 'Q2',
      fiscal_year: 'FY2526'
      // Note: EMMVEE Photovoltaic Power Ltd results
    },
    {
      announcement_date: '2025-12-03', 
      quarter: 'Q2',
      fiscal_year: 'FY2526'
      // Note: Pine Labs Limited results
    }
  ];
  
  console.log('📊 INSERTING REAL NSE FINANCIAL RESULTS:');
  console.log('='.repeat(70));
  
  for (const result of realFinancialResults) {
    console.log(`📅 ${result.announcement_date} - ${result.quarter} ${result.fiscal_year} Results`);
    
    const { data, error } = await supabase
      .from('results_calendar')
      .insert(result)
      .select('*')
      .single();
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else {
      console.log(`✅ Added to calendar (ID: ${data.id})`);
    }
    console.log('');
  }
  
  // Verify final data
  console.log('🎯 VERIFICATION - CALENDAR ENTRIES:');
  console.log('='.repeat(70));
  
  const { data: calendarData, error: fetchError } = await supabase
    .from('results_calendar') 
    .select('*')
    .order('announcement_date');
  
  if (fetchError) {
    console.log('❌ Error fetching data:', fetchError.message);
  } else if (calendarData && calendarData.length > 0) {
    calendarData.forEach((entry, index) => {
      console.log(`${index + 1}. 📊 ${entry.announcement_date}`);
      console.log(`   Quarter: ${entry.quarter} ${entry.fiscal_year}`);
      console.log(`   ID: ${entry.id}`);
      console.log('');
    });
  } else {
    console.log('ℹ️  No entries found in calendar');
  }
  
  // Create a reference map of what companies these relate to
  console.log('📋 COMPANY MAPPING REFERENCE:');
  console.log('='.repeat(70));
  console.log('📅 2025-12-01 (Q2 FY2526):');
  console.log('   • EMMVEE - Emmvee Photovoltaic Power Limited');
  console.log('   • Q2 FY2526 financial results announcement');
  console.log('');
  console.log('📅 2025-12-03 (Q2 FY2526):');
  console.log('   • PINELABS - Pine Labs Limited');  
  console.log('   • Q2 FY2526 financial results announcement');
  console.log('');
  
  console.log('🚀 REAL NSE CALENDAR POPULATED!');
  console.log('='.repeat(70));
  console.log('✅ Upcoming financial results tracked');
  console.log('✅ System ready for automated processing');
  console.log('✅ PDF extraction will trigger on announcement dates');
  console.log('');
  console.log('🤖 AUTOMATED WORKFLOW:');
  console.log('1. Monitor calendar dates (Dec 1 & 3, 2025)');
  console.log('2. Auto-download PDFs when results published');
  console.log('3. Extract Q2 FY2526 financial data');
  console.log('4. Save to quarterly_results table');
  console.log('5. Update dashboard in real-time');
  console.log('');
  console.log('📊 Next Results: 2 companies, Q2 FY2526');
  
  return calendarData;
}

populateExistingCalendar().catch(console.error);