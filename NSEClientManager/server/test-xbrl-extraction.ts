/**
 * Test XBRL Extraction from NSE Announcements
 * This script tests fetching announcements with XBRL data
 */

import { nseClient } from './services/nse-scraper/http-client';
import { parseXBRLData } from './services/nse-scraper/xbrl-parser';
import { format, subDays } from 'date-fns';

async function main() {
  console.log('='.repeat(60));
  console.log('Testing XBRL Data Extraction from NSE');
  console.log('='.repeat(60));
  console.log();

  try {
    // Search for recent announcements with XBRL
    const endDate = new Date();
    const startDate = subDays(endDate, 30); // Last 30 days
    
    console.log(`[Test] Searching for XBRL announcements from ${format(startDate, 'dd-MM-yyyy')} to ${format(endDate, 'dd-MM-yyyy')}`);
    console.log();
    
    const data = await nseClient.get('/api/corporate-announcements', {
      index: 'equities',
      from_date: format(startDate, 'dd-MM-yyyy'),
      to_date: format(endDate, 'dd-MM-yyyy'),
    });
    
    console.log(`[Test] Found ${data.length} total announcements`);
    
    // Filter for announcements with XBRL
    const xbrlAnnouncements = data.filter((item: any) => {
      return item.hasXbrl === true || item.hasXbrl === 'true' || item.xbrl;
    });
    
    console.log(`[Test] Found ${xbrlAnnouncements.length} announcements with XBRL data`);
    console.log();
    
    if (xbrlAnnouncements.length === 0) {
      console.log('❌ No XBRL announcements found in the date range');
      console.log('   Try increasing the date range or checking a different period');
      return;
    }
    
    // Test with the first XBRL announcement
    const testAnnouncement = xbrlAnnouncements[0];
    
    console.log('📋 Testing with announcement:');
    console.log(`   Company: ${testAnnouncement.sm_name || testAnnouncement.companyName}`);
    console.log(`   Symbol: ${testAnnouncement.symbol}`);
    console.log(`   Description: ${testAnnouncement.desc}`);
    console.log(`   Date: ${testAnnouncement.an_dt}`);
    console.log(`   Has XBRL: ${testAnnouncement.hasXbrl}`);
    console.log();
    
    // Try to find XBRL URL
    const xbrlUrl = testAnnouncement.xbrl || 
                   testAnnouncement.xbrlUrl || 
                   testAnnouncement.xbrlFile ||
                   testAnnouncement.xbrlAttchmntFile;
    
    if (!xbrlUrl) {
      console.log('❌ XBRL URL not found in announcement data');
      console.log('   Available fields:', Object.keys(testAnnouncement));
      console.log();
      console.log('Full announcement data:');
      console.log(JSON.stringify(testAnnouncement, null, 2));
      return;
    }
    
    console.log(`   XBRL URL: ${xbrlUrl}`);
    console.log();
    
    // Parse XBRL data
    console.log('[Test] Parsing XBRL data...');
    const result = await parseXBRLData(xbrlUrl, testAnnouncement.symbol);
    
    if (result.success) {
      console.log();
      console.log('✅ XBRL Parsing Successful!');
      console.log();
      console.log('📊 Extracted Financial Metrics:');
      console.log(`   Quarter: ${result.metrics?.quarter || 'N/A'}`);
      console.log(`   Fiscal Year: ${result.metrics?.fiscalYear || 'N/A'}`);
      console.log(`   Period Ended: ${result.metrics?.periodEnded || 'N/A'}`);
      console.log(`   Revenue: ₹${result.metrics?.revenue || 'N/A'} Cr`);
      console.log(`   Net Profit: ₹${result.metrics?.netProfit || 'N/A'} Cr`);
      console.log(`   EPS: ₹${result.metrics?.eps || 'N/A'}`);
      console.log(`   EBITDA: ₹${result.metrics?.ebitda || 'N/A'} Cr`);
      console.log(`   Operating Profit: ₹${result.metrics?.operatingProfit || 'N/A'} Cr`);
      console.log(`   Operating Margin: ${result.metrics?.operatingProfitMargin || 'N/A'}%`);
      console.log(`   Result Type: ${result.metrics?.resultType || 'N/A'}`);
      
      if (result.warnings.length > 0) {
        console.log();
        console.log('⚠️  Warnings:');
        result.warnings.forEach(w => console.log(`   - ${w}`));
      }
    } else {
      console.log();
      console.log('❌ XBRL Parsing Failed!');
      console.log();
      console.log('Errors:');
      result.errors.forEach(e => console.log(`   - ${e}`));
    }
    
    console.log();
    console.log('='.repeat(60));
    console.log('Test completed');
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
