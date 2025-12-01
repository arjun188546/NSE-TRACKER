-- Check if 21STCENMGM stock exists and has quarterly results
SELECT 
  s.id,
  s.symbol,
  s.name,
  COUNT(qr.id) as quarterly_results_count
FROM stocks s
LEFT JOIN quarterly_results qr ON s.id = qr.stock_id
WHERE s.symbol = '21STCENMGM'
GROUP BY s.id, s.symbol, s.name;

-- Check all quarterly results for this stock
SELECT 
  s.symbol,
  qr.quarter,
  qr.fiscal_year,
  qr.revenue,
  qr.profit,
  qr.eps
FROM stocks s
LEFT JOIN quarterly_results qr ON s.id = qr.stock_id
WHERE s.symbol = '21STCENMGM'
ORDER BY qr.fiscal_year DESC, qr.quarter DESC;
