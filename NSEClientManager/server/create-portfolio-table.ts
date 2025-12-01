import { supabase } from './supabase/config/supabase-client.js';

async function createUserPortfolioTable() {
  console.log('🚀 Creating user_portfolio table...');
  
  try {
    // First check if table exists
    const { data: existingData, error: checkError } = await supabase
      .from('user_portfolio')
      .select('*')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ user_portfolio table already exists');
      return;
    }
    
    console.log('Table does not exist, creating it...');
    
    // Create table using raw SQL
    const createTableSQL = `
      CREATE TABLE user_portfolio (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        stock_id VARCHAR NOT NULL,
        added_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, stock_id)
      );
      
      CREATE INDEX idx_user_portfolio_user_id ON user_portfolio(user_id);
      CREATE INDEX idx_user_portfolio_stock_id ON user_portfolio(stock_id);
    `;
    
    // Note: We'll need to run this SQL manually in Supabase dashboard
    console.log('📋 SQL to run manually in Supabase dashboard:');
    console.log(createTableSQL);
    
    // For now, let's proceed assuming the table exists and populate it
    console.log('⚠️  Please run the above SQL in Supabase dashboard first');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

createUserPortfolioTable();