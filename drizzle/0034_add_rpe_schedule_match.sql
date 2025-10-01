-- Create RPEScheduleMatch table
CREATE TABLE IF NOT EXISTS "RPEScheduleMatch" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "matchId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "scheduledTime" time NOT NULL,
    "status" varchar(20) DEFAULT 'scheduled' NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "sentAt" timestamp with time zone,
    "createdById" uuid NOT NULL,
    "recipientsConfig" text
);

-- FKs
ALTER TABLE "RPEScheduleMatch"
ADD CONSTRAINT "RPEScheduleMatch_matchId_fkey"
FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE;

ALTER TABLE "RPEScheduleMatch"
ADD CONSTRAINT "RPEScheduleMatch_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_rpe_schedule_match_match_id" ON "RPEScheduleMatch"("matchId");
CREATE INDEX IF NOT EXISTS "idx_rpe_schedule_match_team_id" ON "RPEScheduleMatch"("teamId");
CREATE INDEX IF NOT EXISTS "idx_rpe_schedule_match_status" ON "RPEScheduleMatch"("status");
CREATE INDEX IF NOT EXISTS "idx_rpe_schedule_match_scheduled_time" ON "RPEScheduleMatch"("scheduledTime");

-- Unique active schedule per match
CREATE UNIQUE INDEX IF NOT EXISTS "idx_rpe_schedule_match_unique_match"
ON "RPEScheduleMatch"("matchId") WHERE "status" != 'cancelled';


