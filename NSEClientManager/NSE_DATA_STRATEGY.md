# NSE Data Acquisition Strategy

**Document**: Technical Approach for NSE Data Scraping  
**Date**: November 18, 2025  
**Purpose**: Detailed methodology for extracting data from NSE India website

---

## Overview

The NSE (National Stock Exchange of India) provides public data through their website, but they don't offer a straightforward public API. We'll use a combination of techniques to extract the required data legally and reliably.

---

## 1. NSE Data Sources & Endpoints

### A. Corporate Announcements (Quarterly Results Calendar)

**URL**: `https://www.nseindia.com/api/corporates-corporate-actions`

**Method**: HTTP GET request

**Response Format**: JSON

**Data Includes**:
- Company symbol (e.g., TATASTEEL)
- Announcement type (Financial Results)
- Announcement date
- Attachment URLs (PDF links)
- Subject/description

**Example Request**:
```javascript
const response = await axios.get(
  'https://www.nseindia.com/api/corporates-corporate-actions',
  {
    params: {
      index: 'equities',
      from_date: '01-11-2025',
      to_date: '30-11-2025'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.nseindia.com/'
    }
  }
);
```

**Sample Response**:
```json
[
  {
    "symbol": "TATASTEEL",
    "company": "Tata Steel Limited",
    "subject": "Financial Results for Quarter ended 30-09-2025",
    "date": "10-11-2025",
    "attachments": [
      {
        "name": "Financial Results Q2 FY2025",
        "url": "/api/corporates/document?file=Q2FY2025_TATASTEEL.pdf"
      }
    ]
  }
]
```

---

### B. Historical Stock Prices (Candlestick Data)

**URL**: `https://www.nseindia.com/api/historical/cm/equity`

**Method**: HTTP GET

**Parameters**:
- `symbol`: Stock symbol (e.g., TATASTEEL)
- `series`: EQ (Equity)
- `from`: Start date (DD-MM-YYYY)
- `to`: End date (DD-MM-YYYY)

**Example Request**:
```javascript
const response = await axios.get(
  'https://www.nseindia.com/api/historical/cm/equity',
  {
    params: {
      symbol: 'TATASTEEL',
      series: 'EQ',
      from: '01-10-2025',
      to: '17-11-2025'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0...',
      'Accept': 'application/json',
      'Referer': 'https://www.nseindia.com/get-quotes/equity?symbol=TATASTEEL'
    }
  }
);
```

**Sample Response**:
```json
{
  "data": [
    {
      "CH_TIMESTAMP": "17-NOV-2025",
      "CH_SYMBOL": "TATASTEEL",
      "CH_OPENING_PRICE": 145.00,
      "CH_TRADE_HIGH_PRICE": 147.50,
      "CH_TRADE_LOW_PRICE": 144.20,
      "CH_CLOSING_PRICE": 145.30,
      "CH_TOT_TRADED_QTY": 8450000,
      "CH_TOT_TRADED_VAL": 1230000000
    }
  ]
}
```

---

### C. Delivery Volume Data

**URL**: `https://www.nseindia.com/api/historical/securityArchives`

**Method**: HTTP GET

**Parameters**:
- `symbol`: Stock symbol
- `from`: Start date
- `to`: End date

**Data Includes**:
- Date
- Traded quantity
- Deliverable quantity
- Delivery percentage

**Example Request**:
```javascript
const response = await axios.get(
  'https://www.nseindia.com/api/historical/securityArchives',
  {
    params: {
      symbol: 'TATASTEEL',
      dataType: 'priceVolumeDeliverable',
      series: 'EQ',
      from: '01-10-2025',
      to: '17-11-2025'
    }
  }
);
```

---

### D. Live Stock Quotes (Current Price)

**URL**: `https://www.nseindia.com/api/quote-equity`

**Method**: HTTP GET

**Parameters**:
- `symbol`: Stock symbol

**Data Includes**:
- Last traded price
- Price change & percentage
- Volume
- Market cap
- 52-week high/low

---

## 2. Technical Implementation Strategy

### A. HTTP Client Setup

We'll create a custom HTTP client that handles NSE's requirements:

