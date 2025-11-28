-- ============================================
-- NSE Stock Tracker - Complete Schema Migration
-- Includes all trading data fields for EOD persistence
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS delivery_volume CASCADE;
DROP TABLE IF EXISTS candlestick_data CASCADE;
DROP TABLE IF EXISTS quarterly_results CASCADE;
DROP TABLE IF EXISTS results_calendar CASCADE;
DROP TABLE IF EXISTS scraping_jobs CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- Step 1: Create all tables with complete schema
-- ============================================

CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  demo_expires_at TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE stocks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  symbol TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  -- Basic price data
  current_price DECIMAL(10, 2),
  percent_change DECIMAL(5, 2),
  volume INTEGER,
  -- Trading data for EOD persistence
  last_traded_price DECIMAL(10, 2),
  last_traded_quantity INTEGER,
  last_traded_time TEXT,
  day_high DECIMAL(10, 2),
  day_low DECIMAL(10, 2),
  open_price DECIMAL(10, 2),
  previous_close DECIMAL(10, 2),
  year_high DECIMAL(10, 2),
  year_low DECIMAL(10, 2),
  total_buy_quantity INTEGER,
  total_sell_quantity INTEGER,
  total_traded_value DECIMAL(15, 2),
  total_traded_volume INTEGER,
  average_price DECIMAL(10, 2),
  -- Stock metadata
  sector TEXT,
  market_cap TEXT,
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scraping_jobs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_type TEXT NOT NULL,
  stock_id VARCHAR REFERENCES stocks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE results_calendar (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  announcement_date DATE NOT NULL,
  result_status TEXT NOT NULL DEFAULT 'waiting',
  quarter TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  pdf_url TEXT,
  pdf_downloaded_at TIMESTAMP
);

CREATE TABLE quarterly_results (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  -- Current quarter data
  revenue DECIMAL(15, 2),
  profit DECIMAL(15, 2),
  eps DECIMAL(10, 4),
  operating_profit DECIMAL(15, 2),
  operating_profit_margin DECIMAL(5, 2),
  ebitda DECIMAL(15, 2),
  ebitda_margin DECIMAL(5, 2),
  total_income DECIMAL(15, 2),
  total_expenses DECIMAL(15, 2),
  pat_margin DECIMAL(5, 2),
  roe DECIMAL(5, 2),
  roce DECIMAL(5, 2),
  -- QoQ comparison
  revenue_qoq DECIMAL(5, 2),
  profit_qoq DECIMAL(5, 2),
  eps_qoq DECIMAL(5, 2),
  operating_profit_qoq DECIMAL(5, 2),
  -- YoY comparison
  revenue_yoy DECIMAL(5, 2),
  profit_yoy DECIMAL(5, 2),
  eps_yoy DECIMAL(5, 2),
  operating_profit_yoy DECIMAL(5, 2),
  published_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE candlestick_data (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open DECIMAL(10, 2) NOT NULL,
  high DECIMAL(10, 2) NOT NULL,
  low DECIMAL(10, 2) NOT NULL,
  close DECIMAL(10, 2) NOT NULL,
  volume INTEGER NOT NULL
);

CREATE TABLE delivery_volume (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  delivery_quantity INTEGER NOT NULL,
  traded_quantity INTEGER NOT NULL,
  delivery_percentage DECIMAL(5, 2) NOT NULL
);

-- ============================================
-- Step 2: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_last_updated ON stocks(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_results_calendar_date ON results_calendar(announcement_date);
CREATE INDEX IF NOT EXISTS idx_results_calendar_status ON results_calendar(result_status);
CREATE INDEX IF NOT EXISTS idx_results_calendar_stock_id ON results_calendar(stock_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_results_stock_id ON quarterly_results(stock_id);
CREATE INDEX IF NOT EXISTS idx_candlestick_stock_date ON candlestick_data(stock_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_volume_stock_date ON delivery_volume(stock_id, date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_candlestick_unique ON candlestick_data(stock_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_volume_unique ON delivery_volume(stock_id, date);

-- ============================================
-- Step 3: Insert seed data
-- ============================================

-- Admin and test users
INSERT INTO users (email, password, role, subscription_status, demo_expires_at) VALUES
  ('admin@nse-platform.com', 'admin123', 'admin', 'active', NULL),
  ('client@example.com', 'client123', 'client', 'active', NULL),
  ('demo@example.com', 'demo123', 'client', 'demo', NOW() + INTERVAL '7 days')
ON CONFLICT (email) DO NOTHING;

-- Blue-chip stocks with accurate current prices (as of Nov 2024)
INSERT INTO stocks (symbol, company_name, current_price, percent_change, volume, sector, market_cap,
  last_traded_price, previous_close, day_high, day_low, open_price) VALUES
  
  ('TATASTEEL', 'Tata Steel Ltd.', 172.40, -0.47, 0, 'Metals & Mining', '₹2.1L Cr',
   172.40, 173.21, 175.50, 170.20, 173.00),
  
  ('RELIANCE', 'Reliance Industries Ltd.', 1549.50, 2.01, 0, 'Oil & Gas', '₹16.5L Cr',
   1549.50, 1518.95, 1552.00, 1540.00, 1520.00),
  
  ('INFY', 'Infosys Ltd.', 1536.30, -0.31, 0, 'IT Services', '₹6.4L Cr',
   1536.30, 1541.05, 1545.00, 1530.00, 1540.00),
  
  ('TCS', 'Tata Consultancy Services Ltd.', 3149.80, 0.07, 0, 'IT Services', '₹11.5L Cr',
   3149.80, 3147.60, 3165.00, 3140.00, 3150.00),
  
  ('HDFCBANK', 'HDFC Bank Ltd.', 1008.60, 1.41, 0, 'Banking', '₹7.7L Cr',
   1008.60, 994.55, 1012.00, 995.00, 998.00),
  
  ('ICICIBANK', 'ICICI Bank Ltd.', 1382.00, -0.08, 0, 'Banking', '₹9.7L Cr',
   1382.00, 1383.10, 1390.00, 1378.00, 1385.00),
  
  ('BHARTIARTL', 'Bharti Airtel Ltd.', 2160.00, 0.01, 0, 'Telecom', '₹12.9L Cr',
   2160.00, 2159.78, 2175.00, 2150.00, 2162.00),
  
  ('ITC', 'ITC Ltd.', 405.60, 0.51, 0, 'FMCG', '₹5.1L Cr',
   405.60, 403.54, 408.00, 402.00, 404.00),
  
  ('WIPRO', 'Wipro Ltd.', 246.38, 0.13, 0, 'IT Services', '₹1.3L Cr',
   246.38, 246.06, 248.50, 245.00, 246.50),
  
  ('AXISBANK', 'Axis Bank Ltd.', 1286.20, 1.24, 0, 'Banking', '₹3.9L Cr',
   1286.20, 1270.40, 1290.00, 1270.00, 1275.00)
   
ON CONFLICT (symbol) DO UPDATE SET
  current_price = EXCLUDED.current_price,
  percent_change = EXCLUDED.percent_change,
  last_traded_price = EXCLUDED.last_traded_price,
  previous_close = EXCLUDED.previous_close,
  day_high = EXCLUDED.day_high,
  day_low = EXCLUDED.day_low,
  open_price = EXCLUDED.open_price,
  last_updated = NOW();

-- ============================================
-- Migration Complete!
-- ============================================
