import { supabase } from './supabase/config/supabase-client.js';

async function checkPrices() {
  console.log('Checking stock prices in database...\n');
  
  const { data: stocks, error } = await supabase
    .from('stocks')
    .select('symbol, company_name, current_price, percent_change, last_updated')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${stocks?.length} stocks\n`);
  stocks?.forEach(stock => {
    console.log(`${stock.symbol}: ₹${stock.current_price || 0} (${stock.percent_change || 0}%) - Last updated: ${stock.last_updated || 'Never'}`);
  });
  
  // Check total count
  const { count } = await supabase
    .from('stocks')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nTotal stocks: ${count}`);
  
  // Check how many have prices
  const { count: withPrices } = await supabase
    .from('stocks')
    .select('*', { count: 'exact', head: true })
    .not('current_price', 'is', null)
    .gt('current_price', 0);
  
  console.log(`Stocks with prices: ${withPrices || 0}`);
}

checkPrices().catch(console.error);
