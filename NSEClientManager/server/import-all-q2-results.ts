/**
 * Bulk Import Q2 FY 25-26 Results for All Stocks
 * This will populate the dashboard with actual published results
 */

import { storage } from './storage';
import { nseClient } from './services/nse-scraper/http-client';
import { parserRegistry } from './services/nse-scraper/pdf-parsers/parser-registry';
import { format, subDays } from 'date-fns';

async function importAllQ2Results() {
  console.log('='.repeat(70));
  console.log('Importing Q2 FY 25-26 Results for All Stocks');
  console.log('='.repeat(70));
  console.log();

  try {
    // Get all stocks from database
    const stocks = await storage.getAllStocks();
    console.log(`📊 Found ${stocks.length} stocks in database`);
    console.log();

    // Search for Q2 FY 25-26 announcements (Jul-Sep 2025 results, published Oct-Nov 2025)
    const endDate = new Date(); // Today
    const startDate = new Date('2025-10-01'); // Start of October when Q2 results typically published

    console.log(`🔍 Searching NSE announcements from ${format(startDate, 'dd-MM-yyyy')} to ${format(endDate, 'dd-MM-yyyy')}`);
    console.log();

    const announcements = await nseClient.get('/api/corporate-announcements', {
      index: 'equities',
      from_date: format(startDate, 'dd-MM-yyyy'),
      to_date: format(endDate, 'dd-MM-yyyy'),
    });

    console.log(`📄 Found ${announcements.length} total announcements`);

    // Filter for financial results with Q2/September mentions AND only for stocks in our database
    const stockSymbols = stocks.map(s => s.symbol);
    
    const q2Results = announcements.filter((item: any) => {
      // First check if stock is in our database
      if (!stockSymbols.includes(item.symbol)) {
        return false;
      }
      
      const desc = item.desc?.toLowerCase() || '';
      const attText = item.attchmntText?.toLowerCase() || '';
      const combined = desc + ' ' + attText;
      
      const isFinancialResult = combined.includes('financial result') || 
                               combined.includes('quarterly result') ||
                               combined.includes('outcome of board meeting');
      
      const isQ2 = combined.includes('period ended september 30, 2025') ||
                   combined.includes('quarter ended september 30') ||
                   combined.includes('quarter ended 30 september') ||
                   combined.includes('september 30, 2025') ||
                   combined.includes('q2') || 
                   combined.includes('jul-sep') ||
                   combined.includes('july to september');

      return isFinancialResult && isQ2;
    });

    console.log(`📊 Found ${q2Results.length} Q2 FY 25-26 result announcements`);
    console.log();

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const announcement of q2Results) {
      const symbol = announcement.symbol;
      const companyName = announcement.sm_name || announcement.companyName;
      
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Processing: ${symbol} - ${companyName}`);
      console.log('='.repeat(70));
      
      try {
        // Check if stock exists
        let stock = await storage.getStockBySymbol(symbol);
        
        if (!stock) {
          console.log(`⏭️  Stock ${symbol} not in our database, skipping...`);
          continue;
        }

        processedCount++;

        // Check for XBRL
        const hasXbrl = announcement.hasXbrl === true || announcement.hasXbrl === 'true';
        const pdfUrl = announcement.attchmntFile;

        console.log(`  Company: ${companyName}`);
        console.log(`  Announcement Date: ${announcement.an_dt}`);
        console.log(`  Description: ${announcement.desc}`);
        console.log(`  PDF URL: ${pdfUrl}`);
        console.log(`  Has XBRL: ${hasXbrl ? '✅ Yes' : '❌ No'}`);

        if (!pdfUrl) {
          console.log(`  ⚠️  No PDF available, skipping...`);
          failedCount++;
          continue;
        }

        // Parse the PDF
        console.log(`\n  📄 Downloading and parsing PDF...`);
        const parseResult = await parserRegistry.parsePDF(symbol, pdfUrl);

        if (!parseResult.success) {
          console.log(`  ❌ PDF parsing failed:`, parseResult.errors);
          failedCount++;
          continue;
        }

        const metrics = parseResult.metrics!;

        console.log(`\n  ✅ PDF Parsed Successfully!`);
        console.log(`     Revenue: ₹${metrics.revenue || 'N/A'} Cr`);
        console.log(`     Net Profit: ₹${metrics.netProfit || 'N/A'} Cr`);
        console.log(`     EPS: ₹${metrics.eps || 'N/A'}`);
        console.log(`     Quarter: ${metrics.quarter || 'N/A'}`);
        console.log(`     Fiscal Year: ${metrics.fiscalYear || 'N/A'}`);

        // Fetch historical data for comparisons
        const quarter = metrics.quarter || 'Q2';
        const fiscalYear = metrics.fiscalYear || 'FY2526';

        // Calculate previous quarter and year ago
        const prevQuarter = quarter === 'Q1' ? 'Q4' : `Q${parseInt(quarter.replace('Q', '')) - 1}`;
        const prevFY = quarter === 'Q1' ? `FY${parseInt(fiscalYear.replace('FY', '')) - 1}` : fiscalYear;
        
        const yearAgoQuarter = quarter;
        const yearAgoFY = `FY${parseInt(fiscalYear.replace('FY', '')) - 101}`; // Previous year

        console.log(`\n  🔍 Fetching historical data for comparisons...`);
        console.log(`     Previous Quarter: ${prevQuarter} ${prevFY}`);
        console.log(`     Year Ago: ${yearAgoQuarter} ${yearAgoFY}`);

        const prevResults = await storage.getQuarterlyResultsByQuarter(
          stock.id,
          prevQuarter,
          prevFY
        );

        const yearAgoResults = await storage.getQuarterlyResultsByQuarter(
          stock.id,
          yearAgoQuarter,
          yearAgoFY
        );

        // Calculate growth percentages
        const calculateGrowth = (current?: string, previous?: string) => {
          if (!current || !previous) return undefined;
          const curr = parseFloat(current);
          const prev = parseFloat(previous);
          if (isNaN(curr) || isNaN(prev) || prev === 0) return undefined;
          return ((curr - prev) / prev * 100).toFixed(2);
        };

        const revenueQoq = calculateGrowth(metrics.revenue, prevResults?.revenue?.toString());
        const profitQoq = calculateGrowth(metrics.netProfit, prevResults?.profit?.toString());
        const epsQoq = calculateGrowth(metrics.eps, prevResults?.eps?.toString());
        
        const revenueYoy = calculateGrowth(metrics.revenue, yearAgoResults?.revenue?.toString());
        const profitYoy = calculateGrowth(metrics.netProfit, yearAgoResults?.profit?.toString());
        const epsYoy = calculateGrowth(metrics.eps, yearAgoResults?.eps?.toString());

        console.log(`\n  📈 Calculated Growth:`);
        if (revenueQoq) console.log(`     Revenue QoQ: ${revenueQoq}%`);
        if (profitQoq) console.log(`     Profit QoQ: ${profitQoq}%`);
        if (revenueYoy) console.log(`     Revenue YoY: ${revenueYoy}%`);
        if (profitYoy) console.log(`     Profit YoY: ${profitYoy}%`);

        // Store quarterly results
        await storage.upsertQuarterlyResults({
          stockId: stock.id,
          quarter,
          fiscalYear,
          revenue: metrics.revenue,
          profit: metrics.netProfit,
          eps: metrics.eps,
          revenueQoq: revenueQoq,
          profitQoq: profitQoq,
          epsQoq: epsQoq,
          revenueYoy: revenueYoy,
          profitYoy: profitYoy,
          epsYoy: epsYoy,
        });

        console.log(`\n  ✅ Successfully stored ${symbol} ${quarter} ${fiscalYear} results!`);
        successCount++;

      } catch (error: any) {
        console.error(`  ❌ Failed to process ${symbol}:`, error.message);
        failedCount++;
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 Import Summary');
    console.log('='.repeat(70));
    console.log(`Total Q2 Announcements Found: ${q2Results.length}`);
    console.log(`Stocks Processed: ${processedCount}`);
    console.log(`✅ Successfully Imported: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

importAllQ2Results();
