DROP TABLE "Event";--> statement-breakpoint
DROP TABLE "Schedule";--> statement-breakpoint
DROP TABLE "ScheduleEvent";--> statement-breakpoint
ALTER TABLE "Training" ALTER COLUMN "date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "Match" ALTER COLUMN "date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "Team" ADD COLUMN "teamType" varchar(16) DEFAULT 'academy' NOT NULL;--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "contractStartDate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "contractEndDate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "passportData" varchar(255);--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "insuranceNumber" varchar(255);--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "visaExpiryDate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "format1" varchar(32);--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "formation1" varchar(32);--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "positionIndex1" integer;--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "format2" varchar(32);--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "formation2" varchar(32);--> statement-breakpoint
ALTER TABLE "Player" ADD COLUMN "positionIndex2" integer;--> statement-breakpoint
ALTER TABLE "fitness_test" ADD COLUMN "description" varchar(512);--> statement-breakpoint
ALTER TABLE "Team" DROP COLUMN IF EXISTS "timezone";