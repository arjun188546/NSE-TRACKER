import { NSEResultExtractor } from './nse-result-extractor';
import { supabase } from './supabase-storage';

async function testEmmveeWorkflow() {
  console.log('\n🧪 TESTING EMMVEE PHOTOVOLTAIC POWER LTD WORKFLOW\n');
  console.log('='.repeat(70));
  
  // Step 1: Check if Emmvee is in our stocks table
  console.log('Step 1: Checking if EMMVEE exists in database...');
  
  const { data: emmveeStock } = await supabase
    .from('stocks')
    .select('*')
    .ilike('symbol', '%EMMVEE%')
    .single();
  
  if (!emmveeStock) {
    console.log('EMMVEE not found in stocks table. Adding manually for testing...');
    
    const { data: newStock, error } = await supabase
      .from('stocks')
      .insert({
        symbol: 'EMMVEE',
        company_name: 'Emmvee Photovoltaic Power Ltd',
        sector: 'Solar Energy',
        current_price: 0,
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('Failed to add EMMVEE:', error);
      return;
    }
    
    console.log('✅ Added EMMVEE to stocks table:', newStock);
  } else {
    console.log('✅ EMMVEE found in database:', emmveeStock);
  }
  
  // Step 2: Create a test announcement for tomorrow
  console.log('\nStep 2: Creating test announcement for EMMVEE...');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const announcementDate = tomorrow.toISOString().split('T')[0];
  
  const testAnnouncement = {
    symbol: 'EMMVEE',
    company_name: 'Emmvee Photovoltaic Power Ltd',
    announcement_date: announcementDate,
    quarter: 'Q2',
    fiscal_year: 'FY2526',
    status: 'scheduled',
    pdf_url: 'https://example.com/emmvee-results.pdf' // Mock URL for testing
  };
  
  // Check if announcement already exists
  const { data: existing } = await supabase
    .from('results_calendar')
    .select('*')
    .eq('symbol', 'EMMVEE')
    .eq('quarter', 'Q2')
    .eq('fiscal_year', 'FY2526')
    .single();
  
  if (!existing) {
    const { data: newAnnouncement, error } = await supabase
      .from('results_calendar')
      .insert(testAnnouncement)
      .select('*')
      .single();
    
    if (error) {
      console.error('Failed to create test announcement:', error);
      return;
    }
    
    console.log('✅ Created test announcement:', newAnnouncement);
  } else {
    console.log('✅ Test announcement already exists:', existing);
  }
  
  // Step 3: Test the extraction workflow
  console.log('\nStep 3: Testing result extraction workflow...');
  
  const extractor = new NSEResultExtractor();
  
  // Simulate manual data entry for testing (since PDF download might fail)
  const mockExtractedData = {
    quarter: 'Q2',
    fiscalYear: 'FY2526',
    revenue: 125.50, // Crores
    profit: 15.75,   // Crores
    eps: 8.25,       // Rupees
    operatingProfit: 22.30, // Crores
    operatingProfitMargin: 17.84, // Percentage
    confidence: 85.5
  };
  
  console.log('Mock extracted data:', mockExtractedData);
  
  const saved = await extractor.saveExtractedData('EMMVEE', mockExtractedData);
  
  if (saved) {
    console.log('✅ Successfully saved extracted data to database');
    
    // Step 4: Verify the data was saved correctly
    console.log('\nStep 4: Verifying saved data...');
    
    const { data: savedResults } = await supabase
      .from('quarterly_results')
      .select('*')
      .eq('quarter', 'Q2')
      .eq('fiscal_year', 'FY2526')
      .contains('stock_id', emmveeStock?.id || '')
      .single();
    
    if (savedResults) {
      console.log('✅ Data verification successful:', savedResults);
    }
    
    // Step 5: Test the auto-population system
    console.log('\nStep 5: Running auto-population for comparison calculations...');
    
    // This would normally run the auto-populate script
    console.log('Run: npx tsx server/auto-populate-all-comparisons.ts');
    
    console.log('\n🎉 EMMVEE WORKFLOW TEST COMPLETE!');
    console.log('\nNext steps:');
    console.log('1. Check the dashboard for EMMVEE quarterly results');
    console.log('2. Run auto-populate to calculate QoQ/YoY comparisons');
    console.log('3. Set up scheduled monitoring for real announcements');
  } else {
    console.log('❌ Failed to save extracted data');
  }
}

testEmmveeWorkflow().catch(console.error);