import { nseClient } from './http-client';
import { parserRegistry } from './pdf-parsers/parser-registry';
import { parseXBRLData } from './xbrl-parser';
import { storage } from '../../storage';
import { format, addDays, parse } from 'date-fns';
import { detectAnnouncementType, isNotificationAnnouncement, isResultsAnnouncement } from './announcement-detector';

// Cache of processed (symbol+date) within this process to avoid duplicate processing in rapid consecutive jobs
const processedAnnouncements = new Set<string>();

/**
 * Scrape NSE corporate announcements for quarterly results
 */
export async function scrapeResultsCalendar(): Promise<number> {
  try {
    console.log('[Results Scraper] Starting results calendar scrape...');
    
    const today = new Date();
    const nextMonth = addDays(today, 30);

    // Try NSE corporate announcements API endpoint
    let data;
    try {
      data = await nseClient.get('/api/corporate-announcements', {
        index: 'equities',
        from_date: format(today, 'dd-MM-yyyy'),
        to_date: format(nextMonth, 'dd-MM-yyyy'),
      });
    } catch (error: any) {
      // Fallback to mock data in development if NSE blocks us
      if (process.env.NODE_ENV === 'development' && 
          (error.message.includes('403') || error.message.includes('404') || error.message.includes('timeout'))) {
        console.warn('[Results Scraper] ⚠️  NSE API unavailable, using mock data for development');
        data = generateMockResultsData(today);
      } else {
        throw error;
      }
    }

    if (!data || !Array.isArray(data)) {
      console.log('[Results Scraper] No data received from NSE');
      return 0;
    }

    // Filter for financial results announcements WITH EARLY ANNOUNCEMENT TYPE DETECTION
    // NSE API uses 'desc' field for announcement description
    // Priority: Actual results > XBRL > Skip notifications
    const resultAnnouncements = data.filter((item: any) => {
      const desc = item.desc?.toLowerCase() || '';
      const attText = item.attchmntText?.toLowerCase() || '';
      const hasXbrl = item.hasXbrl === true || item.hasXbrl === 'true' || item.xbrl;
      
      // SKIP notification announcements early (before PDF download)
      if (isNotificationAnnouncement(desc, attText)) {
        return false; // Skip "General Updates" and "Call with Media" announcements
      }
      
      // PRIORITIZE actual results announcements
      if (isResultsAnnouncement(desc, attText)) {
        return true; // Include "Outcome of Board Meeting" with "submitted to the Exchange"
      }
      
      // Include if has XBRL data
      if (hasXbrl) {
        return true;
      }
      
      // Include other financial result keywords
      const isFinancialResult = desc.includes('financial result') || 
                               desc.includes('quarterly result') ||
                               desc.includes('integrated filing- financial') ||
                               desc.includes('results');
      
      return isFinancialResult;
    });

    console.log(`[Results Scraper] Found ${resultAnnouncements.length} result announcements`);

    // Process each announcement
    let createdCount = 0;
    for (const announcement of resultAnnouncements) {
      try {
        const created = await processAnnouncement(announcement);
        if (created) createdCount += 1;
      } catch (error: any) {
        console.error(`[Results Scraper] Failed to process announcement for ${announcement.symbol}:`, error.message);
      }
    }

    console.log(`[Results Scraper] ✅ Results calendar scrape completed. New entries: ${createdCount}`);
    return createdCount;
  } catch (error: any) {
    console.error('[Results Scraper] ❌ Scraping failed:', error.message);
    throw error;
  }
}

/**
 * Process individual announcement
 */
