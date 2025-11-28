-- Migration 007: Real-time Data Schema Enhancements
-- Created: 2025-11-22
-- Description: Add support for real-time price updates, enhanced status tracking, and live data monitoring

-- ============================================
-- 1. Enhance results_calendar table
-- ============================================

-- Add new columns for detailed status tracking and volume
ALTER TABLE results_calendar 
ADD COLUMN IF NOT EXISTS volume INTEGER,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'waiting',
ADD COLUMN IF NOT EXISTS pdf_download_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS announcement_detected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS pdf_available_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS parsing_completed_at TIMESTAMP;

-- Create indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_results_calendar_processing_status ON results_calendar(processing_status);
CREATE INDEX IF NOT EXISTS idx_results_calendar_pdf_status ON results_calendar(pdf_download_status);

-- Add comments for documentation
COMMENT ON COLUMN results_calendar.volume IS 'Trading volume on announcement date';
COMMENT ON COLUMN results_calendar.processing_status IS 'Current processing status: waiting, received, ready';
COMMENT ON COLUMN results_calendar.pdf_download_status IS 'PDF download status: pending, available, downloaded, failed';
COMMENT ON COLUMN results_calendar.announcement_detected_at IS 'Timestamp when announcement was first detected on NSE';
COMMENT ON COLUMN results_calendar.pdf_available_at IS 'Timestamp when PDF became available for download';
COMMENT ON COLUMN results_calendar.parsing_completed_at IS 'Timestamp when PDF parsing was completed';

-- ============================================
-- 2. Create live_prices table for intraday data
-- ============================================

CREATE TABLE IF NOT EXISTS live_prices (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  volume INTEGER,
  is_market_open BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_live_prices_stock_id ON live_prices(stock_id);
CREATE INDEX IF NOT EXISTS idx_live_prices_timestamp ON live_prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_live_prices_stock_timestamp ON live_prices(stock_id, timestamp DESC);

-- Add comments
COMMENT ON TABLE live_prices IS 'Real-time intraday price updates during market hours';
COMMENT ON COLUMN live_prices.is_market_open IS 'Whether market was open when price was recorded';

-- Enable Row Level Security
ALTER TABLE live_prices ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY "Allow read access to authenticated users" ON live_prices
  FOR SELECT TO authenticated USING (true);

-- Create RLS policy for service role (for scrapers)
CREATE POLICY "Allow insert for service role" ON live_prices
  FOR INSERT TO service_role WITH CHECK (true);

-- ============================================
-- 3. Add data freshness tracking to stocks table
-- ============================================

ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS last_candlestick_update TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_delivery_update TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_live_price_update TIMESTAMP;

-- Create index for tracking stale data
CREATE INDEX IF NOT EXISTS idx_stocks_last_candlestick_update ON stocks(last_candlestick_update);
CREATE INDEX IF NOT EXISTS idx_stocks_last_delivery_update ON stocks(last_delivery_update);

-- Add comments
COMMENT ON COLUMN stocks.last_candlestick_update IS 'Last time candlestick data was updated for this stock';
COMMENT ON COLUMN stocks.last_delivery_update IS 'Last time delivery volume data was updated for this stock';
COMMENT ON COLUMN stocks.last_live_price_update IS 'Last time live price was updated for this stock';

-- ============================================
-- 4. Create function to get stocks needing updates
-- ============================================

CREATE OR REPLACE FUNCTION get_stocks_needing_candlestick_update(hours_threshold INTEGER DEFAULT 24)
RETURNS TABLE (
  id VARCHAR,
  symbol TEXT,
  company_name TEXT,
  last_update TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.symbol,
    s.company_name,
    s.last_candlestick_update
  FROM stocks s
  WHERE s.last_candlestick_update IS NULL 
     OR s.last_candlestick_update < NOW() - (hours_threshold || ' hours')::INTERVAL
  ORDER BY s.last_candlestick_update ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_stocks_needing_delivery_update(hours_threshold INTEGER DEFAULT 24)
RETURNS TABLE (
  id VARCHAR,
  symbol TEXT,
  company_name TEXT,
  last_update TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.symbol,
    s.company_name,
    s.last_delivery_update
  FROM stocks s
  WHERE s.last_delivery_update IS NULL 
     OR s.last_delivery_update < NOW() - (hours_threshold || ' hours')::INTERVAL
  ORDER BY s.last_delivery_update ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Create cleanup function for old live prices
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_live_prices(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM live_prices
  WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_live_prices IS 'Delete live price records older than specified days (default 7)';

-- ============================================
-- 6. Update existing data with default values
-- ============================================

-- Set default processing_status for existing records
UPDATE results_calendar 
SET processing_status = result_status 
WHERE processing_status IS NULL;

-- Set default pdf_download_status based on pdf_url
UPDATE results_calendar 
SET pdf_download_status = CASE 
  WHEN pdf_url IS NOT NULL THEN 'downloaded'
  ELSE 'pending'
END
WHERE pdf_download_status IS NULL;

-- ============================================
-- 7. Grant necessary permissions
-- ============================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_stocks_needing_candlestick_update TO authenticated;
GRANT EXECUTE ON FUNCTION get_stocks_needing_delivery_update TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_live_prices TO service_role;

-- ============================================
-- Migration Complete
-- ============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 007 completed successfully';
  RAISE NOTICE 'Added real-time data support with live_prices table';
  RAISE NOTICE 'Enhanced results_calendar with status tracking columns';
  RAISE NOTICE 'Added data freshness tracking to stocks table';
END $$;
