-- Add higher_is_better column to fitness_test
ALTER TABLE "fitness_test"
ADD COLUMN IF NOT EXISTS "higher_is_better" boolean NOT NULL DEFAULT true;

-- Backfill is not needed due to DEFAULT true, but ensure not null for existing rows
UPDATE "fitness_test" SET "higher_is_better" = COALESCE("higher_is_better", true);


