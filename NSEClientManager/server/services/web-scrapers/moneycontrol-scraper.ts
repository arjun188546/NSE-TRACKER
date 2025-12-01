import axios from 'axios';
import * as cheerio from 'cheerio';

interface MoneyControlQuarterlyData {
  quarter: string;
  fiscalYear: string;
  revenue: number;
  profit: number;
  eps: number;
  operatingProfit: number;
}

export class MoneyControlScraper {
  private baseUrl = 'https://www.moneycontrol.com';
  
  async getQuarterlyResults(symbol: string, companyId: string): Promise<MoneyControlQuarterlyData[]> {
    try {
      console.log(`\n[MoneyControl] Fetching data for ${symbol} (ID: ${companyId})...`);
      
      const url = `${this.baseUrl}/financials/${companyId}/results/quarterly-results/${companyId}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const results: MoneyControlQuarterlyData[] = [];

      // Find quarterly results table
      const table = $('.mctable1').first();
      if (!table.length) {
        console.log('[MoneyControl] No quarterly table found');
        return results;
      }

      const headers: string[] = [];
      
      // Extract quarter headers
      table.find('thead tr').first().find('th').each((i, el) => {
        if (i > 0) { // Skip first column
          headers.push($(el).text().trim());
        }
      });

      console.log(`[MoneyControl] Found ${headers.length} quarters:`, headers);

      // Extract metrics
      const metrics: { [key: string]: number[] } = {
        revenue: [],
        profit: [],
        eps: [],
        operatingProfit: [],
      };

      table.find('tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        const metricName = $(cells[0]).text().trim().toLowerCase();
        
        let fieldName: string | null = null;
        if (metricName.includes('total income') || metricName.includes('sales turnover')) {
          fieldName = 'revenue';
        } else if (metricName.includes('net profit')) {
          fieldName = 'profit';
        } else if (metricName.includes('eps')) {
          fieldName = 'eps';
        } else if (metricName.includes('operating profit') || metricName.includes('pbdit')) {
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

      // Combine data
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

      console.log(`[MoneyControl] Successfully extracted ${results.length} quarters`);
      return results;

    } catch (error) {
      console.error(`[MoneyControl] Error fetching ${symbol}:`, error);
      return [];
    }
  }

  private parseQuarterDate(dateStr: string): { quarter: string; fiscalYear: string } {
    // Parse formats like "Sep '24", "Jun '24"
    const match = dateStr.match(/([a-z]+)\s*'?(\d{2})/i);
    if (!match) return { quarter: '', fiscalYear: '' };

    const months: { [key: string]: number } = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };

    const monthName = match[1].toLowerCase().substring(0, 3);
    const yearShort = parseInt(match[2]);
    const year = yearShort >= 50 ? 1900 + yearShort : 2000 + yearShort;
    const month = months[monthName];

    if (!month || !year) return { quarter: '', fiscalYear: '' };

    let quarter: string;
    let fiscalYear: number;

    if (month >= 4 && month <= 6) {
      quarter = 'Q1';
      fiscalYear = year + 1;
    } else if (month >= 7 && month <= 9) {
      quarter = 'Q2';
      fiscalYear = year + 1;
    } else if (month >= 10 && month <= 12) {
      quarter = 'Q3';
      fiscalYear = year + 1;
    } else {
      quarter = 'Q4';
      fiscalYear = year;
    }

    const fyStr = `FY${String(fiscalYear).slice(2)}${String(fiscalYear + 1).slice(2)}`;
    return { quarter, fiscalYear: fyStr };
  }
}
