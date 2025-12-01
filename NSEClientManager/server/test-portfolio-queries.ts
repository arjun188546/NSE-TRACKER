import { supabase } from './supabase/config/supabase-client.js';

async function testPortfolioQuery() {
  console.log('🧪 Testing portfolio queries with different approaches...\n');

  try {
    // Method 1: Direct join query (might fail if no foreign keys)
    console.log('1️⃣ Testing with foreign key join...');
    const { data: method1Data, error: method1Error } = await supabase
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

    if (method1Error) {
      console.log('❌ Method 1 failed:', method1Error.message);
    } else {
      console.log('✅ Method 1 success:', method1Data?.length, 'records');
    }

    // Method 2: Manual join using stock IDs
    console.log('\n2️⃣ Testing with manual join...');
    
    // First get the portfolio stock IDs
    const { data: portfolioData, error: portfolioError } = await supabase
      .from('user_portfolio')
      .select('stock_id')
      .eq('user_id', '1c779f94-1e78-4a56-a637-3470df6d19b6');

    if (portfolioError) {
      console.log('❌ Failed to get portfolio stock IDs:', portfolioError.message);
      return;
    }

    console.log(`Found ${portfolioData?.length || 0} stock IDs in portfolio`);

    if (portfolioData && portfolioData.length > 0) {
      const stockIds = portfolioData.map(item => item.stock_id);
      
      // Now get the stock details
      const { data: stocksData, error: stocksError } = await supabase
        .from('stocks')
        .select(`
          id,
          symbol,
          company_name,
          current_price,
          percent_change,
          volume,
          sector,
          market_cap
        `)
        .in('id', stockIds);

      if (stocksError) {
        console.log('❌ Failed to get stock details:', stocksError.message);
      } else {
        console.log('✅ Method 2 success:', stocksData?.length, 'records');
        console.log('📊 Portfolio stocks:');
        stocksData?.forEach((stock, index) => {
          console.log(`  ${index + 1}. ${stock.symbol} - ${stock.company_name} (₹${stock.current_price || 0})`);
        });
      }
    }

    // Method 3: Test NSE stocks query
    console.log('\n3️⃣ Testing NSE stocks query...');
    const { data: allStocks, error: allStocksError } = await supabase
      .from('stocks')
      .select('id, symbol, company_name, current_price, percent_change, sector, market_cap')
      .order('symbol', { ascending: true })
      .limit(10);

    if (allStocksError) {
      console.log('❌ NSE stocks query failed:', allStocksError.message);
    } else {
      console.log(`✅ NSE stocks query success: ${allStocks?.length || 0} stocks found`);
      console.log('📊 Sample NSE stocks:');
      allStocks?.forEach((stock, index) => {
        console.log(`  ${index + 1}. ${stock.symbol} - ${stock.company_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testPortfolioQuery();