async function processAnnouncement(announcement: any): Promise<boolean> {
  const symbol = announcement.symbol;
  const companyName = announcement.sm_name || announcement.company || announcement.companyName;
  const desc = announcement.desc || announcement.subject; // NSE API uses 'desc'
  const announcementDate = parseNSEDate(announcement.an_dt || announcement.date);
  const attchmntText = announcement.attchmntText || announcement.description || '';

  // DETECT ANNOUNCEMENT TYPE using metadata (subject + description)
  const classification = detectAnnouncementType(announcement);
  
  console.log(`[Results Scraper] Processing ${symbol} announcement`);
  console.log(`  Subject: ${desc}`);
  console.log(`  Description: ${attchmntText.substring(0, 100)}...`);
  console.log(`  Type: ${classification.type.toUpperCase()}`);
  console.log(`  Confidence: ${classification.confidence}`);
  console.log(`  Reason: ${classification.reason}`);
  
  // SKIP notification announcements - don't process PDFs
  if (classification.type === 'notification') {
    console.log(`  Action: SKIPPING PDF processing (notification announcement)`);
    if (classification.resultDeclarationDate) {
      console.log(`  Results will be published on: ${classification.resultDeclarationDate.toLocaleDateString()}`);
    }
    // Still create calendar entry to track notification
    // (implementation continues below)
  } else if (classification.type === 'results') {
    console.log(`  Action: PROCESSING PDF (actual results announcement)`);
  } else {
    console.log(`  Action: ANALYZING (unknown type, will check PDF content)`);
  }

  // Check for XBRL data (PRIORITY #1)
  const hasXbrl = announcement.hasXbrl === true || announcement.hasXbrl === 'true' || announcement.xbrl;
  let xbrlUrl = null;
  
  if (hasXbrl) {
    // XBRL URL might be in different fields
    xbrlUrl = announcement.xbrl || announcement.xbrlUrl || announcement.xbrlFile;
    
    // If not directly available, try constructing from PDF URL
    // NSE XBRL files are typically in the same directory as PDFs with .xml extension
    if (!xbrlUrl && announcement.attchmntFile) {
      const pdfPath = announcement.attchmntFile;
      // Try replacing .pdf with .xml or looking for corresponding XBRL file
      xbrlUrl = pdfPath.replace(/\.pdf$/i, '.xml');
    }
    
    // Alternative: Check for seq_id based XBRL URL
    if (!xbrlUrl && announcement.seq_id) {
      // Some announcements have XBRL accessible via seq_id
      xbrlUrl = `https://www.nseindia.com/api/corporates-xbrl?index=equities&seq_id=${announcement.seq_id}`;
    }
    
    if (xbrlUrl) {
      console.log(`[Results Scraper] ✅ XBRL data available for ${symbol}: ${xbrlUrl}`);
    } else {
      console.log(`[Results Scraper] ⚠️  hasXbrl=true but XBRL URL not found for ${symbol}`);
    }
  }

  // Extract PDF URL as fallback (PRIORITY #2)
  let pdfUrl = announcement.attchmntFile || null;
  
  // Fallback: check if there's an attachments array
  if (!pdfUrl && announcement.attachments && announcement.attachments.length > 0) {
    const pdfAttachment = announcement.attachments.find((att: any) => 
      att.name?.toLowerCase().includes('pdf') || att.url?.toLowerCase().includes('pdf')
    );
    if (pdfAttachment) {
      pdfUrl = pdfAttachment.url?.startsWith('http') 
        ? pdfAttachment.url 
        : `https://www.nseindia.com${pdfAttachment.url}`;
    }
  }

  // Extract quarter and fiscal year from description or attachment text
  const { quarter, fiscalYear } = extractQuarterInfo(desc + ' ' + (announcement.attchmntText || ''));

  // Get or create stock
  let stock = await storage.getStockBySymbol(symbol);
  
  if (!stock) {
    console.log(`[Results Scraper] Creating new stock entry for ${symbol}`);
    stock = await storage.createStock({
      symbol,
      companyName,
      currentPrice: '0',
      percentChange: '0',
      volume: 0,
      sector: 'Unknown',
      marketCap: 'N/A',
    });
  }

  const announcementDateStr = announcementDate.toISOString().split('T')[0];
  const dedupeKey = `${symbol}:${announcementDateStr}:${quarter || ''}:${fiscalYear || ''}`;

  // Skip if already processed in this runtime
  if (processedAnnouncements.has(dedupeKey)) {
    console.log(`[Results Scraper] Skipping already processed announcement ${dedupeKey}`);
    return false;
  }

  // Skip if calendar entry already exists in storage
  try {
    const existing = await storage.getResultsCalendarByStockAndDate(stock.id, announcementDate);
    if (existing) {
      console.log(`[Results Scraper] Calendar entry exists for ${symbol} on ${announcementDateStr}, skipping.`);
      processedAnnouncements.add(dedupeKey);
      return false;
    }
  } catch {/* ignore */}

  console.log(`[Results Scraper] Creating calendar entry for ${symbol} - ${quarter} ${fiscalYear}`);
  try {
    const calendarData: any = {
      stockId: stock.id,
      announcementDate: announcementDateStr,
      resultStatus: (xbrlUrl || pdfUrl) ? 'received' : 'waiting',
      quarter: quarter || 'Q1',
      fiscalYear: fiscalYear || 'FY2025',
      pdfUrl: pdfUrl || undefined,
      processingStatus: (xbrlUrl || pdfUrl) ? 'received' : 'waiting',
      pdfDownloadStatus: (xbrlUrl || pdfUrl) ? 'available' : 'pending',
      announcementDetectedAt: new Date(),
      pdfAvailableAt: (xbrlUrl || pdfUrl) ? new Date() : undefined,
      // Add announcement type metadata
      announcementType: classification.type,
      notificationText: classification.type === 'notification' ? attchmntText : undefined,
      resultDeclarationDate: classification.resultDeclarationDate 
        ? classification.resultDeclarationDate.toISOString().split('T')[0]
        : undefined,
    };

    const calendarEntry = await storage.createResultsCalendar(calendarData);

    // EARLY EXIT: Skip PDF processing for notification announcements
    if (classification.type === 'notification') {
      console.log(`[Results Scraper] ✅ Notification entry created for ${symbol}, skipping PDF processing`);
      processedAnnouncements.add(dedupeKey);
      return true;
    }

    // PRIORITY #1: Process XBRL data if available
    if (xbrlUrl && calendarEntry) {
      console.log(`[Results Scraper] 📊 Processing XBRL data for ${symbol}...`);
      try {
        const xbrlResult = await parseXBRLData(xbrlUrl, symbol);
        
        if (!xbrlResult.success) {
          console.error(`[Results Scraper] XBRL parsing failed for ${symbol}:`, xbrlResult.errors);
          // Fall through to PDF parsing if XBRL fails
          if (!pdfUrl) {
            await storage.updateResultsCalendar(calendarEntry.id, {
              processingStatus: 'waiting',
              pdfDownloadStatus: 'failed',
            });
            return true;
          }
        } else {
          // XBRL parsing successful!
          const metrics = xbrlResult.metrics!;
          
          console.log(`[Results Scraper] ✅ XBRL data extracted for ${symbol}:`, {
            revenue: metrics.revenue,
            netProfit: metrics.netProfit,
            eps: metrics.eps,
            quarter: metrics.quarter,
            fiscalYear: metrics.fiscalYear
          });
          
          // Update calendar entry
          await storage.updateResultsCalendar(calendarEntry.id, {
            processingStatus: 'ready',
            pdfDownloadStatus: 'downloaded',
            pdfDownloadedAt: new Date(),
            parsingCompletedAt: new Date(),
          });
          
          // Store quarterly results with XBRL data
          await storeQuarterlyResults(stock, metrics, calendarEntry);
          
          processedAnnouncements.add(dedupeKey);
          return true; // Successfully processed XBRL
        }
      } catch (error: any) {
        console.error(`[Results Scraper] XBRL processing error for ${symbol}:`, error.message);
        // Fall through to PDF parsing
      }
    }

    // PRIORITY #2: If XBRL failed or unavailable, try PDF parsing
    if (pdfUrl && calendarEntry) {
      console.log(`[Results Scraper] 📄 Falling back to PDF parsing for ${symbol}...`);
      try {
        // Use company-specific parser from registry
        const parseResult = await parserRegistry.parsePDF(symbol, pdfUrl);
        
        if (!parseResult.success) {
          console.error(`[Results Scraper] PDF parsing failed for ${symbol}:`, parseResult.errors);
          // Update calendar entry to show failure
          await storage.updateResultsCalendar(calendarEntry.id, {
            processingStatus: 'waiting',
            pdfDownloadStatus: 'failed',
          });
          return true; // Still created calendar entry
        }

        const metrics = parseResult.metrics!;
        
        // Log parsing warnings if any
        if (parseResult.warnings && parseResult.warnings.length > 0) {
          console.warn(`[Results Scraper] Parsing warnings for ${symbol}:`, parseResult.warnings);
        }

        // Log what was extracted
        console.log(`[Results Scraper] Extracted metrics for ${symbol}:`, {
          revenue: metrics.revenue,
          netProfit: metrics.netProfit,
          eps: metrics.eps,
          quarter: metrics.quarter,
          fiscalYear: metrics.fiscalYear
        });
        
        // Update calendar entry to show PDF processing is complete
        await storage.updateResultsCalendar(calendarEntry.id, {
          processingStatus: 'ready',
          pdfDownloadStatus: 'downloaded',
          pdfDownloadedAt: new Date(),
          parsingCompletedAt: new Date(),
        });
        
        // Store quarterly results with PDF data
        await storeQuarterlyResults(stock, metrics, calendarEntry);
        
      } catch (parseError: any) {
        console.error(`[Results Scraper] PDF parsing failed for ${symbol}: ${parseError.message}`);
        // Update calendar entry to show failure
        await storage.updateResultsCalendar(calendarEntry.id, {
          processingStatus: 'waiting',
          pdfDownloadStatus: 'failed',
        });
      }
    }
    processedAnnouncements.add(dedupeKey);
    return true;
  } catch (error) {
    // Entry might already exist, that's okay
    console.log(`[Results Scraper] Calendar entry already exists for ${symbol} on ${announcementDateStr}`);
    processedAnnouncements.add(dedupeKey);
    return false;
  }
}

