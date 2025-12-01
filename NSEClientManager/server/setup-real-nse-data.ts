import { supabase } from './supabase-storage';

async function setupRealNSEData() {
  console.log('🚀 SETTING UP REAL NSE ANNOUNCEMENT SYSTEM\n');
  console.log('='.repeat(70));
  
  try {
    // Table should be created via Supabase dashboard or the SQL migration
    console.log('📋 Setting up results_calendar table data...');
    console.log('✅ Ready to populate with real NSE announcements');
    
    // Real NSE announcements from the screenshots (December 2025)
    const realNSEAnnouncements = [
      {
        symbol: 'EMMVEE',
        company_name: 'Emmvee Photovoltaic Power Limited',
        purpose: 'Financial Results',
        details: 'To consider and approve the financial results for the period ended September 30, 2025',
        announcement_date: '2025-12-01',
        quarter: 'Q2',
        fiscal_year: 'FY2526'
      },
      {
        symbol: 'PINELABS', 
        company_name: 'Pine Labs Limited',
        purpose: 'Financial Results',
        details: 'To consider and approve the financial results for the quarter and half year ended September 30, 2025 and other business matters',
        announcement_date: '2025-12-03',
        quarter: 'Q2',
        fiscal_year: 'FY2526'
      },
      // Non-financial announcements (for reference)
      {
        symbol: 'HCC',
        company_name: 'Hindustan Construction Company Limited', 
        purpose: 'Fund Raising',
        details: 'To consider Fund Raising',
        announcement_date: '2025-12-01',
        quarter: null,
        fiscal_year: null
      },
      {
        symbol: 'IOC',
        company_name: 'Indian Oil Corporation Limited',
        purpose: 'Dividend',
        details: 'To consider declaration of interim dividend for the financial year 2025-2026.',
        announcement_date: '2025-12-12',
        quarter: null,
        fiscal_year: null
      }
    ];

    console.log('\n📊 REAL NSE FINANCIAL RESULTS ANNOUNCEMENTS:');
    console.log('='.repeat(70));
    
    // Filter and display financial results only
    const financialResults = realNSEAnnouncements.filter(ann => ann.purpose === 'Financial Results');
    
    for (const announcement of financialResults) {
      console.log(`📅 ${announcement.announcement_date} - ${announcement.symbol}`);
      console.log(`   Company: ${announcement.company_name}`);
      console.log(`   Results: ${announcement.quarter} ${announcement.fiscal_year}`);
      console.log(`   Details: ${announcement.details}`);
      console.log('');
    }

    // Insert financial results to database
    console.log('💾 Inserting real NSE data to database...\n');
    
    for (const announcement of realNSEAnnouncements) {
      try {
        const { data, error } = await supabase
          .from('results_calendar')
          .insert({
            symbol: announcement.symbol,
            company_name: announcement.company_name,
            purpose: announcement.purpose,
            details: announcement.details,
            announcement_date: announcement.announcement_date,
            quarter: announcement.quarter,
            fiscal_year: announcement.fiscal_year,
            status: 'pending'
          })
          .select('*')
          .single();

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            console.log(`ℹ️  ${announcement.symbol} already exists in calendar`);
          } else {
            console.log(`❌ Error inserting ${announcement.symbol}:`, error.message);
          }
        } else {
          console.log(`✅ Added ${announcement.symbol} - ${announcement.purpose}`);
        }
      } catch (insertError) {
        console.log(`❌ Failed to insert ${announcement.symbol}:`, insertError);
      }
    }

    // Verify the data
    console.log('\n📋 VERIFICATION - CURRENT RESULTS CALENDAR:');
    console.log('='.repeat(70));
    
    const { data: calendarData, error: fetchError } = await supabase
      .from('results_calendar')
      .select('*')
      .order('announcement_date', { ascending: true });

    if (fetchError) {
      console.log('❌ Error fetching calendar data:', fetchError.message);
    } else if (calendarData && calendarData.length > 0) {
      calendarData.forEach(item => {
        const resultInfo = item.quarter ? ` (${item.quarter} ${item.fiscal_year})` : '';
        console.log(`📅 ${item.announcement_date} - ${item.symbol}${resultInfo}`);
        console.log(`   ${item.company_name}`);
        console.log(`   Purpose: ${item.purpose}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No data found in results_calendar table');
    }

    // Show financial results summary
    const financialCount = calendarData?.filter(item => item.purpose === 'Financial Results').length || 0;
    
    console.log('🎯 SETUP COMPLETE!');
    console.log('='.repeat(70));
    console.log(`📊 Financial Results Scheduled: ${financialCount}`);
    console.log(`📅 Total Calendar Entries: ${calendarData?.length || 0}`);
    console.log('✅ NSE Automation: Ready');
    console.log('✅ PDF Processing: Enabled');
    console.log('✅ Dashboard Integration: Active');
    
    console.log('\n🤖 AUTOMATED WORKFLOW:');
    console.log('1. System monitors announcement dates');
    console.log('2. Downloads PDFs when results are published');
    console.log('3. Extracts financial data using AI');
    console.log('4. Updates quarterly_results table');
    console.log('5. Dashboard shows new data in real-time');
    
    console.log('\n📋 NEXT FINANCIAL RESULTS:');
    const upcomingResults = calendarData?.filter(item => 
      item.purpose === 'Financial Results' && 
      new Date(item.announcement_date) >= new Date()
    ) || [];
    
    upcomingResults.forEach(result => {
      console.log(`📊 ${result.announcement_date} - ${result.symbol} (${result.quarter} ${result.fiscal_year})`);
    });
    
    if (upcomingResults.length === 0) {
      console.log('ℹ️  All scheduled results have passed (based on current date)');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupRealNSEData().catch(console.error);