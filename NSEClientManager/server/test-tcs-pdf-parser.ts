/**
 * Test script to parse the downloaded TCS Q2 FY25-26 PDF
 * Validates the company-specific parser works correctly
 */

import { parserRegistry } from './services/nse-scraper/pdf-parsers/parser-registry';
import * as fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function testTCSParsing() {
  console.log('='.repeat(70));
  console.log('Testing TCS PDF Parser');
  console.log('='.repeat(70));
  console.log();

  const pdfPath = 'c:/Users/HP/NSE/NSEClientManager/attached_assets/TCS_Q2_FY2526.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF file not found:', pdfPath);
    process.exit(1);
  }

  try {
    // Read PDF file
    console.log('[Test] Reading PDF file...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const size = (dataBuffer.length / 1024).toFixed(2);
    console.log(`[Test] PDF size: ${size} KB`);
    console.log();

    // Extract text using pdf-parse
    console.log('[Test] Extracting text from PDF...');
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    
    console.log(`[Test] Extracted ${text.length} characters`);
    console.log(`[Test] Total pages: ${pdfData.numpages}`);
    console.log();

    // Show sample text
    console.log('[Test] First 500 characters:');
    console.log('-'.repeat(70));
    console.log(text.substring(0, 500));
    console.log('-'.repeat(70));
    console.log();

    // Now test with TCS parser
    console.log('[Test] Testing TCS parser...');
    const tcsParserRef = parserRegistry.getParser('TCS');
    
    // Create a mock URL (we'll provide the buffer directly in test)
    const mockUrl = 'https://nsearchives.nseindia.com/corporate/TCS_CORPCS_09102025154951_PostBMSELetter.pdf';
    
    // Since we already have the PDF, let's directly test the extraction logic
    // We'll use a workaround by creating a custom parser instance
    const { TCSParser } = await import('./services/nse-scraper/pdf-parsers/tcs-parser');
    const tcsParser = new TCSParser();
    
    // Access the protected extractMetrics method via any type
    const metrics = await (tcsParser as any).extractMetrics(text);
    
    console.log();
    console.log('='.repeat(70));
    console.log('📊 Extracted Financial Metrics');
    console.log('='.repeat(70));
    console.log();
    console.log('Period Information:');
    console.log(`  Quarter: ${metrics.quarter || 'NOT FOUND'}`);
    console.log(`  Fiscal Year: ${metrics.fiscalYear || 'NOT FOUND'}`);
    console.log(`  Period Ended: ${metrics.periodEnded || 'NOT FOUND'}`);
    console.log(`  Result Type: ${metrics.resultType || 'NOT FOUND'}`);
    console.log();
    
    console.log('Financial Metrics (₹ Crores):');
    console.log(`  Revenue: ${metrics.revenue || 'NOT FOUND'}`);
    console.log(`  Net Profit: ${metrics.netProfit || 'NOT FOUND'}`);
    console.log(`  EBITDA: ${metrics.ebitda || 'NOT FOUND'}`);
    console.log(`  Operating Profit: ${metrics.operatingProfit || 'NOT FOUND'}`);
    console.log();
    
    console.log('Per Share Metrics:');
    console.log(`  EPS: ₹${metrics.eps || 'NOT FOUND'}`);
    console.log();
    
    console.log('Margins:');
    console.log(`  Operating Margin: ${metrics.operatingProfitMargin || 'NOT FOUND'}%`);
    console.log(`  PAT Margin: ${metrics.patMargin || 'NOT FOUND'}%`);
    console.log();

    if (metrics.parsingNotes && metrics.parsingNotes.length > 0) {
      console.log('Parsing Notes:');
      metrics.parsingNotes.forEach((note: string) => console.log(`  - ${note}`));
      console.log();
    }

    // Validation
    const hasAllCoreMetrics = !!(
      metrics.revenue && 
      metrics.netProfit && 
      metrics.eps &&
      metrics.quarter &&
      metrics.fiscalYear
    );

    console.log('='.repeat(70));
    if (hasAllCoreMetrics) {
      console.log('✅ SUCCESS: All core metrics extracted successfully!');
    } else {
      console.log('⚠️  WARNING: Some core metrics missing');
      if (!metrics.revenue) console.log('   - Revenue missing');
      if (!metrics.netProfit) console.log('   - Net Profit missing');
      if (!metrics.eps) console.log('   - EPS missing');
      if (!metrics.quarter) console.log('   - Quarter missing');
      if (!metrics.fiscalYear) console.log('   - Fiscal Year missing');
    }
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error();
    console.error('='.repeat(70));
    console.error('❌ Test failed!');
    console.error(`Error: ${error.message}`);
    console.error('='.repeat(70));
    if (error.stack) {
      console.error();
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testTCSParsing();
