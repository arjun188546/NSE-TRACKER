# NSE Project Implementation Plan

**Status:** Ready for Development  
**Last Updated:** November 17, 2025

---

## Current State Analysis

### ✅ What's Already Built
- **Authentication System**: Login/logout for clients and admins with session management
- **User Management**: Admin panel to manage users, activate/cancel demos
- **Basic Stock Data**: Mock stock data with portfolio and top performers
- **Results Calendar**: Basic calendar structure with announcement dates and statuses
- **Quarterly Results**: Schema for storing QoQ/YoY comparisons
- **UI Components**: Full set of shadcn/ui components (cards, tables, charts, dialogs, etc.)
- **Pages**: Dashboard, Calendar, Stock Detail, Admin, Login
- **Database Schema**: Defined in `shared/schema.ts` with Drizzle ORM
- **Subscription Model**: Active, demo (7-day), inactive states

### ❌ What's Missing (Core Requirements)

1. **NSE Data Scraping Pipeline**
   - Real-time polling of NSE results announcements
   - PDF download and parsing
   - Candlestick data fetching (OHLCV)
   - Delivery volume data scraping

2. **Enhanced Calendar UI**
   - Date strip with earnings counts (05 Nov — 116 Earnings)
   - Click date → filter companies by that date
   - Enhanced filtering controls

3. **Three-Window Stock Detail Page**
   - Window 1: QoQ/YoY comparison table (needs full metrics)
   - Window 2: Interactive candlestick chart with EMA/RSA indicators
   - Window 3: Delivery-to-trading volume table (21+ days)

4. **Real-time Status Updates**
   - Background jobs to update result status: Waiting → Received → Ready
   - WebSocket or polling for live status changes

5. **Enhanced Stock Listing**
   - Filter by sector, status, price change
   - Sort by multiple columns
   - Search functionality

---

## Implementation Phases

## Phase 1: Data Infrastructure (Week 1-2)

### 1.1 Database Enhancements
**Priority: HIGH**

**Tasks:**
- [ ] Extend `candlestickData` table to store historical OHLCV data
- [ ] Add indexes on `date`, `stockId` for fast queries
- [ ] Create `nse_scrape_jobs` table to track scraping status
- [ ] Add `pdf_url` field to `resultsCalendar` for storing NSE PDF links
- [ ] Expand `quarterlyResults` with additional metrics:
  - Operating Profit, Operating Profit Margin
  - EBITDA, EBITDA Margin
  - Total Income, Total Expenses
  - PAT Margin, ROE, ROCE

**Files to Edit:**
- `shared/schema.ts` - add new fields and tables
- `server/supabase/migrations/002_enhanced_schema.sql` - create migration

**Code Example:**
```typescript
// Add to schema.ts
export const scrapingJobs = pgTable("scraping_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobType: text("job_type").notNull(), // 'results', 'candlestick', 'delivery'
  stockId: varchar("stock_id").references(() => stocks.id),
  status: text("status").default("pending"), // pending, running, completed, failed
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  errorMessage: text("error_message"),
});
```

### 1.2 NSE API Research
**Priority: HIGH**

**Tasks:**
- [ ] Identify NSE endpoints for:
  - Corporate announcements / results calendar
  - Historical price data (candlestick)
  - Delivery volume data
  - PDF result documents
- [ ] Document rate limits and authentication requirements
- [ ] Test sample API calls with curl/Postman
- [ ] Handle CORS and anti-scraping measures

**NSE Data Sources:**
```
# Results Calendar
https://www.nseindia.com/api/corporates-corporate-actions

# Historical Data
https://www.nseindia.com/api/historical/cm/equity?symbol=TATASTEEL

# Delivery Data
https://www.nseindia.com/api/historical/securityArchives?symbol=TATASTEEL

# Result PDFs
https://www.nseindia.com/api/corporate-announcements
```

---

## Phase 2: Data Scraping Service (Week 2-3)

### 2.1 Core Scraper Architecture
**Priority: HIGH**

**Tasks:**
- [ ] Create `server/services/nse-scraper.ts` module
- [ ] Implement rate-limited HTTP client with retry logic
- [ ] Add user-agent rotation and cookie handling
- [ ] Create queue system for scraping jobs (use `bull` or `pg-boss`)

**New Dependencies:**
```bash
npm install axios cheerio pdf-parse bull ioredis
npm install -D @types/cheerio @types/pdf-parse
```

