import cron from 'node-cron';
import { storage } from '../storage';
import { updateStoredPrices } from './nse-scraper/price-fetcher';

class PriceUpdateService {
  private updateJob: any = null;
  private isMarketHours = false;
  private updateInterval = 5000; // 5 seconds during market hours
  private eodSnapshotCaptured = false; // Track if EOD snapshot was captured today

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
      console.log('[Price Service] 📸 Capturing End of Day snapshot...');
      const stocks = await storage.getAllStocks();
      if (!stocks || stocks.length === 0) {
        console.log('[Price Service] No stocks for EOD snapshot');
        return;
      }

      const symbols = stocks.map(s => s.symbol);
      await updateStoredPrices(symbols);
      this.eodSnapshotCaptured = true;
      console.log('[Price Service] ✅ EOD snapshot captured successfully for', symbols.length, 'stocks');
    } catch (error: any) {
      console.error('[Price Service] EOD snapshot failed:', error.message);
    }
  }

  /**
   * Fetch latest data on startup to ensure fresh data even after server restart
   */
  async fetchLatestData(): Promise<void> {
    try {
      console.log('[Price Service] 🔄 Fetching latest available data from NSE...');
      const stocks = await storage.getAllStocks();
      if (!stocks || stocks.length === 0) {
        console.log('[Price Service] No stocks to fetch');
        return;
      }

      const symbols = stocks.map(s => s.symbol);
      await updateStoredPrices(symbols);
      console.log('[Price Service] ✅ Latest data fetched for', symbols.length, 'stocks');
    } catch (error: any) {
      console.error('[Price Service] Failed to fetch latest data:', error.message);
    }
  }

  /**
   * Start the price update service
   */
  async start(): Promise<void> {
    console.log('[Price Service] Starting real-time price update service...');

    // Fetch latest data on startup to ensure fresh data after restart
    await this.fetchLatestData();

    // Check market hours every minute and start/stop updates accordingly
    cron.schedule('* * * * *', async () => {
      const nowMarketHours = this.checkMarketHours();
      
      if (nowMarketHours && !this.isMarketHours) {
        // Market just opened - reset EOD flag for new day
        console.log('[Price Service] 📈 Market OPEN - Starting live price updates every 5 seconds');
        this.isMarketHours = true;
        this.eodSnapshotCaptured = false;
        this.startLiveUpdates();
      } else if (!nowMarketHours && this.isMarketHours) {
        // Market just closed - capture EOD snapshot if not already done
        console.log('[Price Service] 📉 Market CLOSED - Stopping live price updates');
        this.isMarketHours = false;
        this.stopLiveUpdates();
        
        if (!this.eodSnapshotCaptured) {
          await this.captureEODSnapshot();
        }
      }
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Initial check
    if (this.checkMarketHours()) {
      console.log('[Price Service] Market is currently open - starting updates');
      this.isMarketHours = true;
      this.startLiveUpdates();
    } else {
      console.log('[Price Service] Market is currently closed - showing last available data');
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
      console.log('[Price Service] 🌙 New day - EOD snapshot flag reset');
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
    };
  }
}

export const priceUpdateService = new PriceUpdateService();
