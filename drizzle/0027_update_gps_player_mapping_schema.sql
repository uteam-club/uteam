-- Update GPS Player Mapping schema to support nullable playerId, isManual, and similarity
-- Migration: 0027_update_gps_player_mapping_schema

-- Make playerId nullable for "Без привязки" option
ALTER TABLE "GpsPlayerMapping" ALTER COLUMN "playerId" DROP NOT NULL;

-- Add isManual column with default false
ALTER TABLE "GpsPlayerMapping" ADD COLUMN "isManual" boolean DEFAULT false NOT NULL;

-- Add similarity column (nullable)
ALTER TABLE "GpsPlayerMapping" ADD COLUMN "similarity" integer;

-- Add unique constraint to prevent duplicate mappings for same report/row
CREATE UNIQUE INDEX "gps_player_mapping_report_row_unique" ON "GpsPlayerMapping" ("gpsReportId", "rowIndex");