**File Structure:**
```
server/services/
  ├── nse-scraper/
  │   ├── index.ts           # Main orchestrator
  │   ├── http-client.ts     # NSE HTTP wrapper with headers
  │   ├── results-scraper.ts # Fetch results calendar
  │   ├── pdf-parser.ts      # Parse quarterly result PDFs
  │   ├── candlestick-scraper.ts
  │   ├── delivery-scraper.ts
  │   └── scheduler.ts       # Cron jobs
```

### 2.2 Results Calendar Scraper
**Priority: HIGH**

**Implementation:**
```typescript
// server/services/nse-scraper/results-scraper.ts
export async function scrapeResultsCalendar() {
  const response = await nseClient.get('/api/corporates-corporate-actions');
  const announcements = response.data.filter(
    (item) => item.subject.includes('Financial Result')
  );
  
  for (const announcement of announcements) {
    await storage.upsertResultsCalendar({
      symbol: announcement.symbol,
      announcementDate: announcement.date,
      resultStatus: 'waiting',
      pdfUrl: announcement.attachments[0]?.url,
    });
  }
}
```

### 2.3 PDF Parser for Quarterly Results
**Priority: HIGH**

**Implementation:**
```typescript
// server/services/nse-scraper/pdf-parser.ts
import pdf from 'pdf-parse';

export async function parseQuarterlyResultPDF(pdfUrl: string) {
  const pdfBuffer = await downloadPDF(pdfUrl);
  const data = await pdf(pdfBuffer);
  
  // Extract tables using regex or table detection
  const metrics = extractFinancialMetrics(data.text);
  
  return {
    revenue: metrics.revenue,
    profit: metrics.netProfit,
    eps: metrics.eps,
    revenueQoQ: calculateQoQ(metrics.revenue, previousQuarter.revenue),
    // ... other metrics
  };
}
```

### 2.4 Candlestick Data Scraper
**Priority: MEDIUM**

**Tasks:**
- [ ] Fetch OHLCV data for all active stocks
- [ ] Store last 90 days by default, fetch incrementally
- [ ] Run daily after market close (3:30 PM IST)

### 2.5 Delivery Volume Scraper
**Priority: MEDIUM**

**Tasks:**
- [ ] Fetch delivery percentage data from NSE
- [ ] Store last 30 days minimum
- [ ] Run daily after market close

---

## Phase 3: Backend API Enhancements (Week 3-4)

### 3.1 Enhanced Calendar Endpoints
**Priority: HIGH**

**New Endpoints:**
```typescript
// GET /api/calendar/date-summary
// Returns: [{ date: '2025-11-05', count: 116, status_breakdown: {...} }]

// GET /api/calendar/by-date/:date?filters
// Returns: [{ symbol, name, price, change, volume, status }]
// Filters: sector, status, minChange, maxChange

// GET /api/stocks/:symbol/detail
// Returns complete 3-window data:
// { stock, quarterlyResults, candlestickData, deliveryVolume }
```

**Files to Edit:**
- `server/routes.ts` - add new routes
- `server/supabase/api/calendar.ts` - enhance with filters
- `server/supabase/api/stocks.ts` - add candlestick/delivery queries

### 3.2 Real-time Status Updates
**Priority: MEDIUM**

**Options:**
1. **WebSocket** (recommended for real-time)
2. **Server-Sent Events** (simpler)
3. **Polling** (fallback)

**Implementation:**
```typescript
// server/websocket.ts
import { WebSocketServer } from 'ws';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      // Handle subscriptions to specific stocks/dates
    });
  });
  
  // Broadcast when result status changes
  storage.on('resultStatusChange', (data) => {
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({ type: 'status_update', data }));
    });
  });
}
```

---

## Phase 4: Frontend Implementation (Week 4-5)

### 4.1 Enhanced Calendar Page
**Priority: HIGH**

**Tasks:**
- [ ] Create date strip component with earnings counts
- [ ] Add click handler to filter by date
- [ ] Build filter sidebar (sector, status, price range)
- [ ] Add search bar for symbol/company name
- [ ] Show color-coded status badges

**New Components:**
```typescript
// client/src/components/calendar/
├── date-strip.tsx          // Horizontal date selector
├── results-table.tsx       // Enhanced table with filters
├── filter-sidebar.tsx      // Sector, status, price filters
└── status-indicator.tsx    // Waiting/Received/Ready badges
```

