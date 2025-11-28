/**
 * Results Publication Detection Engine
 * Monitors NSE announcements and detects when companies publish quarterly results
 */

import { storage } from '../storage';
import { nseClient } from './nse-scraper/http-client';
import { parserRegistry } from './nse-scraper/pdf-parsers/parser-registry';
import { format, addDays, subDays } from 'date-fns';

interface ResultsPublication {
  symbol: string;
  companyName: string;
  announcementDate: string;
  quarter: string;
  fiscalYear: string;
  pdfUrl?: string;
  hasXbrl: boolean;
  status: 'detected' | 'processing' | 'completed' | 'failed';
}

/**
 * Detect upcoming results publications from NSE calendar
 */
export async function detectUpcomingResults(): Promise<ResultsPublication[]> {
  console.log('[Results Engine] 🔍 Detecting upcoming quarterly results...');
  
  try {
    // Check announcements for next 30 days
    const today = new Date();
    const futureDate = addDays(today, 30);
    
    const announcements = await nseClient.get('/api/corporate-announcements', {
      index: 'equities',
      from_date: format(today, 'dd-MM-yyyy'),
      to_date: format(futureDate, 'dd-MM-yyyy'),
    });

    const upcomingResults: ResultsPublication[] = [];

    for (const announcement of announcements) {
      const desc = announcement.desc?.toLowerCase() || '';
      const attText = announcement.attchmntText?.toLowerCase() || '';
      
      // Check if it's a board meeting announcement for results
      if (desc.includes('board meeting') && 
          (attText.includes('financial result') || attText.includes('quarterly result'))) {
        
        upcomingResults.push({
          symbol: announcement.symbol,
          companyName: announcement.sm_name || announcement.companyName,
          announcementDate: announcement.an_dt,
          quarter: extractQuarterFromText(desc + ' ' + attText),
          fiscalYear: extractFiscalYearFromText(desc + ' ' + attText),
          hasXbrl: announcement.hasXbrl === true || announcement.hasXbrl === 'true',
          status: 'detected'
        });
      }
    }

    console.log(`[Results Engine] ✅ Found ${upcomingResults.length} upcoming result announcements`);
    return upcomingResults;
    
  } catch (error: any) {
    console.error('[Results Engine] ❌ Failed to detect upcoming results:', error.message);
    return [];
  }
}

/**
 * Monitor for newly published results (last 7 days)
 */
export async function monitorPublishedResults(): Promise<ResultsPublication[]> {
  console.log('[Results Engine] 📊 Monitoring recently published results...');
  
  try {
    const today = new Date();
    const weekAgo = subDays(today, 7);
    
    const announcements = await nseClient.get('/api/corporate-announcements', {
      index: 'equities',
      from_date: format(weekAgo, 'dd-MM-yyyy'),
      to_date: format(today, 'dd-MM-yyyy'),
    });
    
    if (!announcements || !Array.isArray(announcements)) {
      console.warn('[Results Engine] ⚠️  No announcements data received from NSE');
      return [];
    }

    const publishedResults: ResultsPublication[] = [];

    for (const announcement of announcements) {
      const desc = announcement.desc?.toLowerCase() || '';
      const attText = announcement.attchmntText?.toLowerCase() || '';
      const combined = desc + ' ' + attText;
      
      // Check if financial results were published
      const isResultPublished = (
        (desc.includes('outcome of board meeting') || desc.includes('financial result')) &&
        (attText.includes('financial result') || attText.includes('quarterly result'))
      );

      if (isResultPublished && announcement.attchmntFile) {
        publishedResults.push({
          symbol: announcement.symbol,
          companyName: announcement.sm_name || announcement.companyName,
          announcementDate: announcement.an_dt,
          quarter: extractQuarterFromText(combined),
          fiscalYear: extractFiscalYearFromText(combined),
          pdfUrl: announcement.attchmntFile,
          hasXbrl: announcement.hasXbrl === true || announcement.hasXbrl === 'true',
          status: 'detected'
        });
      }
    }

    console.log(`[Results Engine] ✅ Found ${publishedResults.length} recently published results`);
    return publishedResults;
    
  } catch (error: any) {
    console.error('[Results Engine] ❌ Failed to monitor published results:', error.message);
    
    // If it's a connection error, log it but don't crash
    if (error.code === 'ECONNRESET' || error.message.includes('ECONNRESET')) {
      console.error('[Results Engine] ⚠️  NSE connection reset - will retry on next schedule');
    }
    
    return []; // Return empty array instead of crashing
  }
}

/**
 * Process a detected result publication
 */
