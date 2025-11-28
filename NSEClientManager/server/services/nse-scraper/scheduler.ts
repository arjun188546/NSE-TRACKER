import cron from 'node-cron';
import { scrapeResultsCalendar } from './results-scraper';
import { scrapeIncrementalCandlestickData } from './candlestick-scraper';
import { scrapeIncrementalDeliveryData, scrapeDeliveryVolume } from './delivery-scraper';
import { scrapeQuarterlyFinancials } from './quarterly-financials-scraper';
import { monitorPublishedResults, processResultPublication } from '../results-engine';
import { updateStoredPrices } from './price-fetcher';
import { storage } from '../../storage';
import { supabase } from '../../supabase/config/supabase-client';

// Simple in-memory status tracking per job
interface JobStatus {
  name: string;
  schedule: string;
  lastRun?: string;
  lastSuccess?: string;
  lastError?: string;
  lastDurationMs?: number;
  averageDurationMs?: number;
  totalDurationMs: number;
  lastRowsAffected?: number;
  consecutiveFailures: number;
  paused?: boolean;
  runs: number;
  successes: number;
  failures: number;
}

const jobStatuses: Record<string, JobStatus> = {
  resultsCalendar: { name: 'resultsCalendar', schedule: '*/30 9-20 * * 1-5', runs: 0, successes: 0, failures: 0, totalDurationMs: 0, consecutiveFailures: 0 },
  livePrice: { name: 'livePrice', schedule: '*/2 9-15 * * 1-5', runs: 0, successes: 0, failures: 0, totalDurationMs: 0, consecutiveFailures: 0 },
  priceRefresh: { name: 'priceRefresh', schedule: '*/30 * * * *', runs: 0, successes: 0, failures: 0, totalDurationMs: 0, consecutiveFailures: 0 },
  candlesticks: { name: 'candlesticks', schedule: '30 16 * * 1-5', runs: 0, successes: 0, failures: 0, totalDurationMs: 0, consecutiveFailures: 0 },
  delivery: { name: 'delivery', schedule: '35 16 * * 1-5', runs: 0, successes: 0, failures: 0, totalDurationMs: 0, consecutiveFailures: 0 },
  quarterlyFinancials: { name: 'quarterlyFinancials', schedule: '0 17 * * 1-5', runs: 0, successes: 0, failures: 0, totalDurationMs: 0, consecutiveFailures: 0 },
  testResults: { name: 'testResults', schedule: '*/5 * * * *', runs: 0, successes: 0, failures: 0, totalDurationMs: 0, consecutiveFailures: 0 },
};

function markRun(key: keyof typeof jobStatuses) {
  const s = jobStatuses[key];
  s.runs += 1; s.lastRun = new Date().toISOString();
}
function markSuccess(key: keyof typeof jobStatuses, durationMs: number, rowsAffected?: number) {
  const s = jobStatuses[key];
  s.successes += 1;
  s.lastSuccess = new Date().toISOString();
  s.lastError = undefined;
  s.lastDurationMs = durationMs;
  s.totalDurationMs += durationMs;
  s.averageDurationMs = parseFloat((s.totalDurationMs / s.successes).toFixed(2));
  if (typeof rowsAffected === 'number') s.lastRowsAffected = rowsAffected;
  s.consecutiveFailures = 0;
}
function markError(key: keyof typeof jobStatuses, err: any, durationMs?: number) {
  const s = jobStatuses[key];
  s.failures += 1; s.lastError = (err?.message || String(err));
  if (durationMs) {
    s.lastDurationMs = durationMs;
    s.totalDurationMs += durationMs;
    if (s.successes > 0) {
      s.averageDurationMs = parseFloat((s.totalDurationMs / s.successes).toFixed(2));
    }
  }
  s.consecutiveFailures += 1;
}

async function persistMetric(job: keyof typeof jobStatuses, success: boolean, durationMs?: number, errorMessage?: string, rowsAffected?: number) {
  try {
    await supabase.from('job_metrics').insert({
      job_name: jobStatuses[job].name,
      duration_ms: durationMs || null,
      success,
      error_message: errorMessage || null,
      rows_affected: rowsAffected || null,
    });
  } catch (e:any) {
    console.warn('[Scheduler] Failed to persist metric:', e.message);
  }
}

