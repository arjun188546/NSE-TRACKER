import { createRequire } from 'module';
import { nseClient } from './http-client';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Financial metrics extracted from quarterly result PDFs
 */
export interface FinancialMetrics {
  revenue?: string;
  netProfit?: string;
  eps?: string; // Earnings Per Share
  ebitda?: string;
  totalIncome?: string;
  operatingProfit?: string;
  profitMargin?: string;
  roe?: string; // Return on Equity
  debt?: string;
  reserves?: string;
  rawText: string; // Store full text for manual review
}

/**
 * Parse quarterly result PDF and extract financial metrics
 * @param pdfUrl URL of the PDF file to parse
 * @returns Extracted financial metrics
 */
export async function parseQuarterlyResultPDF(pdfUrl: string): Promise<FinancialMetrics> {
  const isMock = isMockPdfUrl(pdfUrl);
  if (isMock) {
    // Return synthetic metrics in development for mock PDFs
    const synthetic = generateSyntheticMetrics(pdfUrl);
    console.log(`[PDF Parser] Using synthetic metrics for mock PDF: ${pdfUrl}`);
    return synthetic;
  }
  try {
    console.log(`[PDF Parser] Downloading PDF: ${pdfUrl}`);
    // Download PDF as buffer
    const pdfBuffer = await nseClient.downloadBinary(pdfUrl);
    console.log(`[PDF Parser] Parsing PDF (${pdfBuffer.length} bytes)...`);
    // Parse PDF to extract text
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;
    if (!text || text.trim().length === 0) {
      throw new Error('PDF contains no extractable text (might be scanned/image-based)');
    }
    console.log(`[PDF Parser] Extracted ${text.length} characters of text`);
    // Extract metrics using multiple patterns
    const metrics: FinancialMetrics = {
      rawText: text.substring(0, 5000), // Store first 5000 chars for review
    };

    // Pattern 1: Revenue / Total Income (₹ in Crores)
    metrics.revenue = extractMetric(text, [
      /Total\s+(?:Income|Revenue)[\s\S]{0,100}?([\d,]+\.?\d*)\s*(?:crores?|cr)/i,
      /Revenue\s+from\s+operations[\s\S]{0,100}?([\d,]+\.?\d*)/i,
      /Total\s+Income[\s\S]{0,100}?([\d,]+\.?\d*)/i,
    ]);

    // Pattern 2: Net Profit
    metrics.netProfit = extractMetric(text, [
      /Net\s+Profit[\s\S]{0,100}?([\d,]+\.?\d*)\s*(?:crores?|cr)/i,
      /Profit\s+(?:After|after)\s+Tax[\s\S]{0,100}?([\d,]+\.?\d*)/i,
      /PAT[\s\S]{0,100}?([\d,]+\.?\d*)\s*(?:crores?|cr)/i,
    ]);

    // Pattern 3: EPS (Earnings Per Share)
    metrics.eps = extractMetric(text, [
      /(?:Basic\s+)?EPS[\s\S]{0,50}?([\d,]+\.?\d*)/i,
      /Earnings\s+(?:Per|per)\s+Share[\s\S]{0,50}?([\d,]+\.?\d*)/i,
    ]);

    // Pattern 4: EBITDA
    metrics.ebitda = extractMetric(text, [
      /EBITDA[\s\S]{0,100}?([\d,]+\.?\d*)\s*(?:crores?|cr)/i,
      /Earnings\s+Before\s+Interest[\s\S]{0,100}?([\d,]+\.?\d*)/i,
    ]);

    // Pattern 5: Operating Profit
    metrics.operatingProfit = extractMetric(text, [
      /Operating\s+Profit[\s\S]{0,100}?([\d,]+\.?\d*)\s*(?:crores?|cr)/i,
      /EBIT[\s\S]{0,100}?([\d,]+\.?\d*)\s*(?:crores?|cr)/i,
    ]);

    // Pattern 6: Profit Margin
    metrics.profitMargin = extractMetric(text, [
      /(?:Net\s+)?Profit\s+Margin[\s\S]{0,50}?([\d,]+\.?\d*)\s*%/i,
      /PAT\s+Margin[\s\S]{0,50}?([\d,]+\.?\d*)\s*%/i,
    ]);

    // Pattern 7: ROE (Return on Equity)
    metrics.roe = extractMetric(text, [
      /ROE[\s\S]{0,50}?([\d,]+\.?\d*)\s*%/i,
      /Return\s+on\s+Equity[\s\S]{0,50}?([\d,]+\.?\d*)\s*%/i,
    ]);

    // Pattern 8: Total Debt
    metrics.debt = extractMetric(text, [
      /Total\s+(?:Debt|Borrowings?)[\s\S]{0,100}?([\d,]+\.?\d*)\s*(?:crores?|cr)/i,
      /Long[- ]term\s+Debt[\s\S]{0,100}?([\d,]+\.?\d*)/i,
    ]);

    // Pattern 9: Reserves & Surplus
    metrics.reserves = extractMetric(text, [
      /Reserves?\s+(?:and|&)\s+Surplus[\s\S]{0,100}?([\d,]+\.?\d*)\s*(?:crores?|cr)/i,
      /Reserves?[\s\S]{0,100}?([\d,]+\.?\d*)\s*(?:crores?|cr)/i,
    ]);

    const extractedCount = Object.entries(metrics).filter(([key, value]) => key !== 'rawText' && value).length;
    console.log(`[PDF Parser] ✅ Extracted ${extractedCount}/9 metrics successfully`);
    return metrics;
  } catch (error: any) {
    console.error(`[PDF Parser] ❌ Failed to parse PDF:`, error.message);
    // Return synthetic fallback metrics so upstream can decide not to persist full results
    return {
      rawText: `Error parsing PDF: ${error.message}`,
    };
  }
}

