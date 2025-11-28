-- Migration: Add unique constraint for quarterly_results to prevent duplicates
-- This ensures we can upsert data based on stock_id, quarter, and fiscal_year

-- Add unique constraint if it doesn't exist
ALTER TABLE quarterly_results
DROP CONSTRAINT IF EXISTS quarterly_results_stock_quarter_fy_unique;

ALTER TABLE quarterly_results
ADD CONSTRAINT quarterly_results_stock_quarter_fy_unique 
UNIQUE (stock_id, quarter, fiscal_year);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_quarterly_results_stock_fy 
ON quarterly_results(stock_id, fiscal_year DESC);

-- Comment
COMMENT ON CONSTRAINT quarterly_results_stock_quarter_fy_unique ON quarterly_results 
IS 'Ensures only one result entry per stock per quarter per fiscal year';