export async function processResultPublication(publication: ResultsPublication): Promise<boolean> {
  console.log(`[Results Engine] 🔄 Processing ${publication.symbol} ${publication.quarter} ${publication.fiscalYear}...`);
  
  try {
    // Get stock from database
    const stock = await storage.getStockBySymbol(publication.symbol);
    if (!stock) {
      console.log(`[Results Engine] ⚠️  Stock ${publication.symbol} not in database, skipping...`);
      return false;
    }

    // Check if already processed
    const existing = await storage.getQuarterlyResultsByQuarter(
      stock.id,
      publication.quarter,
      publication.fiscalYear
    );

    if (existing) {
      console.log(`[Results Engine] ℹ️  ${publication.symbol} ${publication.quarter} ${publication.fiscalYear} already processed`);
      return true;
    }

    if (!publication.pdfUrl) {
      console.log(`[Results Engine] ⚠️  No PDF URL available for ${publication.symbol}`);
      return false;
    }

    // Parse PDF
    publication.status = 'processing';
    const parseResult = await parserRegistry.parsePDF(publication.symbol, publication.pdfUrl);

    if (!parseResult.success) {
      console.error(`[Results Engine] ❌ PDF parsing failed for ${publication.symbol}:`, parseResult.errors);
      publication.status = 'failed';
      return false;
    }

    const metrics = parseResult.metrics!;

    // Fetch historical data for comparisons
    const quarter = metrics.quarter || publication.quarter;
    const fiscalYear = metrics.fiscalYear || publication.fiscalYear;

    const prevQuarter = getPreviousQuarter(quarter, fiscalYear);
    const yearAgoQuarter = getYearAgoQuarter(quarter, fiscalYear);

    const prevResults = await storage.getQuarterlyResultsByQuarter(
      stock.id,
      prevQuarter.quarter,
      prevQuarter.fiscalYear
    );

    const yearAgoResults = await storage.getQuarterlyResultsByQuarter(
      stock.id,
      yearAgoQuarter.quarter,
      yearAgoQuarter.fiscalYear
    );

    // Calculate growth
    const calculateGrowth = (current?: string, previous?: string) => {
      if (!current || !previous) return undefined;
      const curr = parseFloat(current);
      const prev = parseFloat(previous);
      if (isNaN(curr) || isNaN(prev) || prev === 0) return undefined;
      return ((curr - prev) / prev * 100).toFixed(2);
    };

    // Store results
    await storage.upsertQuarterlyResults({
      stockId: stock.id,
      quarter,
      fiscalYear,
      revenue: metrics.revenue,
      profit: metrics.netProfit,
      eps: metrics.eps,
      ebitda: metrics.ebitda,
      operatingProfit: metrics.operatingProfit || metrics.ebitda,
      operatingProfitMargin: metrics.operatingProfitMargin,
      patMargin: metrics.patMargin,
      prevRevenue: prevResults?.revenue?.toString(),
      prevProfit: prevResults?.profit?.toString(),
      prevEps: prevResults?.eps?.toString(),
      yearAgoRevenue: yearAgoResults?.revenue?.toString(),
      yearAgoProfit: yearAgoResults?.profit?.toString(),
      yearAgoEps: yearAgoResults?.eps?.toString(),
      revenueQoQ: calculateGrowth(metrics.revenue, prevResults?.revenue?.toString()),
      profitQoQ: calculateGrowth(metrics.netProfit, prevResults?.profit?.toString()),
      epsQoQ: calculateGrowth(metrics.eps, prevResults?.eps?.toString()),
      revenueYoY: calculateGrowth(metrics.revenue, yearAgoResults?.revenue?.toString()),
      profitYoY: calculateGrowth(metrics.netProfit, yearAgoResults?.profit?.toString()),
      epsYoY: calculateGrowth(metrics.eps, yearAgoResults?.eps?.toString()),
    });

    publication.status = 'completed';
    console.log(`[Results Engine] ✅ Successfully processed ${publication.symbol} ${quarter} ${fiscalYear}`);
    return true;

  } catch (error: any) {
    console.error(`[Results Engine] ❌ Failed to process ${publication.symbol}:`, error.message);
    publication.status = 'failed';
    return false;
  }
}

/**
 * Get expected results publication dates for Q3 FY 25-26
 */
export function getExpectedQ3PublicationDates(): Date[] {
  // Q3 FY 25-26 is Oct-Dec 2025
  // Results typically published in January 2026
  return [
    new Date('2026-01-10'), // Early January
    new Date('2026-01-20'), // Mid January
    new Date('2026-01-31'), // End January
  ];
}

/**
 * Extract quarter from announcement text
 */
function extractQuarterFromText(text: string): string {
  // Look for Q1, Q2, Q3, Q4
  const qMatch = text.match(/\bq([1-4])\b/i);
  if (qMatch) return `Q${qMatch[1]}`;

  // Look for month-based quarter
  if (text.includes('september') || text.includes('sep')) return 'Q2';
  if (text.includes('december') || text.includes('dec')) return 'Q3';
  if (text.includes('march') || text.includes('mar')) return 'Q4';
  if (text.includes('june') || text.includes('jun')) return 'Q1';

  return 'Q2'; // Default
}

/**
 * Extract fiscal year from announcement text
 */
function extractFiscalYearFromText(text: string): string {
  // Look for FY25-26, FY2526, 2025-26 patterns
  const fyMatch = text.match(/fy[\s-]?(\d{2})[\s-]?(\d{2})/i) ||
                  text.match(/20(\d{2})-(\d{2})/);
  
  if (fyMatch) {
    return `FY${fyMatch[1]}${fyMatch[2]}`;
  }

  return 'FY2526'; // Default to current year
}

/**
 * Get previous quarter details
 */
function getPreviousQuarter(quarter: string, fiscalYear: string): { quarter: string; fiscalYear: string } {
  const q = parseInt(quarter.replace('Q', ''));
  const fy = parseInt(fiscalYear.replace('FY', ''));
  
  if (q === 1) {
    return {
      quarter: 'Q4',
      fiscalYear: `FY${fy - 101}` // Previous year
    };
  } else {
    return {
      quarter: `Q${q - 1}`,
      fiscalYear
    };
  }
}

/**
 * Get year ago quarter details
 */
function getYearAgoQuarter(quarter: string, fiscalYear: string): { quarter: string; fiscalYear: string } {
  const fy = parseInt(fiscalYear.replace('FY', ''));
  return {
    quarter,
    fiscalYear: `FY${fy - 101}` // Previous year
  };
}
