-- Add profileSnapshot, canonVersion, and importMeta to GpsReport table
-- Also add index on profileId for performance

-- Add new columns to GpsReport
ALTER TABLE "GpsReport" 
ADD COLUMN "profileSnapshot" jsonb,
ADD COLUMN "canonVersion" text,
ADD COLUMN "importMeta" jsonb NOT NULL DEFAULT '{}';

-- Add index on profileId for faster lookups
CREATE INDEX "gps_report_profile_id_idx" ON "GpsReport" ("profileId");