/**
 * Extract metric value from text using multiple regex patterns
 * Returns first successful match
 */
function extractMetric(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Clean up the value: remove commas, trim whitespace
      let value = match[1].trim().replace(/,/g, '');
      
      // Validate it's a number
      if (!isNaN(parseFloat(value))) {
        return value;
      }
    }
  }
  return undefined;
}

/**
 * Parse multiple sections from financial statement
 * Some PDFs have separate sections for standalone/consolidated results
 */
export function detectResultType(text: string): 'standalone' | 'consolidated' | 'unknown' {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('consolidated')) {
    return 'consolidated';
  } else if (lowerText.includes('standalone')) {
    return 'standalone';
  }
  
  return 'unknown';
}

/**
 * Extract quarter and year from PDF text
 */
export function extractPeriodInfo(text: string): { quarter: string | null; year: string | null } {
  // Extract quarter (Q1, Q2, Q3, Q4)
  const quarterMatch = text.match(/(?:Quarter|Q)[- ]?([1-4])/i);
  const quarter = quarterMatch ? `Q${quarterMatch[1]}` : null;

  // Extract year (FY2025, 2024-25, etc.)
  const yearMatch = text.match(/FY[- ]?(\d{2,4})/i) || text.match(/(\d{4})[- ](\d{2,4})/);
  let year = null;
  if (yearMatch) {
    year = yearMatch[1].length === 2 ? `FY20${yearMatch[1]}` : `FY${yearMatch[1]}`;
  }

  return { quarter, year };
}

/**
 * Check if PDF needs OCR (scanned document without text layer)
 */
export async function needsOCR(pdfBuffer: Buffer): Promise<boolean> {
  try {
    const pdfData = await pdfParse(pdfBuffer);
    const textLength = pdfData.text.trim().length;
    
    // If extracted text is very short compared to page count, likely scanned
    const avgTextPerPage = textLength / pdfData.numpages;
    
    return avgTextPerPage < 100; // Less than 100 chars per page suggests scan
  } catch (error) {
    console.error('[PDF Parser] Error checking OCR requirement:', error);
    return false;
  }
}

function isMockPdfUrl(url: string): boolean {
  return process.env.NODE_ENV === 'development' && /\/corporates\/announcements\/.+_(Q\d)_\d{4}\.pdf/i.test(url);
}

function generateSyntheticMetrics(url: string): FinancialMetrics {
  // Simple deterministic synthetic values based on symbol for stable dev display
  const symbolMatch = url.match(/\/([^\/]+)_Q(\d)_/);
  const symbol = symbolMatch ? symbolMatch[1].toUpperCase() : 'MOCK';
  const quarter = symbolMatch ? `Q${symbolMatch[2]}` : 'Q1';
  const base = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const factor = (base % 50) + 50; // 50-99
  const revenue = (factor * 10).toFixed(2); // e.g. crores
  const profit = (factor * 2.7).toFixed(2);
  const eps = (factor / 10).toFixed(2);
  const ebitda = (factor * 6.2).toFixed(2);
  const operatingProfit = (factor * 5.1).toFixed(2);
  const profitMargin = ((parseFloat(profit) / parseFloat(revenue)) * 100).toFixed(2);
  const roe = ((factor % 30) + 10).toFixed(2);
  return {
    revenue,
    netProfit: profit,
    eps,
    ebitda,
    operatingProfit,
    profitMargin,
    roe,
    rawText: `Synthetic metrics for ${symbol} ${quarter}`,
  };
}
