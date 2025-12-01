import { supabase } from '../supabase-storage';
import express from 'express';

const router = express.Router();

// Get all NSE stocks with watchlist status
router.get('/nse-all', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all stocks from the database
    const { data: allStocks, error: stocksError } = await supabase
      .from('stocks')
      .select(`
        id,
        symbol,
        company_name,
        sector,
        market_cap,
        current_price,
        price_change,
        price_change_percent,
        updated_at
      `)
      .order('symbol', { ascending: true });

    if (stocksError) {
      console.error('Error fetching stocks:', stocksError);
      return res.status(500).json({ error: 'Failed to fetch stocks' });
    }

    // Get user's watchlist to determine which stocks are already added
    const { data: watchlistStocks, error: watchlistError } = await supabase
      .from('user_portfolio')
      .select('stock_id')
      .eq('user_id', user.id);

    if (watchlistError) {
      console.error('Error fetching watchlist:', watchlistError);
      return res.status(500).json({ error: 'Failed to fetch watchlist' });
    }

    const watchlistStockIds = new Set(watchlistStocks?.map(item => item.stock_id) || []);

    // Transform data for frontend
    const nseStocks = allStocks?.map(stock => ({
      id: stock.id,
      symbol: stock.symbol,
      companyName: stock.company_name,
      sector: stock.sector || 'Other',
      marketCap: stock.market_cap,
      price: stock.current_price,
      change: stock.price_change,
      changePercent: stock.price_change_percent,
      isInWatchlist: watchlistStockIds.has(stock.id),
      updatedAt: stock.updated_at
    })) || [];

    res.json(nseStocks);

  } catch (error) {
    console.error('Error in /nse-all endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add stock to user's portfolio/watchlist
router.post('/:stockId/add-to-portfolio', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { stockId } = req.params;

    // Check if stock exists
    const { data: stock, error: stockError } = await supabase
      .from('stocks')
      .select('id, symbol, company_name')
      .eq('id', stockId)
      .single();

    if (stockError || !stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    // Check if already in portfolio
    const { data: existing } = await supabase
      .from('user_portfolio')
      .select('id')
      .eq('user_id', user.id)
      .eq('stock_id', stockId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Stock already in watchlist' });
    }

    // Add to portfolio
    const { error: insertError } = await supabase
      .from('user_portfolio')
      .insert({
        user_id: user.id,
        stock_id: stockId,
        added_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error adding to portfolio:', insertError);
      return res.status(500).json({ error: 'Failed to add stock to watchlist' });
    }

    res.json({ 
      success: true, 
      message: `${stock.symbol} added to watchlist` 
    });

  } catch (error) {
    console.error('Error in add-to-portfolio endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove stock from user's portfolio/watchlist
router.delete('/:stockId/remove-from-portfolio', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { stockId } = req.params;

    // Get stock info for response
    const { data: stock } = await supabase
      .from('stocks')
      .select('symbol, company_name')
      .eq('id', stockId)
      .single();

    // Remove from portfolio
    const { error: deleteError } = await supabase
      .from('user_portfolio')
      .delete()
      .eq('user_id', user.id)
      .eq('stock_id', stockId);

    if (deleteError) {
      console.error('Error removing from portfolio:', deleteError);
      return res.status(500).json({ error: 'Failed to remove stock from watchlist' });
    }

    res.json({ 
      success: true, 
      message: stock ? `${stock.symbol} removed from watchlist` : 'Stock removed from watchlist'
    });

  } catch (error) {
    console.error('Error in remove-from-portfolio endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;