/**
 * Store quarterly results with historical comparisons
 */
async function storeQuarterlyResults(stock: any, metrics: any, calendarEntry: any): Promise<void> {
  // Use extracted quarter/fiscal year from metrics
  const finalQuarter = metrics.quarter || 'Q1';
  const finalFiscalYear = metrics.fiscalYear || 'FY2025';
  
  // Fetch historical data for comparisons
  const previousQuarter = getPreviousQuarter(finalQuarter, finalFiscalYear);
  const yearAgoQuarter = getYearAgoQuarter(finalQuarter, finalFiscalYear);
  
  const prevResults = await storage.getQuarterlyResultsByQuarter(
    stock.id, 
    previousQuarter.quarter, 
    previousQuarter.fiscalYear
  );
  
  const yearAgoResults = await storage.getQuarterlyResultsByQuarter(
    stock.id,
    yearAgoQuarter.quarter,
    yearAgoQuarter.fiscalYear
  );

  // Store quarterly results with comparisons
  await storage.upsertQuarterlyResults({
    stockId: stock.id,
    quarter: finalQuarter,
    fiscalYear: finalFiscalYear,
    revenue: metrics.revenue || undefined,
    profit: metrics.netProfit || undefined,
    eps: metrics.eps || undefined,
    ebitda: metrics.ebitda || undefined,
    operatingProfit: metrics.operatingProfit || metrics.ebitda || undefined,
    operatingProfitMargin: metrics.operatingProfitMargin || metrics.ebitdaMargin || undefined,
    patMargin: metrics.patMargin || undefined,
    roe: metrics.roe || undefined,
    totalIncome: metrics.totalIncome || metrics.revenue || undefined,
    // Add previous quarter data for comparison
    prevRevenue: prevResults?.revenue?.toString(),
    prevProfit: prevResults?.profit?.toString(),
    prevEps: prevResults?.eps?.toString(),
    prevOperatingProfit: prevResults?.operatingProfit?.toString(),
    // Add year ago data
    yearAgoRevenue: yearAgoResults?.revenue?.toString(),
    yearAgoProfit: yearAgoResults?.profit?.toString(),
    yearAgoEps: yearAgoResults?.eps?.toString(),
    yearAgoOperatingProfit: yearAgoResults?.operatingProfit?.toString(),
    // Calculate QoQ and YoY percentages
    revenueQoQ: calculatePercentageChange(metrics.revenue, prevResults?.revenue?.toString()),
    profitQoQ: calculatePercentageChange(metrics.netProfit, prevResults?.profit?.toString()),
    epsQoQ: calculatePercentageChange(metrics.eps, prevResults?.eps?.toString()),
    revenueYoY: calculatePercentageChange(metrics.revenue, yearAgoResults?.revenue?.toString()),
    profitYoY: calculatePercentageChange(metrics.netProfit, yearAgoResults?.profit?.toString()),
    epsYoY: calculatePercentageChange(metrics.eps, yearAgoResults?.eps?.toString()),
  });
  
  console.log(`[Results Scraper] ✅ Stored ${stock.symbol} ${finalQuarter} ${finalFiscalYear} results successfully`);
}

