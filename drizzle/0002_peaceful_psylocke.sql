CREATE TABLE IF NOT EXISTS "exercise_tag_to_exercise" (
	"exerciseId" uuid NOT NULL,
	"exerciseTagId" uuid NOT NULL
);
--> statement-breakpoint
DROP TABLE "ExerciseTagToExercise";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "exercise_tag_to_exercise" ADD CONSTRAINT "exercise_tag_to_exercise_exerciseId_Exercise_id_fk" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "exercise_tag_to_exercise" ADD CONSTRAINT "exercise_tag_to_exercise_exerciseTagId_ExerciseTag_id_fk" FOREIGN KEY ("exerciseTagId") REFERENCES "ExerciseTag"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
