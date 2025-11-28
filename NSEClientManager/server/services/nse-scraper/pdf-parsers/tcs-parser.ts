/**
 * TCS (Tata Consultancy Services) specific PDF parser
 * TCS uses a specific format in their quarterly result PDFs
 */

import { CompanyPDFParser, FinancialMetrics } from './base-parser';
import { nseClient } from '../http-client';

export class TCSParser extends CompanyPDFParser {
  constructor() {
    super('TCS', 'Tata Consultancy Services Limited');
  }

  protected async downloadPDF(url: string): Promise<Buffer> {
    return await nseClient.downloadBinary(url);
  }

  protected async extractMetrics(text: string): Promise<FinancialMetrics> {
    const metrics: FinancialMetrics = {
      rawText: text.substring(0, 5000),
      parsingNotes: []
    };

    // Detect result type (TCS usually provides both standalone and consolidated)
    metrics.resultType = this.detectResultType(text);
    metrics.parsingNotes!.push(`Using ${metrics.resultType} results`);

    // Extract quarter - look for "quarter ended 30 September 2025" format
    const quarterEndMatch = text.match(/quarter\s+ended?\s+(\d{1,2})\s+(September|June|March|December)\s+(\d{4})/i);
    if (quarterEndMatch) {
      const month = quarterEndMatch[2];
      metrics.periodEnded = `${quarterEndMatch[1]}-${month}-${quarterEndMatch[3]}`;
      
      // Map month to quarter
      if (month.match(/June/i)) metrics.quarter = 'Q1';
      else if (month.match(/September/i)) metrics.quarter = 'Q2';
      else if (month.match(/December/i)) metrics.quarter = 'Q3';
      else if (month.match(/March/i)) metrics.quarter = 'Q4';
    }

    // Extract fiscal year - TCS format is like "2025-26"
    const fyMatch = text.match(/20(\d{2})-(\d{2})/);
    if (fyMatch) {
      metrics.fiscalYear = `FY${fyMatch[1]}${fyMatch[2]}`;
    }

    // TCS uses a table format with 5 columns:
    // "Revenue from operations 65,799 63,437 64,259 1,29,236 1,26,872"
    // Column 1: Q2 FY2526 (current quarter)
    // Column 2: Q1 FY2526 (previous quarter)
    // Column 3: Q2 FY2425 (year ago)
    // Column 4: H1 FY2526 (half year current)
    // Column 5: H1 FY2425 (half year previous)
    
    const revenueMatch = text.match(/Revenue\s+from\s+operations\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i);
    if (revenueMatch) {
      metrics.revenue = revenueMatch[1].replace(/,/g, '');
      metrics.parsingNotes!.push(`Revenue: Current=${revenueMatch[1]}, Prev=${revenueMatch[2]}, YearAgo=${revenueMatch[3]}`);
    }

    // TCS format: "PROFIT FOR THE PERIOD 12,131 12,819 11,955 24,950 24,060"
    const profitMatch = text.match(/PROFIT\s+FOR\s+THE\s+PERIOD\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i);
    if (profitMatch) {
      metrics.netProfit = profitMatch[1].replace(/,/g, '');
      metrics.parsingNotes!.push(`Net Profit: Current=${profitMatch[1]}, Prev=${profitMatch[2]}, YearAgo=${profitMatch[3]}`);
    }

    // TCS format: "PROFIT BEFORE TAX 16,068 16,979 16,032 33,047 32,263"
    const pbtMatch = text.match(/PROFIT\s+BEFORE\s+TAX\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i);
    if (pbtMatch) {
      const pbt = pbtMatch[1].replace(/,/g, '');
      metrics.operatingProfit = pbt;
      metrics.ebitda = pbt;
      metrics.parsingNotes!.push(`PBT/Operating Profit: Current=${pbtMatch[1]}, Prev=${pbtMatch[2]}, YearAgo=${pbtMatch[3]}`);
    }
    
    // Try to extract EBIT or Operating Profit if available
    const ebitMatch = text.match(/EBIT(?:\s+|\s*\()[^\d]*([\d,]+)\s+([\d,]+)\s+([\d,]+)/i) ||
                     text.match(/Operating\s+Profit[^\d]*([\d,]+)\s+([\d,]+)\s+([\d,]+)/i);
    if (ebitMatch) {
      metrics.operatingProfit = ebitMatch[1].replace(/,/g, '');
      metrics.ebitda = ebitMatch[1].replace(/,/g, '');
      metrics.parsingNotes!.push('Found explicit EBIT/Operating Profit');
    }

    // EPS - TCS format: "Earnings per equity share:- Basic and diluted (t) 33.37"
    const epsMatch = text.match(/Earnings\s+per\s+equity\s+share[^\d]+([\d.]+)/i) ||
                     text.match(/Basic\s+and\s+diluted[^\d]+([\d.]+)/i) ||
                     text.match(/EPS[^\d]+([\d.]+)/i);
    if (epsMatch) {
      metrics.eps = epsMatch[1];
      metrics.parsingNotes!.push('EPS extracted');
    }

    // Calculate margins
    if (metrics.ebitda && metrics.revenue) {
      const margin = (parseFloat(metrics.ebitda) / parseFloat(metrics.revenue)) * 100;
      if (!isNaN(margin)) {
        metrics.operatingProfitMargin = margin.toFixed(2);
        metrics.parsingNotes!.push('Operating margin calculated from PBT/Revenue');
      }
    }

    if (metrics.netProfit && metrics.revenue) {
      const patMargin = (parseFloat(metrics.netProfit) / parseFloat(metrics.revenue)) * 100;
      if (!isNaN(patMargin)) {
        metrics.patMargin = patMargin.toFixed(2);
        metrics.parsingNotes!.push('PAT margin calculated');
      }
    }

    return metrics;
  }

  /**
   * Detect whether PDF contains standalone or consolidated results
   */
  private detectResultType(text: string): 'standalone' | 'consolidated' {
    const lowerText = text.toLowerCase();
    
    // TCS usually provides consolidated results prominently
    if (lowerText.includes('consolidated')) {
      return 'consolidated';
    } else if (lowerText.includes('standalone')) {
      return 'standalone';
    }
    
    // Default to consolidated for TCS
    return 'consolidated';
  }

  /**
   * Extract period ended date (e.g., "30 September 2025")
   */
  private extractPeriodEnded(text: string): string | undefined {
    const patterns = [
      /period\s+ended?\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)[,\s]+(\d{4})/i,
      /ended?\s+(\d{1,2})[/-](0?[1-9]|1[0-2])[/-](\d{4})/i,
      /(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)[,\s]+(\d{4})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2] && match[2].match(/[A-Za-z]/)) {
          // Format: "30 September 2025"
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else {
          // Format: "30/09/2025"
          return `${match[1]}-${match[2]}-${match[3]}`;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract a specific section from text
   */
  private extractSection(text: string, sectionName: string, maxLength: number = 1000): string | undefined {
    const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedName}[\\s\\S]{0,${maxLength}}`, 'i');
    const match = text.match(pattern);
    return match ? match[0] : undefined;
  }
}
