/**
 * Populate user watchlist with the original 10 stocks
 */

import { supabase } from './supabase/config/supabase-client';

async function populateWatchlist() {
  console.log('🚀 Populating user watchlist...\n');

  try {
    // Original 10 stocks that should be in the watchlist
    const originalStocks = ['TCS', 'INFY', 'TATASTEEL', 'ICICIBANK', 'HDFCBANK', 'RELIANCE', 'ITC', 'LT', 'WIPRO', 'BAJFINANCE'];
    
    console.log(`Looking for stocks: ${originalStocks.join(', ')}`);
    
    // Get these stocks from the database
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('id, symbol, company_name')
      .in('symbol', originalStocks);

    if (stocksError) throw stocksError;
    
    console.log(`\n📊 Found ${stocks?.length || 0} stocks in database:`);
    stocks?.forEach(stock => {
      console.log(`  - ${stock.symbol}: ${stock.company_name}`);
    });

    if (!stocks || stocks.length === 0) {
      console.error('❌ No matching stocks found in database');
      return;
    }

    // Get current user (assuming first user for demo)
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (!users || users.length === 0) {
      console.error('❌ No users found in database');
      return;
    }
    
    const userId = users[0].id;
    console.log(`\n👤 Using user ID: ${userId}`);

    // Clear existing portfolio for this user
    const { error: deleteError } = await supabase
      .from('user_portfolio')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.log('⚠️  Warning clearing existing portfolio:', deleteError.message);
    } else {
      console.log('🗑️  Cleared existing portfolio');
    }

    // Add stocks to user portfolio
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
      insertedData?.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${stocks[index]?.symbol} - ${stocks[index]?.company_name}`);
      });
    }

    console.log('\n✨ Watchlist population completed!');
    
  } catch (error: any) {
    console.error('❌ Error populating watchlist:', error.message);
    console.error(error.stack);
  }
}

// Run the function
populateWatchlist();