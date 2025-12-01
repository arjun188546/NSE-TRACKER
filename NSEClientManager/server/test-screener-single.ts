/**
 * Test the screener scraper with one stock
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from './storage';

interface ScreenerQuarterlyData {
  quarter: string;
  fiscalYear: string;
  revenue: number;
  expenses?: number;
  operatingProfit?: number;
  opm?: number;
  otherIncome?: number;
  interest?: number;
  depreciation?: number;
  profit: number;
  eps: number;
  tax?: number;
}

async function scrapeScreenerQuarterly(companyId: string): Promise<ScreenerQuarterlyData[]> {
  const url = `https://www.screener.in/company/${companyId}/`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);
  const results: ScreenerQuarterlyData[] = [];

  const quartersTable = $('section#quarters table').first();
  
  if (quartersTable.length === 0) {
    return [];
  }

  const headers: string[] = [];
  
  quartersTable.find('thead th').each((idx, th) => {
    if (idx > 0) {
      headers.push($(th).text().trim());
    }
  });

  if (headers.length === 0) return [];

  const quarterData: Partial<ScreenerQuarterlyData>[] = headers.map(header => {
    const parts = header.split(' ');
    if (parts.length !== 2) return {};
    
    const month = parts[0];
    const year = parseInt(parts[1]);
    
    if (isNaN(year)) return {};
    
    let quarter = 'Q1';
    let fiscalYear = '';
    
    if (month === 'Jun') {
      quarter = 'Q1';
      fiscalYear = `FY${year.toString().slice(-2)}${(year + 1).toString().slice(-2)}`;
    } else if (month === 'Sep') {
      quarter = 'Q2';
      fiscalYear = `FY${year.toString().slice(-2)}${(year + 1).toString().slice(-2)}`;
    } else if (month === 'Dec') {
      quarter = 'Q3';
      fiscalYear = `FY${year.toString().slice(-2)}${(year + 1).toString().slice(-2)}`;
    } else if (month === 'Mar') {
      quarter = 'Q4';
      fiscalYear = `FY${(year - 1).toString().slice(-2)}${year.toString().slice(-2)}`;
    }

    return { quarter, fiscalYear };
  });

  quartersTable.find('tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return;
    
    const metricName = $(cells[0]).text().trim().toLowerCase();

    cells.each((cellIdx, cell) => {
      if (cellIdx === 0) return;
      
      const quarterIdx = cellIdx - 1;
      if (!quarterData[quarterIdx]) return;
      
      const valueText = $(cell).text().trim();
      
      if (valueText.includes('%')) {
        const numValue = parseFloat(valueText.replace(/%/g, '').replace(/,/g, ''));
        if (!isNaN(numValue)) {
          if (metricName.includes('opm')) {
            quarterData[quarterIdx].opm = numValue;
          } else if (metricName.includes('tax')) {
            quarterData[quarterIdx].tax = numValue;
          }
        }
        return;
      }
      
      const value = parseFloat(valueText.replace(/,/g, ''));
      if (isNaN(value)) return;

      if (metricName.startsWith('sales')) {
        quarterData[quarterIdx].revenue = value;
      } else if (metricName.startsWith('expenses')) {
        quarterData[quarterIdx].expenses = value;
      } else if (metricName === 'operating profit') {
        quarterData[quarterIdx].operatingProfit = value;
      } else if (metricName.startsWith('other income')) {
        quarterData[quarterIdx].otherIncome = value;
      } else if (metricName === 'interest') {
        quarterData[quarterIdx].interest = value;
      } else if (metricName === 'depreciation') {
        quarterData[quarterIdx].depreciation = value;
      } else if (metricName.startsWith('net profit')) {
        quarterData[quarterIdx].profit = value;
      } else if (metricName.startsWith('eps')) {
        quarterData[quarterIdx].eps = value;
      }
    });
  });

  for (let i = quarterData.length - 1; i >= 0; i--) {
    const qd = quarterData[i];
    if (qd.quarter && qd.fiscalYear && (qd.revenue || qd.profit || qd.eps)) {
      results.push(qd as ScreenerQuarterlyData);
    }
  }

  return results;
}

async function testSingleStock() {
  const symbol = '21STCENMGM';
  
  console.log(`Testing Screener scraper for ${symbol}...\n`);

  try {
    const stock = await storage.getStockBySymbol(symbol);
    if (!stock) {
      console.error('Stock not found in database');
      return;
    }

    console.log(`Stock ID: ${stock.id}`);
    console.log(`Company: ${stock.companyName}\n`);

    const quarterlyData = await scrapeScreenerQuarterly(symbol);
    
    console.log(`Found ${quarterlyData.length} quarters of data:\n`);
    
    quarterlyData.slice(0, 5).forEach((q, idx) => {
      console.log(`${idx + 1}. ${q.quarter} ${q.fiscalYear}`);
      console.log(`   Revenue: ₹${q.revenue} Cr`);
      console.log(`   Profit: ₹${q.profit} Cr`);
      console.log(`   EPS: ₹${q.eps}`);
      console.log(`   OPM: ${q.opm}%\n`);
    });

    // Test saving to database
    const latest = quarterlyData[0];
    const previous = quarterlyData[1];
    const yearAgo = quarterlyData[4];

    console.log('Testing database save...');
    
    await storage.upsertQuarterlyResults({
      stockId: stock.id,
      quarter: latest.quarter,
      fiscalYear: latest.fiscalYear,
      revenue: latest.revenue,
      profit: latest.profit,
      eps: latest.eps,
      operatingProfit: latest.operatingProfit || 0,
      operatingProfitMargin: latest.opm || 0,
    });

    console.log('✅ Successfully saved to database!');

    // Verify
    const detail = await storage.getStockDetail(symbol);
    if (detail?.results) {
      console.log('\nVerification - Retrieved from database:');
      console.log(`  Quarter: ${detail.results.quarter} ${detail.results.fiscalYear}`);
      console.log(`  Revenue: ₹${detail.results.revenue} Cr`);
      console.log(`  Profit: ₹${detail.results.profit} Cr`);
      console.log(`  EPS: ₹${detail.results.eps}`);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

testSingleStock();
