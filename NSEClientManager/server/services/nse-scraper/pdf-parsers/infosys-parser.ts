/**
 * Infosys specific PDF parser
 * Infosys has a different format compared to TCS
 */

import { CompanyPDFParser, FinancialMetrics } from './base-parser';
import { nseClient } from '../http-client';

export class InfosysParser extends CompanyPDFParser {
  constructor() {
    super('INFY', 'Infosys Limited');
  }

  protected async downloadPDF(url: string): Promise<Buffer> {
    return await nseClient.downloadBinary(url);
  }

  protected async extractMetrics(text: string): Promise<FinancialMetrics> {
    const metrics: FinancialMetrics = {
      rawText: text.substring(0, 5000),
      parsingNotes: []
    };

    // Infosys reports in both INR and USD - extract INR values
    metrics.resultType = text.toLowerCase().includes('consolidated') ? 'consolidated' : 'standalone';
    metrics.quarter = this.detectQuarter(text);
    metrics.fiscalYear = this.detectFiscalYear(text);

    // Infosys Pattern: Revenue (in ₹ crores) - typically shows current, prev, year-ago
    const revenuePattern = /(?:Total\s+)?Revenues?(?:\s+from\s+operations)?[\s\S]{0,200}?([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i;
    const revenueMatch = text.match(revenuePattern) || text.match(/Revenue\s+from\s+operations[\s\S]{0,150}?([\d,]+\.?\d*)/i);
    if (revenueMatch) {
      metrics.revenue = revenueMatch[1].replace(/,/g, '');
      metrics.parsingNotes!.push(`Revenue: ${revenueMatch[1]}`);
    }

    // Infosys Pattern: Net Profit
    const profitPattern = /(?:Net\s+)?Profit(?:\s+for\s+the\s+period)?[\s\S]{0,200}?([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i;
    const profitMatch = text.match(profitPattern) || text.match(/Net\s+profit[\s\S]{0,150}?([\d,]+\.?\d*)/i);
    if (profitMatch) {
      metrics.netProfit = profitMatch[1].replace(/,/g, '');
      metrics.parsingNotes!.push(`Net Profit: ${profitMatch[1]}`);
    }

    // Infosys Pattern: EPS
    metrics.eps = this.extractNumber(text, [
      /Basic\s+EPS[\s\S]{0,100}?([\d,]+\.?\d*)/i,
      /Earnings\s+per\s+share[\s\S]{0,100}?([\d,]+\.?\d*)/i,
      /EPS[\s\(]*basic[\s\)]*[\s\S]{0,50}?([\d,]+\.?\d*)/i
    ], 'EPS');

    // Infosys Pattern: Operating Profit
    metrics.operatingProfit = this.extractNumber(text, [
      /Operating\s+profit[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /EBIT[\s\S]{0,150}?([\d,]+\.?\d*)/i,
      /Profit\s+before\s+tax[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'Operating Profit');

    // Infosys Pattern: Operating Margin
    metrics.operatingProfitMargin = this.extractPercentage(text, [
      /Operating\s+margin[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i,
      /OP\s+margin[\s\S]{0,50}?([\d,]+\.?\d*)\s*%/i
    ], 'Operating Margin');

    // Calculate margins if not found
    if (metrics.operatingProfit && metrics.revenue && !metrics.operatingProfitMargin) {
      const margin = (parseFloat(metrics.operatingProfit) / parseFloat(metrics.revenue)) * 100;
      metrics.operatingProfitMargin = margin.toFixed(2);
      metrics.parsingNotes!.push('Operating margin calculated');
    }

    if (metrics.netProfit && metrics.revenue) {
      const patMargin = (parseFloat(metrics.netProfit) / parseFloat(metrics.revenue)) * 100;
      metrics.patMargin = patMargin.toFixed(2);
    }

    return metrics;
  }
}
