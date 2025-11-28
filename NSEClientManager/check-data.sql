-- Quick check: Do we have any candlestick or delivery data?
SELECT 
  (SELECT COUNT(*) FROM candlestick_data) as candlestick_count,
  (SELECT COUNT(*) FROM delivery_volume) as delivery_count,
  (SELECT COUNT(DISTINCT stock_id) FROM candlestick_data) as stocks_with_candles,
  (SELECT COUNT(DISTINCT stock_id) FROM delivery_volume) as stocks_with_delivery;

-- Sample candlestick data
SELECT s.symbol, cd.date, cd.open, cd.high, cd.low, cd.close, cd.volume
FROM candlestick_data cd
JOIN stocks s ON s.id = cd.stock_id
ORDER BY cd.date DESC
LIMIT 5;

-- Sample delivery data  
SELECT s.symbol, dv.date, dv.delivery_quantity, dv.traded_quantity, dv.delivery_percentage
FROM delivery_volume dv
JOIN stocks s ON s.id = dv.stock_id
ORDER BY dv.date DESC
LIMIT 5;
