/**
 * Wipro PDF Parser
 * Handles Wipro's quarterly result PDF format
 */

import { CompanyPDFParser, FinancialMetrics } from './base-parser';
import { nseClient } from '../http-client';

export class WiproParser extends CompanyPDFParser {
  constructor() {
    super('WIPRO', 'Wipro Limited');
  }

  protected async downloadPDF(url: string): Promise<Buffer> {
    return await nseClient.downloadBinary(url);
  }

  protected async extractMetrics(text: string): Promise<FinancialMetrics> {
    console.log(`[WIPRO Parser] Extracting metrics from ${text.length} characters`);
    
    const metrics: FinancialMetrics = {
      rawText: text.substring(0, 5000),
      parsingNotes: []
    };

    metrics.resultType = 'consolidated';
    metrics.quarter = this.detectQuarter(text);
    metrics.fiscalYear = this.detectFiscalYear(text);

    // Revenue
    metrics.revenue = this.extractNumber(text, [
      /Revenue\s+from\s+operations[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Total\s+revenue[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Net\s+revenues[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Total\s+income[\s\S]{0,200}?([\d,]+\.?\d*)/i
    ], 'Revenue');

    // Net Profit
    metrics.netProfit = this.extractNumber(text, [
      /Net\s+income[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Profit\s+for\s+the\s+(?:period|quarter)[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Net\s+profit[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /PAT[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'Net Profit');

    // EPS
    metrics.eps = this.extractNumber(text, [
      /(?:Basic\s+)?earnings\s+per\s+share[\s\S]{0,150}?(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      /(?:Basic\s+)?EPS[\s\S]{0,150}?(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)/i
    ], 'EPS');

    // Operating Profit
    metrics.operatingProfit = this.extractNumber(text, [
      /Operating\s+income[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /EBIT[\s\S]{0,150}?([\d,]+\.?\d*)/i,
      /Operating\s+profit[\s\S]{0,200}?([\d,]+\.?\d*)/i
    ], 'Operating Profit');

    if (metrics.operatingProfit) {
      metrics.ebitda = metrics.operatingProfit;
    }

    // Operating Margin
    metrics.operatingProfitMargin = this.extractPercentage(text, [
      /Operating\s+(?:profit\s+)?margin[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i,
      /EBIT\s+margin[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i
    ], 'Operating Margin');

    // Calculate margins
    if (metrics.operatingProfit && metrics.revenue && !metrics.operatingProfitMargin) {
      const margin = (parseFloat(metrics.operatingProfit) / parseFloat(metrics.revenue)) * 100;
      metrics.operatingProfitMargin = margin.toFixed(2);
    }

    if (metrics.netProfit && metrics.revenue) {
      const margin = (parseFloat(metrics.netProfit) / parseFloat(metrics.revenue)) * 100;
      metrics.patMargin = margin.toFixed(2);
    }

    console.log(`[WIPRO Parser] Found Revenue: ${metrics.revenue || 'N/A'}`);
    console.log(`[WIPRO Parser] Found Net Profit: ${metrics.netProfit || 'N/A'}`);
    console.log(`[WIPRO Parser] Found EPS: ${metrics.eps || 'N/A'}`);

    return metrics;
  }
}
