-- ============================================
-- 005_scraper_job_metrics.sql
-- Stores each run of scheduled scraper jobs
-- ============================================

CREATE TABLE IF NOT EXISTS job_metrics (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index to quickly find recent runs per job
CREATE INDEX IF NOT EXISTS idx_job_metrics_job_name_started_at
  ON job_metrics (job_name, started_at DESC);

-- Index to filter failures fast
CREATE INDEX IF NOT EXISTS idx_job_metrics_success
  ON job_metrics (success);

-- Optional retention policy hint (manual):
-- DELETE FROM job_metrics WHERE started_at < now() - interval '30 days';