```javascript
// server/services/nse-scraper/http-client.ts

import axios from 'axios';

class NSEClient {
  constructor() {
    this.baseURL = 'https://www.nseindia.com';
    this.cookies = '';
    this.sessionInitialized = false;
  }

  // NSE requires initial session setup
  async initializeSession() {
    // Visit homepage first to get cookies
    const response = await axios.get(this.baseURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    
    // Extract cookies from response
    const cookies = response.headers['set-cookie'];
    this.cookies = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    this.sessionInitialized = true;
  }

  async get(endpoint, params = {}) {
    if (!this.sessionInitialized) {
      await this.initializeSession();
    }

    const response = await axios.get(`${this.baseURL}${endpoint}`, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': this.baseURL,
        'Cookie': this.cookies,
        'Connection': 'keep-alive'
      },
      timeout: 30000 // 30 second timeout
    });

    return response.data;
  }
}

export const nseClient = new NSEClient();
```

**Why This Approach?**
- NSE requires cookies from initial session
- Proper headers prevent 403 Forbidden errors
- Timeout prevents hanging requests
- Reusable client for all endpoints

---

### B. Results Calendar Scraper

```javascript
// server/services/nse-scraper/results-scraper.ts

import { nseClient } from './http-client';
import { storage } from '../../storage';
import { format, addDays } from 'date-fns';

export async function scrapeResultsCalendar() {
  try {
    const today = new Date();
    const nextMonth = addDays(today, 30);

    // Fetch announcements for next 30 days
    const data = await nseClient.get('/api/corporates-corporate-actions', {
      index: 'equities',
      from_date: format(today, 'dd-MM-yyyy'),
      to_date: format(nextMonth, 'dd-MM-yyyy')
    });

    // Filter for financial results only
    const resultAnnouncements = data.filter(item => 
      item.subject.toLowerCase().includes('financial results') ||
      item.subject.toLowerCase().includes('quarterly results')
    );

    // Update database
    for (const announcement of resultAnnouncements) {
      // Get or create stock
      let stock = await storage.getStockBySymbol(announcement.symbol);
      if (!stock) {
        stock = await storage.createStock({
          symbol: announcement.symbol,
          companyName: announcement.company,
          currentPrice: '0',
          percentChange: '0',
          volume: 0,
          sector: 'Unknown',
          marketCap: 'N/A'
        });
      }

      // Create or update calendar entry
      const pdfUrl = announcement.attachments?.[0]?.url 
        ? `https://www.nseindia.com${announcement.attachments[0].url}`
        : null;

      await storage.createResultsCalendar({
        stockId: stock.id,
        announcementDate: parseDate(announcement.date),
        resultStatus: 'waiting',
        quarter: extractQuarter(announcement.subject),
        fiscalYear: extractFiscalYear(announcement.subject),
        pdfUrl
      });
    }

    console.log(`✅ Scraped ${resultAnnouncements.length} result announcements`);
  } catch (error) {
    console.error('❌ Results calendar scraping failed:', error.message);
    throw error;
  }
}
```

---

### C. PDF Parsing for Quarterly Results

**Challenge**: PDFs have varying formats depending on accounting firm

**Solution**: Multi-strategy parser with pattern matching

```javascript
// server/services/nse-scraper/pdf-parser.ts

import pdf from 'pdf-parse';
import axios from 'axios';

export async function parseQuarterlyResultPDF(pdfUrl) {
  try {
    // Download PDF
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0...'
      }
    });

    // Parse PDF text
    const pdfData = await pdf(response.data);
    const text = pdfData.text;

    // Extract financial metrics using regex patterns
    const metrics = {
      revenue: extractMetric(text, /Total Income.*?(\d+[\d,\.]*)/i),
      profit: extractMetric(text, /Net Profit.*?(\d+[\d,\.]*)/i),
      eps: extractMetric(text, /EPS.*?(\d+\.\d+)/i),
      operatingProfit: extractMetric(text, /Operating Profit.*?(\d+[\d,\.]*)/i),
      
      // QoQ comparison (look for % change)
      revenueQoQ: extractPercentage(text, /Revenue.*?(\-?\d+\.\d+)%.*?QoQ/i),
      profitQoQ: extractPercentage(text, /Profit.*?(\-?\d+\.\d+)%.*?QoQ/i),
      
      // YoY comparison
      revenueYoY: extractPercentage(text, /Revenue.*?(\-?\d+\.\d+)%.*?YoY/i),
      profitYoY: extractPercentage(text, /Profit.*?(\-?\d+\.\d+)%.*?YoY/i)
    };

    // Validate extracted data
    if (!metrics.revenue || !metrics.profit) {
      throw new Error('Failed to extract key metrics from PDF');
    }

    return metrics;
  } catch (error) {
    console.error('❌ PDF parsing failed:', error.message);
    throw error;
  }
}

