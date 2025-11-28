/**
 * NSE Quarterly Financial Results Scraper
 * Fetches real-time quarterly financial data from NSE for all stocks
 */

import { nseClient } from './http-client';
import { storage } from '../../storage';
import { subMonths, subYears, format, parse } from 'date-fns';

interface NSEQuarterlyData {
  revenue: string;
  netProfit: string;
  eps: string;
  operatingProfit: string;
  operatingProfitMargin: string;
  quarter: string;
  fiscalYear: string;
}

/**
 * Scrape quarterly financial results for all stocks from NSE
 */
export async function scrapeQuarterlyFinancials(): Promise<number> {
  try {
    console.log('[Quarterly Financials Scraper] Starting scrape for all stocks...');
    
    const stocks = await storage.getAllStocks();
    console.log(`[Quarterly Financials Scraper] Found ${stocks.length} stocks to process`);

    let successCount = 0;
    let errorCount = 0;

    for (const stock of stocks) {
      try {
        const updated = await scrapeFinancialsForStock(stock.symbol, stock.id);
        if (updated) {
          successCount++;
          console.log(`[Quarterly Financials Scraper] ✅ Updated ${stock.symbol}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        errorCount++;
        console.error(`[Quarterly Financials Scraper] ❌ Failed for ${stock.symbol}:`, error.message);
      }
    }

    console.log(`[Quarterly Financials Scraper] ✅ Completed. Success: ${successCount}, Errors: ${errorCount}`);
    return successCount;
  } catch (error: any) {
    console.error('[Quarterly Financials Scraper] Fatal error:', error.message);
    throw error;
  }
}

/**
 * Scrape quarterly financials for a single stock
 */
async function scrapeFinancialsForStock(symbol: string, stockId: string): Promise<boolean> {
  try {
    // Fetch company info first to get necessary metadata
    const companyInfo = await nseClient.get('/api/quote-equity', { symbol });
    
    if (!companyInfo || !companyInfo.info) {
      console.warn(`[Quarterly Financials Scraper] No company info for ${symbol}`);
      return false;
    }

    // Try to fetch financial results from NSE corporate filings
    // NSE endpoint: /api/corporates-financial-info
    const financialData = await nseClient.get('/api/corporates-financial-info', {
      symbol,
      section: 'quarterly_results'
    });

    if (!financialData || !financialData.data || financialData.data.length === 0) {
      console.log(`[Quarterly Financials Scraper] No financial data available for ${symbol}`);
      return false;
    }

    // Parse the financial data - typically returns array of quarters
    const quarters = financialData.data;
    
    // We need at least 2 quarters for QoQ and 5 quarters for YoY (current + 4 previous)
    if (quarters.length < 2) {
      console.log(`[Quarterly Financials Scraper] Insufficient quarterly data for ${symbol}`);
      return false;
    }

    // Current quarter (Q2 FY 25-26 based on reference image)
    const currentQuarter = quarters[0];
    const previousQuarter = quarters[1]; // Q1 FY 25-26
    const yearAgoQuarter = quarters.find((q: any) => isYearAgoQuarter(q, currentQuarter)) || quarters[4];

    // Extract and normalize financial metrics
    const current = extractFinancialMetrics(currentQuarter);
    const previous = extractFinancialMetrics(previousQuarter);
    const yearAgo = yearAgoQuarter ? extractFinancialMetrics(yearAgoQuarter) : null;

    // Calculate QoQ changes
    const revenueQoQ = calculatePercentageChange(current.revenue, previous.revenue);
    const profitQoQ = calculatePercentageChange(current.netProfit, previous.netProfit);
    const epsQoQ = calculatePercentageChange(current.eps, previous.eps);
    const opProfitQoQ = calculatePercentageChange(current.operatingProfit, previous.operatingProfit);
    const opMarginQoQ = calculatePercentageChange(current.operatingProfitMargin, previous.operatingProfitMargin);

    // Calculate YoY changes
    const revenueYoY = yearAgo ? calculatePercentageChange(current.revenue, yearAgo.revenue) : '0';
    const profitYoY = yearAgo ? calculatePercentageChange(current.netProfit, yearAgo.netProfit) : '0';
    const epsYoY = yearAgo ? calculatePercentageChange(current.eps, yearAgo.eps) : '0';
    const opProfitYoY = yearAgo ? calculatePercentageChange(current.operatingProfit, yearAgo.operatingProfit) : '0';
    const opMarginYoY = yearAgo ? calculatePercentageChange(current.operatingProfitMargin, yearAgo.operatingProfitMargin) : '0';

    // Store in database with proper structure
    await storage.upsertQuarterlyResults({
      stockId,
      quarter: current.quarter,
      fiscalYear: current.fiscalYear,
      // Current quarter values
      revenue: current.revenue,
      profit: current.netProfit,
      eps: current.eps,
      operatingProfit: current.operatingProfit,
      operatingProfitMargin: current.operatingProfitMargin,
      // Previous quarter values (for display)
      prevRevenue: previous.revenue,
      prevProfit: previous.netProfit,
      prevEps: previous.eps,
      prevOperatingProfit: previous.operatingProfit,
      // Year ago values (for display)
      yearAgoRevenue: yearAgo?.revenue || undefined,
      yearAgoProfit: yearAgo?.netProfit || undefined,
      yearAgoEps: yearAgo?.eps || undefined,
      yearAgoOperatingProfit: yearAgo?.operatingProfit || undefined,
      // QoQ changes
      revenueQoQ,
      profitQoQ,
      epsQoQ,
      operatingProfitQoQ: opProfitQoQ,
      operatingProfitMarginQoQ: opMarginQoQ,
      // YoY changes
      revenueYoY,
      profitYoY,
      epsYoY,
      operatingProfitYoY: opProfitYoY,
      operatingProfitMarginYoY: opMarginYoY,
    });

    return true;
  } catch (error: any) {
    // If NSE API fails, log but don't throw - continue with other stocks
    if (error.message.includes('404') || error.message.includes('timeout')) {
      console.warn(`[Quarterly Financials Scraper] NSE data unavailable for ${symbol}`);
      return false;
    }
    throw error;
  }
}

/**
 * Extract financial metrics from NSE quarterly data
 */
function extractFinancialMetrics(quarterData: any): NSEQuarterlyData {
  // NSE returns data in different formats, normalize it
  const revenue = parseFinancialValue(
    quarterData.revenue || 
    quarterData.totalIncome || 
    quarterData.sales || 
    quarterData.income ||
    '0'
  );

  const netProfit = parseFinancialValue(
    quarterData.netProfit || 
    quarterData.profit || 
    quarterData.pat ||
    quarterData.profitAfterTax ||
    '0'
  );

  const eps = parseFinancialValue(
    quarterData.eps || 
    quarterData.earningsPerShare || 
    '0'
  );

  const operatingProfit = parseFinancialValue(
    quarterData.operatingProfit || 
    quarterData.ebit ||
    quarterData.operatingIncome ||
    '0'
  );

  const operatingProfitMargin = quarterData.operatingProfitMargin || 
    (operatingProfit && revenue ? ((parseFloat(operatingProfit) / parseFloat(revenue)) * 100).toFixed(2) : '0');

  const quarter = quarterData.quarter || extractQuarterFromPeriod(quarterData.period);
  const fiscalYear = quarterData.fiscalYear || extractFiscalYearFromPeriod(quarterData.period);

  return {
    revenue,
    netProfit,
    eps,
    operatingProfit,
    operatingProfitMargin,
    quarter,
    fiscalYear
  };
}

/**
 * Parse financial value - handles formats like "55107 Cr", "55107", etc.
 */
function parseFinancialValue(value: string | number): string {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  
  const cleaned = value.toString()
    .replace(/[^0-9.-]/g, '') // Remove non-numeric except decimal and minus
    .trim();
    
  return cleaned || '0';
}

/**
 * Calculate percentage change between two values
 */
function calculatePercentageChange(current: string, previous: string): string {
  const curr = parseFloat(current);
  const prev = parseFloat(previous);
  
  if (!prev || prev === 0) return '0';
  
  const change = ((curr - prev) / prev) * 100;
  return change.toFixed(2);
}

/**
 * Check if a quarter is from one year ago
 */
function isYearAgoQuarter(quarter: any, currentQuarter: any): boolean {
  try {
    const currentFY = parseInt(currentQuarter.fiscalYear?.replace(/\D/g, '') || '2025');
    const quarterFY = parseInt(quarter.fiscalYear?.replace(/\D/g, '') || '2024');
    const currentQ = currentQuarter.quarter || 'Q1';
    const quarterQ = quarter.quarter || 'Q1';
    
    return quarterFY === currentFY - 1 && currentQ === quarterQ;
  } catch {
    return false;
  }
}

/**
 * Extract quarter from period string (e.g., "Q2 FY2026" -> "Q2")
 */
function extractQuarterFromPeriod(period: string): string {
  const match = period?.match(/Q[1-4]/i);
  return match ? match[0].toUpperCase() : 'Q1';
}

/**
 * Extract fiscal year from period string (e.g., "Q2 FY2026" -> "FY2026")
 */
function extractFiscalYearFromPeriod(period: string): string {
  const match = period?.match(/FY\s?(\d{2,4})/i);
  if (match) {
    const year = match[1];
    return year.length === 2 ? `FY20${year}` : `FY${year}`;
  }
  return 'FY2025';
}

/**
 * Manual trigger for quarterly financials scrape
 */
export async function triggerQuarterlyFinancialsScrape(): Promise<void> {
  console.log('[Quarterly Financials Scraper] Manual trigger initiated');
  await scrapeQuarterlyFinancials();
}
