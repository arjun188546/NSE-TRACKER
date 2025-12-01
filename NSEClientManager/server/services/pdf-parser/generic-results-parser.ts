import pdfParse from 'pdf-parse';
import * as fs from 'fs';

interface ParsedQuarterlyResults {
  quarter: string;
  fiscalYear: string;
  revenue: number;
  profit: number;
  eps: number;
  operatingProfit: number;
  operatingProfitMargin: number;
  confidence: number; // 0-100% confidence in extraction
}

export class GenericResultsParser {
  
  async parsePDF(pdfPath: string): Promise<ParsedQuarterlyResults | null> {
    try {
      console.log(`\n[PDF Parser] Reading file: ${pdfPath}`);
      
      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;
      
      console.log(`[PDF Parser] Extracted ${text.length} characters`);
      
      // Extract quarterly data
      const result: ParsedQuarterlyResults = {
        quarter: '',
        fiscalYear: '',
        revenue: 0,
        profit: 0,
        eps: 0,
        operatingProfit: 0,
        operatingProfitMargin: 0,
        confidence: 0,
      };

      let foundFields = 0;

      // 1. Extract Quarter and Fiscal Year
      const quarterMatch = text.match(/(?:Quarter|Q)\s*(?:ended|ending)?\s*(?:on)?\s*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i) ||
                          text.match(/(Q[1-4])\s*(?:FY)?[\s\-]*(\d{2,4})/i) ||
                          text.match(/(?:Sep(?:tember)?|Jun(?:e)?|Mar(?:ch)?|Dec(?:ember)?)\s*(\d{4})/i);

      if (quarterMatch) {
        const parsed = this.extractQuarterInfo(quarterMatch[0], text);
        result.quarter = parsed.quarter;
        result.fiscalYear = parsed.fiscalYear;
        if (result.quarter && result.fiscalYear) foundFields++;
        console.log(`[PDF Parser] Found quarter: ${result.quarter} ${result.fiscalYear}`);
      }

      // 2. Extract Revenue (multiple patterns)
      const revenuePatterns = [
        /(?:Total\s+)?(?:Revenue|Income|Sales)(?:\s+from\s+operations)?[:\s]+(?:Rs\.?\s*)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:cr(?:ore)?|million|bn)?/i,
        /Revenue\s+from\s+Operations[:\s]+(\d+(?:,\d+)*(?:\.\d+)?)/i,
        /Total\s+Income[:\s]+(\d+(?:,\d+)*(?:\.\d+)?)/i,
      ];

      for (const pattern of revenuePatterns) {
        const match = text.match(pattern);
        if (match) {
          result.revenue = this.parseAmount(match[1]);
          if (result.revenue > 0) {
            foundFields++;
            console.log(`[PDF Parser] Found revenue: ${result.revenue} Cr`);
            break;
          }
        }
      }

      // 3. Extract Net Profit
      const profitPatterns = [
        /(?:Net\s+)?Profit(?:\s+After\s+Tax)?(?:\s+\(PAT\))?[:\s]+(?:Rs\.?\s*)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:cr(?:ore)?)?/i,
        /PAT[:\s]+(\d+(?:,\d+)*(?:\.\d+)?)/i,
        /Net\s+Profit[:\s]+(\d+(?:,\d+)*(?:\.\d+)?)/i,
      ];

      for (const pattern of profitPatterns) {
        const match = text.match(pattern);
        if (match) {
          result.profit = this.parseAmount(match[1]);
          if (result.profit > 0) {
            foundFields++;
            console.log(`[PDF Parser] Found profit: ${result.profit} Cr`);
            break;
          }
        }
      }

      // 4. Extract EPS
      const epsPatterns = [
        /(?:Basic\s+)?(?:Diluted\s+)?EPS[:\s]+(?:Rs\.?\s*)?(\d+(?:\.\d+)?)/i,
        /Earnings\s+Per\s+Share[:\s]+(?:Rs\.?\s*)?(\d+(?:\.\d+)?)/i,
      ];

