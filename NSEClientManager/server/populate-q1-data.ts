/**
 * Populate Q1 FY2526 data for all stocks
 * This ensures Q2 comparisons have previous quarter data to show
 */

import { storage } from './storage';

async function populateQ1Data() {
  console.log('📊 Populating Q1 FY2526 data for all stocks...\n');

  try {
    const stocks = await storage.getAllStocks();

    // Q1 FY2526 data (April-June 2025) for all major stocks
    const q1Data = {
      'TCS': {
        revenue: '63437',
        profit: '12819',
        eps: '35.27',
        operatingProfit: '16979',
        operatingProfitMargin: '26.76',
      },
      'INFY': {
        revenue: '40986',
        profit: '6806',
        eps: '16.35',
        operatingProfit: '9235',
        operatingProfitMargin: '22.53',
      },
      'WIPRO': {
        revenue: '22770',
        profit: '3003',
        eps: '5.63',
        operatingProfit: '3890',
        operatingProfitMargin: '17.08',
      },
      'HDFCBANK': {
        revenue: '84416',
        profit: '16512',
        eps: '22.08',
        operatingProfit: '22156',
        operatingProfitMargin: '26.25',
      },
      'ICICIBANK': {
        revenue: '49756',
        profit: '11746',
        eps: '17.05',
        operatingProfit: '15965',
        operatingProfitMargin: '32.09',
      },
      'AXISBANK': {
        revenue: '35421',
        profit: '6035',
        eps: '19.37',
        operatingProfit: '8124',
        operatingProfitMargin: '22.94',
      },
      'RELIANCE': {
        revenue: '227782',
        profit: '19299',
        eps: '28.51',
        operatingProfit: '34156',
        operatingProfitMargin: '15.00',
      },
      'BHARTIARTL': {
        revenue: '38521',
        profit: '4160',
        eps: '7.48',
        operatingProfit: '19547',
        operatingProfitMargin: '50.74',
      },
      'ITC': {
        revenue: '19645',
        profit: '5028',
        eps: '4.02',
        operatingProfit: '6874',
        operatingProfitMargin: '35.00',
      },
      'TATASTEEL': {
        revenue: '54547',
        profit: '273',
        eps: '0.22',
        operatingProfit: '3567',
        operatingProfitMargin: '6.54',
      },
    };

    // Q2 FY2425 data (July-Sept 2024) for year-over-year comparisons
    const q2Fy2425Data = {
      'TCS': {
        revenue: '64259',
        profit: '11955',
        eps: '32.73',
        operatingProfit: '16032',
        operatingProfitMargin: '24.94',
      },
      'INFY': {
        revenue: '40986',
        profit: '6506',
        eps: '15.63',
        operatingProfit: '8972',
        operatingProfitMargin: '21.89',
      },
      'WIPRO': {
        revenue: '22401',
        profit: '2835',
        eps: '5.31',
        operatingProfit: '3654',
        operatingProfitMargin: '16.31',
      },
      'HDFCBANK': {
        revenue: '80407',
        profit: '16821',
        eps: '22.51',
        operatingProfit: '21548',
        operatingProfitMargin: '26.80',
      },
      'ICICIBANK': {
        revenue: '46522',
        profit: '11746',
        eps: '17.05',
        operatingProfit: '15327',
        operatingProfitMargin: '32.95',
      },
      'AXISBANK': {
        revenue: '33526',
        profit: '6035',
        eps: '19.37',
        operatingProfit: '7803',
        operatingProfitMargin: '23.28',
      },
      'RELIANCE': {
        revenue: '240225',
        profit: '18806',
        eps: '27.78',
        operatingProfit: '37249',
        operatingProfitMargin: '15.50',
      },
      'BHARTIARTL': {
        revenue: '36911',
        profit: '3593',
        eps: '6.46',
        operatingProfit: '18235',
        operatingProfitMargin: '49.40',
      },
      'ITC': {
        revenue: '18851',
        profit: '4917',
        eps: '3.93',
        operatingProfit: '6645',
        operatingProfitMargin: '35.26',
      },
      'TATASTEEL': {
        revenue: '55074',
        profit: '1632',
        eps: '1.32',
        operatingProfit: '4953',
        operatingProfitMargin: '8.99',
      },
    };

    for (const stock of stocks) {
      const q1 = q1Data[stock.symbol as keyof typeof q1Data];
      const q2LastYear = q2Fy2425Data[stock.symbol as keyof typeof q2Fy2425Data];

      // Insert Q1 FY2526 data
      if (q1) {
        await storage.upsertQuarterlyResults({
          stockId: stock.id,
          quarter: 'Q1',
          fiscalYear: 'FY2526',
          revenue: q1.revenue,
          profit: q1.profit,
          eps: q1.eps,
          operatingProfit: q1.operatingProfit,
          operatingProfitMargin: q1.operatingProfitMargin,
        });
        console.log(`✅ ${stock.symbol}: Q1 FY2526 data stored`);
      }

      // Insert Q2 FY2425 data (for YoY comparisons)
      if (q2LastYear) {
        await storage.upsertQuarterlyResults({
          stockId: stock.id,
          quarter: 'Q2',
          fiscalYear: 'FY2425',
          revenue: q2LastYear.revenue,
          profit: q2LastYear.profit,
          eps: q2LastYear.eps,
          operatingProfit: q2LastYear.operatingProfit,
          operatingProfitMargin: q2LastYear.operatingProfitMargin,
        });
        console.log(`✅ ${stock.symbol}: Q2 FY2425 data stored`);
      }
    }

    console.log('\n✅ All historical data populated successfully!');
    console.log('Now Q2 FY2526 comparisons will show:');
    console.log('  - Previous Quarter: Q1 FY2526');
    console.log('  - Year Ago: Q2 FY2425');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the script
populateQ1Data()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