/**
 * Parse NSE date format (DD-MMM-YYYY or DD-MM-YYYY)
 */
function parseNSEDate(dateStr: string): Date {
  try {
    // Try DD-MMM-YYYY format (e.g., "10-Nov-2025")
    const parsedDate = parse(dateStr, 'dd-MMM-yyyy', new Date());
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    // Try DD-MM-YYYY format
    const altParsed = parse(dateStr, 'dd-MM-yyyy', new Date());
    if (!isNaN(altParsed.getTime())) {
      return altParsed;
    }

    // Fallback to current date
    console.warn(`[Results Scraper] Could not parse date: ${dateStr}, using today`);
    return new Date();
  } catch (error) {
    console.error(`[Results Scraper] Date parsing error for ${dateStr}:`, error);
    return new Date();
  }
}

/**
 * Extract quarter and fiscal year from announcement subject
 */
function extractQuarterInfo(subject: string): { quarter: string | null; fiscalYear: string | null } {
  const lowerSubject = subject.toLowerCase();
  
  // Extract quarter (Q1, Q2, Q3, Q4)
  const quarterMatch = lowerSubject.match(/q[1-4]/i);
  const quarter = quarterMatch ? quarterMatch[0].toUpperCase() : null;

  // Extract fiscal year (FY2025, FY25, 2024-25, etc.)
  const fyMatch = lowerSubject.match(/fy\s?(\d{2,4})/i) || 
                  lowerSubject.match(/(\d{4})-(\d{2,4})/);
  
  let fiscalYear = null;
  if (fyMatch) {
    const year = fyMatch[1];
    fiscalYear = year.length === 2 ? `FY20${year}` : `FY${year}`;
  }

  return { quarter, fiscalYear };
}