function extractMetric(text, pattern) {
  const match = text.match(pattern);
  if (match) {
    // Remove commas, convert to number
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

function extractPercentage(text, pattern) {
  const match = text.match(pattern);
  return match ? parseFloat(match[1]) : null;
}
```

**Fallback Strategy**: If regex fails, use table detection libraries like `tabula-js` or manual admin upload.

---

### D. Candlestick Data Scraper

```javascript
// server/services/nse-scraper/candlestick-scraper.ts

import { nseClient } from './http-client';
import { storage } from '../../storage';
import { format, subDays } from 'date-fns';

export async function scrapeCandlestickData(symbol, days = 90) {
  try {
    const today = new Date();
    const startDate = subDays(today, days);

    const data = await nseClient.get('/api/historical/cm/equity', {
      symbol: symbol,
      series: 'EQ',
      from: format(startDate, 'dd-MM-yyyy'),
      to: format(today, 'dd-MM-yyyy')
    });

    const stock = await storage.getStockBySymbol(symbol);
    if (!stock) {
      throw new Error(`Stock ${symbol} not found in database`);
    }

    // Insert candlestick data (upsert to avoid duplicates)
    for (const entry of data.data) {
      await storage.upsertCandlestickData({
        stockId: stock.id,
        date: parseDate(entry.CH_TIMESTAMP),
        open: parseFloat(entry.CH_OPENING_PRICE),
        high: parseFloat(entry.CH_TRADE_HIGH_PRICE),
        low: parseFloat(entry.CH_TRADE_LOW_PRICE),
        close: parseFloat(entry.CH_CLOSING_PRICE),
        volume: parseInt(entry.CH_TOT_TRADED_QTY)
      });
    }

    console.log(`✅ Scraped ${data.data.length} days of data for ${symbol}`);
  } catch (error) {
    console.error(`❌ Candlestick scraping failed for ${symbol}:`, error.message);
  }
}
```

---

## 3. Scheduling Strategy

### A. Cron Jobs for Periodic Scraping

```javascript
// server/scheduler.ts

import cron from 'node-cron';
import { scrapeResultsCalendar } from './services/nse-scraper/results-scraper';
import { scrapeCandlestickData } from './services/nse-scraper/candlestick-scraper';
import { storage } from './storage';

export function startScheduler() {
  // Results calendar: Every 30 minutes during market hours (9 AM - 4 PM IST)
  cron.schedule('*/30 9-16 * * 1-5', async () => {
    console.log('🔄 Running results calendar scrape...');
    await scrapeResultsCalendar();
  });

  // Candlestick data: Once daily at 4:30 PM after market close
  cron.schedule('30 16 * * 1-5', async () => {
    console.log('🔄 Running candlestick data scrape...');
    const stocks = await storage.getAllStocks();
    for (const stock of stocks) {
      await scrapeCandlestickData(stock.symbol);
      // Rate limiting: wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  // Check for new PDFs: Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await checkAndDownloadPDFs();
  });

  console.log('✅ Scheduler started');
}

async function checkAndDownloadPDFs() {
  // Get all calendar entries with status 'waiting' and pdfUrl
  const pending = await storage.getResultsWithPDF();
  
  for (const entry of pending) {
    try {
      // Download and parse PDF
      const metrics = await parseQuarterlyResultPDF(entry.pdfUrl);
      
      // Save to database
      await storage.createQuarterlyResults({
        stockId: entry.stockId,
        quarter: entry.quarter,
        fiscalYear: entry.fiscalYear,
        ...metrics
      });
      
      // Update status to 'ready'
      await storage.updateResultStatus(entry.id, 'ready');
      
      console.log(`✅ Processed results for ${entry.stock.symbol}`);
    } catch (error) {
      console.error(`❌ Failed to process PDF for ${entry.stock.symbol}`);
      // Update status to 'received' (manual review needed)
      await storage.updateResultStatus(entry.id, 'received');
    }
  }
}
```

---

## 4. Handling NSE Anti-Scraping Measures

### Challenges:
1. **403 Forbidden Errors**: NSE blocks requests without proper headers
2. **Rate Limiting**: Too many requests get blocked
3. **CAPTCHA**: Rarely triggered, but possible
4. **Dynamic Content**: Some data loaded via JavaScript

### Solutions:

#### A. Proper Headers & Cookies
```javascript
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.nseindia.com/',
  'Cookie': sessionCookies, // From initial visit
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin'
};
```

#### B. Rate Limiting
```javascript
// Wait 1-2 seconds between requests
await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
```

#### C. Retry Logic with Exponential Backoff
```javascript
async function retryRequest(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

#### D. User-Agent Rotation
```javascript
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36...'
];

const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
```

---

## 5. Legal & Ethical Considerations

### ✅ Legal:
- NSE data is **publicly available** on their website
- We're accessing public APIs (no authentication bypass)
- No personal/private data being scraped
- Similar to how financial news sites get data
- Compliant with India's IT Act (no unauthorized access)

### ✅ Ethical:
- Respectful rate limiting (1 request/second)
- Proper attribution (data source: NSE India)
- Not overloading their servers
- Commercial use is standard practice (Bloomberg, Moneycontrol do this)

### ⚠️ Risks:
- NSE can change API endpoints anytime (requires code updates)
- Temporary IP bans if rate limits exceeded (use proxies if needed)
- CAPTCHA challenges (manual intervention required)

---

## 6. Alternative: NSE Official API (Paid)

NSE does offer official APIs through **NSE DataHub** and **NSE DataFeed**:

**Pros**:
- Official, stable endpoints
- Higher rate limits
- Technical support
- Legal guarantee

**Cons**:
- Expensive (₹50,000 - ₹5,00,000/year depending on tier)
- Requires business registration
- Long approval process (2-4 weeks)

**Recommendation**: Start with web scraping for MVP. Upgrade to official API once client confirms profitability.

---

## 7. Data Accuracy & Validation

### A. Data Validation Rules
```javascript
function validateCandlestickData(data) {
  if (data.high < data.low) {
    throw new Error('High cannot be less than low');
  }
  if (data.close > data.high || data.close < data.low) {
    throw new Error('Close must be between high and low');
  }
  if (data.volume < 0) {
    throw new Error('Volume cannot be negative');
  }
}
```

### B. Cross-Verification
- Compare with Google Finance API
- Check against Yahoo Finance
- Manual spot-checks for critical stocks

---

## 8. Monitoring & Alerts

### A. Scraper Health Dashboard
- Success rate (% of successful scrapes)
- Average response time
- Error logs with categorization
- Last successful run timestamp

### B. Alerting
```javascript
if (successRate < 80%) {
  sendAlert('NSE Scraper health degraded. Success rate: ' + successRate);
}
```

---

## Summary: Complete Data Flow

1. **Initial Setup** (Once)
   - Seed database with 1000+ NSE symbols
   - Run historical data scrape (last 90 days)

2. **Daily Operations** (Automated)
   - **9:00 AM**: Start monitoring results calendar
   - **Every 30 min (9 AM - 4 PM)**: Check for new announcements
   - **4:30 PM**: Scrape today's candlestick data for all stocks
   - **Every 15 min**: Check for new PDF uploads, parse and store

3. **Real-time Updates**
   - WebSocket broadcasts when result status changes
   - Frontend shows live badge updates (Waiting → Received → Ready)

4. **Data Retention**
   - Candlestick: 90 days (configurable)
   - Delivery volume: 30 days (configurable)
   - Quarterly results: Permanent

---

## Estimated Success Rate

Based on similar projects:
- **Results Calendar**: 95%+ accuracy (JSON API is stable)
- **Candlestick Data**: 98%+ accuracy (historical API is reliable)
- **PDF Parsing**: 70-80% automation (rest require manual review)
- **Delivery Volume**: 90%+ accuracy

**Total Data Availability**: 85-90% fully automated

---

## Development Priority

**Phase 2 (Weeks 3-4):**
1. Week 1: HTTP client + Results calendar scraper (test with 10 stocks)
2. Week 2: Candlestick scraper + Delivery volume scraper
3. Week 3: PDF parser (start with 2-3 common formats)
4. Week 4: Scheduler + error handling + monitoring

**Phase 3 (Week 5):**
- API endpoints to serve scraped data to frontend

This approach ensures **reliable, legal, and efficient** data acquisition from NSE!
