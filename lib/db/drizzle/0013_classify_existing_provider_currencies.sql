-- Older imports stored currency in this JSON structure. Preserve their amounts
-- and reclassify explicitly non-USD events so USD totals omit them.
UPDATE "system_activity_events"
SET "event_type" = 'revenue_unconverted'
WHERE "event_type" = 'revenue'
  AND "revenue_provider" IS NOT NULL
  AND substring("metadata" from '"currency"[[:space:]]*:[[:space:]]*"([[:alpha:]]{3})"') !~* '^usd$';