-- Add foreign key constraints to user_portfolio table
ALTER TABLE user_portfolio 
ADD CONSTRAINT fk_user_portfolio_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_portfolio 
ADD CONSTRAINT fk_user_portfolio_stock 
FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE;