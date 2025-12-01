# NSE Client Manager - Vercel Deployment

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/nse-tracker)

## 📋 Pre-Deployment Setup

### 1. Environment Variables

You'll need these 3 environment variables in Vercel:

```bash
DATABASE_URL=postgresql://postgres:[password]@[host].supabase.co:5432/postgres
SESSION_SECRET=[generate-random-32-chars]
CRON_SECRET=[generate-random-32-chars]
```

**Generate secrets**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Supabase Database

Make sure your Supabase database has all required tables. Run migrations if needed.

## 🔄 Background Jobs (Automatic)

Vercel Cron will automatically run these jobs:

| Job | Schedule | Time (IST) |
|-----|----------|-----------|
| Results Calendar | Every 30 min | 9 AM - 8 PM (Mon-Fri) |
| Live Prices | Every 2 min | 9 AM - 3:30 PM (Mon-Fri) |
| Price Refresh | Every 30 min | 24/7 |
| Candlesticks | Daily | 4:30 PM (Mon-Fri) |
| Delivery Volume | Daily | 4:35 PM (Mon-Fri) |
| Quarterly Financials | Daily | 5:00 PM (Mon-Fri) |

## 🧪 Test Locally

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev

# Visit http://localhost:5000
```

## 📦 Deploy

### Option 1: GitHub + Vercel (Recommended)

1. Push to GitHub
2. Go to [Vercel](https://vercel.com/new)
3. Import repository
4. Add environment variables
5. Deploy

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel

# Add env variables
vercel env add DATABASE_URL
vercel env add SESSION_SECRET  
vercel env add CRON_SECRET

# Deploy to production
vercel --prod
```

## ✅ Post-Deployment

1. **Verify Cron Jobs**: Vercel Dashboard → Your Project → Settings → Cron Jobs
2. **Check Logs**: Dashboard → Logs → Filter by "Cron"
3. **Test API**: Visit `https://your-app.vercel.app/api/auth/session`

## 📚 Documentation

- **Full Deployment Guide**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **Architecture Overview**: [BACKGROUND_JOBS_ARCHITECTURE.md](./BACKGROUND_JOBS_ARCHITECTURE.md)
- **System Status**: [SYSTEM_READY_STATUS.md](./SYSTEM_READY_STATUS.md)

## 🔐 Security

- Cron endpoints protected with `CRON_SECRET`
- Session-based authentication
- Supabase Row Level Security (RLS) recommended

## 🎯 Features

- ✅ Real-time stock prices (NSE API)
- ✅ Candlestick charts (Yahoo Finance)
- ✅ Quarterly results auto-extraction
- ✅ Results calendar tracking
- ✅ Delivery volume analysis
- ✅ 992 NSE stocks supported

## 📊 Data Sources

- **NSE India**: Live prices, announcements
- **Yahoo Finance**: Historical candlestick data
- **Screener.in**: Quarterly financial results
- **Supabase**: Persistent storage

## ⚡ Performance

- **Serverless**: Auto-scales to 0 when idle
- **Global CDN**: Fast worldwide access
- **Edge Caching**: Optimized static assets
- **Cold Start**: ~200ms

## 💰 Cost

**Vercel Free Tier** (sufficient for testing):
- 100GB bandwidth/month
- 100 hours function execution/month
- 60 cron job executions/month (limited)

**Vercel Pro** ($20/month, recommended for production):
- 1TB bandwidth/month
- 1,000 hours function execution/month
- Unlimited cron executions

**Supabase Free Tier**:
- 500MB database
- 1GB file storage
- 50,000 monthly active users

## 🆘 Support

For issues, check:
1. [Troubleshooting Guide](./VERCEL_DEPLOYMENT.md#-troubleshooting)
2. Vercel Logs Dashboard
3. Supabase Database Logs

---

**Status**: ✅ Production Ready  
**Last Updated**: December 1, 2025
