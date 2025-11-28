-- ============================================
-- NSE Project - Quick Setup Script
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create all tables
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  demo_expires_at TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stocks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  symbol TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  current_price DECIMAL(10, 2),
  percent_change DECIMAL(5, 2),
  volume INTEGER,
  sector TEXT,
  market_cap TEXT,
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scraping_jobs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_type TEXT NOT NULL,
  stock_id VARCHAR REFERENCES stocks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS results_calendar (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  announcement_date DATE NOT NULL,
  result_status TEXT NOT NULL DEFAULT 'waiting',
  quarter TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  pdf_url TEXT,
  pdf_downloaded_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quarterly_results (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
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
  revenue_qoq DECIMAL(5, 2),
  profit_qoq DECIMAL(5, 2),
  eps_qoq DECIMAL(5, 2),
  operating_profit_qoq DECIMAL(5, 2),
  revenue_yoy DECIMAL(5, 2),
  profit_yoy DECIMAL(5, 2),
  eps_yoy DECIMAL(5, 2),
  operating_profit_yoy DECIMAL(5, 2),
  published_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candlestick_data (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open DECIMAL(10, 2) NOT NULL,
  high DECIMAL(10, 2) NOT NULL,
  low DECIMAL(10, 2) NOT NULL,
  close DECIMAL(10, 2) NOT NULL,
  volume INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_volume (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  delivery_quantity INTEGER NOT NULL,
  traded_quantity INTEGER NOT NULL,
  delivery_percentage DECIMAL(5, 2) NOT NULL
);

-- Step 2: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_next_run ON scraping_jobs(next_run);
CREATE INDEX IF NOT EXISTS idx_results_calendar_date ON results_calendar(announcement_date);
CREATE INDEX IF NOT EXISTS idx_results_calendar_status ON results_calendar(result_status);
CREATE INDEX IF NOT EXISTS idx_results_calendar_stock_id ON results_calendar(stock_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_results_stock_id ON quarterly_results(stock_id);
CREATE INDEX IF NOT EXISTS idx_candlestick_stock_date ON candlestick_data(stock_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_volume_stock_date ON delivery_volume(stock_id, date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_candlestick_unique ON candlestick_data(stock_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_volume_unique ON delivery_volume(stock_id, date);

-- Step 3: Insert seed data
-- ============================================

-- Admin and test users
INSERT INTO users (email, password, role, subscription_status, demo_expires_at) VALUES
  ('admin@nse-platform.com', 'admin123', 'admin', 'active', NULL),
  ('client@example.com', 'client123', 'client', 'active', NULL),
  ('demo@example.com', 'demo123', 'client', 'demo', NOW() + INTERVAL '7 days'),
  ('inactive@example.com', 'inactive123', 'client', 'inactive', NULL)
ON CONFLICT (email) DO NOTHING;

-- Sample stocks
INSERT INTO stocks (symbol, company_name, current_price, percent_change, volume, sector, market_cap) VALUES
  ('TATASTEEL', 'Tata Steel Limited', 145.30, 2.4, 8450000, 'Steel', '₹1.8L Cr'),
  ('RELIANCE', 'Reliance Industries Ltd', 2456.75, 1.8, 12000000, 'Oil & Gas', '₹16.6L Cr'),
  ('INFY', 'Infosys Limited', 1567.20, -0.9, 6200000, 'IT', '₹6.5L Cr'),
  ('TCS', 'Tata Consultancy Services', 3542.80, 3.2, 4100000, 'IT', '₹12.9L Cr'),
  ('HDFCBANK', 'HDFC Bank Limited', 1623.45, 0.7, 9800000, 'Banking', '₹12.4L Cr'),
  ('ICICIBANK', 'ICICI Bank Limited', 978.60, 1.5, 11500000, 'Banking', '₹6.9L Cr'),
  ('BHARTIARTL', 'Bharti Airtel Limited', 1245.90, -1.2, 7300000, 'Telecom', '₹7.3L Cr'),
  ('ITC', 'ITC Limited', 456.30, 0.5, 15600000, 'FMCG', '₹5.7L Cr'),
  ('WIPRO', 'Wipro Limited', 487.25, -2.1, 5900000, 'IT', '₹2.6L Cr'),
  ('AXISBANK', 'Axis Bank Limited', 1089.70, 2.8, 8700000, 'Banking', '₹3.4L Cr')
ON CONFLICT (symbol) DO NOTHING;

-- Sample results calendar (generates random dates for next 14 days)
INSERT INTO results_calendar (stock_id, announcement_date, result_status, quarter, fiscal_year)
SELECT 
  s.id,
  CURRENT_DATE + (random() * 14)::integer,
  CASE 
    WHEN random() < 0.33 THEN 'waiting'
    WHEN random() < 0.66 THEN 'received'
    ELSE 'ready'
  END,
  'Q2',
  'FY2025'
FROM stocks s
WHERE NOT EXISTS (
  SELECT 1 FROM results_calendar rc WHERE rc.stock_id = s.id
);

-- Success message
SELECT 'Database setup complete! ✅' as status;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as stock_count FROM stocks;
SELECT COUNT(*) as calendar_count FROM results_calendar;
