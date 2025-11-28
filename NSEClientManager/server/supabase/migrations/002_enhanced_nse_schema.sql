-- Migration: Enhanced NSE Schema
-- Created: 2025-11-17
-- Description: Add scraping jobs, enhanced quarterly results, and NSE-specific fields

-- Drop existing tables if they exist (for fresh install)
DROP TABLE IF EXISTS delivery_volume CASCADE;
DROP TABLE IF EXISTS candlestick_data CASCADE;
DROP TABLE IF EXISTS quarterly_results CASCADE;
DROP TABLE IF EXISTS results_calendar CASCADE;
DROP TABLE IF EXISTS scraping_jobs CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table with subscription and role management
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client', -- 'admin' or 'client'
  subscription_status TEXT NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'demo'
  demo_expires_at TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Stocks/Companies table
CREATE TABLE stocks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  current_price DECIMAL(10, 2),
  percent_change DECIMAL(5, 2),
  volume INTEGER,
  sector TEXT,
  market_cap TEXT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_sector ON stocks(sector);

-- Scraping Jobs - track NSE data fetching status
CREATE TABLE scraping_jobs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL, -- 'results', 'candlestick', 'delivery', 'calendar'
  stock_id VARCHAR REFERENCES stocks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX idx_scraping_jobs_next_run ON scraping_jobs(next_run);

-- Results Calendar - upcoming quarterly result announcements
CREATE TABLE results_calendar (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  announcement_date DATE NOT NULL,
  result_status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'received', 'ready'
  quarter TEXT NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4'
  fiscal_year TEXT NOT NULL,
  pdf_url TEXT, -- NSE PDF download URL
  pdf_downloaded_at TIMESTAMP
);

CREATE INDEX idx_results_calendar_date ON results_calendar(announcement_date);
CREATE INDEX idx_results_calendar_status ON results_calendar(result_status);
CREATE INDEX idx_results_calendar_stock_id ON results_calendar(stock_id);

-- Quarterly Results data with enhanced metrics
CREATE TABLE quarterly_results (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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
  -- QoQ comparison (%)
  revenue_qoq DECIMAL(5, 2),
  profit_qoq DECIMAL(5, 2),
  eps_qoq DECIMAL(5, 2),
  operating_profit_qoq DECIMAL(5, 2),
  -- YoY comparison (%)
  revenue_yoy DECIMAL(5, 2),
  profit_yoy DECIMAL(5, 2),
  eps_yoy DECIMAL(5, 2),
  operating_profit_yoy DECIMAL(5, 2),
  published_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quarterly_results_stock_id ON quarterly_results(stock_id);
CREATE INDEX idx_quarterly_results_quarter ON quarterly_results(quarter, fiscal_year);

-- Candlestick data for charts
CREATE TABLE candlestick_data (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open DECIMAL(10, 2) NOT NULL,
  high DECIMAL(10, 2) NOT NULL,
  low DECIMAL(10, 2) NOT NULL,
  close DECIMAL(10, 2) NOT NULL,
  volume INTEGER NOT NULL
);

CREATE INDEX idx_candlestick_stock_date ON candlestick_data(stock_id, date DESC);
CREATE UNIQUE INDEX idx_candlestick_unique ON candlestick_data(stock_id, date);

-- Delivery volume data
CREATE TABLE delivery_volume (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  delivery_quantity INTEGER NOT NULL,
  traded_quantity INTEGER NOT NULL,
  delivery_percentage DECIMAL(5, 2) NOT NULL
);

CREATE INDEX idx_delivery_volume_stock_date ON delivery_volume(stock_id, date DESC);
CREATE UNIQUE INDEX idx_delivery_volume_unique ON delivery_volume(stock_id, date);

-- Seed data: Admin user
INSERT INTO users (id, email, password, role, subscription_status) VALUES
  ('admin-001', 'admin@nse-platform.com', 'admin123', 'admin', 'active');

-- Seed data: Test client users
INSERT INTO users (email, password, role, subscription_status, demo_expires_at) VALUES
  ('client@example.com', 'client123', 'client', 'active', NULL),
  ('demo@example.com', 'demo123', 'client', 'demo', NOW() + INTERVAL '7 days'),
  ('inactive@example.com', 'inactive123', 'client', 'inactive', NULL);

-- Seed data: Sample stocks
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
  ('AXISBANK', 'Axis Bank Limited', 1089.70, 2.8, 8700000, 'Banking', '₹3.4L Cr');

-- Seed data: Sample results calendar (next 14 days)
DO $$
DECLARE
  stock_record RECORD;
  random_days INTEGER;
BEGIN
  FOR stock_record IN SELECT id, symbol FROM stocks LOOP
    random_days := floor(random() * 14)::INTEGER;
    INSERT INTO results_calendar (stock_id, announcement_date, result_status, quarter, fiscal_year)
    VALUES (
      stock_record.id,
      CURRENT_DATE + random_days,
      CASE 
        WHEN random() < 0.33 THEN 'waiting'
        WHEN random() < 0.66 THEN 'received'
        ELSE 'ready'
      END,
      'Q2',
      'FY2025'
    );
  END LOOP;
END $$;

-- Grant permissions (for Supabase)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE results_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE candlestick_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_volume ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your auth setup)
CREATE POLICY "Allow read access to all authenticated users" ON stocks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to all authenticated users" ON results_calendar
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to all authenticated users" ON quarterly_results
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to all authenticated users" ON candlestick_data
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to all authenticated users" ON delivery_volume
  FOR SELECT TO authenticated USING (true);
