-- Add user_portfolio table for watchlist functionality
-- Migration to add portfolio/watchlist support

CREATE TABLE IF NOT EXISTS user_portfolio (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stock_id VARCHAR NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, stock_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_portfolio_user_id ON user_portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolio_stock_id ON user_portfolio(stock_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolio_added_at ON user_portfolio(added_at);

-- Enable Row Level Security
ALTER TABLE user_portfolio ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to only see their own portfolio
CREATE POLICY "Users can view their own portfolio" ON user_portfolio
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert into their own portfolio" ON user_portfolio
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete from their own portfolio" ON user_portfolio
  FOR DELETE USING (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE user_portfolio IS 'User watchlist/portfolio - tracks which stocks users are following';