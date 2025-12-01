/**
 * Detailed test to understand Screener table structure
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function analyzeScreenerTable() {
  const symbol = '21STCENMGM';
  const url = `https://www.screener.in/company/${symbol}/`;
  
  console.log(`Analyzing Screener table structure for ${symbol}...\n`);

  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);
  const quartersSection = $('section#quarters');
  const table = quartersSection.find('table').first();

  console.log('=== HEADERS ===');
  const headers: string[] = [];
  table.find('thead th').each((idx, th) => {
    const text = $(th).text().trim();
    headers.push(text);
    console.log(`Header ${idx}: "${text}"`);
  });

  console.log('\n=== ROWS (First 10) ===');
  table.find('tbody tr').slice(0, 10).each((rowIdx, row) => {
    const cells: string[] = [];
    $(row).find('td').each((cellIdx, cell) => {
      cells.push($(cell).text().trim());
    });
    console.log(`Row ${rowIdx}: ${cells.join(' | ')}`);
  });

  console.log('\n=== Looking for specific metrics ===');
  const metrics = ['Sales', 'Expenses', 'Operating Profit', 'OPM %', 'Net Profit', 'EPS'];
  
  metrics.forEach(metric => {
    const row = table.find('tbody tr').filter((_, row) => {
      const firstCell = $(row).find('td').first().text().trim();
      return firstCell.toLowerCase().includes(metric.toLowerCase());
    }).first();

    if (row.length > 0) {
      const cells: string[] = [];
      row.find('td').each((_, cell) => {
        cells.push($(cell).text().trim());
      });
      console.log(`\n${metric}:`);
      console.log(`  ${cells.slice(0, 5).join(' | ')}`);
    }
  });
}

analyzeScreenerTable();
