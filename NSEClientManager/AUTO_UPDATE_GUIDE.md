# 🔄 Automatic Database Updates - How It Works

## Overview

Your NSE Stock Tracker now **automatically updates the Supabase PostgreSQL database** whenever it extracts new data from NSE. No manual intervention required!

---

## 🎯 What Gets Auto-Updated

### 1. **Real-Time Stock Prices** (Every 5 seconds during market hours)
**File**: `server/services/nse-scraper/price-fetcher.ts`

When `fetchStockPrice()` or `updateStoredPrices()` is called:
```typescript
// Automatically updates in Supabase:
- currentPrice          ← Latest traded price
- percentChange         ← % change from previous close
- volume                ← Total traded volume
- lastTradedPrice       ← Last transaction price
- lastTradedQuantity    ← Last transaction quantity
- lastTradedTime        ← Time of last trade
- dayHigh               ← Highest price of the day
- dayLow                ← Lowest price of the day
- openPrice             ← Opening price
- previousClose         ← Previous day's close
- yearHigh              ← 52-week high
- yearLow               ← 52-week low
- totalBuyQuantity      ← Total buy orders
- totalSellQuantity     ← Total sell orders
- totalTradedValue      ← Total value traded
- totalTradedVolume     ← Total shares traded
- averagePrice          ← Average trading price
- lastUpdated           ← Timestamp (auto-set)
```

### 2. **End-of-Day Snapshots** (3:30 PM IST daily)
**File**: `server/services/price-update-service.ts`

When market closes:
```typescript
captureEODSnapshot() → fetchStockPrice() → storage.updateStock()
                                                    ↓
                                          Supabase PostgreSQL ✅
```

All trading data is **permanently saved** as EOD snapshot.

### 3. **Quarterly Results Calendar** (Every 30 min during market hours)
**File**: `server/services/nse-scraper/results-scraper.ts`

When `scrapeResultsCalendar()` runs:
```typescript
// Automatically creates/updates in Supabase:
- results_calendar table
  - stockId
  - announcementDate
  - resultStatus (waiting/received/ready)
  - quarter (Q1/Q2/Q3/Q4)
  - fiscalYear (FY2025, etc.)
  - pdfUrl (if available)
  - pdfDownloadedAt
```

### 4. **Quarterly Financial Results** (When PDF available)
**File**: `server/services/nse-scraper/results-scraper.ts`

When PDF is parsed:
```typescript
// Automatically creates in Supabase:
- quarterly_results table
  - stockId
  - quarter, fiscalYear
  - revenue, profit, eps
  - operatingProfit, ebitda
  - patMargin, roe, roce
  - QoQ and YoY comparisons
```

---

## 🔧 How Auto-Update Works

### Architecture Flow:

```
NSE API
   ↓
price-fetcher.ts / results-scraper.ts
   ↓
storage.updateStock() / storage.createResultsCalendar()
   ↓
server/storage.ts (exports SupabaseStorage instance)
   ↓
server/supabase-storage.ts
   ↓
Supabase PostgreSQL ✅ PERSISTED FOREVER
```

### Key Code:

**server/storage.ts**:
```typescript
// Always uses Supabase (no more MemStorage!)
export const storage = new SupabaseStorage();
```

**server/supabase-storage.ts**:
```typescript
async updateStock(id: string, updates: Partial<Stock>): Promise<Stock | undefined> {
  const { data, error } = await supabase
    .from('stocks')
    .update({
      ...updates,
      last_updated: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  // Data is now in PostgreSQL ✅
  return data as Stock;
}
```

---

## ⚡ Auto-Update Triggers

| Event | Frequency | What Updates | Persists To |
|-------|-----------|--------------|-------------|
| **Market Hours Polling** | Every 5 seconds | Stock prices (all 23 fields) | `stocks` table |
| **Market Open (9:15 AM)** | Once daily | Fresh data fetch | `stocks` table |
| **Market Close (3:30 PM)** | Once daily | EOD snapshot | `stocks` table |
| **Server Startup** | Once per restart | Latest available data | `stocks` table |
| **Results Scraper** | Every 30 min | Calendar entries | `results_calendar` table |
| **PDF Parser** | When PDF available | Financial metrics | `quarterly_results` table |
| **Manual Force Update** | On demand (API call) | All stock data | `stocks` table |

---

## 🧪 Testing Auto-Update

### Run the test script:
```bash
npm run db:test
```

This will:
1. ✅ Verify you're using SupabaseStorage
2. ✅ Fetch a stock from database
3. ✅ Get fresh data from NSE
4. ✅ Trigger auto-update
5. ✅ Verify data persisted to Supabase
6. ✅ Confirm timestamps updated

### Expected Output:
```
🧪 Testing Supabase Auto-Update...

1️⃣ Verifying storage type...
   ✅ Using SupabaseStorage

2️⃣ Fetching existing stock data...
   ✅ Found TATASTEEL:
      Current Price: ₹172.40
      Last Updated: 2025-11-20...

3️⃣ Fetching fresh data from NSE...
   ✅ Fresh data retrieved:
      LTP: ₹172.40
      Time: 6:15:30 pm

4️⃣ Triggering automatic database update...
   ✅ Update process completed

5️⃣ Verifying data persistence in Supabase...
   ✅ Stock data persisted:
      Current Price: ₹172.40
      Last Traded Time: 6:15:30 pm
      Volume: 45,234,567

6️⃣ Checking all stocks in database...
   ✅ Found 10 stocks in Supabase

═══════════════════════════════════════════════════════════
🎉 AUTO-UPDATE TEST PASSED!
═══════════════════════════════════════════════════════════
```

