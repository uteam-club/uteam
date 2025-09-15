-- Add display_unit column to GpsColumnMapping table
ALTER TABLE "GpsColumnMapping" ADD COLUMN IF NOT EXISTS "display_unit" varchar(50);
