import { ScreenerScraper } from './services/web-scrapers/screener-scraper';
import { GenericResultsParser } from './services/pdf-parser/generic-results-parser';

async function testScreenerScraping() {
  console.log('\n🧪 Testing Screener.in Scraping\n');
  console.log('='.repeat(60));
  
  const scraper = new ScreenerScraper();
  
  // Test with TCS
  const testSymbols = ['TCS', 'INFY', 'RELIANCE'];
  
  for (const symbol of testSymbols) {
    try {
      console.log(`\nTesting ${symbol}...`);
      const data = await scraper.getQuarterlyResults(symbol);
      
      if (data.length > 0) {
        console.log(`\n✅ Successfully scraped ${data.length} quarters for ${symbol}:`);
        console.log('\nLatest 3 quarters:');
        data.slice(0, 3).forEach((q, i) => {
          console.log(`\n${i + 1}. ${q.quarter} ${q.fiscalYear}`);
          console.log(`   Revenue: ₹${q.revenue.toLocaleString()} Cr`);
          console.log(`   Profit: ₹${q.profit.toLocaleString()} Cr`);
          console.log(`   EPS: ₹${q.eps}`);
          console.log(`   Operating Profit: ₹${q.operatingProfit.toLocaleString()} Cr`);
        });
      } else {
        console.log(`\n⚠️  No data found for ${symbol}`);
      }
      
      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`\n❌ Error testing ${symbol}:`, error);
    }
  }
}

async function testPDFParsing() {
  console.log('\n\n🧪 Testing PDF Parsing\n');
  console.log('='.repeat(60));
  
  const parser = new GenericResultsParser();
  
  // Check if TCS Q2 PDF exists
  const pdfPaths = [
    'c:/Users/HP/NSE/NSEClientManager/server/tcs-q2-fy2526.pdf',
    'c:/Users/HP/NSE/NSEClientManager/tcs-q2-fy2526.pdf',
    './tcs-q2-fy2526.pdf',
  ];
  
  let foundPdf = false;
  
  for (const pdfPath of pdfPaths) {
    try {
      const fs = await import('fs');
      if (fs.existsSync(pdfPath)) {
        console.log(`\nFound PDF: ${pdfPath}`);
        console.log('Parsing...\n');
        
        const result = await parser.parsePDF(pdfPath);
        
        if (result) {
          console.log('\n✅ Successfully parsed PDF:');
          console.log(`\nQuarter: ${result.quarter} ${result.fiscalYear}`);
          console.log(`Revenue: ₹${result.revenue.toLocaleString()} Cr`);
          console.log(`Profit: ₹${result.profit.toLocaleString()} Cr`);
          console.log(`EPS: ₹${result.eps}`);
          console.log(`Operating Profit: ₹${result.operatingProfit.toLocaleString()} Cr`);
          console.log(`Operating Margin: ${result.operatingProfitMargin.toFixed(2)}%`);
          console.log(`\nConfidence: ${result.confidence.toFixed(1)}%`);
          
          if (result.confidence >= 80) {
            console.log('✅ High confidence extraction!');
          } else if (result.confidence >= 60) {
            console.log('⚠️  Medium confidence - manual verification recommended');
          } else {
            console.log('❌ Low confidence - needs manual data entry');
          }
        } else {
          console.log('\n❌ Failed to parse PDF or low confidence');
        }
        
        foundPdf = true;
        break;
      }
    } catch (error) {
      console.error(`Error checking ${pdfPath}:`, error);
    }
  }
  
  if (!foundPdf) {
    console.log('\n⚠️  No PDF file found for testing');
    console.log('\nTo test PDF parsing:');
    console.log('1. Download a quarterly results PDF');
    console.log('2. Save it as "tcs-q2-fy2526.pdf" in the NSEClientManager folder');
    console.log('3. Run this test again');
  }
}

async function main() {
  console.log('\n🚀 Web Scraping & PDF Parsing Test Suite\n');
  
  // Test 1: Web Scraping
  await testScreenerScraping();
  
  // Test 2: PDF Parsing
  await testPDFParsing();
  
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 Test Complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Review the scraped data above');
  console.log('2. If successful, run: npx tsx server/auto-fetch-quarterly-data.ts');
  console.log('3. Then run: npx tsx server/auto-populate-all-comparisons.ts');
  console.log('4. All quarterly data will be automatically populated!\n');
}

main().catch(console.error);