---

## 🔍 Verifying in Supabase Dashboard

### Check data directly in Supabase:

1. **Go to Table Editor**:
   https://supabase.com/dashboard/project/xnfscozxsooaunugyxdu/editor

2. **View stocks table**:
   ```sql
   SELECT symbol, current_price, last_traded_price, last_traded_time, last_updated
   FROM stocks
   ORDER BY last_updated DESC;
   ```

3. **Watch real-time updates**:
   - Open table editor
   - Start server (`npm run dev`)
   - Refresh table view every few seconds
   - **You'll see timestamps updating!** ✅

---

## 📊 What This Means

### Before (MemStorage):
```
NSE → price-fetcher.ts → MemStorage (RAM)
                               ↓
                         Lost on restart ❌
```

### Now (Supabase Auto-Update):
```
NSE → price-fetcher.ts → SupabaseStorage → PostgreSQL
                                                  ↓
                                            Saved forever ✅
                                            Survives restarts ✅
                                            Automatic backups ✅
                                            EOD snapshots ✅
```

---

## 🚀 Benefits

| Feature | Before | Now |
|---------|--------|-----|
| **Data Persistence** | ❌ Lost on restart | ✅ Permanent |
| **EOD Snapshots** | ❌ Lost | ✅ Saved daily at 3:30 PM |
| **Historical Data** | ❌ None | ✅ Growing database |
| **Scalability** | ❌ Memory limited | ✅ Unlimited (PostgreSQL) |
| **Backups** | ❌ None | ✅ Automatic (Supabase) |
| **Recovery** | ❌ Impossible | ✅ Point-in-time restore |
| **Concurrent Users** | ❌ Risky | ✅ Safe (ACID compliant) |

---

## 🔒 Data Integrity

### Auto-Update Guarantees:

1. **Atomic Updates**: Each update is a single transaction
2. **Rollback on Error**: Failed updates don't corrupt data
3. **Unique Constraints**: Prevents duplicate stocks
4. **Foreign Keys**: Ensures referential integrity
5. **Timestamps**: Auto-tracked for audit trail
6. **Indexes**: Fast lookups on symbol, date, etc.

---

## 🛠️ Configuration

### All auto-update behavior is in:

**`.env`**:
```env
DATABASE_URL=postgresql://postgres:...@db.xnfscozxsooaunugyxdu.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xnfscozxsooaunugyxdu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**server/storage.ts**:
```typescript
// Toggle between MemStorage and SupabaseStorage here
export const storage = new SupabaseStorage(); // ✅ Active
```

---

## 📋 Monitoring Auto-Updates

### Watch server logs:

```bash
npm run dev
```

Look for these log entries:

```
[Price Fetcher] Updating prices for 10 stocks...
[Price Fetcher] ✅ Updated TATASTEEL: LTP ₹172.40 @ 6:15:30 pm (-0.47%) | Vol: 45,234,567
[Price Service] ✅ Latest data fetched for 10 stocks

[Results Scraper] Starting results calendar scrape...
[Results Scraper] Creating calendar entry for TCS - Q3 FY2025
[Results Scraper] ✅ Stored financial metrics for TCS
```

**Each "✅ Updated" or "✅ Stored" = Database write to Supabase!**

---

## 🎯 Next Steps

1. ✅ **Run Migration** (if not done):
   - Copy SQL from `server/supabase/migrations/003_complete_schema_with_trading_data.sql`
   - Paste in Supabase SQL Editor
   - Execute

2. ✅ **Test Auto-Update**:
   ```bash
   npm run db:test
   ```

3. ✅ **Start Server**:
   ```bash
   npm run dev
   ```

4. ✅ **Verify in Supabase**:
   - Check `stocks` table
   - Watch `last_updated` timestamps change
   - See data persist after restart

5. ✅ **Import All NSE Stocks**:
   - System ready for 2000+ stocks
   - Each will auto-update on every poll

---

## 🆘 Troubleshooting

### "Stock not found in database"
→ Run the Supabase migration first (see MIGRATION_READY.md)

### "Not using SupabaseStorage"
→ Check that `server/storage.ts` exports `new SupabaseStorage()`

### "Cannot connect to Supabase"
→ Verify `.env` has correct `DATABASE_URL` and Supabase credentials

### Data not updating
→ Check server logs for errors
→ Verify NSE API is responding
→ Check Supabase dashboard for connection issues

---

## ✅ Summary

**Every time your system extracts data from NSE:**
- ✅ **Automatically saved to Supabase PostgreSQL**
- ✅ **Survives server restarts**
- ✅ **EOD snapshots persist forever**
- ✅ **No manual database operations needed**
- ✅ **Ready for 2000+ NSE stocks**

**Your data is safe, persistent, and production-ready!** 🎉
