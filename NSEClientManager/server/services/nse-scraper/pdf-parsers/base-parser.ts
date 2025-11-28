/**
 * Base parser interface for company-specific financial result PDFs
 * Each company (TCS, Infosys, Reliance) has different PDF formats
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export interface FinancialMetrics {
  // Core metrics (in Crores unless specified)
  revenue?: string;
  netProfit?: string;
  eps?: string; // Earnings Per Share in Rupees
  operatingProfit?: string;
  operatingProfitMargin?: string; // percentage
  ebitda?: string;
  ebitdaMargin?: string; // percentage
  totalIncome?: string;
  
  // Additional metrics
  patMargin?: string; // Profit After Tax margin (%)
  roe?: string; // Return on Equity (%)
  debt?: string;
  reserves?: string;
  
  // Meta information
  quarter?: string; // Q1, Q2, Q3, Q4
  fiscalYear?: string; // FY2526, FY2425, etc.
  periodEnded?: string; // Date like "30-Sep-2025"
  resultType?: 'standalone' | 'consolidated'; // Which financial statement
  
  // For debugging
  rawText?: string;
  parsingNotes?: string[];
}

export interface PDFParseResult {
  success: boolean;
  metrics?: FinancialMetrics;
  errors?: string[];
  warnings?: string[];
}

/**
 * Base class for company-specific PDF parsers
 */
export abstract class CompanyPDFParser {
  protected companySymbol: string;
  protected companyName: string;

  constructor(symbol: string, name: string) {
    this.companySymbol = symbol;
    this.companyName = name;
  }

  /**
   * Main parsing method - downloads PDF and extracts metrics
   */
  async parsePDF(pdfUrl: string): Promise<PDFParseResult> {
    try {
      console.log(`[${this.companySymbol} Parser] Parsing PDF: ${pdfUrl}`);
      
      // Download PDF
      const pdfBuffer = await this.downloadPDF(pdfUrl);
      
      // Extract text from PDF
      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;
      
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          errors: ['PDF contains no extractable text (may be scanned/image-based)']
        };
      }

      console.log(`[${this.companySymbol} Parser] Extracted ${text.length} characters`);
      
      // Company-specific parsing logic
      const metrics = await this.extractMetrics(text);
      
      // Validate metrics
      const validation = this.validateMetrics(metrics);
      if (!validation.valid) {
        return {
          success: false,
          metrics,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      return {
        success: true,
        metrics,
        warnings: validation.warnings
      };

    } catch (error: any) {
      console.error(`[${this.companySymbol} Parser] Parse error:`, error.message);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Company-specific metric extraction - must be implemented by each company
   */
  protected abstract extractMetrics(text: string): Promise<FinancialMetrics>;

  /**
   * Download PDF from URL
   */
  protected abstract downloadPDF(url: string): Promise<Buffer>;

  /**
   * Validate extracted metrics
   */
  protected validateMetrics(metrics: FinancialMetrics): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Must have at least one core metric
    const hasCoreMetric = !!(
      metrics.revenue || 
      metrics.netProfit || 
      metrics.eps ||
      metrics.operatingProfit
    );

    if (!hasCoreMetric) {
      errors.push('No core financial metrics extracted');
    }

    // Warn if missing quarter/fiscal year
    if (!metrics.quarter) {
      warnings.push('Quarter not identified');
    }
    if (!metrics.fiscalYear) {
      warnings.push('Fiscal year not identified');
    }

    return {
      valid: hasCoreMetric,
      errors,
      warnings
    };
  }

  /**
   * Utility: Extract number from text with multiple patterns
   */
  protected extractNumber(text: string, patterns: RegExp[], context?: string): string | undefined {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let value = match[1].trim().replace(/,/g, '');
        
        // Validate it's a number
        const num = parseFloat(value);
        if (!isNaN(num)) {
          if (context) {
            console.log(`[${this.companySymbol} Parser] Found ${context}: ${value}`);
          }
          return value;
        }
      }
    }
    return undefined;
  }

  /**
   * Utility: Extract percentage from text
   */
  protected extractPercentage(text: string, patterns: RegExp[], context?: string): string | undefined {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let value = match[1].trim().replace(/,/g, '');
        const num = parseFloat(value);
        
        if (!isNaN(num)) {
          if (context) {
            console.log(`[${this.companySymbol} Parser] Found ${context}: ${value}%`);
          }
          return value;
        }
      }
    }
    return undefined;
  }

  /**
   * Utility: Detect quarter from text
   */
  protected detectQuarter(text: string): string | undefined {
    // Look for Q1, Q2, Q3, Q4
    const quarterMatch = text.match(/\b(Q[1-4]|Quarter[- ]?([1-4]))\b/i);
    if (quarterMatch) {
      return quarterMatch[1].startsWith('Q') 
        ? quarterMatch[1].toUpperCase() 
        : `Q${quarterMatch[2]}`;
    }

    // Look for month ranges
    if (text.match(/April.*?June|01.*?April.*?30.*?June/i)) return 'Q1';
    if (text.match(/July.*?September|01.*?July.*?30.*?September/i)) return 'Q2';
    if (text.match(/October.*?December|01.*?October.*?31.*?December/i)) return 'Q3';
    if (text.match(/January.*?March|01.*?January.*?31.*?March/i)) return 'Q4';

    return undefined;
  }

  /**
   * Utility: Detect fiscal year from text
   */
  protected detectFiscalYear(text: string): string | undefined {
    // Look for FY2025, FY2526, 2025-26, etc.
    const fyMatch = text.match(/FY[- ]?(\d{2})[- ]?(\d{2})/i) || 
                    text.match(/FY[- ]?(\d{4})/i) ||
                    text.match(/(\d{4})[- ](\d{2,4})/);
    
    if (fyMatch) {
      if (fyMatch[2]) {
        // FY25-26 or 2025-26 format
        return `FY${fyMatch[1]}${fyMatch[2]}`;
      } else {
        // FY2025 format
        const year = fyMatch[1];
        return year.length === 4 ? `FY${year}` : `FY20${year}`;
      }
    }

    return undefined;
  }
}
