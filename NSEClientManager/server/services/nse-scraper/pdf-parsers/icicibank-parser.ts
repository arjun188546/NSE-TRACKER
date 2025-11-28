/**
 * ICICI Bank PDF Parser
 * Handles ICICI Bank's quarterly result PDF format
 */

import { CompanyPDFParser, FinancialMetrics } from './base-parser';
import { nseClient } from '../http-client';

export class ICICIBankParser extends CompanyPDFParser {
  constructor() {
    super('ICICIBANK', 'ICICI Bank Limited');
  }

  protected async downloadPDF(url: string): Promise<Buffer> {
    return await nseClient.downloadBinary(url);
  }

  protected async extractMetrics(text: string): Promise<FinancialMetrics> {
    console.log(`[ICICIBANK Parser] Extracting metrics from ${text.length} characters`);
    
    const metrics: FinancialMetrics = {
      rawText: text.substring(0, 5000),
      parsingNotes: []
    };

    // ICICI Bank specific patterns
    metrics.resultType = 'consolidated';
    metrics.quarter = this.detectQuarter(text);
    metrics.fiscalYear = this.detectFiscalYear(text);

    // Revenue (Net Interest Income + Other Income for banks)
    // Pattern: "Total income" or "Total revenue"
    metrics.revenue = this.extractNumber(text, [
      /Total\s+income[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Net\s+interest\s+income[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Total\s+revenue[\s\S]{0,200}?([\d,]+\.?\d*)/i
    ], 'Revenue/Total Income');

    // Net Profit
    metrics.netProfit = this.extractNumber(text, [
      /Net\s+profit[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Profit\s+after\s+tax[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /PAT[\s\S]{0,150}?([\d,]+\.?\d*)/i,
      /Net\s+profit\s+for\s+the\s+(?:quarter|period)[\s\S]{0,200}?([\d,]+\.?\d*)/i
    ], 'Net Profit');

    // EPS
    metrics.eps = this.extractNumber(text, [
      /(?:Basic\s+)?earnings\s+per\s+share[\s\S]{0,150}?(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      /(?:Basic\s+)?EPS[\s\S]{0,150}?(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      /Earnings\s+per\s+equity\s+share[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'EPS');

    // Operating Profit (Pre-provision operating profit for banks)
    metrics.operatingProfit = this.extractNumber(text, [
      /Operating\s+profit[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Pre-provision\s+operating\s+profit[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /PPOP[\s\S]{0,150}?([\d,]+\.?\d*)/i,
      /Core\s+operating\s+profit[\s\S]{0,200}?([\d,]+\.?\d*)/i
    ], 'Operating Profit');

    // EBITDA (use operating profit for banks)
    if (metrics.operatingProfit) {
      metrics.ebitda = metrics.operatingProfit;
    }

    // Margins
    metrics.operatingProfitMargin = this.extractPercentage(text, [
      /Operating\s+(?:profit\s+)?margin[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i,
      /Cost\s+to\s+income\s+ratio[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i
    ], 'Operating Margin');

    metrics.patMargin = this.extractPercentage(text, [
      /(?:Net\s+)?(?:profit|PAT)\s+margin[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i,
      /Return\s+on\s+assets[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i
    ], 'PAT Margin');

    // ROE (important for banks)
    metrics.roe = this.extractPercentage(text, [
      /Return\s+on\s+equity[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i,
      /ROE[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i
    ], 'ROE');

    // Calculate margins if missing
    if (metrics.operatingProfit && metrics.revenue && !metrics.operatingProfitMargin) {
      const margin = (parseFloat(metrics.operatingProfit) / parseFloat(metrics.revenue)) * 100;
      metrics.operatingProfitMargin = margin.toFixed(2);
      metrics.parsingNotes!.push('Operating margin calculated');
    }

    if (metrics.netProfit && metrics.revenue && !metrics.patMargin) {
      const margin = (parseFloat(metrics.netProfit) / parseFloat(metrics.revenue)) * 100;
      metrics.patMargin = margin.toFixed(2);
      metrics.parsingNotes!.push('PAT margin calculated');
    }

    // Log what was found
    console.log(`[ICICIBANK Parser] Found Revenue: ${metrics.revenue || 'N/A'}`);
    console.log(`[ICICIBANK Parser] Found Net Profit: ${metrics.netProfit || 'N/A'}`);
    console.log(`[ICICIBANK Parser] Found EPS: ${metrics.eps || 'N/A'}`);
    console.log(`[ICICIBANK Parser] Found Operating Profit: ${metrics.operatingProfit || 'N/A'}`);

    return metrics;
  }
}
