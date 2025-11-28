/**
 * Generic PDF parser for companies without specific parsers
 * Uses common patterns found across most Indian company financial statements
 */

import { CompanyPDFParser, FinancialMetrics } from './base-parser';
import { nseClient } from '../http-client';

export class GenericParser extends CompanyPDFParser {
  protected async downloadPDF(url: string): Promise<Buffer> {
    return await nseClient.downloadBinary(url);
  }

  protected async extractMetrics(text: string): Promise<FinancialMetrics> {
    const metrics: FinancialMetrics = {
      rawText: text.substring(0, 5000),
      parsingNotes: ['Using generic parser']
    };

    // Detect basic info
    metrics.resultType = text.toLowerCase().includes('consolidated') ? 'consolidated' : 'standalone';
    metrics.quarter = this.detectQuarter(text);
    metrics.fiscalYear = this.detectFiscalYear(text);

    // Generic Pattern: Revenue (try multiple common variants)
    metrics.revenue = this.extractNumber(text, [
      /Revenue\s+from\s+operations[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Total\s+(?:revenue|income)[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /(?:Net\s+)?sales[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Turnover[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Total\s+income\s+from\s+operations[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'Revenue');

    // Generic Pattern: Net Profit
    metrics.netProfit = this.extractNumber(text, [
      /Net\s+profit[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Profit\s+(?:After|after)\s+Tax[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /PAT[\s\S]{0,100}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Profit\s+for\s+the\s+(?:period|quarter|year)[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Net\s+profit\s+attributable[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'Net Profit');

    // Generic Pattern: EPS
    metrics.eps = this.extractNumber(text, [
      /(?:Basic\s+)?(?:Earnings|earnings)\s+(?:Per|per)\s+(?:Share|share)[\s\S]{0,100}?([\d,]+\.?\d*)/i,
      /(?:Basic\s+)?EPS[\s\S]{0,100}?([\d,]+\.?\d*)/i,
      /EPS[^\d]+([\d,]+\.?\d*)/i,
      /Earnings\s+per\s+equity\s+share[^\d]+([\d,]+\.?\d*)/i
    ], 'EPS');

    // Generic Pattern: EBITDA / Operating Profit
    metrics.ebitda = this.extractNumber(text, [
      /EBITDA[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Operating\s+(?:profit|income)[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /EBIT[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /Profit\s+before\s+(?:interest|tax)[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i,
      /PBDIT[\s\S]{0,150}?([\d,]+\.?\d*)/i
    ], 'EBITDA/Operating Profit');

    // Use EBITDA as operating profit if found
    if (metrics.ebitda) {
      metrics.operatingProfit = metrics.ebitda;
    }

    // Generic Pattern: Margins
    metrics.operatingProfitMargin = this.extractPercentage(text, [
      /Operating\s+(?:profit\s+)?margin[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i,
      /EBITDA\s+margin[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i,
      /OP\s+margin[\s\S]{0,50}?([\d,]+\.?\d*)\s*%/i,
      /OPM[\s\S]{0,50}?([\d,]+\.?\d*)\s*%/i
    ], 'Operating Margin');

    metrics.patMargin = this.extractPercentage(text, [
      /(?:Net\s+)?(?:Profit|PAT)\s+margin[\s\S]{0,100}?([\d,]+\.?\d*)\s*%/i,
      /NPM[\s\S]{0,50}?([\d,]+\.?\d*)\s*%/i
    ], 'PAT Margin');

    // Calculate missing margins
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

    // Generic Pattern: Total Income (if revenue not found)
    if (!metrics.revenue) {
      metrics.totalIncome = this.extractNumber(text, [
        /Total\s+income[\s\S]{0,150}?([\d,]+\.?\d*)\s*(?:crores?|cr\.?)/i
      ], 'Total Income');
      
      if (metrics.totalIncome) {
        metrics.revenue = metrics.totalIncome;
        metrics.parsingNotes!.push('Using total income as revenue');
      }
    }

    return metrics;
  }
}
