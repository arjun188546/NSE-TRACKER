import { supabase } from './supabase/config/supabase-client.js';

async function setupWatchlistData() {
  console.log('🚀 Setting up watchlist with original 10 stocks...\n');

  try {
    // Original 10 stocks symbols
    const originalStocks = ['TCS', 'INFY', 'TATASTEEL', 'ICICIBANK', 'HDFCBANK', 'RELIANCE', 'ITC', 'LT', 'WIPRO', 'BAJFINANCE'];
    
    console.log(`Looking for stocks: ${originalStocks.join(', ')}`);
    
    // Get these stocks from the database
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('id, symbol, company_name')
      .in('symbol', originalStocks);

    if (stocksError) {
      console.error('Error fetching stocks:', stocksError);
      return;
    }
    
    console.log(`\n📊 Found ${stocks?.length || 0} stocks in database:`);
    stocks?.forEach(stock => {
      console.log(`  - ${stock.symbol}: ${stock.company_name}`);
    });

    if (!stocks || stocks.length === 0) {
      console.error('❌ No matching stocks found in database');
      return;
    }

    // Get first user (demo user)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
      
    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found:', usersError);
      return;
    }
    
    const userId = users[0].id;
    console.log(`\n👤 Using user: ${users[0].email} (${userId})`);

    // Try to check if user_portfolio table exists by testing a query
    console.log('\n🔍 Checking if user_portfolio table exists...');
    const { data: existingPortfolio, error: portfolioError } = await supabase
      .from('user_portfolio')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (portfolioError) {
      console.log('❌ user_portfolio table does not exist or has error:', portfolioError.message);
      console.log('\n📋 Please create the user_portfolio table first by running this SQL in Supabase dashboard:');
      console.log(`
CREATE TABLE user_portfolio (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  stock_id VARCHAR NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, stock_id)
);

CREATE INDEX idx_user_portfolio_user_id ON user_portfolio(user_id);
CREATE INDEX idx_user_portfolio_stock_id ON user_portfolio(stock_id);
      `);
      return;
    }

    console.log('✅ user_portfolio table exists');

    // Clear existing portfolio
    const { error: deleteError } = await supabase
      .from('user_portfolio')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.log('⚠️  Warning clearing existing portfolio:', deleteError.message);
    } else {
      console.log('🗑️  Cleared existing portfolio');
    }

    // Add stocks to portfolio
    const portfolioEntries = stocks.map(stock => ({
      user_id: userId,
      stock_id: stock.id,
      added_at: new Date().toISOString()
    }));

    const { data: insertedData, error: insertError } = await supabase
      .from('user_portfolio')
      .insert(portfolioEntries)
      .select();

    if (insertError) {
      console.error('❌ Error inserting portfolio entries:', insertError.message);
    } else {
      console.log(`\n✅ Successfully added ${insertedData?.length || 0} stocks to watchlist:`);
      stocks.forEach((stock, index) => {
        console.log(`  ${index + 1}. ${stock.symbol} - ${stock.company_name}`);
      });
    }

    console.log('\n🎉 Watchlist setup completed!');
    console.log('📱 You can now see your 10 stocks in the dashboard watchlist tab');
    
  } catch (error) {
    console.error('❌ Error setting up watchlist:', error);
  }
  
  process.exit(0);
}

setupWatchlistData();