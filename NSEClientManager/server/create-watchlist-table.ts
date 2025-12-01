import { supabase } from './supabase/config/supabase-client.js';

async function createTableAndPopulateWatchlist() {
  console.log('🚀 Creating user_portfolio table and populating with original stocks...\n');

  try {
    console.log('📋 Please run this SQL in your Supabase dashboard SQL editor:');
    console.log('https://supabase.com/dashboard/project/xnfscozxsooaunugyxdu/sql');
    console.log('\n--- COPY AND PASTE THIS SQL ---');
    console.log(`
-- Create user_portfolio table
CREATE TABLE IF NOT EXISTS user_portfolio (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  stock_id VARCHAR NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, stock_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_portfolio_user_id ON user_portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolio_stock_id ON user_portfolio(stock_id);

-- Insert original 10 stocks for demo user
INSERT INTO user_portfolio (user_id, stock_id)
SELECT 
  '1c779f94-1e78-4a56-a637-3470df6d19b6' as user_id,
  s.id as stock_id
FROM stocks s 
WHERE s.symbol IN ('TCS', 'INFY', 'TATASTEEL', 'ICICIBANK', 'HDFCBANK', 'RELIANCE', 'ITC', 'LT', 'WIPRO', 'BAJFINANCE')
ON CONFLICT (user_id, stock_id) DO NOTHING;
`);
    console.log('--- END SQL ---\n');

    // After running the SQL, let's test the connection
    console.log('⏳ Testing connection (run this script again after executing the SQL)...');
    
    const { data: testData, error: testError } = await supabase
      .from('user_portfolio')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('❌ Table not created yet. Please run the SQL above first.');
      return;
    }
    
    console.log('✅ Table exists! Testing portfolio query...');
    
    // Test the portfolio query
    const { data: portfolioData, error: portfolioError } = await supabase
      .from('user_portfolio')
      .select(`
        stocks (
          id,
          symbol,
          company_name,
          current_price,
          percent_change
        )
      `)
      .eq('user_id', '1c779f94-1e78-4a56-a637-3470df6d19b6');
    
    if (portfolioError) {
      console.log('❌ Portfolio query error:', portfolioError);
      return;
    }
    
    console.log(`✅ Portfolio query successful! Found ${portfolioData?.length || 0} stocks:`);
    portfolioData?.forEach((item: any, index: number) => {
      console.log(`  ${index + 1}. ${item.stocks.symbol} - ${item.stocks.company_name}`);
    });
    
    console.log('\n🎉 Setup complete! Your watchlist should now show the original 10 stocks.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

createTableAndPopulateWatchlist();