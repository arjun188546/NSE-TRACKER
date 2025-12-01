-- Add L&T stock to portfolio if it exists
INSERT INTO user_portfolio (user_id, stock_id)
SELECT 
  '1c779f94-1e78-4a56-a637-3470df6d19b6' as user_id,
  s.id as stock_id
FROM stocks s 
WHERE s.symbol = 'LT'
ON CONFLICT (user_id, stock_id) DO NOTHING;