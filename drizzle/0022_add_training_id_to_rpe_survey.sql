-- Migration: Add trainingId to RPESurveyResponse for linking RPE surveys to specific trainings

-- Add trainingId column to RPESurveyResponse table
ALTER TABLE "RPESurveyResponse" 
ADD COLUMN "trainingId" uuid;

-- Add foreign key constraint to Training table
ALTER TABLE "RPESurveyResponse" 
ADD CONSTRAINT "RPESurveyResponse_trainingId_fkey" 
FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX "idx_rpe_survey_response_training_id" ON "RPESurveyResponse"("trainingId");

-- Add composite index for common queries (player + training)
CREATE INDEX "idx_rpe_survey_response_player_training" ON "RPESurveyResponse"("playerId", "trainingId");