### 4.2 Three-Window Stock Detail Page
**Priority: HIGH**

**Complete Redesign:**
```typescript
// client/src/pages/stock-detail-three-windows.tsx

export default function StockDetailPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Window 1: Quarterly Results */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Quarterly Results Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {results ? (
            <QuarterlyComparisonTable data={results} />
          ) : (
            <Alert>Waiting for results...</Alert>
          )}
        </CardContent>
      </Card>

      {/* Window 2: Candlestick Chart */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Price Chart (21 Days)</CardTitle>
          <DaysSelector onChange={setDays} />
        </CardHeader>
        <CardContent>
          <CandlestickChart 
            data={candlestickData} 
            indicators={['EMA', 'RSA', 'VOLUME']}
          />
        </CardContent>
      </Card>

      {/* Window 3: Delivery Volume */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Delivery vs Trading Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryVolumeTable data={deliveryData} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.3 Candlestick Chart with Indicators
**Priority: HIGH**

**Libraries to Use:**
- `lightweight-charts` (TradingView) - best for candlesticks
- OR `recharts` (already installed) with custom candlestick renderer

**Install:**
```bash
npm install lightweight-charts
```

**Implementation:**
```typescript
// client/src/components/charts/candlestick-chart.tsx
import { createChart } from 'lightweight-charts';

export function CandlestickChart({ data, indicators }) {
  useEffect(() => {
    const chart = createChart(chartRef.current);
    const candleSeries = chart.addCandlestickSeries();
    candleSeries.setData(data);
    
    if (indicators.includes('EMA')) {
      const emaSeries = chart.addLineSeries({ color: 'blue' });
      emaSeries.setData(calculateEMA(data, 20));
    }
    
    // Add volume histogram
    const volumeSeries = chart.addHistogramSeries();
    volumeSeries.setData(data.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close > d.open ? 'green' : 'red'
    })));
  }, [data]);
}
```

### 4.4 Real-time Status Updates (Client)
**Priority: MEDIUM**

**WebSocket Client:**
```typescript
// client/src/hooks/use-realtime-updates.ts
export function useRealtimeUpdates() {
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000/ws');
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'status_update') {
        queryClient.invalidateQueries(['calendar']);
      }
    };
    
    return () => ws.close();
  }, []);
}
```

---

## Phase 5: Background Jobs & Scheduling (Week 5)

### 5.1 Job Scheduler Setup
**Priority: HIGH**

**Use `node-cron` or `bull` for job queue:**
```bash
npm install node-cron
npm install -D @types/node-cron
```

**Implementation:**
```typescript
// server/scheduler.ts
import cron from 'node-cron';

