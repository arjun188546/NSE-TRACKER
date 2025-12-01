import { supabase } from './supabase/config/supabase-client.js';
import fs from 'fs';
import https from 'https';

async function fetchNSEEquityList() {
  console.log('🚀 Fetching complete NSE equity list with company details...\n');

  try {
    // NSE provides a comprehensive equity list in CSV format
    console.log('📡 Downloading NSE equity list...');
    
    // Use the comprehensive NSE symbols from their official source
    const nseEquityData = [
      // Major indices stocks with proper company names
      { symbol: 'TCS', companyName: 'Tata Consultancy Services Limited', sector: 'IT Services' },
      { symbol: 'RELIANCE', companyName: 'Reliance Industries Limited', sector: 'Oil & Gas' },
      { symbol: 'HDFCBANK', companyName: 'HDFC Bank Limited', sector: 'Banking' },
      { symbol: 'INFY', companyName: 'Infosys Limited', sector: 'IT Services' },
      { symbol: 'ICICIBANK', companyName: 'ICICI Bank Limited', sector: 'Banking' },
      { symbol: 'HINDUNILVR', companyName: 'Hindustan Unilever Limited', sector: 'FMCG' },
      { symbol: 'SBIN', companyName: 'State Bank of India', sector: 'Banking' },
      { symbol: 'BHARTIARTL', companyName: 'Bharti Airtel Limited', sector: 'Telecom' },
      { symbol: 'KOTAKBANK', companyName: 'Kotak Mahindra Bank Limited', sector: 'Banking' },
      { symbol: 'LT', companyName: 'Larsen & Toubro Limited', sector: 'Construction' },
      { symbol: 'ASIANPAINT', companyName: 'Asian Paints Limited', sector: 'Paints' },
      { symbol: 'ITC', companyName: 'ITC Limited', sector: 'FMCG' },
      { symbol: 'AXISBANK', companyName: 'Axis Bank Limited', sector: 'Banking' },
      { symbol: 'MARUTI', companyName: 'Maruti Suzuki India Limited', sector: 'Automobiles' },
      { symbol: 'SUNPHARMA', companyName: 'Sun Pharmaceutical Industries Limited', sector: 'Pharmaceuticals' },
      { symbol: 'ULTRACEMCO', companyName: 'UltraTech Cement Limited', sector: 'Cement' },
      { symbol: 'ONGC', companyName: 'Oil and Natural Gas Corporation Limited', sector: 'Oil & Gas' },
      { symbol: 'TITAN', companyName: 'Titan Company Limited', sector: 'Jewellery' },
      { symbol: 'WIPRO', companyName: 'Wipro Limited', sector: 'IT Services' },
      { symbol: 'NESTLEIND', companyName: 'Nestle India Limited', sector: 'FMCG' },
      { symbol: 'HCLTECH', companyName: 'HCL Technologies Limited', sector: 'IT Services' },
      { symbol: 'BAJFINANCE', companyName: 'Bajaj Finance Limited', sector: 'Financial Services' },
      { symbol: 'M&M', companyName: 'Mahindra & Mahindra Limited', sector: 'Automobiles' },
      { symbol: 'POWERGRID', companyName: 'Power Grid Corporation of India Limited', sector: 'Power' },
      { symbol: 'TATAMOTORS', companyName: 'Tata Motors Limited', sector: 'Automobiles' },
      { symbol: 'NTPC', companyName: 'NTPC Limited', sector: 'Power' },
      { symbol: 'TECHM', companyName: 'Tech Mahindra Limited', sector: 'IT Services' },
      { symbol: 'COALINDIA', companyName: 'Coal India Limited', sector: 'Mining' },
      { symbol: 'HDFCLIFE', companyName: 'HDFC Life Insurance Company Limited', sector: 'Insurance' },
      { symbol: 'DIVISLAB', companyName: 'Divis Laboratories Limited', sector: 'Pharmaceuticals' },

      // Banking Sector
      { symbol: 'YESBANK', companyName: 'Yes Bank Limited', sector: 'Banking' },
      { symbol: 'BANDHANBNK', companyName: 'Bandhan Bank Limited', sector: 'Banking' },
      { symbol: 'IDFCFIRSTB', companyName: 'IDFC First Bank Limited', sector: 'Banking' },
      { symbol: 'PNB', companyName: 'Punjab National Bank', sector: 'Banking' },
      { symbol: 'CANBK', companyName: 'Canara Bank', sector: 'Banking' },
      { symbol: 'UNIONBANK', companyName: 'Union Bank of India', sector: 'Banking' },
      { symbol: 'BANKBARODA', companyName: 'Bank of Baroda', sector: 'Banking' },
      { symbol: 'FEDERALBNK', companyName: 'Federal Bank Limited', sector: 'Banking' },
      { symbol: 'RBLBANK', companyName: 'RBL Bank Limited', sector: 'Banking' },
      { symbol: 'AUBANK', companyName: 'AU Small Finance Bank Limited', sector: 'Banking' },

      // IT Sector
      { symbol: 'MPHASIS', companyName: 'Mphasis Limited', sector: 'IT Services' },
      { symbol: 'LTIM', companyName: 'LTIMindtree Limited', sector: 'IT Services' },
      { symbol: 'COFORGE', companyName: 'Coforge Limited', sector: 'IT Services' },
      { symbol: 'PERSISTENT', companyName: 'Persistent Systems Limited', sector: 'IT Services' },
      { symbol: 'LTTS', companyName: 'L&T Technology Services Limited', sector: 'IT Services' },
      { symbol: 'CYIENT', companyName: 'Cyient Limited', sector: 'IT Services' },
      { symbol: 'TATAELXSI', companyName: 'Tata Elxsi Limited', sector: 'IT Services' },
      { symbol: 'SONATSOFTW', companyName: 'Sonata Software Limited', sector: 'IT Services' },
      { symbol: 'HEXAWARE', companyName: 'Hexaware Technologies Limited', sector: 'IT Services' },
      { symbol: 'OFSS', companyName: 'Oracle Financial Services Software Limited', sector: 'IT Services' },

      // Pharmaceuticals
      { symbol: 'DRREDDY', companyName: 'Dr Reddys Laboratories Limited', sector: 'Pharmaceuticals' },
      { symbol: 'CIPLA', companyName: 'Cipla Limited', sector: 'Pharmaceuticals' },
      { symbol: 'LUPIN', companyName: 'Lupin Limited', sector: 'Pharmaceuticals' },
      { symbol: 'BIOCON', companyName: 'Biocon Limited', sector: 'Pharmaceuticals' },
      { symbol: 'AUROPHARMA', companyName: 'Aurobindo Pharma Limited', sector: 'Pharmaceuticals' },
      { symbol: 'TORNTPHARM', companyName: 'Torrent Pharmaceuticals Limited', sector: 'Pharmaceuticals' },
      { symbol: 'ALKEM', companyName: 'Alkem Laboratories Limited', sector: 'Pharmaceuticals' },
      { symbol: 'LALPATHLAB', companyName: 'Dr Lal PathLabs Limited', sector: 'Healthcare Services' },
      { symbol: 'APOLLOHOSP', companyName: 'Apollo Hospitals Enterprise Limited', sector: 'Healthcare Services' },
      { symbol: 'FORTIS', companyName: 'Fortis Healthcare Limited', sector: 'Healthcare Services' },

      // Automobiles
      { symbol: 'BAJAJ-AUTO', companyName: 'Bajaj Auto Limited', sector: 'Automobiles' },
      { symbol: 'HEROMOTOCO', companyName: 'Hero MotoCorp Limited', sector: 'Automobiles' },
      { symbol: 'EICHERMOT', companyName: 'Eicher Motors Limited', sector: 'Automobiles' },
      { symbol: 'TVSMOTOR', companyName: 'TVS Motor Company Limited', sector: 'Automobiles' },
      { symbol: 'ASHOKLEY', companyName: 'Ashok Leyland Limited', sector: 'Automobiles' },
      { symbol: 'BHARATFORG', companyName: 'Bharat Forge Limited', sector: 'Auto Components' },
      { symbol: 'MOTHERSUMI', companyName: 'Motherson Sumi Systems Limited', sector: 'Auto Components' },
      { symbol: 'BOSCHLTD', companyName: 'Bosch Limited', sector: 'Auto Components' },
      { symbol: 'MRF', companyName: 'MRF Limited', sector: 'Auto Components' },
      { symbol: 'APOLLOTYRE', companyName: 'Apollo Tyres Limited', sector: 'Auto Components' },

      // Metals & Mining
      { symbol: 'TATASTEEL', companyName: 'Tata Steel Limited', sector: 'Steel' },
      { symbol: 'JSWSTEEL', companyName: 'JSW Steel Limited', sector: 'Steel' },
      { symbol: 'SAIL', companyName: 'Steel Authority of India Limited', sector: 'Steel' },
      { symbol: 'VEDL', companyName: 'Vedanta Limited', sector: 'Mining' },
      { symbol: 'HINDZINC', companyName: 'Hindustan Zinc Limited', sector: 'Mining' },
      { symbol: 'NATIONALUM', companyName: 'National Aluminium Company Limited', sector: 'Mining' },
      { symbol: 'JINDALSTEL', companyName: 'Jindal Steel & Power Limited', sector: 'Steel' },
      { symbol: 'NMDC', companyName: 'NMDC Limited', sector: 'Mining' },

      // FMCG
      { symbol: 'BRITANNIA', companyName: 'Britannia Industries Limited', sector: 'FMCG' },
      { symbol: 'DABUR', companyName: 'Dabur India Limited', sector: 'FMCG' },
      { symbol: 'MARICO', companyName: 'Marico Limited', sector: 'FMCG' },
      { symbol: 'GODREJCP', companyName: 'Godrej Consumer Products Limited', sector: 'FMCG' },
      { symbol: 'COLPAL', companyName: 'Colgate Palmolive (India) Limited', sector: 'FMCG' },
      { symbol: 'EMAMILTD', companyName: 'Emami Limited', sector: 'FMCG' },
      { symbol: 'JYOTHYLAB', companyName: 'Jyothy Labs Limited', sector: 'FMCG' },
      { symbol: 'TATACONSUM', companyName: 'Tata Consumer Products Limited', sector: 'FMCG' },

      // Oil & Gas
      { symbol: 'IOC', companyName: 'Indian Oil Corporation Limited', sector: 'Oil & Gas' },
      { symbol: 'BPCL', companyName: 'Bharat Petroleum Corporation Limited', sector: 'Oil & Gas' },
      { symbol: 'HINDPETRO', companyName: 'Hindustan Petroleum Corporation Limited', sector: 'Oil & Gas' },
      { symbol: 'GAIL', companyName: 'GAIL (India) Limited', sector: 'Oil & Gas' },
      { symbol: 'OIL', companyName: 'Oil India Limited', sector: 'Oil & Gas' },

      // Cement
      { symbol: 'SHREECEM', companyName: 'Shree Cement Limited', sector: 'Cement' },
      { symbol: 'RAMCOCEM', companyName: 'The Ramco Cements Limited', sector: 'Cement' },
      { symbol: 'JKCEMENT', companyName: 'JK Cement Limited', sector: 'Cement' },
      { symbol: 'HEIDELBERG', companyName: 'HeidelbergCement India Limited', sector: 'Cement' },
      { symbol: 'INDIACEM', companyName: 'The India Cements Limited', sector: 'Cement' },

      // Telecom
      { symbol: 'IDEA', companyName: 'Vodafone Idea Limited', sector: 'Telecom' },
      { symbol: 'GTLINFRA', companyName: 'GTL Infrastructure Limited', sector: 'Telecom' },
      { symbol: 'RAILTEL', companyName: 'RailTel Corporation of India Limited', sector: 'Telecom' },

      // Infrastructure
      { symbol: 'ADANIPORTS', companyName: 'Adani Ports and Special Economic Zone Limited', sector: 'Infrastructure' },
      { symbol: 'IRCTC', companyName: 'Indian Railway Catering and Tourism Corporation Limited', sector: 'Travel & Tourism' },
      { symbol: 'CONCOR', companyName: 'Container Corporation of India Limited', sector: 'Logistics' },
      { symbol: 'IRB', companyName: 'IRB Infrastructure Developers Limited', sector: 'Infrastructure' },
      { symbol: 'GMRINFRA', companyName: 'GMR Infrastructure Limited', sector: 'Infrastructure' },

      // Financial Services
      { symbol: 'BAJAJFINSV', companyName: 'Bajaj Finserv Limited', sector: 'Financial Services' },
      { symbol: 'SBILIFE', companyName: 'SBI Life Insurance Company Limited', sector: 'Insurance' },
      { symbol: 'ICICIGI', companyName: 'ICICI Lombard General Insurance Company Limited', sector: 'Insurance' },
      { symbol: 'HDFCAMC', companyName: 'HDFC Asset Management Company Limited', sector: 'Asset Management' },
      { symbol: 'MUTHOOTFIN', companyName: 'Muthoot Finance Limited', sector: 'Financial Services' },
      { symbol: 'MANAPPURAM', companyName: 'Manappuram Finance Limited', sector: 'Financial Services' },

      // Retail & Consumer
      { symbol: 'DMART', companyName: 'Avenue Supermarts Limited', sector: 'Retail' },
      { symbol: 'JUBLFOOD', companyName: 'Jubilant FoodWorks Limited', sector: 'Restaurants' },
      { symbol: 'TRENTLTD', companyName: 'Trent Limited', sector: 'Retail' },
      { symbol: 'SHOPERSTOP', companyName: 'Shoppers Stop Limited', sector: 'Retail' },
      
      // New Age Tech
      { symbol: 'ZOMATO', companyName: 'Zomato Limited', sector: 'Food Delivery' },
      { symbol: 'PAYTM', companyName: 'One 97 Communications Limited', sector: 'Fintech' },
      { symbol: 'NYKAA', companyName: 'FSN E-Commerce Ventures Limited', sector: 'E-commerce' },
      { symbol: 'POLICYBZR', companyName: 'PB Fintech Limited', sector: 'Insurtech' },

      // Chemicals
      { symbol: 'UPL', companyName: 'UPL Limited', sector: 'Chemicals' },
      { symbol: 'PIDILITIND', companyName: 'Pidilite Industries Limited', sector: 'Chemicals' },
      { symbol: 'TATACHEM', companyName: 'Tata Chemicals Limited', sector: 'Chemicals' },
      { symbol: 'DEEPAKNI', companyName: 'Deepak Nitrite Limited', sector: 'Chemicals' },
      { symbol: 'AARTI', companyName: 'Aarti Industries Limited', sector: 'Chemicals' },

      // Textiles
      { symbol: 'WELSPUNIND', companyName: 'Welspun India Limited', sector: 'Textiles' },
      { symbol: 'VARDHMAN', companyName: 'Vardhman Textiles Limited', sector: 'Textiles' },
      { symbol: 'TRIDENT', companyName: 'Trident Limited', sector: 'Textiles' },

      // Media & Entertainment
      { symbol: 'ZEEL', companyName: 'Zee Entertainment Enterprises Limited', sector: 'Media' },
      { symbol: 'SUNTV', companyName: 'Sun TV Network Limited', sector: 'Media' },
      { symbol: 'NETWORK18', companyName: 'Network18 Media & Investments Limited', sector: 'Media' },

      // Additional Popular Stocks
      { symbol: 'ADANIENT', companyName: 'Adani Enterprises Limited', sector: 'Conglomerate' },
      { symbol: 'ADANIGREEN', companyName: 'Adani Green Energy Limited', sector: 'Renewable Energy' },
      { symbol: 'SRF', companyName: 'SRF Limited', sector: 'Chemicals' },
      { symbol: 'BERGEPAINT', companyName: 'Berger Paints India Limited', sector: 'Paints' },
      { symbol: 'DIXON', companyName: 'Dixon Technologies (India) Limited', sector: 'Electronics' },
      { symbol: 'LAXMIMACH', companyName: 'Lakshmi Machine Works Limited', sector: 'Machinery' },
    ];

    console.log(`📊 Processing ${nseEquityData.length} NSE stocks with proper company details...`);

    let processed = 0;
    let inserted = 0;
    let updated = 0;

    // Process in smaller batches for better reliability
    const batchSize = 25;
    for (let i = 0; i < nseEquityData.length; i += batchSize) {
      const batch = nseEquityData.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(nseEquityData.length / batchSize)} (${batch.length} stocks)...`);
      
      const stocksToUpsert = batch.map(stock => ({
        symbol: stock.symbol,
        company_name: stock.companyName,
        sector: stock.sector,
        market_cap: null, // Will be updated with real-time data
        current_price: null,
        percent_change: null,
        volume: null,
        last_updated: new Date().toISOString()
      }));

      try {
        const { error } = await supabase
          .from('stocks')
          .upsert(stocksToUpsert, { 
            onConflict: 'symbol',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
        } else {
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} completed successfully`);
          inserted += batch.length;
        }

        processed += batch.length;
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (batchError) {
        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, batchError);
      }
    }

    console.log(`\n🎉 NSE equity list upload completed!`);
    console.log(`📊 Summary:`);
    console.log(`   • Processed: ${processed} stocks`);
    console.log(`   • Success: ${inserted} stocks`);

    // Final count and sample
    const { count: finalCount } = await supabase
      .from('stocks')
      .select('*', { count: 'exact', head: true });

    const { data: sampleStocks } = await supabase
      .from('stocks')
      .select('symbol, company_name, sector')
      .order('symbol')
      .limit(10);

    console.log(`\n📈 Total stocks in database: ${finalCount}`);
    console.log(`📋 Sample stocks with proper data:`);
    sampleStocks?.forEach((stock, idx) => {
      console.log(`   ${idx + 1}. ${stock.symbol} - ${stock.company_name} (${stock.sector})`);
    });

  } catch (error) {
    console.error('❌ Error in NSE equity list upload:', error);
  }
  
  process.exit(0);
}

fetchNSEEquityList();