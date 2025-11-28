-- ============================================
-- Performance Optimization Indexes
-- For handling 3000+ stocks efficiently
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable pg_trgm extension FIRST (required for fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- must precede any gin_trgm_ops index creation

-- Additional indexes for stock queries
CREATE INDEX IF NOT EXISTS idx_stocks_percent_change_desc ON stocks(percent_change DESC);
CREATE INDEX IF NOT EXISTS idx_stocks_volume_desc ON stocks(volume DESC);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
CREATE INDEX IF NOT EXISTS idx_stocks_company_name ON stocks(company_name);

-- Full-text search index for stock search (requires pg_trgm extension)
CREATE INDEX IF NOT EXISTS idx_stocks_symbol_trgm ON stocks USING gin(symbol gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stocks_company_trgm ON stocks USING gin(company_name gin_trgm_ops);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_stocks_active_trading ON stocks(last_updated DESC, percent_change DESC);

-- Optimize calendar queries
CREATE INDEX IF NOT EXISTS idx_results_calendar_composite ON results_calendar(announcement_date DESC, result_status);

-- Optimize quarterly results queries
CREATE INDEX IF NOT EXISTS idx_quarterly_results_composite ON quarterly_results(stock_id, published_at DESC);

-- Add materialized view for top performers (optional - for very large datasets)
-- This can be refreshed periodically to cache expensive calculations
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_performers AS
SELECT 
  id, 
  symbol, 
  company_name, 
  current_price, 
  percent_change, 
  volume,
  last_traded_price,
  day_high,
  day_low,
  sector,
  last_updated
FROM stocks
WHERE percent_change IS NOT NULL
ORDER BY percent_change DESC
LIMIT 50;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_performers_id ON mv_top_performers(id);

-- Function to refresh materialized view (call this periodically)
CREATE OR REPLACE FUNCTION refresh_top_performers()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_performers;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Query optimization hints
-- ============================================

-- ============================
-- IMPORTANT: ANALYZE / VACUUM
-- ============================
-- Supabase wraps multi-statement migrations in a transaction. VACUUM and some ANALYZE forms
-- cannot run inside a transaction block and will throw: "VACUUM cannot run inside a transaction block".
-- Run the following maintenance commands separately (each as its own single query) AFTER this file succeeds:
--   ANALYZE stocks;
--   ANALYZE results_calendar;
--   ANALYZE quarterly_results;
--   ANALYZE users;
--   VACUUM ANALYZE stocks;
--   VACUUM ANALYZE results_calendar;
-- You can also schedule periodic auto-analyze; PostgreSQL auto-vacuum will handle most cases.
-- (Left commented here intentionally.)

-- ============================================
-- Performance monitoring queries
-- ============================================

-- Check index usage
-- SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public' ORDER BY idx_scan DESC;

-- Find slow queries
-- SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;

-- Table sizes
-- SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
