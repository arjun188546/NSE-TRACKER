/**
 * Screener.in Data Scraper
 * Extracts quarterly financial data for all NSE stocks from Screener.in
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';

interface ScreenerQuarterlyData {
  quarter: string;
  fiscalYear: string;
  revenue: number;
  expenses: number;
  operatingProfit: number;
  opm: number;
  otherIncome: number;
  interest: number;
  depreciation: number;
  profit: number;
  eps: number;
  tax: number;
}

const WATCHLIST_STOCKS = ['TCS', 'INFY', 'RELIANCE', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT'];

/**
 * Extract company ID from Screener.in search
 */
async function getScreenerCompanyId(symbol: string, companyName: string): Promise<string | null> {
  try {
    // Try direct URL first (most common pattern)
    const directUrl = `https://www.screener.in/company/${symbol}/`;
    const directResponse = await axios.get(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
      validateStatus: (status) => status < 500, // Accept 404 as valid response
    });

    if (directResponse.status === 200) {
      console.log(`  ✅ Found direct URL for ${symbol}`);
      return symbol;
    }

    // If direct URL fails, try search
    const searchUrl = `https://www.screener.in/api/company/search/?q=${encodeURIComponent(symbol)}`;
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    if (searchResponse.data && searchResponse.data.length > 0) {
      // Find exact match or best match
      const exactMatch = searchResponse.data.find((item: any) => 
        item.value?.toUpperCase() === symbol.toUpperCase()
      );
      
      if (exactMatch) {
        return exactMatch.url?.split('/').filter(Boolean).pop() || null;
      }

      // Return first result if no exact match
      return searchResponse.data[0].url?.split('/').filter(Boolean).pop() || null;
    }

    return null;
  } catch (error: any) {
    console.error(`  ❌ Error finding company ID for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Scrape quarterly results from Screener.in
 */
async function scrapeScreenerQuarterly(companyId: string): Promise<ScreenerQuarterlyData[]> {
  try {
    const url = `https://www.screener.in/company/${companyId}/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const results: ScreenerQuarterlyData[] = [];

    // Find the quarterly results table
    const quartersTable = $('section#quarters table').first();
    
    if (quartersTable.length === 0) {
      return [];
    }

    const headers: string[] = [];
    
    // Extract quarter headers (skip first empty header)
    quartersTable.find('thead th').each((idx, th) => {
      if (idx > 0) {
        headers.push($(th).text().trim());
      }
    });

    if (headers.length === 0) return [];

    // Initialize data for each quarter
    const quarterData: Partial<ScreenerQuarterlyData>[] = headers.map(header => {
      // Parse format: "Sep 2025", "Mar 2025", etc.
      const parts = header.split(' ');
      if (parts.length !== 2) return {};
      
      const month = parts[0];
      const year = parseInt(parts[1]);
      
      if (isNaN(year)) return {};
      
      // Determine quarter and fiscal year (Indian FY: Apr-Mar)
      let quarter = 'Q1';
      let fiscalYear = '';
      
      if (month === 'Jun') {
        quarter = 'Q1';
        fiscalYear = `FY${year.toString().slice(-2)}${(year + 1).toString().slice(-2)}`;
      } else if (month === 'Sep') {
        quarter = 'Q2';
        fiscalYear = `FY${year.toString().slice(-2)}${(year + 1).toString().slice(-2)}`;
      } else if (month === 'Dec') {
        quarter = 'Q3';
        fiscalYear = `FY${year.toString().slice(-2)}${(year + 1).toString().slice(-2)}`;
      } else if (month === 'Mar') {
        quarter = 'Q4';
        fiscalYear = `FY${(year - 1).toString().slice(-2)}${year.toString().slice(-2)}`;
      }

      return { quarter, fiscalYear };
    });

    // Extract metrics from table rows
    quartersTable.find('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length === 0) return;
      
      const metricName = $(cells[0]).text().trim().toLowerCase();

      // Process each quarter's value
      cells.each((cellIdx, cell) => {
        if (cellIdx === 0) return; // Skip metric name column
        
        const quarterIdx = cellIdx - 1;
        if (!quarterData[quarterIdx]) return;
        
        const valueText = $(cell).text().trim();
        
        // Handle percentage values
        if (valueText.includes('%')) {
          const numValue = parseFloat(valueText.replace(/%/g, '').replace(/,/g, ''));
          if (!isNaN(numValue)) {
            if (metricName.includes('opm')) {
              quarterData[quarterIdx].opm = numValue;
            } else if (metricName.includes('tax')) {
              quarterData[quarterIdx].tax = numValue;
            }
          }
          return;
        }
        
        // Handle numeric values
        const value = parseFloat(valueText.replace(/,/g, ''));
        if (isNaN(value)) return;

        // Map metrics to fields
        if (metricName.startsWith('sales')) {
          quarterData[quarterIdx].revenue = value;
        } else if (metricName.startsWith('expenses')) {
          quarterData[quarterIdx].expenses = value;
        } else if (metricName === 'operating profit') {
          quarterData[quarterIdx].operatingProfit = value;
        } else if (metricName.startsWith('other income')) {
          quarterData[quarterIdx].otherIncome = value;
        } else if (metricName === 'interest') {
          quarterData[quarterIdx].interest = value;
        } else if (metricName === 'depreciation') {
          quarterData[quarterIdx].depreciation = value;
        } else if (metricName.startsWith('net profit')) {
          quarterData[quarterIdx].profit = value;
        } else if (metricName.startsWith('eps')) {
          quarterData[quarterIdx].eps = value;
        }
      });
    });

    // Convert to full objects (reverse order - latest first)
    for (let i = quarterData.length - 1; i >= 0; i--) {
      const qd = quarterData[i];
      if (qd.quarter && qd.fiscalYear && (qd.revenue || qd.profit || qd.eps)) {
        results.push(qd as ScreenerQuarterlyData);
      }
    }

    return results;
  } catch (error: any) {
    console.error(`  ❌ Error scraping Screener data:`, error.message);
    return [];
  }
}

