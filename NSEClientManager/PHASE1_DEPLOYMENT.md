# Phase 1 Deployment Guide

## Prerequisites
✅ Supabase project created
✅ Credentials added to `.env` file
✅ Dependencies installed (`npm install`)

## Step 1: Run Database Migration

### Option A: Using Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/xnfscozxsooaunugyxdu
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `server/supabase/migrations/002_enhanced_nse_schema.sql`
5. Paste into the SQL editor
6. Click **Run** button
7. Verify success message

### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref xnfscozxsooaunugyxdu

# Run migration
supabase db push
```

### Option C: Using Direct SQL Connection
If you have the database password, use psql or any PostgreSQL client:
```bash
psql "postgresql://postgres:[YOUR_PASSWORD]@db.xnfscozxsooaunugyxdu.supabase.co:5432/postgres" \
  -f server/supabase/migrations/002_enhanced_nse_schema.sql
```

## Step 2: Update Environment Variables

Make sure your `.env` file has the DATABASE_URL with your actual password:
```env
DATABASE_URL=postgresql://postgres:[YOUR_SUPABASE_PASSWORD]@db.xnfscozxsooaunugyxdu.supabase.co:5432/postgres
```

To get your database password:
1. Go to Supabase Dashboard → Settings → Database
2. Find **Connection String** section
3. Copy the password or generate a new one

## Step 3: Verify Tables Created

Run this query in Supabase SQL Editor to verify:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- users
- stocks
- scraping_jobs
- results_calendar
- quarterly_results
- candlestick_data
- delivery_volume

## Step 4: Test Database Connection

Run this test query to check seed data:
```sql
-- Check users
SELECT email, role, subscription_status FROM users;

-- Check stocks
SELECT symbol, company_name, sector FROM stocks;

-- Check results calendar
SELECT 
  s.symbol,
  rc.announcement_date,
  rc.result_status
FROM results_calendar rc
JOIN stocks s ON rc.stock_id = s.id
ORDER BY rc.announcement_date;
```

## Step 5: Update Application to Use Supabase

The following files have been prepared for Supabase:
- ✅ `shared/schema.ts` - Enhanced with scraping jobs and metrics
- ✅ `server/supabase/config/supabase-client.ts` - Configured with credentials
- ✅ `server/supabase/migrations/002_enhanced_nse_schema.sql` - Complete migration
- ⚠️ `server/storage.ts` - Still using MemStorage (needs Supabase implementation)

## Next Steps

### Immediate (Complete Phase 1):
1. ✅ Run migration on Supabase
2. ⚠️ Update `server/storage.ts` to use Supabase instead of in-memory
3. ⚠️ Test all existing endpoints with Supabase backend
4. ⚠️ Verify authentication still works

### Phase 2 (NSE Scraping):
1. Create `server/services/nse-scraper/` directory
2. Implement HTTP client with NSE headers
3. Build results calendar scraper
4. Build PDF parser for quarterly results
5. Setup cron jobs for periodic scraping

## Troubleshooting

### Migration Fails
- Check if tables already exist (drop them first if needed)
- Verify you have proper permissions
- Check Supabase logs in Dashboard → Logs

### Connection Issues
- Verify credentials in `.env` are correct
- Check if Supabase project is active (not paused)
- Ensure connection pooling is enabled in Supabase settings

### RLS Policy Errors
- Temporarily disable RLS for testing:
  ```sql
  ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  -- (do for all tables)
  ```
- Update policies based on your auth implementation

## Database Connection String Format

For Drizzle ORM, use this format:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Or direct connection:
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

## Status: Phase 1 Progress

- [x] Supabase credentials configured
- [x] Enhanced schema designed
- [x] Migration SQL created
- [x] Supabase client initialized
- [ ] Migration executed on Supabase
- [ ] Storage layer migrated to Supabase
- [ ] Endpoints tested with Supabase backend

**Ready to run the migration!** Start with Option A (Supabase Dashboard) as it's the most straightforward.
