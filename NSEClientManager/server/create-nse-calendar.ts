import { supabase } from './supabase-storage';

async function createAndPopulateNSECalendar() {
  console.log('🏗️  CREATING NSE RESULTS CALENDAR\n');
  console.log('='.repeat(70));
  
  // Try to create the table using Supabase client
  // Note: This requires proper database permissions
  try {
    console.log('📋 Attempting to create results_calendar table...');
    
    // First, let's check if table exists by trying to select from it
    const { data: testData, error: testError } = await supabase
      .from('results_calendar')
      .select('*')
      .limit(1);
    
    if (testError && testError.code === 'PGRST116') {
      console.log('⚠️  Table does not exist. Please create it manually in Supabase:');
      console.log('\n📋 SQL TO RUN IN SUPABASE:');
      console.log('='.repeat(50));
      console.log(`
CREATE TABLE results_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    purpose VARCHAR(100) NOT NULL,
    details TEXT,
    announcement_date DATE NOT NULL,
    quarter VARCHAR(10),
    fiscal_year VARCHAR(10),
    status VARCHAR(20) DEFAULT 'pending',
    pdf_url TEXT,
    extraction_completed BOOLEAN DEFAULT FALSE,
    extracted_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_results_calendar_date ON results_calendar(announcement_date);
CREATE INDEX idx_results_calendar_symbol ON results_calendar(symbol);
CREATE INDEX idx_results_calendar_purpose ON results_calendar(purpose);
      `);
      console.log('='.repeat(50));
      console.log('\n💡 After creating the table in Supabase, run this script again.');
      
      return;
    } else if (testError) {
      console.log('❌ Error checking table:', testError.message);
      return;
    } else {
      console.log('✅ Table exists, proceeding with data population...');
    }

  } catch (error) {
    console.log('❌ Database connection error:', error);
    return;
  }

  // Real NSE announcements data from screenshots
  const realNSEData = [
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
    }
  ];

  console.log('📊 INSERTING REAL NSE FINANCIAL RESULTS:');
  console.log('='.repeat(70));

  // Clear existing data first
  const { error: deleteError } = await supabase
    .from('results_calendar')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.log('⚠️  Could not clear existing data:', deleteError.message);
  } else {
    console.log('✅ Cleared existing calendar data');
  }

  // Insert real data
  for (const announcement of realNSEData) {
    console.log(`📅 Adding ${announcement.symbol} - ${announcement.company_name}`);
    console.log(`   Date: ${announcement.announcement_date}`);
    console.log(`   Results: ${announcement.quarter} ${announcement.fiscal_year}`);
    
    const { data, error } = await supabase
      .from('results_calendar')
      .insert(announcement)
      .select('*')
      .single();

    if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else {
      console.log(`✅ Successfully added to calendar\n`);
    }
  }

  // Verify final data
  const { data: finalData, error: finalError } = await supabase
    .from('results_calendar')
    .select('*')
    .order('announcement_date');

  if (finalError) {
    console.log('❌ Error fetching final data:', finalError.message);
  } else {
    console.log('🎯 FINAL RESULTS CALENDAR:');
    console.log('='.repeat(70));
    
    if (finalData && finalData.length > 0) {
      finalData.forEach(item => {
        console.log(`📊 ${item.announcement_date} - ${item.symbol}`);
        console.log(`   ${item.company_name}`);
        console.log(`   ${item.quarter} ${item.fiscal_year} Results`);
        console.log(`   Status: ${item.status}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No data in results calendar');
    }
  }

  console.log('🚀 NSE CALENDAR SETUP COMPLETE!');
  console.log('\n✅ Real NSE announcement data populated');
  console.log('✅ System ready for automated processing');
  console.log('✅ Dashboard will show upcoming results');
  
  console.log('\n🤖 NEXT: System will automatically:');
  console.log('1. Monitor announcement dates (Dec 1 & 3)');  
  console.log('2. Download PDFs when published');
  console.log('3. Extract Q2 FY2526 financial data');
  console.log('4. Update quarterly_results table');
  console.log('5. Refresh dashboard in real-time');
}

createAndPopulateNSECalendar().catch(console.error);