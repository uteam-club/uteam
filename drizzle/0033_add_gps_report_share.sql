-- GPS Report Share table
CREATE TABLE IF NOT EXISTS "GpsReportShare" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reportId" uuid NOT NULL REFERENCES "GpsReport"("id") ON DELETE CASCADE,
  "profileId" uuid NOT NULL,
  "createdById" uuid NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "expiresAt" timestamp with time zone NOT NULL,
  "revokedAt" timestamp with time zone,
  "views" integer DEFAULT 0 NOT NULL,
  "lastViewedAt" timestamp with time zone,
  "options" jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_gps_report_share_report" ON "GpsReportShare"("reportId");
CREATE INDEX IF NOT EXISTS "idx_gps_report_share_profile" ON "GpsReportShare"("profileId");
CREATE INDEX IF NOT EXISTS "idx_gps_report_share_expires" ON "GpsReportShare"("expiresAt");


