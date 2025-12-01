import { supabase } from './supabase/config/supabase-client.js';

// Initial price data for commonly tracked stocks
const initialPrices = [
  { symbol: 'TCS', price: 3135.90, change: 1.12 },
  { symbol: 'INFY', price: 1558.10, change: -0.65 },
  { symbol: 'RELIANCE', price: 1285.50, change: 0.85 },
  { symbol: 'HDFCBANK', price: 1748.90, change: 0.45 },
  { symbol: 'ICICIBANK', price: 1285.60, change: 0.78 },
  { symbol: 'ITC', price: 485.70, change: 0.52 },
  { symbol: 'BAJFINANCE', price: 7245.30, change: 1.35 },
  { symbol: 'WIPRO', price: 298.45, change: -1.25 },
  { symbol: 'TATASTEEL', price: 172.40, change: -0.47 },
  { symbol: 'LT', price: 3685.20, change: 0.92 },
  { symbol: 'BHARTIARTL', price: 1685.40, change: -0.32 },
  { symbol: 'AXISBANK', price: 1148.70, change: 1.15 },
  { symbol: 'HINDUNILVR', price: 2384.50, change: 0.68 },
  { symbol: 'SBIN', price: 825.30, change: 1.45 },
  { symbol: 'KOTAKBANK', price: 1734.80, change: 0.58 },
  { symbol: 'ASIANPAINT', price: 2456.70, change: -0.35 },
  { symbol: 'MARUTI', price: 12245.50, change: 0.95 },
  { symbol: 'SUNPHARMA', price: 1784.30, change: 0.42 },
  { symbol: 'TITAN', price: 3624.80, change: 1.12 },
  { symbol: 'NESTLEIND', price: 2456.90, change: 0.28 },
];

async function populateInitialPrices() {
  console.log('🔄 Populating initial prices for top stocks...\n');
  
  let updated = 0;
  let errors = 0;
  
  for (const stock of initialPrices) {
    try {
      const { error } = await supabase
        .from('stocks')
        .update({
          current_price: stock.price,
          percent_change: stock.change,
          last_updated: new Date().toISOString()
        })
        .eq('symbol', stock.symbol);
      
      if (error) {
        console.error(`❌ Error updating ${stock.symbol}:`, error.message);
        errors++;
      } else {
        console.log(`✅ Updated ${stock.symbol}: ₹${stock.price} (${stock.change > 0 ? '+' : ''}${stock.change}%)`);
        updated++;
      }
    } catch (err) {
      console.error(`❌ Failed to update ${stock.symbol}:`, err);
      errors++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updated} stocks`);
  console.log(`   ❌ Errors: ${errors} stocks`);
  
  // Verify updates
  const { data: verifyData } = await supabase
    .from('stocks')
    .select('symbol, current_price')
    .in('symbol', initialPrices.map(s => s.symbol))
    .not('current_price', 'is', null);
  
  console.log(`\n✨ Stocks with prices now: ${verifyData?.length || 0}/${initialPrices.length}`);
}

populateInitialPrices().catch(console.error);
