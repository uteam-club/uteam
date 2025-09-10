BEGIN;
ALTER TABLE "GpsReport" ADD COLUMN IF NOT EXISTS "profileSnapshot" jsonb;
ALTER TABLE "GpsReport" ADD COLUMN IF NOT EXISTS "canonVersion"   text;
ALTER TABLE "GpsReport" ADD COLUMN IF NOT EXISTS "importMeta"     jsonb;
ALTER TABLE "GpsReport" ALTER COLUMN "importMeta" SET DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS "idx_GpsReport_profileId" ON "GpsReport" ("profileId");
COMMIT;
