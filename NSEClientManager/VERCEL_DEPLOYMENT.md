# Vercel Deployment Guide

## Overview
This NSE Client Manager is configured for **serverless deployment on Vercel** with automated background jobs using Vercel Cron.

## 🚀 Deployment Steps

### 1. Prerequisites
- Vercel account (free tier works)
- GitHub repository (recommended) or Vercel CLI
- Supabase account with database configured

### 2. Environment Variables

Add these to your Vercel project settings:

```env
# Required
DATABASE_URL=postgresql://postgres:[password]@[host].supabase.co:5432/postgres
SESSION_SECRET=your-random-secret-key-min-32-chars
CRON_SECRET=your-cron-secret-key-for-background-jobs

# Optional
NODE_ENV=production
```

**Important**: Generate secure random strings for `SESSION_SECRET` and `CRON_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Deploy to Vercel

#### Option A: GitHub Integration (Recommended)
1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Add environment variables
5. Click "Deploy"

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add DATABASE_URL
vercel env add SESSION_SECRET
vercel env add CRON_SECRET

# Deploy to production
vercel --prod
```

### 4. Configure Vercel Cron

Vercel automatically reads `vercel.json` and sets up cron jobs:

| Job | Schedule | Timezone | Description |
|-----|----------|----------|-------------|
| **Results Calendar** | `*/30 9-20 * * 1-5` | IST | Every 30 min, 9AM-8PM, Mon-Fri |
| **Live Prices** | `*/2 9-15 * * 1-5` | IST | Every 2 min, 9AM-3:30PM, Mon-Fri |
| **Price Refresh** | `*/30 * * * *` | IST | Every 30 min, 24/7 |
| **Candlesticks** | `30 16 * * 1-5` | IST | Daily 4:30 PM, Mon-Fri |
| **Delivery Volume** | `35 16 * * 1-5` | IST | Daily 4:35 PM, Mon-Fri |
| **Quarterly Financials** | `0 17 * * 1-5` | IST | Daily 5:00 PM, Mon-Fri |

**Note**: Vercel Cron uses UTC timezone by default. Adjust schedules in `vercel.json` if needed.

### 5. Verify Deployment

After deployment:

1. **Check Cron Jobs**:
   - Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
   - Verify all 6 jobs are listed

2. **Test Endpoints**:
   ```bash
   # Your deployment URL
   curl https://your-app.vercel.app/api/auth/session
   ```

3. **Monitor Logs**:
   - Vercel Dashboard → Your Project → Logs
   - Filter by "Cron" to see background job execution

## 📊 How It Works

