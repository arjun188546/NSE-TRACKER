import cron from 'node-cron';
import { storage } from '../storage';
import { updateStoredPrices } from './nse-scraper/price-fetcher';

class PriceUpdateService {
  private updateJob: any = null;
  private isMarketHours = false;
  private updateInterval = 5000; // 5 seconds during market hours
  private eodSnapshotCaptured = false; // Track if EOD snapshot was captured today
  private lastMarketSession: string | null = null; // Track last market session date (YYYY-MM-DD)

  /**
   * Check if current time is within market hours (9:15 AM - 3:30 PM IST, Mon-Fri)
   */
  private checkMarketHours(): boolean {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = istTime.getHours();
    const minute = istTime.getMinutes();
    
    // Check if it's a weekday (Monday-Friday)
    if (day === 0 || day === 6) {
      return false;
    }
    
    // Market hours: 9:15 AM to 3:30 PM
    const currentTimeMinutes = hour * 60 + minute;
    const marketOpen = 9 * 60 + 15;  // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM
    
    return currentTimeMinutes >= marketOpen && currentTimeMinutes <= marketClose;
  }

  /**
   * Get today's date in YYYY-MM-DD format (IST timezone)
   */
  private getTodaySessionDate(): string {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return istTime.toISOString().split('T')[0];
  }

  /**
   * Check if we should fetch from NSE or use stored data
   * Returns true only during market hours OR if we haven't captured today's EOD yet
   */
  private shouldFetchFromNSE(): boolean {
    const todaySession = this.getTodaySessionDate();
    
    // If market is open, always fetch
    if (this.isMarketHours) {
      return true;
    }
    
    // If market is closed and we've already captured EOD for today, don't fetch
    if (this.eodSnapshotCaptured && this.lastMarketSession === todaySession) {
      return false;
    }
    
    // If we haven't captured EOD yet for today, allow one fetch
    return true;
  }

  /**
   * Update prices for all tracked stocks
   */
  private async updatePrices(): Promise<void> {
    try {
      // Get all stocks from portfolio
      const stocks = await storage.getAllStocks();
      if (!stocks || stocks.length === 0) {
        console.log('[Price Service] No stocks to update');
        return;
      }

      const symbols = stocks.map(s => s.symbol);
      await updateStoredPrices(symbols);
    } catch (error: any) {
      console.error('[Price Service] Price update failed:', error.message);
    }
  }

  /**
   * Capture End of Day snapshot - fetch and persist last traded data from NSE
   * This ensures we have the final closing prices even after market closes
   */
  private async captureEODSnapshot(): Promise<void> {
    try {
      const todaySession = this.getTodaySessionDate();
      
      // Skip if already captured for today
      if (this.eodSnapshotCaptured && this.lastMarketSession === todaySession) {
        console.log('[Price Service] EOD snapshot already captured for today');
        return;
      }

      console.log('[Price Service] 📸 Capturing End of Day snapshot...');
      const stocks = await storage.getAllStocks();
      if (!stocks || stocks.length === 0) {
        console.log('[Price Service] No stocks for EOD snapshot');
        return;
      }

      const symbols = stocks.map(s => s.symbol);
      await updateStoredPrices(symbols, false); // Force fetch without cache
      this.eodSnapshotCaptured = true;
      this.lastMarketSession = todaySession;
      console.log('[Price Service] ✅ EOD snapshot captured successfully for', symbols.length, 'stocks on', todaySession);
      console.log('[Price Service] 🛑 NSE fetching stopped - using stored prices until next market open');
    } catch (error: any) {
      console.error('[Price Service] EOD snapshot failed:', error.message);
    }
  }

  /**
   * Fetch latest data on startup to ensure fresh data even after server restart
   * Smart fetch: Only calls NSE if market is open OR data is stale (>6 hours old)
   */
  async fetchLatestData(): Promise<void> {
    try {
      const stocks = await storage.getAllStocks();
      if (!stocks || stocks.length === 0) {
        console.log('[Price Service] No stocks to fetch');
        return;
      }

      const symbols = stocks.map(s => s.symbol);
      const todaySession = this.getTodaySessionDate();
      const marketOpen = this.checkMarketHours();
      
      // Check if we have recent data (within last 6 hours)
      const hasRecentData = stocks.every(stock => {
        if (!stock.lastUpdated) return false;
        const lastUpdate = new Date(stock.lastUpdated);
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        return lastUpdate > sixHoursAgo;
      });
      
      // Smart decision: Fetch from NSE or use stored data
      if (marketOpen) {
        // Market is open - always fetch fresh data
        console.log('[Price Service] 📈 Market OPEN - Fetching live data from NSE...');
        await updateStoredPrices(symbols);
        console.log('[Price Service] ✅ Live data fetched for', symbols.length, 'stocks');
      } else if (!hasRecentData) {
        // Market closed but data is stale - fetch once to update
        console.log('[Price Service] 🔄 Data is stale - Fetching latest available from NSE...');
        await updateStoredPrices(symbols);
        this.lastMarketSession = todaySession;
        console.log('[Price Service] ✅ Latest data fetched for', symbols.length, 'stocks');
      } else {
        // Market closed and data is recent - use stored data
        console.log('[Price Service] 💾 Market CLOSED - Using stored prices (last update was recent)');
        const oldestUpdate = stocks.reduce((oldest, stock) => {
          if (!stock.lastUpdated) return oldest;
          const stockUpdate = new Date(stock.lastUpdated);
          return stockUpdate < oldest ? stockUpdate : oldest;
        }, new Date());
        const minutesAgo = Math.floor((Date.now() - oldestUpdate.getTime()) / (60 * 1000));
        console.log(`[Price Service] ℹ️  Showing ${symbols.length} stocks with data from ${minutesAgo} minutes ago`);
      }
    } catch (error: any) {
      console.error('[Price Service] Failed to fetch latest data:', error.message);
    }
  }

