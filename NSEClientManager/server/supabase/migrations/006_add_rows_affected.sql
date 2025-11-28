-- 006_add_rows_affected.sql
-- Adds rows_affected column to job_metrics for richer monitoring
ALTER TABLE job_metrics ADD COLUMN IF NOT EXISTS rows_affected INTEGER;