### Serverless Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                       │
│                    (Global CDN)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌────────────────┐    ┌──────────────────┐
│  User Requests │    │  Vercel Cron     │
│  (API calls)   │    │  (Scheduled)     │
└────────┬───────┘    └─────────┬────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────┐
│     Serverless Functions (Node.js)      │
│  - API Routes (/api/*)                  │
│  - Cron Routes (/api/cron/*)            │
│  - Auto-scales to 0 when idle           │
│  - Executes on-demand                   │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│        Supabase PostgreSQL              │
│  (Persistent Data Storage)              │
│  - stocks                               │
│  - candlestick_data                     │
│  - quarterly_results                    │
│  - results_calendar                     │
└─────────────────────────────────────────┘
```

### Execution Flow

#### User Request Flow
1. User visits https://your-app.vercel.app
2. Vercel serves static files (HTML, CSS, JS) from CDN
3. Frontend makes API calls to /api/* endpoints
4. Serverless function executes (cold start ~200ms, warm ~50ms)
5. Function queries Supabase and returns data
6. Function terminates (no persistent process)

#### Cron Job Flow
1. Vercel Cron triggers at scheduled time
2. HTTP request sent to /api/cron/* endpoint with Bearer token
3. Endpoint verifies CRON_SECRET for security
4. Background job executes (fetch prices, scrape data, etc.)
5. Data saved to Supabase
6. Function returns success/error response
7. Function terminates

## 🔒 Security

### Cron Endpoint Protection

All cron endpoints require Bearer token authentication:

```typescript
// In routes.ts
const authHeader = req.headers.authorization;
if (authHeader !== `Bearer ${CRON_SECRET}`) {
  return res.status(401).json({ error: "Unauthorized" });
}
```

Vercel automatically adds this header when calling cron endpoints.

### External Trigger Prevention

Cron endpoints are **not** accessible via browser or Postman without the secret. Only Vercel's internal cron system has access.

## 📈 Scaling & Limits

### Vercel Free Tier
- **Bandwidth**: 100GB/month
- **Serverless Function Execution**: 100 hours/month
- **Cron Jobs**: 60 executions/month (limited)
- **Function Duration**: 10 seconds max
- **Cold Starts**: ~200-500ms

### Vercel Pro Tier ($20/month)
- **Bandwidth**: 1TB/month
- **Serverless Function Execution**: 1,000 hours/month
- **Cron Jobs**: Unlimited executions
- **Function Duration**: 60 seconds max
- **Cold Starts**: ~100-200ms (faster)

### Optimization Tips

1. **Reduce Cron Frequency** (Free Tier):
   - Live Prices: `*/5 9-15 * * 1-5` (every 5 min instead of 2)
   - Price Refresh: `0 * * * *` (hourly instead of every 30 min)

2. **Batch Operations**:
   - Process stocks in batches of 50-100
   - Use Supabase batch insert/update

3. **Cache Aggressively**:
   - Enable HTTP caching headers
   - Use Vercel Edge Cache for static data

4. **Monitor Usage**:
   - Vercel Dashboard → Analytics → Function Invocations
   - Set up alerts for approaching limits

## 🛠️ Local Development

For local development without Vercel Cron:

```bash
# Standard development server (no background jobs)
npm run dev

# Manually trigger cron jobs for testing
curl -H "Authorization: Bearer your-cron-secret-key" \
  http://localhost:5000/api/cron/live-prices

curl -H "Authorization: Bearer your-cron-secret-key" \
  http://localhost:5000/api/cron/results-calendar
```

## 🔄 Migration from Long-Running Server

### Before (Traditional Server)
```typescript
// ❌ Not compatible with Vercel
startScheduler(); // node-cron running in background
priceUpdateService.start(); // Persistent process
```

### After (Serverless)
```typescript
// ✅ Vercel-compatible
// No background processes
// All jobs triggered via HTTP endpoints
// Vercel Cron calls /api/cron/* on schedule
```

## 📋 Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] CRON_SECRET set to secure random string
- [ ] Supabase database accessible from Vercel
- [ ] `vercel.json` cron schedules correct for timezone
- [ ] All cron endpoints tested manually
- [ ] Logs monitored for first 24 hours
- [ ] Database connection pooling configured (Supabase auto-handles)
- [ ] Error alerts configured (Vercel Integrations → Sentry/Slack)

## 🚨 Troubleshooting

### Cron Jobs Not Running
1. Check Vercel Dashboard → Cron Jobs → Executions
2. Verify CRON_SECRET matches in code and Vercel env
3. Check function logs for errors
4. Ensure Pro plan if exceeding free tier limits

### Database Connection Errors
1. Verify DATABASE_URL in Vercel env variables
2. Check Supabase connection pooling settings
3. Enable Supabase connection pooler (Supabase Dashboard → Settings → Database → Connection Pooling)

### Function Timeout
1. Reduce batch size (process fewer stocks per execution)
2. Upgrade to Pro plan (60s limit vs 10s)
3. Split large jobs into smaller cron jobs

### Cold Starts Slow
1. Upgrade to Pro plan for faster cold starts
2. Keep functions warm with health check pings
3. Optimize imports (lazy load heavy dependencies)

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs/cron-jobs
- **Supabase Docs**: https://supabase.com/docs
- **GitHub Issues**: Create issue in your repository

---

**Deployed on**: Vercel  
**Database**: Supabase PostgreSQL  
**Background Jobs**: Vercel Cron  
**Status**: ✅ Production Ready