  /**
   * Start the price update service
   */
  async start(): Promise<void> {
    console.log('[Price Service] Starting real-time price update service...');
    console.log('[Price Service] Current IST time:', new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    // Set market hours status FIRST (before long-running fetch)
    const initialMarketCheck = this.checkMarketHours();
    console.log('[Price Service] Initial market check:', initialMarketCheck ? 'OPEN ✅' : 'CLOSED ❌');
    
    if (initialMarketCheck) {
      this.isMarketHours = true;
      this.lastMarketSession = this.getTodaySessionDate();
      console.log('[Price Service] Market is open - will start live updates immediately');
    } else {
      this.isMarketHours = false;
      console.log('[Price Service] Market is closed - showing stored data');
    }

    // Fetch latest data in background (don't block initialization)
    this.fetchLatestData().catch(err => {
      console.error('[Price Service] Initial fetch failed:', err.message);
    });

    console.log('[Price Service] Setting up cron schedulers...');

    // Check market hours every minute and start/stop updates accordingly
    cron.schedule('* * * * *', async () => {
      const nowMarketHours = this.checkMarketHours();
      const todaySession = this.getTodaySessionDate();
      
      if (nowMarketHours && !this.isMarketHours) {
        // Market just opened - reset EOD flag for new trading day
        console.log('[Price Service] 📈 Market OPEN - Starting live price updates every 5 seconds');
        console.log('[Price Service] 🔄 Resuming real-time NSE data fetching...');
        this.isMarketHours = true;
        this.eodSnapshotCaptured = false;
        this.lastMarketSession = todaySession;
        this.startLiveUpdates();
      } else if (!nowMarketHours && this.isMarketHours) {
        // Market just closed - capture final EOD snapshot
        console.log('[Price Service] 📉 Market CLOSED - Stopping live price updates');
        this.isMarketHours = false;
        this.stopLiveUpdates();
        
        // Capture final closing prices
        if (!this.eodSnapshotCaptured) {
          await this.captureEODSnapshot();
        }
      }
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Start live updates if market is currently open
    if (this.isMarketHours) {
      console.log('[Price Service] Starting interval-based live updates (every 5 seconds)');
      this.startLiveUpdates();
    }

    // Capture EOD snapshot at market close (3:30 PM IST) on weekdays
    cron.schedule('30 15 * * 1-5', async () => {
      console.log('[Price Service] 🔔 Market closing time - capturing EOD snapshot');
      await this.captureEODSnapshot();
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Reset EOD flag at midnight to prepare for next trading day
    cron.schedule('0 0 * * *', () => {
      this.eodSnapshotCaptured = false;
      console.log('[Price Service] 🌙 New day - Ready for next trading session');
      console.log('[Price Service] 💾 Previous session data preserved:', this.lastMarketSession);
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Weekend/Holiday status log (every 4 hours on Sat/Sun)
    cron.schedule('0 */4 * * 0,6', () => {
      console.log('[Price Service] 📅 Weekend - Market closed, using last session data:', this.lastMarketSession);
    }, {
      timezone: 'Asia/Kolkata'
    });
  }

  /**
   * Start live price updates during market hours
   */
  private startLiveUpdates(): void {
    if (this.updateJob) {
      return; // Already running
    }

    // Initial update
    this.updatePrices();

    // Set up interval for continuous updates
    this.updateJob = setInterval(async () => {
      await this.updatePrices();
    }, this.updateInterval);
  }

  /**
   * Stop live price updates
   */
  private stopLiveUpdates(): void {
    if (this.updateJob) {
      clearInterval(this.updateJob);
      this.updateJob = null;
    }
  }

  /**
   * Get current service status
   */
  getStatus() {
    return {
      isMarketHours: this.isMarketHours,
      isUpdating: this.updateJob !== null,
      updateInterval: this.updateInterval,
      nextUpdate: this.updateJob ? 'Running' : 'Stopped',
      eodSnapshotCaptured: this.eodSnapshotCaptured,
      lastMarketSession: this.lastMarketSession,
      dataSource: this.isMarketHours ? 'Live NSE' : `Stored (${this.lastMarketSession || 'Last Session'})`,
    };
  }
}

export const priceUpdateService = new PriceUpdateService();
