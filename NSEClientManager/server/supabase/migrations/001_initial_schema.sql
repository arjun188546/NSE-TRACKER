-- NSE Stock Analysis Platform - Initial Schema Migration
-- This migration creates all necessary tables for the platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with subscription management
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'demo')),
  demo_expires_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stocks/Companies table
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  current_price DECIMAL(10, 2),
  percent_change DECIMAL(5, 2),
  volume INTEGER,
  sector TEXT,
  market_cap TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Results Calendar - upcoming quarterly result announcements
CREATE TABLE results_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  announcement_date DATE NOT NULL,
  result_status TEXT NOT NULL DEFAULT 'waiting' CHECK (result_status IN ('waiting', 'received', 'ready')),
  quarter TEXT NOT NULL,
  fiscal_year TEXT NOT NULL
);

-- Quarterly Results data
CREATE TABLE quarterly_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  revenue DECIMAL(15, 2),
  profit DECIMAL(15, 2),
  eps DECIMAL(10, 4),
  revenue_qoq DECIMAL(5, 2),
  profit_qoq DECIMAL(5, 2),
  eps_qoq DECIMAL(5, 2),
  revenue_yoy DECIMAL(5, 2),
  profit_yoy DECIMAL(5, 2),
  eps_yoy DECIMAL(5, 2),
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candlestick data for charts
CREATE TABLE candlestick_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open DECIMAL(10, 2) NOT NULL,
  high DECIMAL(10, 2) NOT NULL,
  low DECIMAL(10, 2) NOT NULL,
  close DECIMAL(10, 2) NOT NULL,
  volume INTEGER NOT NULL
);

-- Delivery volume data
CREATE TABLE delivery_volume (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  delivery_quantity INTEGER NOT NULL,
  traded_quantity INTEGER NOT NULL,
  delivery_percentage DECIMAL(5, 2) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_results_calendar_date ON results_calendar(announcement_date);
CREATE INDEX idx_results_calendar_stock ON results_calendar(stock_id);
CREATE INDEX idx_quarterly_results_stock ON quarterly_results(stock_id);
CREATE INDEX idx_candlestick_stock_date ON candlestick_data(stock_id, date);
CREATE INDEX idx_delivery_volume_stock_date ON delivery_volume(stock_id, date);
CREATE INDEX idx_users_email ON users(email);

-- Insert default admin user (password should be hashed in production)
INSERT INTO users (email, password, role, subscription_status)
VALUES ('admin@nse-platform.com', 'admin123', 'admin', 'active');
