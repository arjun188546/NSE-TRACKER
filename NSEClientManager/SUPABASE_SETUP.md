# 🚀 Supabase Migration Guide

## Step 1: Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `xnfscozxsooaunugyxdu`
3. Click on **SQL Editor** in the left sidebar

## Step 2: Run the Migration

1. Click **New Query**
2. Copy the entire contents of: `server/supabase/migrations/003_complete_schema_with_trading_data.sql`
3. Paste into the SQL editor
4. Click **Run** (or press `Ctrl+Enter`)

## Step 3: Verify Migration

Check that the following tables were created:
- ✅ users
- ✅ stocks (with 23 columns including all trading data)
- ✅ scraping_jobs
- ✅ results_calendar
- ✅ quarterly_results
- ✅ candlestick_data
- ✅ delivery_volume

## Step 4: Verify Seed Data

Run this query to check data:

```sql
SELECT symbol, company_name, current_price, last_traded_price 
FROM stocks 
ORDER BY symbol;
```

You should see 10 stocks with accurate prices.

## Step 5: Test Connection

Restart your server:

```bash
npm run dev
```

Check logs for:
```
✅ Latest data fetched for 10 stocks
```

## Troubleshooting

### If tables already exist:
The migration script includes `DROP TABLE IF EXISTS` to handle this.

### If you get permission errors:
Make sure you're using the correct Supabase credentials in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`

### To reset everything:
Run this in SQL Editor first:
```sql
DROP TABLE IF EXISTS delivery_volume CASCADE;
DROP TABLE IF EXISTS candlestick_data CASCADE;
DROP TABLE IF EXISTS quarterly_results CASCADE;
DROP TABLE IF EXISTS results_calendar CASCADE;
DROP TABLE IF EXISTS scraping_jobs CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

Then run the full migration again.

## What Changed?

### Before (MemStorage):
- Data stored in-memory
- Lost on server restart
- No persistence

### After (Supabase):
- Data stored in PostgreSQL
- Persists across restarts
- Production-ready
- EOD snapshots survive forever
- Ready for 2000+ stocks

## Next Steps

After migration completes:
1. ✅ Server will automatically use Supabase
2. ✅ All price updates persist to database
3. ✅ EOD snapshots saved permanently
4. ✅ User sessions persist
5. ✅ Ready to import all NSE stocks
