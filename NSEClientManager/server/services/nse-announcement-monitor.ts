import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from '../supabase-storage';

interface NSEAnnouncement {
  symbol: string;
  company: string;
  subject: string;
  date: string;
  time: string;
  announcementType: 'upcoming' | 'declared';
  expectedDate?: string;
  pdfUrl?: string;
}

interface ResultCalendarEntry {
  id?: string;
  symbol: string;
  company_name: string;
  announcement_date: string;
  quarter: string;
  fiscal_year: string;
  status: 'scheduled' | 'published';
  pdf_url?: string;
  extracted_data?: any;
}

export class NSEAnnouncementMonitor {
  private baseUrl = 'https://www.nseindia.com';
  private session: any = null;

  async initialize() {
    console.log('[NSE Monitor] Initializing session...');
    
    try {
      // Initialize session like other NSE scrapers
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
      });

      // Extract session cookies
      const cookies = response.headers['set-cookie'];
      this.session = { cookies };
      
      console.log('[NSE Monitor] Session initialized successfully');
      return true;
    } catch (error) {
      console.error('[NSE Monitor] Session initialization failed:', error);
      return false;
    }
  }

  async getFinancialAnnouncements(): Promise<NSEAnnouncement[]> {
    if (!this.session) {
      await this.initialize();
    }

    try {
      console.log('[NSE Monitor] Fetching corporate announcements...');
      
      const url = `${this.baseUrl}/api/corporate-announcements`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': this.baseUrl,
        },
        timeout: 15000,
      });

      const announcements: NSEAnnouncement[] = [];
      
      if (response.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          const subject = item.desc || item.subject || '';
          
          // Look for financial results related announcements
          if (this.isFinancialResultAnnouncement(subject)) {
            const announcement: NSEAnnouncement = {
              symbol: item.symbol || '',
              company: item.companyName || item.company || '',
              subject: subject,
              date: item.date || item.an_dt || '',
              time: item.time || '',
              announcementType: this.determineAnnouncementType(subject),
              pdfUrl: item.attchmntFile || item.pdf || ''
            };

            // Extract expected date for upcoming results
            if (announcement.announcementType === 'upcoming') {
              announcement.expectedDate = this.extractExpectedDate(subject);
            }

            announcements.push(announcement);
          }
        }
      }

      console.log(`[NSE Monitor] Found ${announcements.length} financial result announcements`);
      return announcements;

    } catch (error) {
      console.error('[NSE Monitor] Error fetching announcements:', error);
      return [];
    }
  }

  private isFinancialResultAnnouncement(subject: string): boolean {
    const keywords = [
      'financial results',
      'quarterly results',
      'unaudited results',
      'audited results',
      'q1', 'q2', 'q3', 'q4',
      'half yearly',
      'annual results',
      'declaration of results',
      'board meeting',
      'results for the quarter',
      'results for the year'
    ];

    return keywords.some(keyword => 
      subject.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private determineAnnouncementType(subject: string): 'upcoming' | 'declared' {
    const upcomingKeywords = [
      'board meeting',
      'intimation',
      'notice',
      'to consider',
      'will be held',
      'scheduled',
      'convened'
    ];

    const declaredKeywords = [
      'approved',
      'declared',
      'submitted',
      'outcome',
      'results of',
      'unaudited results for'
    ];

    const subjectLower = subject.toLowerCase();
    
    if (declaredKeywords.some(keyword => subjectLower.includes(keyword))) {
      return 'declared';
    }
    
    if (upcomingKeywords.some(keyword => subjectLower.includes(keyword))) {
      return 'upcoming';
    }
    
    return 'declared'; // Default to declared if unclear
  }

  private extractExpectedDate(subject: string): string | undefined {
    // Extract dates from subject like "Board meeting on December 1, 2025"
    const datePatterns = [
      /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*,?\s*(\d{4})/i,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/
    ];

    for (const pattern of datePatterns) {
      const match = subject.match(pattern);
      if (match) {
        try {
          // Convert to standardized date format
          return new Date(match[0]).toISOString().split('T')[0];
        } catch (error) {
          continue;
        }
      }
    }

    return undefined;
  }

  async saveToResultsCalendar(announcements: NSEAnnouncement[]): Promise<void> {
    console.log(`[NSE Monitor] Saving ${announcements.length} announcements to results calendar...`);

    for (const announcement of announcements) {
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('results_calendar')
          .select('id')
          .eq('symbol', announcement.symbol)
          .eq('announcement_date', announcement.date)
          .single();

        if (existing) {
          console.log(`  ✓ ${announcement.symbol} already in calendar, skipping`);
          continue;
        }

        // Determine quarter and fiscal year from current date/announcement
        const { quarter, fiscalYear } = this.determineQuarterFromDate(announcement.date);

        const calendarEntry: Partial<ResultCalendarEntry> = {
          symbol: announcement.symbol,
          company_name: announcement.company,
          announcement_date: announcement.expectedDate || announcement.date,
          quarter,
          fiscal_year: fiscalYear,
          status: announcement.announcementType === 'upcoming' ? 'scheduled' : 'published',
          pdf_url: announcement.pdfUrl || null
        };

        const { error } = await supabase
          .from('results_calendar')
          .insert(calendarEntry);

        if (error) {
          console.log(`  ✗ Failed to save ${announcement.symbol}: ${error.message}`);
        } else {
          console.log(`  ✅ Saved ${announcement.symbol} - ${announcement.announcementType} (${quarter} ${fiscalYear})`);
        }

      } catch (error) {
        console.error(`Error saving ${announcement.symbol}:`, error);
      }
    }
  }

  private determineQuarterFromDate(dateStr: string): { quarter: string; fiscalYear: string } {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();

    // Determine quarter based on month
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

async function main() {
  console.log('\n🔍 NSE FINANCIAL RESULTS ANNOUNCEMENT MONITOR\n');
  console.log('='.repeat(70));
  
  const monitor = new NSEAnnouncementMonitor();
  
  // Get financial announcements
  const announcements = await monitor.getFinancialAnnouncements();
  
  if (announcements.length === 0) {
    console.log('No financial result announcements found');
    return;
  }

  // Display announcements
  console.log('\n📢 FINANCIAL RESULT ANNOUNCEMENTS:\n');
  
  announcements.forEach((ann, index) => {
    console.log(`${index + 1}. ${ann.symbol} - ${ann.company}`);
    console.log(`   Subject: ${ann.subject}`);
    console.log(`   Date: ${ann.date} | Type: ${ann.announcementType}`);
    if (ann.expectedDate) {
      console.log(`   Expected: ${ann.expectedDate}`);
    }
    if (ann.pdfUrl) {
      console.log(`   PDF: ${ann.pdfUrl}`);
    }
    console.log('');
  });

  // Save to results calendar
  await monitor.saveToResultsCalendar(announcements);
  
  console.log('\n✅ NSE announcement monitoring complete!');
}

main().catch(console.error);