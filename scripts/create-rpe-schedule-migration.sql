-- Migration: Create RPESchedule table for managing RPE survey scheduling

-- Create RPESchedule table
CREATE TABLE "RPESchedule" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "trainingId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "scheduledTime" time NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'scheduled',
    "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
    "sentAt" timestamp with time zone,
    "createdById" uuid NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "RPESchedule" 
ADD CONSTRAINT "RPESchedule_trainingId_fkey" 
FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE;

ALTER TABLE "RPESchedule" 
ADD CONSTRAINT "RPESchedule_teamId_fkey" 
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX "idx_rpe_schedule_training_id" ON "RPESchedule"("trainingId");
CREATE INDEX "idx_rpe_schedule_team_id" ON "RPESchedule"("teamId");
CREATE INDEX "idx_rpe_schedule_status" ON "RPESchedule"("status");
CREATE INDEX "idx_rpe_schedule_scheduled_time" ON "RPESchedule"("scheduledTime");

-- Add unique constraint to prevent duplicate schedules for same training
CREATE UNIQUE INDEX "idx_rpe_schedule_unique_training" ON "RPESchedule"("trainingId") WHERE "status" != 'cancelled';
