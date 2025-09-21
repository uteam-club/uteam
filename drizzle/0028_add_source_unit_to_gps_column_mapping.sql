-- Add sourceUnit column to GpsColumnMapping table
-- This column will store the original unit of measurement from GPS files

ALTER TABLE "GpsColumnMapping" 
ADD COLUMN "sourceUnit" VARCHAR(50);

-- Add comment to explain the column purpose
COMMENT ON COLUMN "GpsColumnMapping"."sourceUnit" IS 'Original unit of measurement from GPS file (e.g., km/h, m/s, min)';
