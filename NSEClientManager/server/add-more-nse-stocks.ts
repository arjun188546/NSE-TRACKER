import { supabase } from './supabase/config/supabase-client.js';

async function addMoreNSEStocks() {
  console.log('🚀 Adding more NSE stocks to reach comprehensive coverage...\n');

  // Additional NSE stocks across various sectors and market caps
  const additionalStocks = [
    // Small & Mid Cap IT
    { symbol: 'KPITTECH', companyName: 'KPIT Technologies Limited', sector: 'IT Services' },
    { symbol: 'ROLTA', companyName: 'Rolta India Limited', sector: 'IT Services' },
    { symbol: 'ZENTEC', companyName: 'Zen Technologies Limited', sector: 'IT Services' },
    { symbol: 'SAKSOFT', companyName: 'Saksoft Limited', sector: 'IT Services' },
    { symbol: 'NIITTECH', companyName: 'NIIT Technologies Limited', sector: 'IT Services' },
    { symbol: 'TANLA', companyName: 'Tanla Platforms Limited', sector: 'IT Services' },
    { symbol: 'NELCO', companyName: 'Nelco Limited', sector: 'IT Services' },

    // Banking & NBFC
    { symbol: 'SOUTHBANK', companyName: 'The South Indian Bank Limited', sector: 'Banking' },
    { symbol: 'KARURBANK', companyName: 'Karur Vysya Bank Limited', sector: 'Banking' },
    { symbol: 'CITYUNION', companyName: 'City Union Bank Limited', sector: 'Banking' },
    { symbol: 'DHANLAXMI', companyName: 'Dhanlaxmi Bank Limited', sector: 'Banking' },
    { symbol: 'NKBANK', companyName: 'Nainital Bank Limited', sector: 'Banking' },
    { symbol: 'SHRIRAMFIN', companyName: 'Shriram Finance Limited', sector: 'Financial Services' },
    { symbol: 'L&TFH', companyName: 'L&T Finance Holdings Limited', sector: 'Financial Services' },
    { symbol: 'SRTRANSFIN', companyName: 'Shriram Transport Finance Company Limited', sector: 'Financial Services' },
    { symbol: 'CHOLAFIN', companyName: 'Cholamandalam Investment and Finance Company Limited', sector: 'Financial Services' },
    { symbol: 'MAHSCOOTER', companyName: 'Maharashtra Scooters Limited', sector: 'Financial Services' },

    // Pharmaceuticals & Healthcare
    { symbol: 'CADILAHC', companyName: 'Cadila Healthcare Limited', sector: 'Pharmaceuticals' },
    { symbol: 'GLENMARK', companyName: 'Glenmark Pharmaceuticals Limited', sector: 'Pharmaceuticals' },
    { symbol: 'GRANULES', companyName: 'Granules India Limited', sector: 'Pharmaceuticals' },
    { symbol: 'NATCOPHARMA', companyName: 'Natco Pharma Limited', sector: 'Pharmaceuticals' },
    { symbol: 'STRIDES', companyName: 'Strides Pharma Science Limited', sector: 'Pharmaceuticals' },
    { symbol: 'WOCKPHARMA', companyName: 'Wockhardt Limited', sector: 'Pharmaceuticals' },
    { symbol: 'METROPOLIS', companyName: 'Metropolis Healthcare Limited', sector: 'Healthcare Services' },
    { symbol: 'THYROCARE', companyName: 'Thyrocare Technologies Limited', sector: 'Healthcare Services' },
    { symbol: 'KRIDHANINF', companyName: 'Kridhan Infra Limited', sector: 'Healthcare Services' },

    // Auto & Auto Components
    { symbol: 'ESCORTS', companyName: 'Escorts Limited', sector: 'Automobiles' },
    { symbol: 'FORCE', companyName: 'Force Motors Limited', sector: 'Automobiles' },
    { symbol: 'MAHINDCIE', companyName: 'Mahindra CIE Automotive Limited', sector: 'Auto Components' },
    { symbol: 'SUNDRMFAST', companyName: 'Sundram Fasteners Limited', sector: 'Auto Components' },
    { symbol: 'CUMMINSIND', companyName: 'Cummins India Limited', sector: 'Auto Components' },
    { symbol: 'EXIDEIND', companyName: 'Exide Industries Limited', sector: 'Auto Components' },
    { symbol: 'TIINDIA', companyName: 'Tube Investments of India Limited', sector: 'Auto Components' },
    { symbol: 'WHEELS', companyName: 'Wheels India Limited', sector: 'Auto Components' },

    // Energy & Power
    { symbol: 'TATAPOWER', companyName: 'Tata Power Company Limited', sector: 'Power' },
    { symbol: 'ADANIPOWER', companyName: 'Adani Power Limited', sector: 'Power' },
    { symbol: 'TORNTPOWER', companyName: 'Torrent Power Limited', sector: 'Power' },
    { symbol: 'NHPC', companyName: 'NHPC Limited', sector: 'Power' },
    { symbol: 'SJVN', companyName: 'SJVN Limited', sector: 'Power' },
    { symbol: 'THERMAX', companyName: 'Thermax Limited', sector: 'Capital Goods' },
    { symbol: 'BHEL', companyName: 'Bharat Heavy Electricals Limited', sector: 'Capital Goods' },
    { symbol: 'CESC', companyName: 'CESC Limited', sector: 'Power' },

    // Chemicals & Fertilizers
    { symbol: 'GNFC', companyName: 'Gujarat Narmada Valley Fertilizers & Chemicals Limited', sector: 'Fertilizers' },
    { symbol: 'CHAMBAL', companyName: 'Chambal Fertilisers and Chemicals Limited', sector: 'Fertilizers' },
    { symbol: 'COROMANDEL', companyName: 'Coromandel International Limited', sector: 'Fertilizers' },
    { symbol: 'GSFC', companyName: 'Gujarat State Fertilizers & Chemicals Limited', sector: 'Fertilizers' },
    { symbol: 'NOCIL', companyName: 'NOCIL Limited', sector: 'Chemicals' },
    { symbol: 'GHCL', companyName: 'GHCL Limited', sector: 'Chemicals' },
    { symbol: 'ALKYLAMINE', companyName: 'Alkyl Amines Chemicals Limited', sector: 'Chemicals' },
    { symbol: 'VINDHYATEL', companyName: 'Vindhya Telelinks Limited', sector: 'Chemicals' },

    // Textiles & Apparel
    { symbol: 'RSWM', companyName: 'RSWM Limited', sector: 'Textiles' },
    { symbol: 'CENTURYTEXT', companyName: 'Century Textiles and Industries Limited', sector: 'Textiles' },
    { symbol: 'ALOKTEXT', companyName: 'Alok Industries Limited', sector: 'Textiles' },
    { symbol: 'KPR', companyName: 'KPR Mill Limited', sector: 'Textiles' },
    { symbol: 'SPENTEX', companyName: 'Spentex Industries Limited', sector: 'Textiles' },
    { symbol: 'RAYMOND', companyName: 'Raymond Limited', sector: 'Apparel' },
    { symbol: 'GRASIM', companyName: 'Grasim Industries Limited', sector: 'Textiles' },

    // Consumer Goods
    { symbol: 'VBL', companyName: 'Varun Beverages Limited', sector: 'Beverages' },
    { symbol: 'CCL', companyName: 'CCL Products (India) Limited', sector: 'Beverages' },
    { symbol: 'RADICO', companyName: 'Radico Khaitan Limited', sector: 'Beverages' },
    { symbol: 'UBL', companyName: 'United Breweries Limited', sector: 'Beverages' },
    { symbol: 'MCDOWELL-N', companyName: 'United Spirits Limited', sector: 'Beverages' },
    { symbol: 'VBLVOL', companyName: 'VBL Voltas Limited', sector: 'Consumer Durables' },
    { symbol: 'WHIRLPOOL', companyName: 'Whirlpool of India Limited', sector: 'Consumer Durables' },
    { symbol: 'BLUESTAR', companyName: 'Blue Star Limited', sector: 'Consumer Durables' },

    // Real Estate & Construction
    { symbol: 'DLF', companyName: 'DLF Limited', sector: 'Real Estate' },
    { symbol: 'GODREJPROP', companyName: 'Godrej Properties Limited', sector: 'Real Estate' },
    { symbol: 'BRIGADE', companyName: 'Brigade Enterprises Limited', sector: 'Real Estate' },
    { symbol: 'SOBHA', companyName: 'Sobha Limited', sector: 'Real Estate' },
    { symbol: 'PRESTIGE', companyName: 'Prestige Estates Projects Limited', sector: 'Real Estate' },
    { symbol: 'NCCLTD', companyName: 'NCC Limited', sector: 'Construction' },
    { symbol: 'JSWINFRA', companyName: 'JSW Infrastructure Limited', sector: 'Infrastructure' },
    { symbol: 'NBCC', companyName: 'NBCC (India) Limited', sector: 'Construction' },
    { symbol: 'HUDCO', companyName: 'Housing & Urban Development Corporation Limited', sector: 'Real Estate' },

    // Logistics & Transportation
    { symbol: 'BLUEDART', companyName: 'Blue Dart Express Limited', sector: 'Logistics' },
    { symbol: 'GATI', companyName: 'Gati Limited', sector: 'Logistics' },
    { symbol: 'TRANSINDIA', companyName: 'Transport Corporation of India Limited', sector: 'Logistics' },
    { symbol: 'MAHLOG', companyName: 'Mahindra Logistics Limited', sector: 'Logistics' },

    // Metals & Mining Extended
    { symbol: 'MOIL', companyName: 'MOIL Limited', sector: 'Mining' },
    { symbol: 'WELCORP', companyName: 'Welspun Corp Limited', sector: 'Steel' },
    { symbol: 'RATNAMANI', companyName: 'Ratnamani Metals & Tubes Limited', sector: 'Steel' },
    { symbol: 'APARINDS', companyName: 'Apar Industries Limited', sector: 'Metals' },
    { symbol: 'HINDALCO', companyName: 'Hindalco Industries Limited', sector: 'Metals' },
    { symbol: 'BALRAMCHIN', companyName: 'Balrampur Chini Mills Limited', sector: 'Sugar' },

    // Agriculture & Food Processing
    { symbol: 'KRBL', companyName: 'KRBL Limited', sector: 'Food Processing' },
    { symbol: 'USHAMART', companyName: 'Usha Martin Limited', sector: 'Food Processing' },
    { symbol: 'FLEX', companyName: 'Flex Foods Limited', sector: 'Food Processing' },
    { symbol: 'GOLDIAM', companyName: 'Goldiam International Limited', sector: 'Food Processing' },
    { symbol: 'DCMSHRIRAM', companyName: 'DCM Shriram Limited', sector: 'Chemicals' },

    // Travel & Tourism
    { symbol: 'INDHOTEL', companyName: 'The Indian Hotels Company Limited', sector: 'Hotels' },
    { symbol: 'LEMONTREE', companyName: 'Lemon Tree Hotels Limited', sector: 'Hotels' },
    { symbol: 'MAHINDHOLIDAY', companyName: 'Mahindra Holidays & Resorts India Limited', sector: 'Hotels' },
    { symbol: 'EASEMYTRIP', companyName: 'Easy Trip Planners Limited', sector: 'Travel & Tourism' },
    { symbol: 'SPICEJET', companyName: 'SpiceJet Limited', sector: 'Aviation' },

    // New Age & Fintech
    { symbol: 'CARTRADE', companyName: 'CarTrade Tech Limited', sector: 'E-commerce' },
    { symbol: 'DEVYANI', companyName: 'Devyani International Limited', sector: 'Restaurants' },
    { symbol: 'SAPPHIRE', companyName: 'Sapphire Foods India Limited', sector: 'Restaurants' },
    { symbol: 'MEDPLUS', companyName: 'MedPlus Health Services Limited', sector: 'Healthcare Services' },
    { symbol: 'STARHEALTH', companyName: 'Star Health and Allied Insurance Company Limited', sector: 'Insurance' },

    // Others
    { symbol: 'PAGEIND', companyName: 'Page Industries Limited', sector: 'Apparel' },
    { symbol: 'VIJAYA', companyName: 'Vijaya Diagnostic Centre Limited', sector: 'Healthcare Services' },
    { symbol: 'AMBER', companyName: 'Amber Enterprises India Limited', sector: 'Consumer Durables' },
    { symbol: 'ROUTE', companyName: 'Route Mobile Limited', sector: 'IT Services' },
  ];

  console.log(`📊 Processing ${additionalStocks.length} additional NSE stocks...`);

  let processed = 0;
  let inserted = 0;

  const batchSize = 20;
  for (let i = 0; i < additionalStocks.length; i += batchSize) {
    const batch = additionalStocks.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(additionalStocks.length / batchSize)} (${batch.length} stocks)...`);
    
    const stocksToUpsert = batch.map(stock => ({
      symbol: stock.symbol,
      company_name: stock.companyName,
      sector: stock.sector,
      market_cap: null,
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
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (batchError) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, batchError);
    }
  }

  // Get final statistics
  const { count: finalCount } = await supabase
    .from('stocks')
    .select('*', { count: 'exact', head: true });

  // Get sector distribution
  const { data: sectorData } = await supabase
    .from('stocks')
    .select('sector')
    .not('sector', 'is', null);

  const sectorCounts = sectorData?.reduce((acc, curr) => {
    acc[curr.sector] = (acc[curr.sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  console.log(`\n🎉 Additional NSE stocks upload completed!`);
  console.log(`📊 Final Summary:`);
  console.log(`   • New stocks processed: ${processed}`);
  console.log(`   • New stocks added: ${inserted}`);
  console.log(`   • Total stocks in database: ${finalCount}`);

  console.log(`\n📈 Sector Distribution (Top 10):`);
  Object.entries(sectorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([sector, count], idx) => {
      console.log(`   ${idx + 1}. ${sector}: ${count} stocks`);
    });

  process.exit(0);
}

addMoreNSEStocks();