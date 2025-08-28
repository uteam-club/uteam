-- Safe migration to add trainingId to RPESurveyResponse
-- This script checks if the column exists before adding it

DO $$ 
BEGIN
    -- Check if trainingId column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'RPESurveyResponse' 
        AND column_name = 'trainingId'
    ) THEN
        -- Add trainingId column (nullable for existing records)
        ALTER TABLE "RPESurveyResponse" 
        ADD COLUMN "trainingId" uuid;
        
        RAISE NOTICE 'Added trainingId column to RPESurveyResponse';
    ELSE
        RAISE NOTICE 'trainingId column already exists in RPESurveyResponse';
    END IF;
    
    -- Check if foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'RPESurveyResponse_trainingId_fkey'
        AND table_name = 'RPESurveyResponse'
    ) THEN
        -- Add foreign key constraint to Training table
        ALTER TABLE "RPESurveyResponse" 
        ADD CONSTRAINT "RPESurveyResponse_trainingId_fkey" 
        FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint for trainingId';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
    
    -- Check if index exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_rpe_survey_response_training_id'
    ) THEN
        -- Add index for better query performance
        CREATE INDEX "idx_rpe_survey_response_training_id" 
        ON "RPESurveyResponse"("trainingId");
        
        RAISE NOTICE 'Added index for trainingId';
    ELSE
        RAISE NOTICE 'Index for trainingId already exists';
    END IF;
    
    -- Check if composite index exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_rpe_survey_response_player_training'
    ) THEN
        -- Add composite index for common queries (player + training)
        CREATE INDEX "idx_rpe_survey_response_player_training" 
        ON "RPESurveyResponse"("playerId", "trainingId");
        
        RAISE NOTICE 'Added composite index for playerId and trainingId';
    ELSE
        RAISE NOTICE 'Composite index already exists';
    END IF;
    
END $$;
