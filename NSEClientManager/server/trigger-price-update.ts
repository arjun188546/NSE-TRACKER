/**
 * Trigger immediate price update for all stocks
 */

import { updateStoredPrices } from './services/nse-scraper/price-fetcher';
import { storage } from './storage';

async function triggerPriceUpdate() {
    console.log('🔄 Triggering immediate price update for all stocks...\n');

    try {
        const stocks = await storage.getAllStocks();
        console.log(`Found ${stocks.length} stocks to update\n`);

        const symbols = stocks.map(s => s.symbol);

        // Force fresh fetch (no cache)
        await updateStoredPrices(symbols, false);

        console.log('\n✅ Price update completed!');
        console.log('Prices should now be visible in the dashboard');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

triggerPriceUpdate().catch(console.error);
