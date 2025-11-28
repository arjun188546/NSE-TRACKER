/**
 * HDFC Bank PDF Parser
 * Handles HDFC Bank's quarterly result PDF format
 */

import { CompanyPDFParser, FinancialMetrics } from './base-parser';
import { nseClient } from '../http-client';

export class HDFCBankParser extends CompanyPDFParser {
  constructor() {
    super('HDFCBANK', 'HDFC Bank Limited');
  }

  protected async downloadPDF(url: string): Promise<Buffer> {
    return await nseClient.downloadBinary(url);
  }

  protected async extractMetrics(text: string): Promise<FinancialMetrics> {
    console.log(`[HDFCBANK Parser] Extracting metrics from ${text.length} characters`);
    
    const metrics: FinancialMetrics = {
      rawText: text.substring(0, 5000),
      parsingNotes: []
    };

    metrics.resultType = 'consolidated';
    metrics.quarter = this.detectQuarter(text);
    metrics.fiscalYear = this.detectFiscalYear(text);

    // Revenue - Total Income for banks
    metrics.revenue = this.extractNumber(text, [
      /Total\s+income[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Total\s+revenue[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Net\s+interest\s+income[\s\S]{0,200}?([\d,]+\.?\d*)/i
    ], 'Revenue/Total Income');

    // Net Profit
    metrics.netProfit = this.extractNumber(text, [
      /Net\s+profit[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Profit\s+after\s+tax[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /PAT[\s\S]{0,150}?([\d,]+\.?\d*)/i,
      /Profit\s+for\s+the\s+(?:quarter|period)[\s\S]{0,200}?([\d,]+\.?\d*)/i
    ], 'Net Profit');

    // EPS
    metrics.eps = this.extractNumber(text, [
      /(?:Basic\s+)?earnings\s+per\s+share[\s\S]{0,150}?(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      /(?:Basic\s+)?EPS[\s\S]{0,150}?(?:Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      /Earnings\s+per\s+equity\s+share[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'EPS');

    // Operating Profit
    metrics.operatingProfit = this.extractNumber(text, [
      /Operating\s+profit[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /Pre-provision\s+operating\s+profit[\s\S]{0,200}?([\d,]+\.?\d*)/i,
      /PPOP[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'Operating Profit');

    if (metrics.operatingProfit) {
      metrics.ebitda = metrics.operatingProfit;
    }

    // Margins
    if (metrics.operatingProfit && metrics.revenue) {
      const margin = (parseFloat(metrics.operatingProfit) / parseFloat(metrics.revenue)) * 100;
      metrics.operatingProfitMargin = margin.toFixed(2);
    }

    if (metrics.netProfit && metrics.revenue) {
      const margin = (parseFloat(metrics.netProfit) / parseFloat(metrics.revenue)) * 100;
      metrics.patMargin = margin.toFixed(2);
    }

    console.log(`[HDFCBANK Parser] Found Revenue: ${metrics.revenue || 'N/A'}`);
    console.log(`[HDFCBANK Parser] Found Net Profit: ${metrics.netProfit || 'N/A'}`);
    console.log(`[HDFCBANK Parser] Found EPS: ${metrics.eps || 'N/A'}`);

    return metrics;
  }
}
