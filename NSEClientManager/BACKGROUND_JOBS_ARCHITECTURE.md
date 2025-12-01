# Background Jobs Architecture

## Overview
The NSE Client Manager runs background jobs **independently of user login**. All market data (prices, charts, volume, quarterly results) is shared across all users, while personalized features (watchlists, portfolios) are user-specific.

## System Architecture

### 🔄 Global Data (Runs Without User Login)
These background jobs continuously update shared market data for all users:

#### 1. **Results Calendar Scraper**
- **Schedule**: Every 30 minutes (9 AM - 8 PM IST, Mon-Fri)
- **Cron**: `*/30 9-20 * * 1-5`
- **Purpose**: Monitors NSE announcements for quarterly results
- **Storage**: `results_calendar` table (Supabase)
- **Status**: ✅ Active - Ready for Dec 1, 2025 EMMVEE announcement

#### 2. **Live Price Updates**
- **Schedule**: Every 2 minutes (9 AM - 3:30 PM IST, Mon-Fri)
- **Cron**: `*/2 9-15 * * 1-5`
- **Purpose**: Real-time stock price updates during market hours
- **Storage**: `stocks` table (Supabase)
- **Service**: `priceUpdateService` + NSE API

#### 3. **Price Refresh (Keepalive)**
- **Schedule**: Every 30 minutes (24/7)
- **Cron**: `*/30 * * * *`
- **Purpose**: Ensure fresh data even outside market hours
- **Storage**: `stocks` table (Supabase)

#### 4. **Candlestick Data Scraper**
- **Schedule**: Daily at 4:30 PM IST (Mon-Fri)
- **Cron**: `30 16 * * 1-5`
- **Purpose**: Fetch OHLCV data for all 992 stocks
- **Sources**: Yahoo Finance API (primary), NSE API (backup)
- **Storage**: `candlestick_data` table (Supabase)
- **Timeframes**: 1W, 1M, 3M, 6M, 1Y

#### 5. **Delivery Volume Scraper**
- **Schedule**: Daily at 4:35 PM IST (Mon-Fri)
- **Cron**: `35 16 * * 1-5`
- **Purpose**: Fetch delivery vs traded volume metrics
- **Storage**: `delivery_volume` table (Supabase)

#### 6. **Quarterly Financials Scraper**
- **Schedule**: Daily at 5:00 PM IST (Mon-Fri)
- **Cron**: `0 17 * * 1-5`
- **Purpose**: Extract financial data from published PDFs
- **Sources**: NSE corporate announcements, Screener.in
- **Storage**: `quarterly_results` table (Supabase)
- **Parser**: 10 company-specific parsers + generic parser

### 👤 User-Specific Data
These features are personalized per user and require authentication:

#### 1. **Watchlists**
- **Storage**: `user_portfolio` table with `is_watchlist` flag
- **Access**: Requires `requireActiveSubscription` middleware
- **Endpoint**: `/api/stocks/portfolio`

#### 2. **Custom Portfolios**
- **Storage**: `user_portfolio` table
- **Access**: Requires `requireActiveSubscription` middleware
- **Features**: Add/remove stocks, track performance

#### 3. **User Preferences**
- **Storage**: `users` table
- **Access**: Session-based authentication
- **Features**: Demo mode, subscription status, last login

## Startup Sequence

```typescript
// server/index.ts
1. Express app initialization
2. Session middleware setup
3. Routes registration
4. Vite setup (development) / Static serving (production)
5. Server listening on port (5000/5001)
6. ✅ Background jobs start automatically:
   - startScheduler() - All cron jobs
   - priceUpdateService.start() - Real-time updates
```

**Key Point**: Background jobs start in `onListening` callback, **NOT** on user login.

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    NSE / Yahoo Finance                       │
│              (External Data Sources)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Background Jobs      │
         │  (Always Running)     │
         │  - Results Scraper    │
         │  - Price Fetcher      │
         │  - Candlestick        │
         │  - Delivery Volume    │
         │  - Quarterly Results  │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Supabase PostgreSQL │
         │   (Shared Data Layer) │
         │   - stocks            │
         │   - candlestick_data  │
         │   - delivery_volume   │
         │   - quarterly_results │
         │   - results_calendar  │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌────────────────┐    ┌──────────────────┐
│  All Users     │    │  Logged-In Users │
│  (Read Global  │    │  (Read Global +  │
│   Data)        │    │   Personal Data) │
│                │    │                  │
│  - Prices      │    │  - Watchlists    │
│  - Charts      │    │  - Portfolios    │
│  - Results     │    │  - Preferences   │
└────────────────┘    └──────────────────┘
```

## Job Monitoring

### View Scheduler Status
```bash
cd c:\Users\HP\NSE\NSEClientManager
npx tsx -e "import { getScraperStatus } from './server/services/nse-scraper/scheduler'; console.log(JSON.stringify(getScraperStatus(), null, 2));"
```

### View Job Metrics
```sql
SELECT * FROM job_metrics 
ORDER BY created_at DESC 
LIMIT 20;
```

### Pause/Resume Jobs
```typescript
import { pauseJob, resumeJob } from './server/services/nse-scraper/scheduler';

// Pause specific job
pauseJob('resultsCalendar');

// Resume job
resumeJob('resultsCalendar');
```

## Current Status (Dec 1, 2025)

✅ **Active Background Jobs**:
- Results calendar monitoring (every 30 min)
- Live price updates (every 2 min during market hours)
- Daily candlestick scraping (4:30 PM IST)
- Daily delivery volume scraping (4:35 PM IST)
- Daily quarterly financials scraping (5:00 PM IST)

✅ **Data Coverage**:
- 992 NSE stocks in database
- Yahoo Finance scraper populating candlestick data
- Screener.in scraper populating quarterly results
- EMMVEE results deleted, ready for today's announcement

✅ **Ready For**:
- EMMVEE Q2 FY2526 announcement (Dec 1, 2025)
- PINELABS Q2 FY2526 announcement (Dec 3, 2025)
- Automatic PDF parsing and metric extraction
- Real-time chart updates

## Benefits of This Architecture

1. **Always-On Data**: Market data updates even when no users are logged in
2. **Instant Access**: Users see fresh data immediately upon login
3. **Reduced API Calls**: Single scrape serves all users
4. **Scalability**: 1000 users don't cause 1000x API calls
5. **Reliability**: Background jobs run independently of user sessions
6. **Performance**: Cached global data, personalized user queries

## Error Handling

- **Unhandled Rejections**: Logged but don't crash server
- **Uncaught Exceptions**: Logged with graceful degradation
- **Consecutive Failures**: Alerts after 3+ failures
- **Job Metrics**: Persisted to `job_metrics` table for analysis
- **Auto-Recovery**: Jobs retry on next schedule

## Environment Variables

```env
# Required for background jobs
DATABASE_URL=<supabase_connection_string>
SESSION_SECRET=<session_secret>

# Optional
NODE_ENV=production
PORT=5000
```

## Testing Background Jobs

### Manual Trigger
```bash
# Trigger results calendar scrape
npx tsx -e "import { triggerResultsScrape } from './server/services/nse-scraper'; await triggerResultsScrape();"

# Trigger price update
npx tsx -e "import { updateStoredPrices } from './server/services/nse-scraper/price-fetcher'; await updateStoredPrices(['TCS', 'INFY']);"
```

### Check EMMVEE Readiness
```bash
npx tsx server/check-emmvee-data.ts
```

---

**Last Updated**: December 1, 2025
**System Status**: ✅ Fully Operational
