-- Migration: Add previous quarter and year-ago data fields to quarterly_results
-- These fields store comparison data for better UI display

ALTER TABLE quarterly_results 
ADD COLUMN IF NOT EXISTS prev_revenue DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS prev_profit DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS prev_eps DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS prev_operating_profit DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS year_ago_revenue DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS year_ago_profit DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS year_ago_eps DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS year_ago_operating_profit DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS operating_profit_margin_qoq DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS operating_profit_margin_yoy DECIMAL(5, 2);

-- Comment
COMMENT ON COLUMN quarterly_results.prev_revenue IS 'Revenue from previous quarter (Q-1)';
COMMENT ON COLUMN quarterly_results.year_ago_revenue IS 'Revenue from same quarter last year (Y-1)';