/**
 * Generate mock data for development when NSE blocks requests
 */
function generateMockResultsData(baseDate: Date) {
  const futureDate = addDays(baseDate, 7);
  const formattedDate = format(futureDate, 'dd-MMM-yyyy');

  return [
    {
      symbol: 'TCS',
      company: 'Tata Consultancy Services Limited',
      subject: 'Financial Results - Q3 FY2025',
      date: formattedDate,
      attachments: [
        {
          name: 'Q3_Results.pdf',
          url: '/corporates/announcements/TCS_Q3_2025.pdf'
        }
      ],
    },
    {
      symbol: 'INFY',
      company: 'Infosys Limited',
      subject: 'Quarterly Results Q2 FY2025',
      date: formattedDate,
      attachments: [
        {
          name: 'Results.pdf',
          url: '/corporates/announcements/INFY_Q2_2025.pdf'
        }
      ],
    },
    {
      symbol: 'RELIANCE',
      company: 'Reliance Industries Limited',
      subject: 'Results for Q4 FY2025',
      date: formattedDate,
      attachments: [],
    },
  ];
}

/**
 * Get previous quarter
 */
function getPreviousQuarter(quarter: string, fiscalYear: string): { quarter: string; fiscalYear: string } {
  const quarterMap: Record<string, string> = { 'Q1': 'Q4', 'Q2': 'Q1', 'Q3': 'Q2', 'Q4': 'Q3' };
  const prevQuarter = quarterMap[quarter] || 'Q1';
  
  // If going from Q1 to Q4, we need previous fiscal year
  let prevFiscalYear = fiscalYear;
  if (quarter === 'Q1') {
    const yearMatch = fiscalYear.match(/FY(\d{2,4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      prevFiscalYear = year > 2000 ? `FY${year - 1}` : `FY${year - 1}`;
    }
  }
  
  return { quarter: prevQuarter, fiscalYear: prevFiscalYear };
}

/**
 * Get year ago quarter (same quarter, previous fiscal year)
 */
function getYearAgoQuarter(quarter: string, fiscalYear: string): { quarter: string; fiscalYear: string } {
  const yearMatch = fiscalYear.match(/FY(\d{2,4})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    const prevYear = year > 2000 ? year - 1 : year - 1;
    return { quarter, fiscalYear: `FY${prevYear}` };
  }
  return { quarter, fiscalYear };
}

/**
 * Calculate percentage change between two values
 */
function calculatePercentageChange(current: string | undefined, previous: string | undefined): string | undefined {
  if (!current || !previous) return undefined;
  
  const curr = parseFloat(current);
  const prev = parseFloat(previous);
  
  if (isNaN(curr) || isNaN(prev) || prev === 0) return undefined;
  
  const change = ((curr - prev) / prev) * 100;
  return change.toFixed(2);
}

