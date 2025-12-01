import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { GenericResultsParser } from './services/pdf-parser/generic-results-parser';
import { supabase } from './supabase-storage';

interface CompanyResult {
  symbol: string;
  quarter: string;
  fiscalYear: string;
  pdfUrl: string;
  extractedData?: any;
}

export class NSEResultExtractor {
  private downloadDir = path.join(process.cwd(), 'downloads', 'results');

  constructor() {
    // Ensure download directory exists
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  async downloadResultPDF(pdfUrl: string, symbol: string, quarter: string): Promise<string | null> {
    try {
      console.log(`[PDF Downloader] Downloading ${symbol} ${quarter} results...`);
      
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 30000,
      });

      const filename = `${symbol}_${quarter}_${Date.now()}.pdf`;
      const filepath = path.join(this.downloadDir, filename);
      
      fs.writeFileSync(filepath, response.data);
      
      console.log(`[PDF Downloader] ✅ Downloaded: ${filepath}`);
      return filepath;

    } catch (error) {
      console.error(`[PDF Downloader] ❌ Failed to download ${symbol} PDF:`, error);
      return null;
    }
  }

  async extractDataFromPDF(pdfPath: string): Promise<any | null> {
    try {
      console.log(`[PDF Parser] Extracting data from: ${path.basename(pdfPath)}`);
      
      const parser = new GenericResultsParser();
      const result = await parser.parsePDF(pdfPath);
      
      if (result && result.confidence >= 60) {
        console.log(`[PDF Parser] ✅ Extraction successful (${result.confidence.toFixed(1)}% confidence)`);
        console.log(`  Revenue: ₹${result.revenue} Cr`);
        console.log(`  Profit: ₹${result.profit} Cr`);
        console.log(`  EPS: ₹${result.eps}`);
        console.log(`  Operating Profit: ₹${result.operatingProfit} Cr`);
        return result;
      } else {
        console.log(`[PDF Parser] ⚠️  Low confidence extraction (${result?.confidence || 0}%)`);
        return null;
      }

    } catch (error) {
      console.error('[PDF Parser] ❌ Extraction failed:', error);
      return null;
    }
  }

  async saveExtractedData(symbol: string, extractedData: any): Promise<boolean> {
    try {
      console.log(`[Database] Saving ${symbol} ${extractedData.quarter} ${extractedData.fiscalYear} results...`);

      // Get or create stock
      let { data: stock } = await supabase
        .from('stocks')
        .select('id')
        .eq('symbol', symbol)
        .single();

      if (!stock) {
        console.log(`[Database] Creating new stock entry for ${symbol}...`);
        const { data: newStock, error } = await supabase
          .from('stocks')
          .insert({
            symbol,
            company_name: `${symbol} Limited`, // Default name
            sector: 'Unknown',
            current_price: 0,
          })
          .select('id')
          .single();

        if (error) {
          console.error(`[Database] ❌ Failed to create stock ${symbol}:`, error.message);
          return false;
        }
        stock = newStock;
      }

      // Check if quarter data already exists
      const { data: existing } = await supabase
        .from('quarterly_results')
        .select('id')
        .eq('stock_id', stock.id)
        .eq('quarter', extractedData.quarter)
        .eq('fiscal_year', extractedData.fiscalYear)
        .single();

      if (existing) {
        console.log(`[Database] ✓ ${symbol} ${extractedData.quarter} ${extractedData.fiscalYear} already exists, skipping`);
        return true;
      }

      // Insert quarterly results
      const { error } = await supabase
        .from('quarterly_results')
        .insert({
          stock_id: stock.id,
          quarter: extractedData.quarter,
          fiscal_year: extractedData.fiscalYear,
          revenue: extractedData.revenue,
          profit: extractedData.profit,
          eps: extractedData.eps,
          operating_profit: extractedData.operatingProfit,
          operating_profit_margin: extractedData.operatingProfitMargin,
        });

      if (error) {
        console.error(`[Database] ❌ Failed to save ${symbol} results:`, error.message);
        return false;
      }

      console.log(`[Database] ✅ Saved ${symbol} ${extractedData.quarter} ${extractedData.fiscalYear} results`);
      
      // Update results calendar status
      await this.updateCalendarStatus(symbol, extractedData.quarter, extractedData.fiscalYear, 'published');
      
      return true;

    } catch (error) {
      console.error(`[Database] Error saving ${symbol} data:`, error);
      return false;
    }
  }

  private async updateCalendarStatus(symbol: string, quarter: string, fiscalYear: string, status: string) {
    try {
      await supabase
        .from('results_calendar')
        .update({ status })
        .eq('symbol', symbol)
        .eq('quarter', quarter)
        .eq('fiscal_year', fiscalYear);
    } catch (error) {
      console.error('Error updating calendar status:', error);
    }
  }

  async processScheduledResults(): Promise<void> {
    console.log('\n📋 PROCESSING SCHEDULED FINANCIAL RESULTS\n');
    console.log('='.repeat(70));

    // Get scheduled results for today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: scheduled } = await supabase
      .from('results_calendar')
      .select('*')
      .eq('status', 'scheduled')
      .lte('announcement_date', today);

    if (!scheduled || scheduled.length === 0) {
      console.log('No scheduled results for today');
      return;
    }

    console.log(`Found ${scheduled.length} scheduled results for processing:\n`);

    for (const result of scheduled) {
      console.log(`Processing ${result.symbol} - ${result.quarter} ${result.fiscal_year}`);
      
      if (!result.pdf_url) {
        console.log(`  ⚠️  No PDF URL available, skipping`);
        continue;
      }

      // Download PDF
      const pdfPath = await this.downloadResultPDF(
        result.pdf_url, 
        result.symbol, 
        `${result.quarter}_${result.fiscal_year}`
      );

      if (!pdfPath) {
        console.log(`  ❌ Failed to download PDF`);
        continue;
      }

      // Extract data
      const extractedData = await this.extractDataFromPDF(pdfPath);
      
      if (!extractedData) {
        console.log(`  ❌ Failed to extract data from PDF`);
        continue;
      }

      // Ensure extracted data has correct quarter/fiscal year
      extractedData.quarter = result.quarter;
      extractedData.fiscalYear = result.fiscal_year;

      // Save to database
      const saved = await this.saveExtractedData(result.symbol, extractedData);
      
      if (saved) {
        console.log(`  ✅ Successfully processed ${result.symbol}`);
        
        // Clean up PDF file
        try {
          fs.unlinkSync(pdfPath);
          console.log(`  🗑️  Cleaned up PDF file`);
        } catch (error) {
          console.log(`  ⚠️  Could not delete PDF file`);
        }
      }

      console.log('');
    }

    console.log('✅ Scheduled results processing complete!');
  }

  async testEmmveeExtraction(): Promise<void> {
    console.log('\n🧪 TESTING EMMVEE PHOTOVOLTAIC POWER LTD EXTRACTION\n');
    console.log('='.repeat(70));

    // This is a test function for the specific company mentioned
    const testSymbol = 'EMMVEE';
    
    console.log(`Testing real-time extraction for ${testSymbol}...`);
    
    // Check if there's an announcement for Emmvee
    const { data: announcement } = await supabase
      .from('results_calendar')
      .select('*')
      .eq('symbol', testSymbol)
      .order('announcement_date', { ascending: false })
      .limit(1)
      .single();

    if (!announcement) {
      console.log(`No announcement found for ${testSymbol} in calendar`);
      console.log('Running NSE monitor to check for announcements...');
      
      // Run NSE monitor
      const { NSEAnnouncementMonitor } = await import('./services/nse-announcement-monitor');
      const monitor = new NSEAnnouncementMonitor();
      const announcements = await monitor.getFinancialAnnouncements();
      
      const emmveeAnn = announcements.find(ann => 
        ann.symbol.toUpperCase().includes('EMMVEE') || 
        ann.company.toLowerCase().includes('emmvee')
      );
      
      if (emmveeAnn) {
        console.log(`✅ Found Emmvee announcement:`, emmveeAnn);
        await monitor.saveToResultsCalendar([emmveeAnn]);
      } else {
        console.log(`No Emmvee announcement found in current NSE data`);
      }
      
      return;
    }

    console.log(`Found announcement for ${testSymbol}:`, announcement);
    
    if (announcement.pdf_url && announcement.status === 'scheduled') {
      console.log('Processing PDF extraction...');
      
      // Download and process
      const pdfPath = await this.downloadResultPDF(
        announcement.pdf_url,
        testSymbol,
        `${announcement.quarter}_${announcement.fiscal_year}`
      );
      
      if (pdfPath) {
        const extractedData = await this.extractDataFromPDF(pdfPath);
        
        if (extractedData) {
          extractedData.quarter = announcement.quarter;
          extractedData.fiscalYear = announcement.fiscal_year;
          
          await this.saveExtractedData(testSymbol, extractedData);
          
          console.log(`✅ Emmvee extraction test complete!`);
        }
      }
    }
  }
}

async function main() {
  const extractor = new NSEResultExtractor();
  
  // Process scheduled results
  await extractor.processScheduledResults();
  
  // Test Emmvee extraction
  await extractor.testEmmveeExtraction();
}

main().catch(console.error);