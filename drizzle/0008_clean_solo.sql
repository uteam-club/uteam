CREATE TABLE IF NOT EXISTS "fitness_test" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"type" varchar(64) NOT NULL,
	"unit" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fitness_test_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fitness_test" ADD CONSTRAINT "fitness_test_club_id_Club_id_fk" FOREIGN KEY ("club_id") REFERENCES "Club"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fitness_test" ADD CONSTRAINT "fitness_test_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fitness_test_result" ADD CONSTRAINT "fitness_test_result_test_id_fitness_test_id_fk" FOREIGN KEY ("test_id") REFERENCES "fitness_test"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fitness_test_result" ADD CONSTRAINT "fitness_test_result_player_id_Player_id_fk" FOREIGN KEY ("player_id") REFERENCES "Player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fitness_test_result" ADD CONSTRAINT "fitness_test_result_team_id_Team_id_fk" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fitness_test_result" ADD CONSTRAINT "fitness_test_result_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
