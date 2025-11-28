import { nseClient } from './http-client';
import { storage } from '../../storage';
import { addDays, format, subDays } from 'date-fns';

/**
 * Scrape delivery volume data (deliverable quantity, traded quantity, delivery %) from NSE
 * Fallbacks to mock data in development if NSE blocks or endpoint unavailable.
 */
export async function scrapeDeliveryVolume(daysBack: number = 30): Promise<number> {
  try {
    console.log('[Delivery Scraper] Starting delivery volume scrape...');

    const stocks = await storage.getAllStocks();
    console.log(`[Delivery Scraper] Found ${stocks.length} stocks to update`);

    let totalRows = 0;
    for (const stock of stocks) {
      try {
        const rows = await scrapeDeliveryForStock(stock.symbol, stock.id, daysBack);
        totalRows += rows;
      } catch (err: any) {
        console.error(`[Delivery Scraper] Failed ${stock.symbol}:`, err.message);
      }
    }

    console.log(`[Delivery Scraper] ✅ Delivery volume scrape completed. Rows stored: ${totalRows}`);
    return totalRows;
  } catch (error: any) {
    console.error('[Delivery Scraper] ❌ Scraping failed:', error.message);
    throw error;
  }
}

async function scrapeDeliveryForStock(symbol: string, stockId: string, daysBack: number): Promise<number> {
  const toDate = new Date();
  const fromDate = subDays(toDate, daysBack);

  const endpoint = '/api/historical/securityArchives';
  const params = {
    symbol,
    series: 'EQ',
    dataType: 'priceVolumeDeliverable',
    from: format(fromDate, 'dd-MM-yyyy'),
    to: format(toDate, 'dd-MM-yyyy'),
  } as Record<string, any>;

  let data: any;
  try {
    data = await nseClient.get(endpoint, params);
  } catch (error: any) {
    // No mock fallbacks permitted in this project
    throw error;
  }

  // Expected data shape: { data: Array<{ CH_DATE, CH_DELIV_QTY, CH_TOT_TRADED_QTY, CH_DELIV_PERC }> }
  const rows: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    console.warn(`[Delivery Scraper] No rows for ${symbol}`);
    return;
  }

  let stored = 0;
  for (const row of rows) {
    try {
      const dateStr = normalizeDate(row.CH_DATE || row.date);
      const deliveryQty = toInt(row.CH_DELIV_QTY ?? row.deliveryQuantity ?? '0');
      const tradedQty = toInt(row.CH_TOT_TRADED_QTY ?? row.tradedQuantity ?? '0');
      const deliveryPerc = toFloat(row.CH_DELIV_PERC ?? row.deliveryPercentage ?? '0');

      // Basic validation
      if (!dateStr) continue;
      if (tradedQty <= 0) continue;
      if (deliveryQty < 0 || deliveryPerc < 0) continue;

      await storage.createDeliveryVolume({
        stockId,
        date: dateStr,
        deliveryQuantity: deliveryQty,
        tradedQuantity: tradedQty,
        deliveryPercentage: deliveryPerc.toFixed(2),
      });
      stored += 1;
    } catch (e) {
      // likely duplicate, ignore quietly
    }
  }

  console.log(`[Delivery Scraper] Stored delivery rows for ${symbol}: ${stored}/${rows.length}`);
  return stored;
}

function normalizeDate(input: string | undefined): string | null {
  if (!input) return null;
  // Try ISO first
  const iso = new Date(input);
  if (!isNaN(iso.getTime())) return format(iso, 'yyyy-MM-dd');

  // Try dd-MMM-yyyy (10-Nov-2025)
  const parts = input.split('-');
  if (parts.length === 3) {
    const months: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    const m = months[(parts[1] || '').toLowerCase()];
    if (m !== undefined) {
      const d = new Date(parseInt(parts[2],10), m, parseInt(parts[0],10));
      if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
    }
  }

  // Try dd-MM-yyyy
  const parts2 = input.split('-');
  if (parts2.length === 3) {
    const [dd, mm, yyyy] = parts2;
    const d = new Date(parseInt(yyyy,10), parseInt(mm,10)-1, parseInt(dd,10));
    if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
  }

  return null;
}

function toInt(v: any): number {
  if (typeof v === 'number') return Math.round(v);
  return parseInt(String(v).replace(/[,\s]/g, ''), 10) || 0;
}

function toFloat(v: any): number {
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/[,\s]/g, '')) || 0;
}

function generateMockDeliveryData(symbol: string, fromDate: Date, toDate: Date) {
  const rows: any[] = [];
  for (let d = new Date(fromDate); d <= toDate; d = addDays(d, 1)) {
    // weekdays only (approx)
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const traded = 1000000 + Math.floor(Math.random() * 3000000);
    const perc = 25 + Math.random() * 35; // 25% - 60%
    const delivery = Math.round(traded * (perc / 100));

    rows.push({
      date: format(d, 'dd-MMM-yyyy'),
      deliveryQuantity: delivery,
      tradedQuantity: traded,
      deliveryPercentage: perc,
    });
  }
  return { data: rows };
}

/**
 * Adaptive incremental delivery scraping: For each stock determine how many missing days
 * since last stored delivery date (capped) and fetch only that range.
 * Falls back to a small window (7 days) if no prior data.
 */
export async function scrapeIncrementalDeliveryData(): Promise<number> {
  console.log('[Delivery Scraper] Running incremental adaptive update...');
  let total = 0;
  const stocks = await storage.getAllStocks();
  const today = new Date();
  for (const stock of stocks) {
    try {
      // @ts-ignore - helper exists on storage instance
      const latestDateStr = await (storage as any).getLatestDeliveryDate?.(stock.id);
      let daysNeeded = 7; // default small window
      if (latestDateStr) {
        const latestDate = new Date(latestDateStr + 'T00:00:00');
        const diffMs = today.getTime() - latestDate.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays <= 0) continue; // already up-to-date
        daysNeeded = diffDays + 1; // include current day potential
        if (daysNeeded > 30) daysNeeded = 30; // cap per stock fetch
      }
      const stored = await scrapeDeliveryForStock(stock.symbol, stock.id, daysNeeded);
      if (typeof stored === 'number') total += stored;
    } catch (e:any) {
      console.warn('[Delivery Scraper] Incremental skip error:', e.message);
    }
  }
  console.log(`[Delivery Scraper] Incremental update complete. New delivery rows: ${total}`);
  return total;
}
