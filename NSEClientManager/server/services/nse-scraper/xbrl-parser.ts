/**
 * XBRL Parser for NSE Financial Results
 * Extracts structured financial data from XBRL attachments
 */

import { nseClient } from './http-client';
import { parseStringPromise } from 'xml2js';

export interface XBRLFinancialData {
  success: boolean;
  metrics?: {
    quarter?: string;
    fiscalYear?: string;
    periodEnded?: string;
    revenue?: string;
    netProfit?: string;
    eps?: string;
    ebitda?: string;
    operatingProfit?: string;
    operatingProfitMargin?: string;
    patMargin?: string;
    resultType?: 'consolidated' | 'standalone';
  };
  errors: string[];
  warnings: string[];
}

/**
 * Parse XBRL data from NSE announcement
 */
export async function parseXBRLData(xbrlUrl: string, symbol: string): Promise<XBRLFinancialData> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    console.log(`[XBRL Parser] Fetching XBRL data for ${symbol} from: ${xbrlUrl}`);

    // Download XBRL file (usually XML format)
    const xbrlContent = await nseClient.downloadBinary(xbrlUrl);
    
    if (!xbrlContent || xbrlContent.length === 0) {
      errors.push('XBRL file is empty');
      return { success: false, errors, warnings };
    }

    // Convert buffer to string
    const xmlString = xbrlContent.toString('utf-8');
    
    // Parse XML
    const xbrlData = await parseStringPromise(xmlString);
    
    console.log(`[XBRL Parser] Successfully parsed XBRL XML for ${symbol}`);

    // Extract financial metrics from XBRL structure
    const metrics = extractMetricsFromXBRL(xbrlData, symbol);

    if (!metrics.revenue && !metrics.netProfit && !metrics.eps) {
      errors.push('No core financial metrics found in XBRL');
      return { success: false, errors, warnings };
    }

    return {
      success: true,
      metrics,
      errors,
      warnings
    };

  } catch (error: any) {
    console.error(`[XBRL Parser] Error parsing XBRL for ${symbol}:`, error.message);
    errors.push(`XBRL parsing failed: ${error.message}`);
    return { success: false, errors, warnings };
  }
}

/**
 * Extract metrics from parsed XBRL data
 */
function extractMetricsFromXBRL(xbrlData: any, symbol: string): any {
  const metrics: any = {};

  try {
    // XBRL structure varies by company, but generally follows a pattern
    // Navigate through the XBRL structure to find financial facts
    
    // Common XBRL namespaces and paths
    const contexts = xbrlData?.xbrl?.context || [];
    const facts = xbrlData?.xbrl || {};

    // Find the current period context
    const currentPeriodContext = findCurrentPeriodContext(contexts);
    
    if (currentPeriodContext) {
      metrics.periodEnded = currentPeriodContext.period?.instant?.[0] || 
                           currentPeriodContext.period?.endDate?.[0];
      
      // Extract quarter and fiscal year from period
      if (metrics.periodEnded) {
        const date = new Date(metrics.periodEnded);
        const month = date.getMonth();
        
        // Map month to quarter (Indian fiscal year: Apr-Mar)
        if (month >= 3 && month <= 5) metrics.quarter = 'Q1'; // Apr-Jun
        else if (month >= 6 && month <= 8) metrics.quarter = 'Q2'; // Jul-Sep
        else if (month >= 9 && month <= 11) metrics.quarter = 'Q3'; // Oct-Dec
        else metrics.quarter = 'Q4'; // Jan-Mar
        
        // Calculate fiscal year (Apr to Mar)
        const year = date.getFullYear();
        const fiscalStartYear = month >= 3 ? year : year - 1;
        metrics.fiscalYear = `FY${fiscalStartYear.toString().slice(-2)}${(fiscalStartYear + 1).toString().slice(-2)}`;
      }
    }

    // Extract financial metrics
    // Common XBRL tags for Indian companies
    const revenuePatterns = [
      'RevenueFromOperations',
      'Revenue',
      'TotalIncome',
      'IncomeFromOperations'
    ];

    const profitPatterns = [
      'ProfitLossForPeriod',
      'NetProfit',
      'ProfitAfterTax',
      'ProfitForPeriod'
    ];

    const epsPatterns = [
      'BasicEarningsPerShare',
      'EarningsPerShareBasic',
      'BasicEPS',
      'DilutedEarningsPerShare'
    ];

    // Search for metrics in XBRL facts
    for (const key in facts) {
      const value = facts[key];
      
      // Check if this is a financial metric array
      if (Array.isArray(value) && value.length > 0) {
        const fact = value[0];
        
        // Extract revenue
        if (!metrics.revenue && revenuePatterns.some(p => key.includes(p))) {
          metrics.revenue = extractNumericValue(fact);
        }
        
        // Extract net profit
        if (!metrics.netProfit && profitPatterns.some(p => key.includes(p))) {
          metrics.netProfit = extractNumericValue(fact);
        }
        
        // Extract EPS
        if (!metrics.eps && epsPatterns.some(p => key.includes(p))) {
          metrics.eps = extractNumericValue(fact);
        }
      }
    }

    // Determine result type (consolidated vs standalone)
    const contextId = currentPeriodContext?.['$']?.id || '';
    metrics.resultType = contextId.toLowerCase().includes('consolidated') ? 'consolidated' : 'standalone';

    // Convert crores to standard format (XBRL usually in actual amounts)
    if (metrics.revenue) {
      metrics.revenue = convertToCrores(metrics.revenue);
    }
    if (metrics.netProfit) {
      metrics.netProfit = convertToCrores(metrics.netProfit);
    }

    console.log(`[XBRL Parser] Extracted metrics for ${symbol}:`, {
      revenue: metrics.revenue,
      netProfit: metrics.netProfit,
      eps: metrics.eps,
      quarter: metrics.quarter,
      fiscalYear: metrics.fiscalYear
    });

  } catch (error: any) {
    console.error(`[XBRL Parser] Error extracting metrics:`, error.message);
  }

  return metrics;
}

/**
 * Find the current period context in XBRL
 */
function findCurrentPeriodContext(contexts: any[]): any {
  if (!contexts || contexts.length === 0) return null;
  
  // Look for context with instant date or period end date
  for (const context of contexts) {
    if (context.period && (context.period.instant || context.period.endDate)) {
      return context;
    }
  }
  
  return contexts[0]; // Fallback to first context
}

/**
 * Extract numeric value from XBRL fact
 */
function extractNumericValue(fact: any): string | undefined {
  if (typeof fact === 'string') {
    return fact.replace(/,/g, '');
  }
  
  if (typeof fact === 'object') {
    // XBRL facts can have nested structure
    const value = fact._ || fact['$'] || fact.value || fact;
    if (typeof value === 'string' || typeof value === 'number') {
      return value.toString().replace(/,/g, '');
    }
  }
  
  return undefined;
}

/**
 * Convert amount to crores if needed
 */
function convertToCrores(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  
  // If the number is > 100000, assume it's in lakhs or actual amount
  // Convert to crores (1 crore = 10000000)
  if (num > 100000) {
    return (num / 10000000).toFixed(2);
  }
  
  // Otherwise assume it's already in crores
  return num.toFixed(2);
}
