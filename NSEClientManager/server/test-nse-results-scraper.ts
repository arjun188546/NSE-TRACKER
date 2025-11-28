/**
 * Manual test script for NSE results scraper
 * Tests real NSE API integration and PDF parsing
 */

import { nseClient } from './services/nse-scraper/http-client';
import { parserRegistry } from './services/nse-scraper/pdf-parsers/parser-registry';
import { format, subDays } from 'date-fns';

async function main() {
  console.log('='.repeat(60));
  console.log('Testing NSE Results Scraper - Historical Data');
  console.log('='.repeat(60));
  console.log();

  try {
    console.log('[Test] Searching for TCS results announcement from Oct 9, 2025...');
    
    // Search past 90 days to find the TCS announcement
    const endDate = new Date('2025-10-10');
    const startDate = subDays(endDate, 5);
    
    console.log(`[Test] Date range: ${format(startDate, 'dd-MM-yyyy')} to ${format(endDate, 'dd-MM-yyyy')}`);
    
    const data = await nseClient.get('/api/corporate-announcements', {
      index: 'equities',
      from_date: format(startDate, 'dd-MM-yyyy'),
      to_date: format(endDate, 'dd-MM-yyyy'),
      symbol: 'TCS'
    });
    
    console.log(`[Test] Found ${data.length} announcements for TCS`);
    
    // Find the results announcement
    const resultAnnouncement = data.find((item: any) => {
      const desc = item.desc?.toLowerCase() || '';
      const attText = item.attchmntText?.toLowerCase() || '';
      
      return desc.includes('outcome of board meeting') && 
             attText.includes('financial result');
    });
    
    if (!resultAnnouncement) {
      console.error('[Test] ❌ No results announcement found for TCS');
      return;
    }
    
    console.log('\n[Test] Found announcement:');
    console.log(`  Description: ${resultAnnouncement.desc}`);
    console.log(`  Date: ${resultAnnouncement.an_dt}`);
    console.log(`  PDF URL: ${resultAnnouncement.attchmntFile}`);
    
    // Test PDF parsing
    console.log('\n[Test] Testing PDF parsing...');
    const parseResult = await parserRegistry.parsePDF('TCS', resultAnnouncement.attchmntFile);
    
    if (parseResult.success) {
      console.log('\n✅ PDF Parsing Successful!');
      console.log('\n📊 Extracted Metrics:');
      console.log(`  Quarter: ${parseResult.metrics.quarter}`);
      console.log(`  Fiscal Year: ${parseResult.metrics.fiscalYear}`);
      console.log(`  Revenue: ₹${parseResult.metrics.revenue} Cr`);
      console.log(`  Net Profit: ₹${parseResult.metrics.netProfit} Cr`);
      console.log(`  EPS: ₹${parseResult.metrics.eps}`);
      console.log(`  EBITDA: ₹${parseResult.metrics.ebitda} Cr`);
      console.log(`  Operating Margin: ${parseResult.metrics.operatingProfitMargin}%`);
      console.log(`  PAT Margin: ${parseResult.metrics.patMargin}%`);
    } else {
      console.error('\n❌ PDF Parsing Failed!');
      console.error(`  Errors: ${parseResult.errors.join(', ')}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.error();
    console.error('='.repeat(60));
    console.error('❌ Test failed!');
    console.error(`   Error: ${error.message}`);
    console.error('='.repeat(60));
    if (error.stack) {
      console.error();
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
