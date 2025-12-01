import axios from 'axios';
import * as cheerio from 'cheerio';

async function testBankMetrics(symbol: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing ${symbol}`);
  console.log('='.repeat(70));
  
  try {
    const url = `https://www.screener.in/company/${symbol}/consolidated/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    
    // Find the quarterly results section
    const quarterlySection = $('#quarters');
    const table = quarterlySection.find('table').first();
    
    // Get all row names to see what metrics are available
    console.log('\n📊 Available Metrics for Banks:\n');
    
    table.find('tbody tr').each((index, row) => {
      const cells = $(row).find('td');
      const metricName = $(cells[0]).text().trim();
      
      if (metricName) {
        // Get first value as sample
        const sampleValue = $(cells[1]).text().trim();
        console.log(`${index + 1}. ${metricName.padEnd(40)} = ${sampleValue}`);
      }
    });
    
    // Look specifically for operating profit related metrics
    console.log('\n\n🔍 Looking for Operating Profit / NII / Operating Income:\n');
    
    table.find('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      const metricName = $(cells[0]).text().trim().toLowerCase();
      
      if (metricName.includes('operating') || 
          metricName.includes('interest income') || 
          metricName.includes('nii') ||
          metricName.includes('total income') ||
          metricName.includes('other income')) {
        
        const values: string[] = [];
        cells.slice(1, 4).each((_, cell) => {
          values.push($(cell).text().trim());
        });
        
        console.log(`✓ "${$(cells[0]).text().trim()}"`);
        console.log(`  Latest 3 quarters: ${values.join(' | ')}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  console.log('\n🏦 BANK METRICS INVESTIGATION\n');
  
  // Test multiple banks
  await testBankMetrics('HDFCBANK');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await testBankMetrics('ICICIBANK');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await testBankMetrics('AXISBANK');
  
  // Compare with a non-bank
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('\n\n' + '='.repeat(70));
  console.log('COMPARISON: Non-Bank Company (TCS)');
  console.log('='.repeat(70));
  await testBankMetrics('TCS');
}

main().catch(console.error);
