/**
 * Populate sample historical data for development
 * This creates realistic candlestick and delivery data for the past 30 days
 */

import { supabase } from './supabase/config/supabase-client';
import { subDays, format, isWeekend } from 'date-fns';

async function populateSampleData() {
  console.log('🚀 Populating sample historical data...\n');

  try {
    // Get all stocks
    const { data: stocks, error: stocksError } = await supabase
      .from('stocks')
      .select('id, symbol')
      .limit(10);

    if (stocksError) throw stocksError;
    if (!stocks || stocks.length === 0) {
      console.error('❌ No stocks found in database');
      return;
    }

    console.log(`📊 Found ${stocks.length} stocks`);

    // Generate data for last 30 trading days
    const today = new Date();
    const tradingDays: Date[] = [];
    
    for (let i = 30; i >= 0; i--) {
      const date = subDays(today, i);
      if (!isWeekend(date)) {
        tradingDays.push(date);
      }
    }

    console.log(`📅 Generating data for ${tradingDays.length} trading days\n`);

    let candlestickCount = 0;
    let deliveryCount = 0;

    for (const stock of stocks) {
      console.log(`Processing ${stock.symbol}...`);
      
      // Generate realistic price movements
      let basePrice = 1000 + Math.random() * 2000; // Random base price between 1000-3000

      const candlestickData = [];
      const deliveryData = [];

      for (const date of tradingDays) {
        // Random daily change -3% to +3%
        const change = (Math.random() - 0.5) * 0.06;
        basePrice = basePrice * (1 + change);

        const open = basePrice * (1 + (Math.random() - 0.5) * 0.01);
        const close = basePrice * (1 + (Math.random() - 0.5) * 0.01);
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low = Math.min(open, close) * (1 - Math.random() * 0.02);
        const volume = Math.floor(1000000 + Math.random() * 9000000);

        candlestickData.push({
          stock_id: stock.id,
          date: format(date, 'yyyy-MM-dd'),
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume
        });

        // Delivery data (40-80% delivery percentage)
        const deliveryPercentage = 40 + Math.random() * 40;
        const deliveryQty = Math.floor(volume * (deliveryPercentage / 100));

        deliveryData.push({
          stock_id: stock.id,
          date: format(date, 'yyyy-MM-dd'),
          delivery_quantity: deliveryQty,
          traded_quantity: volume,
          delivery_percentage: parseFloat(deliveryPercentage.toFixed(2))
        });
      }

      // Insert candlestick data
      const { error: candleError } = await supabase
        .from('candlestick_data')
        .upsert(candlestickData, { onConflict: 'stock_id,date' });

      if (candleError) {
        console.error(`  ❌ Error inserting candlestick data:`, candleError.message);
      } else {
        candlestickCount += candlestickData.length;
        console.log(`  ✅ Inserted ${candlestickData.length} candlestick records`);
      }

      // Insert delivery data
      const { error: deliveryError } = await supabase
        .from('delivery_volume')
        .upsert(deliveryData, { onConflict: 'stock_id,date' });

      if (deliveryError) {
        console.error(`  ❌ Error inserting delivery data:`, deliveryError.message);
      } else {
        deliveryCount += deliveryData.length;
        console.log(`  ✅ Inserted ${deliveryData.length} delivery records`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✨ Sample data population completed!`);
    console.log(`📊 Total candlestick records: ${candlestickCount}`);
    console.log(`📦 Total delivery records: ${deliveryCount}`);
    
  } catch (error: any) {
    console.error('❌ Error populating sample data:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

populateSampleData();
