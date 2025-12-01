-- Create results_calendar table for tracking upcoming financial results

CREATE TABLE IF NOT EXISTS results_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    purpose VARCHAR(100) NOT NULL, -- Financial Results, Fund Raising, etc.
    details TEXT, -- Full announcement details
    announcement_date DATE NOT NULL,
    quarter VARCHAR(10), -- Q1, Q2, Q3, Q4 (nullable for non-financial announcements)
    fiscal_year VARCHAR(10), -- FY2526, etc. (nullable for non-financial announcements)
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    pdf_url TEXT,
    extraction_completed BOOLEAN DEFAULT FALSE,
    extracted_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_results_calendar_date ON results_calendar(announcement_date);
CREATE INDEX IF NOT EXISTS idx_results_calendar_status ON results_calendar(status);
CREATE INDEX IF NOT EXISTS idx_results_calendar_symbol ON results_calendar(symbol);
CREATE INDEX IF NOT EXISTS idx_results_calendar_purpose ON results_calendar(purpose);
CREATE INDEX IF NOT EXISTS idx_results_calendar_financial ON results_calendar(quarter, fiscal_year) WHERE quarter IS NOT NULL;

-- Add comments
COMMENT ON TABLE results_calendar IS 'Tracks upcoming NSE corporate announcements including financial results';
COMMENT ON COLUMN results_calendar.purpose IS 'Type of announcement: Financial Results, Fund Raising, Dividend, etc.';
COMMENT ON COLUMN results_calendar.details IS 'Full announcement description from NSE website';
COMMENT ON COLUMN results_calendar.quarter IS 'Fiscal quarter (Q1-Q4) for financial results only';
COMMENT ON COLUMN results_calendar.fiscal_year IS 'Fiscal year (FY2526) for financial results only';