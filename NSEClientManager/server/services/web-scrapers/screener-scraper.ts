import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScreenerQuarterlyData {
  quarter: string;
  fiscalYear: string;
  revenue: number;
  profit: number;
  eps: number;
  operatingProfit: number;
}

export class ScreenerScraper {
  private baseUrl = 'https://www.screener.in';
  
  async getQuarterlyResults(symbol: string): Promise<ScreenerQuarterlyData[]> {
    try {
      console.log(`\n[Screener] Fetching data for ${symbol}...`);
      
      const url = `${this.baseUrl}/company/${symbol}/consolidated/`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const results: ScreenerQuarterlyData[] = [];

      // Find the quarterly results table
      const quarterlySection = $('#quarters');
      if (!quarterlySection.length) {
        console.log('[Screener] No quarterly section found');
        return results;
      }

      // Get the table with quarterly data
      const table = quarterlySection.find('table').first();
      const headers: string[] = [];
      
      // Extract quarter headers (e.g., "Sep 2024", "Jun 2024")
      table.find('thead tr th').each((i, el) => {
        const text = $(el).text().trim();
        if (text && i > 0) { // Skip first column which is metric name
          headers.push(text);
        }
      });

      console.log(`[Screener] Found ${headers.length} quarters:`, headers);

      // Extract data rows
      const metrics: { [key: string]: number[] } = {
        revenue: [],
        profit: [],
        eps: [],
        operatingProfit: [],
      };

      // Check if this is a bank (has "Interest" and "Financing Profit" rows)
      let isBank = false;
      table.find('tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        const metricName = $(cells[0]).text().trim().toLowerCase();
        if (metricName === 'financing profit') {
          isBank = true;
        }
      });

      console.log(`[Screener] Detected as ${isBank ? 'BANK' : 'NON-BANK'} company`);

      table.find('tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        const metricName = $(cells[0]).text().trim().toLowerCase();
        
        // Map screener metric names to our fields
        let fieldName: string | null = null;
        
        if (metricName.includes('sales') || metricName.includes('revenue')) {
          fieldName = 'revenue';
          // For banks, also use Revenue as Operating Profit (it's their total operating income)
          if (isBank) {
            const values: number[] = [];
            cells.slice(1).each((_, cell) => {
              const text = $(cell).text().trim().replace(/,/g, '');
              const value = parseFloat(text);
              if (!isNaN(value)) {
                values.push(value);
              }
            });
            metrics['operatingProfit'] = values; // Revenue = Operating income for banks
          }
        } else if (metricName.includes('net profit') && !metricName.includes('margin')) {
          fieldName = 'profit';
        } else if (metricName === 'eps in rs') {
          fieldName = 'eps';
        } else if (metricName.includes('operating profit') && !metricName.includes('margin')) {
          fieldName = 'operatingProfit';
        }

        if (fieldName) {
          const values: number[] = [];
          cells.slice(1).each((_, cell) => {
            const text = $(cell).text().trim().replace(/,/g, '');
            const value = parseFloat(text);
            if (!isNaN(value)) {
              values.push(value);
            }
          });
          metrics[fieldName] = values;
        }
      });

      // Combine data for each quarter
      for (let i = 0; i < headers.length; i++) {
        const dateStr = headers[i];
        const { quarter, fiscalYear } = this.parseQuarterDate(dateStr);
        
        if (quarter && fiscalYear) {
          results.push({
            quarter,
            fiscalYear,
            revenue: metrics.revenue[i] || 0,
            profit: metrics.profit[i] || 0,
            eps: metrics.eps[i] || 0,
            operatingProfit: metrics.operatingProfit[i] || 0,
          });
        }
      }

      console.log(`[Screener] Successfully extracted ${results.length} quarters`);
      return results;

    } catch (error) {
      console.error(`[Screener] Error fetching ${symbol}:`, error);
      return [];
    }
  }

  private parseQuarterDate(dateStr: string): { quarter: string; fiscalYear: string } {
    // Parse dates like "Sep 2024", "Jun 2024", "Mar 2024"
    const months: { [key: string]: number } = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };

    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length !== 2) return { quarter: '', fiscalYear: '' };

    const monthName = parts[0].substring(0, 3);
    const year = parseInt(parts[1]);
    const month = months[monthName];

    if (!month || !year) return { quarter: '', fiscalYear: '' };

    // Determine quarter (Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar)
    let quarter: string;
    let fiscalYear: number;

    if (month >= 4 && month <= 6) {
      quarter = 'Q1';
      fiscalYear = year + 1; // FY starts in April
    } else if (month >= 7 && month <= 9) {
      quarter = 'Q2';
      fiscalYear = year + 1;
    } else if (month >= 10 && month <= 12) {
      quarter = 'Q3';
      fiscalYear = year + 1;
    } else {
      quarter = 'Q4';
      fiscalYear = year; // Jan-Mar belongs to previous FY
    }

    // Format as FY2526 (short year format)
    const fyStr = `FY${String(fiscalYear).slice(2)}${String(fiscalYear + 1).slice(2)}`;

    return { quarter, fiscalYear: fyStr };
  }
}
