-- GPS Foundation Migration: Add profileSnapshot and canonVersion to GpsReport
-- Generated: 2024-12-19 (SAFE VERSION)
-- Purpose: Enable stable visualization and version tracking for GPS reports

-- Step 1: Add new columns (all nullable initially)
ALTER TABLE "GpsReport" 
ADD COLUMN IF NOT EXISTS "profileSnapshot" jsonb,
ADD COLUMN IF NOT EXISTS "canonVersion" text,
ADD COLUMN IF NOT EXISTS "importMeta" jsonb;

-- Step 2: Set default value for importMeta (safe for existing rows)
UPDATE "GpsReport" 
SET "importMeta" = '{}'::jsonb 
WHERE "importMeta" IS NULL;

-- Step 3: Add NOT NULL constraint after setting defaults
ALTER TABLE "GpsReport" 
ALTER COLUMN "importMeta" SET NOT NULL,
ALTER COLUMN "importMeta" SET DEFAULT '{}'::jsonb;

-- Step 4: Add index on profileId for faster lookups
CREATE INDEX IF NOT EXISTS "gps_report_profile_id_idx" ON "GpsReport" ("profileId");

-- Migration completed successfully
-- New columns:
-- - profileSnapshot: Stores column mapping snapshot at import time (nullable)
-- - canonVersion: Tracks canonical metrics registry version (nullable)
-- - importMeta: Stores import metadata (NOT NULL, default '{}')
-- - Index: Improves performance for profile usage queries
