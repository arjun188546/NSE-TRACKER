import { supabase } from './supabase-storage';

async function checkNewCompaniesData() {
  console.log('🔍 CHECKING NEW COMPANIES DATA\n');
  console.log('='.repeat(70));
  
  const newCompanies = ['EMMVEE', 'PINELABS'];
  
  for (const symbol of newCompanies) {
    console.log(`📊 Checking ${symbol}...\n`);
    
    // Get company info
    const { data: company } = await supabase
      .from('stocks')
      .select('*')
      .eq('symbol', symbol)
      .single();
    
    if (company) {
      console.log(`✅ Company: ${company.company_name}`);
      console.log(`   Sector: ${company.sector}`);
      console.log(`   Stock ID: ${company.id}`);
      
      // Check quarterly results
      const { data: results } = await supabase
        .from('quarterly_results')
        .select('*')
        .eq('stock_id', company.id)
        .order('created_at', { ascending: false });
      
      if (results && results.length > 0) {
        console.log(`\n📋 Current Quarterly Results (${results.length}):`);
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.quarter} ${result.fiscal_year}:`);
          console.log(`      Revenue: ₹${result.revenue || 'N/A'} Cr`);
          console.log(`      Profit: ₹${result.profit || 'N/A'} Cr`);
          console.log(`      EPS: ₹${result.eps || 'N/A'}`);
          console.log(`      Created: ${result.created_at}`);
        });
        
        console.log(`\n⚠️  WARNING: ${symbol} has ${results.length} quarterly result(s)`);
        console.log('   These may be placeholder data, not real results');
        console.log('   New companies typically don\'t have historical data');
      } else {
        console.log('\n✅ No quarterly results found (expected for new company)');
      }
      
      // Check calendar entries
      const { data: calendar } = await supabase
        .from('results_calendar')
        .select('*')
        .eq('stock_id', company.id);
      
      if (calendar && calendar.length > 0) {
        console.log(`\n📅 Calendar Entries (${calendar.length}):`);
        calendar.forEach((entry, index) => {
          console.log(`   ${index + 1}. ${entry.announcement_date} - ${entry.quarter} ${entry.fiscal_year}`);
        });
      } else {
        console.log('\n📅 No calendar entries found');
      }
    } else {
      console.log(`❌ ${symbol} not found in stocks table`);
    }
    
    console.log('\n' + '-'.repeat(60) + '\n');
  }
  
  console.log('🎯 ANALYSIS FOR NEW COMPANIES:');
  console.log('='.repeat(70));
  console.log('📋 EMMVEE & PINELABS Status:');
  console.log('• These are newly listed companies');
  console.log('• They likely don\'t have historical quarterly data yet'); 
  console.log('• Any existing quarterly results are probably placeholder data');
  console.log('• First real results will be Q2 FY2526 (Sep 2025 quarter)');
  console.log('• Results announcement scheduled for Dec 1 & 3, 2025');
  console.log('');
  console.log('🚨 RECOMMENDED ACTIONS:');
  console.log('1. Remove any placeholder quarterly results');
  console.log('2. Keep calendar entries for upcoming announcements');
  console.log('3. Wait for real PDFs to be published');
  console.log('4. Extract actual financial data from official results');
  console.log('');
  console.log('💡 This is normal for newly listed companies!');
}

checkNewCompaniesData().catch(console.error);