CREATE TABLE IF NOT EXISTS "ExerciseTagToExercise" (
	"exerciseId" uuid NOT NULL,
	"exerciseTagId" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ExerciseTagToExercise" ADD CONSTRAINT "ExerciseTagToExercise_exerciseId_Exercise_id_fk" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ExerciseTagToExercise" ADD CONSTRAINT "ExerciseTagToExercise_exerciseTagId_ExerciseTag_id_fk" FOREIGN KEY ("exerciseTagId") REFERENCES "ExerciseTag"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
