ALTER TABLE "TrainingExercise" ADD COLUMN "series" integer;--> statement-breakpoint
ALTER TABLE "TrainingExercise" ADD COLUMN "repetitions" integer;--> statement-breakpoint
ALTER TABLE "TrainingExercise" ADD COLUMN "repetitionTime" integer;--> statement-breakpoint
ALTER TABLE "TrainingExercise" ADD COLUMN "pauseBetweenRepetitions" integer;--> statement-breakpoint
ALTER TABLE "TrainingExercise" ADD COLUMN "pauseBetweenSeries" integer;--> statement-breakpoint
ALTER TABLE "RPESurveyResponse" ADD COLUMN "durationMinutes" integer;