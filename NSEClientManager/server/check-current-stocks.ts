import { supabase } from './supabase/config/supabase-client.js';

async function checkCurrentStocks() {
  console.log('📊 Checking current stocks in database...\n');
  
  try {
    const { count, error: countError } = await supabase
      .from('stocks')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error getting count:', countError);
      return;
    }
    
    console.log(`Current stocks in database: ${count}`);
    
    const { data: sampleStocks } = await supabase
      .from('stocks')
      .select('symbol, company_name')
      .limit(10);
    
    console.log('Sample stocks:', sampleStocks?.map(s => `${s.symbol} - ${s.company_name}`).join('\n  '));
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkCurrentStocks();