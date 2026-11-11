-- Apply by hand (psql "$DATABASE_URL" -f <this file>); idempotent and non-destructive.
-- Do not use `drizzle-kit push` for this: it offers to drop the untracked
-- scheduler_state table (see .agents/memory/drizzle-kit-push-hazard.md).

-- Health monitoring: a dimension with no data source is stored as NULL
-- ("not measured") instead of a neutral-looking default score.
ALTER TABLE system_health_scores
  ALTER COLUMN overall_score DROP NOT NULL,
  ALTER COLUMN connection_score DROP NOT NULL,
  ALTER COLUMN hosting_score DROP NOT NULL,
  ALTER COLUMN api_score DROP NOT NULL,
  ALTER COLUMN seo_score DROP NOT NULL,
  ALTER COLUMN performance_score DROP NOT NULL,
  ALTER COLUMN security_score DROP NOT NULL,
  ALTER COLUMN revenue_score DROP NOT NULL,
  ALTER COLUMN automation_score DROP NOT NULL;

ALTER TABLE business_health_metrics
  ALTER COLUMN overall_score DROP NOT NULL,
  ALTER COLUMN connection_score DROP NOT NULL,
  ALTER COLUMN hosting_score DROP NOT NULL,
  ALTER COLUMN api_score DROP NOT NULL,
  ALTER COLUMN seo_score DROP NOT NULL,
  ALTER COLUMN performance_score DROP NOT NULL,
  ALTER COLUMN security_score DROP NOT NULL,
  ALTER COLUMN revenue_score DROP NOT NULL,
  ALTER COLUMN automation_score DROP NOT NULL;

-- executive_observations and observation_signals both declared an index named
-- obs_signal_type_idx; index names are schema-global, so a fresh schema push
-- failed. The observation_signals index is now obs_signal_signal_type_idx.
CREATE INDEX IF NOT EXISTS obs_signal_signal_type_idx ON observation_signals (signal_type);
