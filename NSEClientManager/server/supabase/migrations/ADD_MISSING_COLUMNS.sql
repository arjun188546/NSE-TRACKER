-- Add missing columns to quarterly_results table for complete quarterly data
-- Run this SQL in your Supabase SQL Editor

-- Add columns for storing previous quarter data
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_revenue DECIMAL(15, 2);
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_profit DECIMAL(15, 2);
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_eps DECIMAL(10, 4);
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_operating_profit DECIMAL(15, 2);
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_operating_profit_margin DECIMAL(5, 2);

-- Add columns for storing year-ago quarter data
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_revenue DECIMAL(15, 2);
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_profit DECIMAL(15, 2);
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_eps DECIMAL(10, 4);
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_operating_profit DECIMAL(15, 2);
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_operating_profit_margin DECIMAL(5, 2);

-- Add columns for margin growth comparisons
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS operating_profit_margin_qoq DECIMAL(5, 2);
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS operating_profit_margin_yoy DECIMAL(5, 2);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quarterly_results' 
ORDER BY column_name;
