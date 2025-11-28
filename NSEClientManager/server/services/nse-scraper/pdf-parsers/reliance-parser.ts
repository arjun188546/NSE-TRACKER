/**
 * Reliance Industries specific PDF parser
 * Reliance has a complex conglomerate structure with multiple segments
 */

import { CompanyPDFParser, FinancialMetrics } from './base-parser';
import { nseClient } from '../http-client';

export class RelianceParser extends CompanyPDFParser {
  constructor() {
    super('RELIANCE', 'Reliance Industries Limited');
  }

  protected async downloadPDF(url: string): Promise<Buffer> {
    return await nseClient.downloadBinary(url);
  }

  protected async extractMetrics(text: string): Promise<FinancialMetrics> {
    const metrics: FinancialMetrics = {
      rawText: text.substring(0, 5000),
      parsingNotes: []
    };

    metrics.resultType = text.toLowerCase().includes('consolidated') ? 'consolidated' : 'standalone';
    metrics.quarter = this.detectQuarter(text);
    metrics.fiscalYear = this.detectFiscalYear(text);

    // Reliance Pattern: Total Income/Revenue
    metrics.revenue = this.extractNumber(text, [
      /Total\s+income[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Revenue\s+from\s+operations[\s\S]{0,150}?([\d,]+\.?\d*)/i,
      /Total\s+revenue[\s\S]{0,150}?([\d,]+\.?\d*)/i,
      /Turnover[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'Revenue');

    // Reliance Pattern: Profit After Tax
    metrics.netProfit = this.extractNumber(text, [
      /Profit\s+(?:After|after)\s+Tax[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Net\s+profit[\s\S]{0,150}?([\d,]+\.?\d*)/i,
      /PAT[\s\S]{0,100}?([\d,]+\.?\d*)/i,
      /Profit\s+for\s+the\s+(?:period|quarter)[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'Net Profit');

    // Reliance Pattern: EPS
    metrics.eps = this.extractNumber(text, [
      /Earnings\s+per\s+share[\s\S]{0,100}?([\d,]+\.?\d*)/i,
      /EPS[\s\(]*basic[\s\)]*[\s\S]{0,50}?([\d,]+\.?\d*)/i,
      /Basic\s+EPS[\s\S]{0,100}?([\d,]+\.?\d*)/i,
      /Earnings\s+Per\s+Equity\s+Share[\s\S]{0,100}?([\d,]+\.?\d*)/i
    ], 'EPS');

    // Reliance Pattern: EBITDA
    metrics.ebitda = this.extractNumber(text, [
      /EBITDA[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Earnings\s+before\s+interest[\s\S]{0,150}?([\d,]+\.?\d*)/i,
      /Operating\s+profit[\s\S]{0,150}?([\d,]+\.?\d*)/i,
      /PBDIT[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'EBITDA');

    // Reliance Pattern: EBITDA Margin
    metrics.ebitdaMargin = this.extractPercentage(text, [
      /EBITDA\s+margin[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i,
      /Operating\s+margin[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i
    ], 'EBITDA Margin');

    // Calculate margins
    if (metrics.ebitda && metrics.revenue) {
      if (!metrics.ebitdaMargin) {
        const margin = (parseFloat(metrics.ebitda) / parseFloat(metrics.revenue)) * 100;
        metrics.ebitdaMargin = margin.toFixed(2);
        metrics.parsingNotes!.push('EBITDA margin calculated');
      }
      metrics.operatingProfitMargin = metrics.ebitdaMargin;
      metrics.operatingProfit = metrics.ebitda;
    }

    if (metrics.netProfit && metrics.revenue) {
      const patMargin = (parseFloat(metrics.netProfit) / parseFloat(metrics.revenue)) * 100;
      metrics.patMargin = patMargin.toFixed(2);
    }

    return metrics;
  }
}