function checkConsecutiveFailures(job: keyof typeof jobStatuses, threshold: number = 3) {
  const s = jobStatuses[job];
  if (s.failures >= threshold) {
    console.error(`[ALERT] Job '${s.name}' has failed ${s.failures} times consecutively.`);
  }
}

export function pauseJob(job: keyof typeof jobStatuses) {
  jobStatuses[job].paused = true;
}
export function resumeJob(job: keyof typeof jobStatuses) {
  jobStatuses[job].paused = false;
  jobStatuses[job].consecutiveFailures = 0;
}

export function getScraperStatus() {
  return jobStatuses;
}

export function getScraperMetrics() {
  return Object.values(jobStatuses).map(j => ({
    name: j.name,
    schedule: j.schedule,
    runs: j.runs,
    successes: j.successes,
    failures: j.failures,
    lastRun: j.lastRun,
    lastSuccess: j.lastSuccess,
    lastError: j.lastError,
    lastDurationMs: j.lastDurationMs,
    averageDurationMs: j.averageDurationMs,
  }));
}

/**
 * Job Scheduler for NSE data scraping
 */
export function startScheduler() {
  console.log('[Scheduler] Starting NSE data scraping jobs...');

  // Results calendar scraper - Every 30 minutes from 9 AM to 8 PM IST
  // Extended hours to catch after-market announcements
  // Format: minute hour day month weekday
  // */30 9-20 * * 1-5 = every 30 minutes, 9AM-8PM, Monday-Friday
  const resultsCalendarJob = cron.schedule('*/30 9-20 * * 1-5', async () => {
    console.log('[Scheduler] Running results calendar scrape job...');
    try {
      markRun('resultsCalendar');
      const start = Date.now();
      if (jobStatuses.resultsCalendar.paused) { console.log('[Scheduler] resultsCalendar paused'); return; }
      
      // Use the new results engine
      console.log('[Scheduler] 📊 Monitoring published results with new engine...');
      const publishedResults = await monitorPublishedResults();
      
      let successCount = 0;
      for (const publication of publishedResults) {
        const success = await processResultPublication(publication);
        if (success) successCount++;
      }
      
      const duration = Date.now() - start;
      console.log(`[Scheduler] ✅ Results calendar job completed in ${duration}ms - Processed ${successCount} results`);
      markSuccess('resultsCalendar', duration, successCount);
      await persistMetric('resultsCalendar', true, duration, undefined, successCount);
    } catch (error: any) {
      const duration = Date.now() - (jobStatuses.resultsCalendar.lastRun ? Date.parse(jobStatuses.resultsCalendar.lastRun) : Date.now());
      console.error('[Scheduler] ❌ Results calendar job failed:', error.message);
      markError('resultsCalendar', error, duration);
      await persistMetric('resultsCalendar', false, duration, error.message);
      checkConsecutiveFailures('resultsCalendar');
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Live price fetcher - Every 2 minutes during market hours (9 AM to 3:30 PM IST)
  const livePriceJob = cron.schedule('*/2 9-15 * * 1-5', async () => {
    console.log('[Scheduler] Running live price fetch job...');
    try {
      markRun('livePrice');
      const start = Date.now();
      if (jobStatuses.livePrice.paused) { console.log('[Scheduler] livePrice paused'); return; }
      
      // Get all stock symbols from database
      const stocks = await storage.getAllStocks();
      const symbols = stocks.map(s => s.symbol);
      
      await updateStoredPrices(symbols);
      
      const duration = Date.now() - start;
      console.log(`[Scheduler] ✅ Live price job completed in ${duration}ms`);
      markSuccess('livePrice', duration, symbols.length);
      await persistMetric('livePrice', true, duration, undefined, symbols.length);
    } catch (error: any) {
      const duration = Date.now() - (jobStatuses.livePrice.lastRun ? Date.parse(jobStatuses.livePrice.lastRun) : Date.now());
      console.error('[Scheduler] ❌ Live price job failed:', error.message);
      markError('livePrice', error, duration);
      await persistMetric('livePrice', false, duration, error.message);
      checkConsecutiveFailures('livePrice');
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Price refresh job - Every 30 minutes (24/7) to keep prices updated even outside market hours
  // This ensures prices are fresh when users visit the app
  const priceRefreshJob = cron.schedule('*/30 * * * *', async () => {
    console.log('[Scheduler] Running price refresh job (keepalive)...');
    try {
      markRun('priceRefresh');
      const start = Date.now();
      if (jobStatuses.priceRefresh.paused) { console.log('[Scheduler] priceRefresh paused'); return; }
      
      // Get all stock symbols from database
      const stocks = await storage.getAllStocks();
      const symbols = stocks.map(s => s.symbol);
      
      // Only refresh if stocks exist
      if (symbols.length > 0) {
        await updateStoredPrices(symbols);
        
        const duration = Date.now() - start;
        console.log(`[Scheduler] ✅ Price refresh job completed in ${duration}ms`);
        markSuccess('priceRefresh', duration, symbols.length);
        await persistMetric('priceRefresh', true, duration, undefined, symbols.length);
      } else {
        console.log('[Scheduler] No stocks to refresh');
      }
    } catch (error: any) {
      const duration = Date.now() - (jobStatuses.priceRefresh.lastRun ? Date.parse(jobStatuses.priceRefresh.lastRun) : Date.now());
      console.error('[Scheduler] ⚠️  Price refresh job failed:', error.message);
      markError('priceRefresh', error, duration);
      await persistMetric('priceRefresh', false, duration, error.message);
      // Don't check consecutive failures for keepalive job - it's non-critical
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Candlestick data scraper - Daily at 4:30 PM IST (after market close)
  const candlestickJob = cron.schedule('30 16 * * 1-5', async () => {
    console.log('[Scheduler] Running candlestick data scrape job...');
    try {
      markRun('candlesticks');
      const start = Date.now();
      if (jobStatuses.candlesticks.paused) { console.log('[Scheduler] candlesticks paused'); return; }
      const rows = await scrapeIncrementalCandlestickData();
      const duration = Date.now() - start;
      console.log(`[Scheduler] ✅ Candlestick job completed in ${duration}ms`);
      markSuccess('candlesticks', duration, rows);
      await persistMetric('candlesticks', true, duration, undefined, rows);
    } catch (error: any) {
      const duration = Date.now() - (jobStatuses.candlesticks.lastRun ? Date.parse(jobStatuses.candlesticks.lastRun) : Date.now());
      console.error('[Scheduler] ❌ Candlestick job failed:', error.message);
      markError('candlesticks', error, duration);
      await persistMetric('candlesticks', false, duration, error.message);
      checkConsecutiveFailures('candlesticks');
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Delivery volume scraper - Daily at 4:35 PM IST (after candlestick)
  const deliveryJob = cron.schedule('35 16 * * 1-5', async () => {
    console.log('[Scheduler] Running incremental delivery volume scrape job...');
    try {
      markRun('delivery');
      const start = Date.now();
      if (jobStatuses.delivery.paused) { console.log('[Scheduler] delivery paused'); return; }
      const rows = await scrapeIncrementalDeliveryData();
      const duration = Date.now() - start;
      console.log(`[Scheduler] ✅ Delivery volume job completed in ${duration}ms`);
      markSuccess('delivery', duration, rows);
      await persistMetric('delivery', true, duration, undefined, rows);
    } catch (error: any) {
      const duration = Date.now() - (jobStatuses.delivery.lastRun ? Date.parse(jobStatuses.delivery.lastRun) : Date.now());
      console.error('[Scheduler] ❌ Delivery volume job failed:', error.message);
      markError('delivery', error, duration);
      await persistMetric('delivery', false, duration, error.message);
      checkConsecutiveFailures('delivery');
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Quarterly financials scraper - Daily at 5:00 PM IST (after market and other scrapers)
  const quarterlyFinancialsJob = cron.schedule('0 17 * * 1-5', async () => {
    console.log('[Scheduler] Running quarterly financials scrape job...');
    try {
      markRun('quarterlyFinancials');
      const start = Date.now();
      if (jobStatuses.quarterlyFinancials.paused) { console.log('[Scheduler] quarterlyFinancials paused'); return; }
      const rows = await scrapeQuarterlyFinancials();
      const duration = Date.now() - start;
      console.log(`[Scheduler] ✅ Quarterly financials job completed in ${duration}ms`);
      markSuccess('quarterlyFinancials', duration, rows);
      await persistMetric('quarterlyFinancials', true, duration, undefined, rows);
    } catch (error: any) {
      const duration = Date.now() - (jobStatuses.quarterlyFinancials.lastRun ? Date.parse(jobStatuses.quarterlyFinancials.lastRun) : Date.now());
      console.error('[Scheduler] ❌ Quarterly financials job failed:', error.message);
      markError('quarterlyFinancials', error, duration);
      await persistMetric('quarterlyFinancials', false, duration, error.message);
      checkConsecutiveFailures('quarterlyFinancials');
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Metrics retention purge - daily at 02:10 AM IST
  const retentionDays = parseInt(process.env.METRICS_RETENTION_DAYS || '30', 10);
  const purgeJob = cron.schedule('10 2 * * *', async () => {
    console.log(`[Scheduler] Running metrics retention purge (> ${retentionDays} days)...`);
    try {
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('job_metrics')
        .delete()
        .lt('started_at', cutoff);
      if (error) throw error;
      console.log('[Scheduler] ✅ Metrics purge completed');
    } catch (err:any) {
      console.error('[Scheduler] ❌ Metrics purge failed:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // Manual trigger for testing (every 5 minutes in development only)
  const testJob = process.env.NODE_ENV === 'development' 
    ? cron.schedule('*/5 * * * *', async () => {
        console.log('[Scheduler] Running test scrape job (every 5 min)...');
        try {
          markRun('testResults');
          const start = Date.now();
          if (jobStatuses.testResults.paused) { console.log('[Scheduler] testResults paused'); return; }
          
          // Use new results engine in test mode too
          const publishedResults = await monitorPublishedResults();
          let successCount = 0;
          for (const publication of publishedResults.slice(0, 3)) { // Process max 3 in test mode
            const success = await processResultPublication(publication);
            if (success) successCount++;
          }
          
          const duration = Date.now() - start;
          console.log(`[Scheduler] ✅ Test scrape job completed in ${duration}ms`);
          markSuccess('testResults', duration, successCount);
          await persistMetric('testResults', true, duration, undefined, successCount);
        } catch (error: any) {
          const duration = Date.now() - (jobStatuses.testResults.lastRun ? Date.parse(jobStatuses.testResults.lastRun) : Date.now());
          console.error('[Scheduler] ❌ Test scrape job failed:', error.message);
          console.error('[Scheduler] Stack:', error.stack);
          markError('testResults', error, duration);
          await persistMetric('testResults', false, duration, error.message);
          checkConsecutiveFailures('testResults');
        }
      })
    : null;

  console.log('[Scheduler] ✅ Jobs scheduled:');
  console.log('  - Results Calendar: Every 30 min (9AM-8PM IST, Mon-Fri) - Extended for after-market filings');
  console.log('  - Live Prices: Every 2 min (9AM-3:30PM IST, Mon-Fri) - Real-time price updates');
  console.log('  - Price Refresh: Every 30 min (24/7) - Keepalive to ensure fresh data');
  console.log('  - Candlestick Data: Daily at 4:30 PM IST (Mon-Fri)');
  console.log('  - Delivery Volume (Incremental): Daily at 4:35 PM IST (Mon-Fri)');
  console.log('  - Quarterly Financials: Daily at 5:00 PM IST (Mon-Fri)');
  if (process.env.NODE_ENV === 'development') {
    console.log('  - Test Scraper: Every 5 minutes (development)');
  }

  // Return jobs for manual control if needed
  return {
    resultsCalendarJob,
    livePriceJob,
    priceRefreshJob,
    candlestickJob,
    deliveryJob,
    quarterlyFinancialsJob,
    purgeJob,
    testJob,
  };
}

/**
 * Manual trigger for results calendar scrape
 */
export async function triggerResultsScrape(): Promise<void> {
  console.log('[Scheduler] Manual trigger: Results calendar scrape');
  await scrapeResultsCalendar();
}