export function startScheduler() {
  // Update results calendar every 30 minutes during market hours
  cron.schedule('*/30 9-15 * * 1-5', async () => {
    await scrapeResultsCalendar();
  });
  
  // Fetch candlestick data daily at 4 PM
  cron.schedule('0 16 * * 1-5', async () => {
    await scrapeCandlestickData();
  });
  
  // Check for new PDFs every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await checkAndDownloadResultPDFs();
  });
}
```

### 5.2 PDF Processing Queue
**Priority: HIGH**

**Background Worker:**
```typescript
// server/workers/pdf-processor.ts
export async function processPendingPDFs() {
  const pending = await storage.getResultsWithStatus('received');
  
  for (const result of pending) {
    try {
      const metrics = await parseQuarterlyResultPDF(result.pdfUrl);
      await storage.createQuarterlyResults({
        stockId: result.stockId,
        ...metrics
      });
      await storage.updateResultStatus(result.id, 'ready');
    } catch (error) {
      await storage.updateResultStatus(result.id, 'error');
      log(`Failed to parse PDF for ${result.stockId}: ${error.message}`);
    }
  }
}
```

---

## Phase 6: Testing & Deployment (Week 6)

### 6.1 Testing Strategy

**Unit Tests:**
- [ ] PDF parser with sample NSE PDFs
- [ ] Financial metric calculations (QoQ, YoY)
- [ ] Date filtering logic

**Integration Tests:**
- [ ] API endpoints with real DB
- [ ] Scraper error handling
- [ ] WebSocket connections

**E2E Tests:**
- [ ] User flow: login → calendar → stock detail
- [ ] Filter and search functionality
- [ ] Real-time status updates

### 6.2 Production Deployment

**Infrastructure Needed:**
- **Database**: PostgreSQL (Supabase or self-hosted)
- **Web Server**: Node.js (18+)
- **Redis**: For job queue and caching
- **Storage**: For downloaded PDFs (S3 or local)

**Deployment Options:**
1. **Replit** (current, good for dev/demo)
2. **Railway** (easy Node.js + Postgres)
3. **DigitalOcean App Platform**
4. **AWS EC2 + RDS** (full control)
5. **Vercel + Supabase** (serverless)

**Environment Variables:**
```bash
# .env.production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SESSION_SECRET=...
NSE_API_KEY=...  # if needed
NODE_ENV=production
PORT=5000
```

**Build & Start:**
```bash
npm run build
npm start
```

---

## Technology Stack Summary

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL + Drizzle ORM
- **Scraping**: Axios + Cheerio
- **PDF Parsing**: pdf-parse
- **Job Queue**: Bull + Redis OR node-cron
- **WebSocket**: ws library
- **Session**: express-session

### Frontend
- **Framework**: React 18 + TypeScript
- **Routing**: Wouter
- **State**: TanStack Query
- **UI**: shadcn/ui (Radix + Tailwind)
- **Charts**: lightweight-charts (candlestick) OR recharts
- **Forms**: react-hook-form + Zod

### DevOps
- **Build**: Vite + esbuild
- **Package Manager**: npm
- **Deployment**: Railway / DigitalOcean / AWS

---

## Risk Mitigation

### NSE Anti-Scraping Measures
**Risk**: NSE blocks automated requests  
**Mitigation**:
- Rotate user agents
- Respect rate limits (1 req/sec)
- Use residential proxy if needed
- Cache aggressively
- Fallback to manual PDF upload for critical dates

### PDF Parsing Accuracy
**Risk**: Financial tables have varied formats  
**Mitigation**:
- Build parser with multiple regex patterns
- Manual review queue for failed parses
- Allow admin to correct/override data

### Performance with Large Data
**Risk**: Slow queries with millions of candlestick records  
**Mitigation**:
- Partition tables by date
- Index on (stockId, date)
- Cache recent data in Redis
- Paginate API responses

### Real-time Updates Scale
**Risk**: Too many WebSocket connections  
**Mitigation**:
- Use Redis pub/sub for multi-instance support
- Implement connection limits
- Fallback to polling every 30s

---

## Development Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Data Infrastructure | 1-2 weeks | Enhanced schema + migrations |
| Phase 2: Scraping Service | 1-2 weeks | Working NSE scrapers for all data types |
| Phase 3: Backend APIs | 1 week | Enhanced endpoints + filtering |
| Phase 4: Frontend | 1-2 weeks | 3-window UI + calendar enhancements |
| Phase 5: Background Jobs | 1 week | Scheduled scraping + PDF processing |
| Phase 6: Testing & Deploy | 1 week | Production-ready system |

**Total Estimated Time: 6-8 weeks**

---

## Next Immediate Steps

1. **Start Phase 1:**
   ```bash
   # Create migration file
   touch server/supabase/migrations/002_enhanced_schema.sql
   
   # Install scraping dependencies
   npm install axios cheerio pdf-parse
   npm install -D @types/cheerio @types/pdf-parse
   ```

2. **Research NSE APIs:**
   - Open NSE website in browser DevTools
   - Inspect Network tab during result browsing
   - Document API endpoints and headers
   - Test with curl/Postman

3. **Create Scraper Skeleton:**
   ```bash
   mkdir -p server/services/nse-scraper
   touch server/services/nse-scraper/index.ts
   touch server/services/nse-scraper/http-client.ts
   ```

4. **Extend Database Schema:**
   - Edit `shared/schema.ts`
   - Add scraping jobs table
   - Add PDF URL field to results calendar
   - Add additional quarterly metrics

---

## Success Metrics

- [ ] Calendar shows accurate earnings counts per date
- [ ] Results status updates from Waiting → Received → Ready within 5 minutes of NSE publication
- [ ] Stock detail page loads in < 2 seconds
- [ ] Candlestick chart renders smoothly with 100+ data points
- [ ] System handles 1000+ stocks without performance degradation
- [ ] 99% PDF parsing accuracy
- [ ] Zero data loss during scraping failures

---

**Ready to begin implementation?** Start with Phase 1 database enhancements, then move to NSE API research in parallel.