/**
 * Calculate QoQ and YoY comparisons
 */
function calculateComparisons(
  current: ScreenerQuarterlyData,
  previous: ScreenerQuarterlyData | undefined,
  yearAgo: ScreenerQuarterlyData | undefined
) {
  const result: any = {
    quarter: current.quarter,
    fiscalYear: current.fiscalYear,
    revenue: current.revenue,
    profit: current.profit,
    eps: current.eps,
    operatingProfit: current.operatingProfit,
    operatingProfitMargin: current.opm,
  };

  // QoQ calculations
  if (previous) {
    result.prevRevenue = previous.revenue;
    result.prevProfit = previous.profit;
    result.prevEps = previous.eps;
    result.prevOperatingProfit = previous.operatingProfit;
    result.prevOperatingProfitMargin = previous.opm;

    if (previous.revenue) {
      result.revenueQoQ = ((current.revenue - previous.revenue) / previous.revenue) * 100;
    }
    if (previous.profit) {
      result.profitQoQ = ((current.profit - previous.profit) / previous.profit) * 100;
    }
    if (previous.eps) {
      result.epsQoQ = ((current.eps - previous.eps) / previous.eps) * 100;
    }
    if (previous.operatingProfit) {
      result.operatingProfitQoQ = ((current.operatingProfit - previous.operatingProfit) / previous.operatingProfit) * 100;
    }
    if (previous.opm) {
      result.operatingProfitMarginQoQ = current.opm - previous.opm;
    }
  }

  // YoY calculations
  if (yearAgo) {
    result.yearAgoRevenue = yearAgo.revenue;
    result.yearAgoProfit = yearAgo.profit;
    result.yearAgoEps = yearAgo.eps;
    result.yearAgoOperatingProfit = yearAgo.operatingProfit;
    result.yearAgoOperatingProfitMargin = yearAgo.opm;

    if (yearAgo.revenue) {
      result.revenueYoY = ((current.revenue - yearAgo.revenue) / yearAgo.revenue) * 100;
    }
    if (yearAgo.profit) {
      result.profitYoY = ((current.profit - yearAgo.profit) / yearAgo.profit) * 100;
    }
    if (yearAgo.eps) {
      result.epsYoY = ((current.eps - yearAgo.eps) / yearAgo.eps) * 100;
    }
    if (yearAgo.operatingProfit) {
      result.operatingProfitYoY = ((current.operatingProfit - yearAgo.operatingProfit) / yearAgo.operatingProfit) * 100;
    }
    if (yearAgo.opm) {
      result.operatingProfitMarginYoY = current.opm - yearAgo.opm;
    }
  }

  return result;
}

