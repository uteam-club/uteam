CREATE TABLE IF NOT EXISTS "SurveySchedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teamId" uuid NOT NULL,
	"surveyType" varchar(32) DEFAULT 'morning' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sendTime" varchar(8) DEFAULT '08:00' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "Team" ADD COLUMN "timezone" varchar(64) DEFAULT 'Europe/Moscow' NOT NULL;--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "language" varchar(10);