      for (const pattern of epsPatterns) {
        const match = text.match(pattern);
        if (match) {
          result.eps = parseFloat(match[1]);
          if (result.eps > 0) {
            foundFields++;
            console.log(`[PDF Parser] Found EPS: ${result.eps}`);
            break;
          }
        }
      }

      // 5. Extract Operating Profit
      const opProfitPatterns = [
        /(?:Operating\s+)?(?:Profit|EBIT)[:\s]+(?:Rs\.?\s*)?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:cr(?:ore)?)?/i,
        /EBITDA[:\s]+(\d+(?:,\d+)*(?:\.\d+)?)/i,
        /Operating\s+Income[:\s]+(\d+(?:,\d+)*(?:\.\d+)?)/i,
      ];

      for (const pattern of opProfitPatterns) {
        const match = text.match(pattern);
        if (match) {
          result.operatingProfit = this.parseAmount(match[1]);
          if (result.operatingProfit > 0) {
            foundFields++;
            console.log(`[PDF Parser] Found operating profit: ${result.operatingProfit} Cr`);
            break;
          }
        }
      }

      // 6. Extract Operating Profit Margin (or calculate it)
      const marginMatch = text.match(/Operating\s+(?:Profit\s+)?Margin[:\s]+(\d+(?:\.\d+)?)\s*%/i);
      if (marginMatch) {
        result.operatingProfitMargin = parseFloat(marginMatch[1]);
        foundFields++;
        console.log(`[PDF Parser] Found operating margin: ${result.operatingProfitMargin}%`);
      } else if (result.operatingProfit > 0 && result.revenue > 0) {
        result.operatingProfitMargin = (result.operatingProfit / result.revenue) * 100;
        console.log(`[PDF Parser] Calculated operating margin: ${result.operatingProfitMargin.toFixed(2)}%`);
      }

      // Calculate confidence score
      const totalFields = 6;
      result.confidence = (foundFields / totalFields) * 100;

      console.log(`\n[PDF Parser] Extraction Summary:`);
      console.log(`  Fields found: ${foundFields}/${totalFields}`);
      console.log(`  Confidence: ${result.confidence.toFixed(1)}%`);

      if (foundFields >= 4) {
        return result;
      } else {
        console.log(`[PDF Parser] Not enough fields extracted (minimum 4 required)`);
        return null;
      }

    } catch (error) {
      console.error('[PDF Parser] Error:', error);
      return null;
    }
  }

  private parseAmount(amountStr: string): number {
    // Remove commas and parse
    const cleanStr = amountStr.replace(/,/g, '');
    return parseFloat(cleanStr) || 0;
  }

  private extractQuarterInfo(matchStr: string, fullText: string): { quarter: string; fiscalYear: string } {
    const months: { [key: string]: number } = {
      'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
      'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
      'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
      'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
    };

    // Try to find month name
    let month = 0;
    let year = 0;

    for (const [name, num] of Object.entries(months)) {
      if (matchStr.toLowerCase().includes(name)) {
        month = num;
        break;
      }
    }

    // Extract year
    const yearMatch = matchStr.match(/\d{4}/);
    if (yearMatch) {
      year = parseInt(yearMatch[0]);
    } else {
      const shortYearMatch = matchStr.match(/\d{2}/);
      if (shortYearMatch) {
        const shortYear = parseInt(shortYearMatch[0]);
        year = shortYear >= 50 ? 1900 + shortYear : 2000 + shortYear;
      }
    }

    if (!month || !year) {
      // Try to extract from date format
      const dateMatch = matchStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
      if (dateMatch) {
        month = parseInt(dateMatch[2]);
        year = parseInt(dateMatch[3]);
        if (year < 100) {
          year = year >= 50 ? 1900 + year : 2000 + year;
        }
      }
    }

    if (!month || !year) {
      return { quarter: '', fiscalYear: '' };
    }

    // Determine quarter and fiscal year
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
