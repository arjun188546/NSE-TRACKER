import { supabase } from './supabase-storage';

async function inspectAndFixCalendar() {
  console.log('🔍 INSPECTING RESULTS_CALENDAR TABLE STRUCTURE\n');
  
  // Try to get table schema by attempting various column names
  const testColumns = [
    'id', 'symbol', 'company_name', 'name', 'company', 
    'announcement_date', 'date', 'purpose', 'details', 
    'quarter', 'fiscal_year', 'status'
  ];
  
  console.log('📋 Testing column existence...\n');
  
  for (const column of testColumns) {
    try {
      const { data, error } = await supabase
        .from('results_calendar')
        .select(column)
        .limit(1);
      
      if (error) {
        console.log(`❌ ${column}: ${error.message}`);
      } else {
        console.log(`✅ ${column}: exists`);
      }
    } catch (e) {
      console.log(`❌ ${column}: error`);
    }
  }
  
  // Try to insert with minimal fields to see what works
  console.log('\n🧪 Testing minimal insert...');
  
  const testData = {
    symbol: 'TEST',
    announcement_date: '2025-12-01'
  };
  
  const { data, error } = await supabase
    .from('results_calendar')
    .insert(testData)
    .select('*');
  
  if (error) {
    console.log('❌ Minimal insert failed:', error.message);
    
    // Try alternative column names
    const altTestData = {
      symbol: 'TEST',
      name: 'Test Company',
      date: '2025-12-01'
    };
    
    const { data: altData, error: altError } = await supabase
      .from('results_calendar')
      .insert(altTestData)
      .select('*');
    
    if (altError) {
      console.log('❌ Alternative insert failed:', altError.message);
    } else {
      console.log('✅ Alternative insert worked:', altData);
    }
  } else {
    console.log('✅ Minimal insert worked:', data);
  }
  
  // Show existing data structure
  console.log('\n📊 Checking existing data...');
  const { data: existingData, error: fetchError } = await supabase
    .from('results_calendar')
    .select('*')
    .limit(5);
  
  if (fetchError) {
    console.log('❌ Cannot fetch data:', fetchError.message);
  } else if (existingData && existingData.length > 0) {
    console.log('✅ Found existing data:');
    console.log('Columns:', Object.keys(existingData[0]));
    console.log('Sample:', existingData[0]);
  } else {
    console.log('ℹ️  No existing data in table');
  }
  
  // Manual instructions
  console.log('\n📋 MANUAL TABLE CREATION INSTRUCTIONS:');
  console.log('='.repeat(60));
  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Run this SQL:');
  console.log('');
  console.log(`CREATE TABLE IF NOT EXISTS results_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    purpose VARCHAR(100) NOT NULL,
    details TEXT,
    announcement_date DATE NOT NULL,
    quarter VARCHAR(10),
    fiscal_year VARCHAR(10), 
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`);
  console.log('');
  console.log('3. Then run this script again to populate data');
}

inspectAndFixCalendar().catch(console.error);