/**
 * Main function to scrape all stocks from Screener.in
 */
export async function scrapeAllStocksFromScreener(): Promise<void> {
  console.log('🚀 Starting Screener.in data extraction for all NSE stocks...\n');

  const allStocks = await storage.getAllStocks();
  const stocksToProcess = allStocks.filter(stock => !WATCHLIST_STOCKS.includes(stock.symbol));

  console.log(`📊 Total stocks: ${allStocks.length}`);
  console.log(`⏭️  Skipping watchlist stocks: ${WATCHLIST_STOCKS.length}`);
  console.log(`🎯 Stocks to process: ${stocksToProcess.length}\n`);

  let successCount = 0;
  let errorCount = 0;
  let noDataCount = 0;

  for (let i = 0; i < stocksToProcess.length; i++) {
    const stock = stocksToProcess[i];
    const progress = `[${i + 1}/${stocksToProcess.length}]`;

    try {
      console.log(`${progress} Processing ${stock.symbol}...`);

      // Check if stock already has quarterly results
      const existingDetail = await storage.getStockDetail(stock.symbol);
      if (existingDetail?.results) {
        console.log(`  ⏭️  Already has quarterly data - skipping`);
        successCount++;
        continue;
      }

      // Get company ID from Screener
      const companyId = await getScreenerCompanyId(stock.symbol, stock.companyName || stock.symbol);
      
      if (!companyId) {
        console.log(`  ⚠️  Could not find ${stock.symbol} on Screener.in`);
        noDataCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Scrape quarterly data
      const quarterlyData = await scrapeScreenerQuarterly(companyId);

      if (quarterlyData.length === 0) {
        console.log(`  ⚠️  No quarterly data found for ${stock.symbol}`);
        noDataCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Get latest quarter (first in array)
      const latest = quarterlyData[0];
      const previous = quarterlyData[1];
      const yearAgo = quarterlyData[4]; // 4 quarters ago

      const resultToSave = calculateComparisons(latest, previous, yearAgo);

      // Save to database
      await storage.upsertQuarterlyResults({
        stockId: stock.id,
        ...resultToSave
      });

      console.log(`  ✅ Saved ${latest.quarter} ${latest.fiscalYear} - Revenue: ₹${latest.revenue}Cr, Profit: ₹${latest.profit}Cr`);
      successCount++;

      // Rate limiting - 3 seconds between requests to avoid 429 errors
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error: any) {
      console.error(`  ❌ Error processing ${stock.symbol}:`, error.message);
      errorCount++;
      
      // If rate limited, wait longer before continuing
      if (error.message?.includes('429')) {
        console.log(`  ⏸️  Rate limited. Waiting 30 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Progress update every 25 stocks
    if ((i + 1) % 25 === 0) {
      console.log(`\n📈 Progress: ${i + 1}/${stocksToProcess.length} | Success: ${successCount} | No Data: ${noDataCount} | Errors: ${errorCount}\n`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Screener.in extraction completed!');
  console.log('='.repeat(70));
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`⚠️  No data available: ${noDataCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${stocksToProcess.length}`);
  console.log('='.repeat(70));
}

/**
 * Trigger function for manual execution
 */
export async function triggerScreenerScraper(): Promise<void> {
  await scrapeAllStocksFromScreener();
  process.exit(0);
}
