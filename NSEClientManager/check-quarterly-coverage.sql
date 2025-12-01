-- Check how many stocks have quarterly results
SELECT 
  COUNT(DISTINCT s.id) as total_stocks,
  COUNT(DISTINCT qr.stock_id) as stocks_with_results,
  COUNT(qr.id) as total_quarterly_results
FROM stocks s
LEFT JOIN quarterly_results qr ON s.id = qr.stock_id;

-- List first 20 stocks with quarterly results
SELECT 
  s.symbol,
  s.name,
  COUNT(qr.id) as results_count
FROM stocks s
INNER JOIN quarterly_results qr ON s.id = qr.stock_id
GROUP BY s.id, s.symbol, s.name
ORDER BY s.symbol
LIMIT 20;

-- Check if 21STCENMGM specifically has results
SELECT 
  s.symbol,
  qr.*
FROM stocks s
LEFT JOIN quarterly_results qr ON s.id = qr.stock_id
WHERE s.symbol = '21STCENMGM';
