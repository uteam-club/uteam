-- GPS Foundation Migration: Add profileSnapshot and canonVersion to GpsReport
-- Generated: 2024-12-19
-- Purpose: Enable stable visualization and version tracking for GPS reports

-- Add new columns to GpsReport table
ALTER TABLE "GpsReport" 
ADD COLUMN IF NOT EXISTS "profileSnapshot" jsonb,
ADD COLUMN IF NOT EXISTS "canonVersion" text,
ADD COLUMN IF NOT EXISTS "importMeta" jsonb NOT NULL DEFAULT '{}';

-- Add index on profileId for faster lookups
CREATE INDEX IF NOT EXISTS "gps_report_profile_id_idx" ON "GpsReport" ("profileId");

-- Migration completed successfully
-- New columns:
-- - profileSnapshot: Stores column mapping snapshot at import time
-- - canonVersion: Tracks canonical metrics registry version
-- - importMeta: Stores import metadata (file size, warnings, etc.)
-- - Index: Improves performance for profile usage queries
