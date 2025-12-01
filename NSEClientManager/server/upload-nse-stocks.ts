import { supabase } from './supabase/config/supabase-client.js';
import https from 'https';

interface NSEStock {
  symbol: string;
  companyName: string;
  series: string;
  listingDate: string;
  isinNumber: string;
  marketLot: number;
  faceValue: number;
}

interface NSEStockPrice {
  symbol: string;
  lastPrice: number;
  change: number;
  pChange: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  totalTradedVolume: number;
  totalTradedValue: number;
}

async function fetchNSEData(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function uploadAllNSEStocks() {
  console.log('🚀 Starting comprehensive NSE stocks upload to Supabase...\n');

  try {
    console.log('📡 Fetching all NSE equity stocks...');
    
    // Fetch all equity stocks list from NSE
    const equityListUrl = 'https://www.nseindia.com/api/equity-stockIndices?index=SECURITIES%20IN%20F%26O';
    
    console.log('🔍 Trying alternative NSE APIs...');
    
    // Alternative: Try to get all symbols from market data
    const allSymbolsUrl = 'https://www.nseindia.com/api/allIndices';
    
    let allStocks: any[] = [];
    
    try {
      console.log('Fetching from all indices API...');
      const indicesData = await fetchNSEData(allSymbolsUrl);
      console.log('Indices data sample:', Object.keys(indicesData).slice(0, 5));
    } catch (error) {
      console.log('NSE API direct access failed, using fallback approach...');
    }

    // Fallback: Use a comprehensive list of NSE symbols
    console.log('📋 Using comprehensive NSE symbols list...');
    
    const nseSymbols = [
      // Top 50 by market cap
      'TCS', 'RELIANCE', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'KOTAKBANK',
      'LT', 'ASIANPAINT', 'ITC', 'AXISBANK', 'MARUTI', 'SUNPHARMA', 'ULTRACEMCO', 'ONGC', 'TITAN',
      'WIPRO', 'NESTLEIND', 'HCLTECH', 'BAJFINANCE', 'M&M', 'POWERGRID', 'TATAMOTORS', 'NTPC', 'TECHM',
      'COALINDIA', 'HDFCLIFE', 'DIVISLAB', 'BAJAJFINSV', 'GRASIM', 'ADANIPORTS', 'BRITANNIA', 'DRREDDY',
      'EICHERMOT', 'APOLLOHOSP', 'BPCL', 'CIPLA', 'SHREECEM', 'TATASTEEL', 'HINDPETRO', 'JSWSTEEL',
      'INDUSINDBK', 'BAJAJ-AUTO', 'HEROMOTOCO', 'TATACONSUM', 'UPL', 'SBILIFE',
      
      // Next tier stocks
      'ADANIENT', 'GODREJCP', 'PIDILITIND', 'DABUR', 'MARICO', 'BIOCON', 'CADILAHC', 'LUPIN', 'AUROPHARMA',
      'TORNTPHARM', 'ALKEM', 'CONCOR', 'GAIL', 'IOC', 'RELCAPITAL', 'YESBANK', 'BANDHANBNK', 'IDFCFIRSTB',
      'PNB', 'CANBK', 'UNIONBANK', 'BANKBARODA', 'FEDERALBNK', 'RBLBANK', 'AUBANK', 'SOUTHBANK',
      
      // IT Sector
      'MPHASIS', 'MINDTREE', 'LTTS', 'COFORGE', 'PERSISTENT', 'CYIENT', 'KPITTECH', 'ROLTA', 'NIITTECH',
      'L&TFH', 'LTIM', 'OFSS', 'TANLA', '3IINFOTECH', 'TATAELXSI', 'SONATSOFTW', 'HEXAWARE',
      
      // Auto Sector
      'TVSMOTOR', 'BAJAJHLDNG', 'ASHOKLEY', 'BHARATFORG', 'MOTHERSUMI', 'BHEL', 'APOLLOTYRE', 'MRF',
      'ESCORTS', 'FORCE', 'MAHINDCIE', 'SUNDRMFAST', 'BOSCHLTD', 'CUMMINSIND', 'EXIDEIND',
      
      // Pharma & Healthcare
      'REDDY', 'SUNPHARMA', 'CIPLA', 'DRREDDY', 'LUPIN', 'BIOCON', 'CADILAHC', 'AUROPHARMA', 'TORNTPHARM',
      'ALKEM', 'DIVIS', 'LALPATHLAB', 'METROPOLIS', 'THYROCARE', 'FORTIS', 'MAXHEALTH', 'APOLLOHOSP',
      
      // FMCG & Consumer
      'HINDUNILVR', 'ITC', 'NESTLEIND', 'BRITANNIA', 'DABUR', 'MARICO', 'GODREJCP', 'COLPAL',
      'EMAMILTD', 'JYOTHYLAB', 'RADICO', 'MCDOWELL-N', 'UBL', 'VBLVOL', 'CCL', 'VBL',
      
      // Metals & Mining
      'TATASTEEL', 'JSWSTEEL', 'SAIL', 'COALINDIA', 'NMDC', 'VEDL', 'HINDZINC', 'NATIONALUM',
      'JINDALSTEL', 'RATNAMANI', 'WELCORP', 'WELSPUNIND', 'JSPL', 'MOIL',
      
      // Infrastructure & Construction
      'LT', 'NCCLTD', 'IRB', 'GMRINFRA', 'PFC', 'RECLTD', 'IRCTC', 'CONCOR', 'ADANIPORTS',
      'JSWINFRA', 'NBCC', 'HUDCO', 'NHPC', 'SJVN', 'THERMAX',
      
      // Telecom & Technology
      'BHARTIARTL', 'RCOM', 'IDEA', 'GTLINFRA', 'RPOWER', 'HFCL', 'STERLTECH', 'TEJAS', 'RAILTEL',
      
      // Financial Services
      'HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'AXISBANK', 'SBIN', 'INDUSINDBK', 'YESBANK', 'BANDHANBNK',
      'IDFCFIRSTB', 'PNB', 'CANBK', 'UNIONBANK', 'BANKBARODA', 'FEDERALBNK', 'RBLBANK', 'AUBANK',
      'BAJFINANCE', 'BAJAJFINSV', 'M&MFIN', 'SHRIRAMFIN', 'LICHSGFIN', 'DHFL', 'INDIABULLS',
      'SRTRANSFIN', 'MANAPPURAM', 'MUTHOOTFIN', 'CHOLAFIN', 'EDELWEISS',
      
      // Energy & Oil
      'RELIANCE', 'ONGC', 'IOC', 'BPCL', 'HINDPETRO', 'GAIL', 'OIL', 'MRPL', 'CPCL', 'TATAPOWER',
      'NTPC', 'POWERGRID', 'ADANIPOWER', 'JSPL', 'TORNTPOWER', 'NHPC', 'SJVN',
      
      // Retail & E-commerce
      'DMART', 'JUBLFOOD', 'WESTLIFE', 'SPECIALITY', 'SHOPERSTOP', 'TRENTLTD', 'PAGEIND',
      
      // Textiles
      'WELSPUNIND', 'RSWM', 'CENTURYTEXT', 'VARDHMAN', 'TRIDENT', 'ALOKTEXT', 'KPR', 'GUJALKALI',
      
      // Chemicals
      'UPL', 'PIDILITIND', 'ASIANPAINT', 'BERGERPAINTS', 'AKZOINDIA', 'KANSAINER', 'DEEPAKNI',
      'AARTI', 'CHEMCON', 'CLEAN', 'TATACHEM', 'GUJALKALI', 'NOCIL', 'GHCL',
      
      // Small & Mid Cap Popular Stocks
      'IRCTC', 'ZOMATO', 'PAYTM', 'NYKAA', 'POLICYBZR', 'CARTRADE', 'EASEMYTRIP', 'DEVYANI',
      'SAPPHIRE', 'MEDPLUS', 'TATACONSUMER', 'TATACOMM', 'IDEA', 'VODAFONE', 'BHARTI',
      
      // REITs & InvITs
      'EMBASSY', 'MINDSPACE', 'BROOKFIELD', 'INDIGRID', 'INDIANIVESH',
      
      // Others
      'DIXON', 'AMBER', 'ROUTE', 'LAXMIMACH', 'VIJAYA', 'KRBL', 'KTKBANK', 'DCMSHRIRAM',
      'HEIDELBERG', 'SHREECEM', 'RAMCOCEM', 'JKCEMENT', 'INDIACEM', 'ORIENTCEM'
    ];

    console.log(`📊 Processing ${nseSymbols.length} NSE symbols...`);
    
    let processed = 0;
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < nseSymbols.length; i += batchSize) {
      const batch = nseSymbols.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(nseSymbols.length / batchSize)} (${batch.length} stocks)...`);
      
      const stocksToProcess = batch.map(symbol => ({
        symbol: symbol.trim(),
        company_name: `${symbol.trim()} Limited`, // Will be updated with real data later
        sector: 'Unknown', // Will be updated
        market_cap: null,
        current_price: null,
        percent_change: null,
        volume: null,
        last_updated: new Date().toISOString()
      }));

      try {
        const { error } = await supabase
          .from('stocks')
          .upsert(stocksToProcess, { 
            onConflict: 'symbol',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
          errors += batch.length;
        } else {
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} completed`);
          inserted += batch.length;
        }

        processed += batch.length;
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (batchError) {
        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, batchError);
        errors += batch.length;
      }
    }

    console.log(`\n🎉 NSE stocks upload completed!`);
    console.log(`📊 Summary:`);
    console.log(`   • Processed: ${processed} stocks`);
    console.log(`   • Success: ${inserted} stocks`);
    console.log(`   • Errors: ${errors} stocks`);

    // Final count check
    const { count: finalCount } = await supabase
      .from('stocks')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📈 Total stocks in database: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Error in NSE stocks upload:', error);
  }
  
  process.exit(0);
}

uploadAllNSEStocks();