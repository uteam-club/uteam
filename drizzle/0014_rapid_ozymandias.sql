ALTER TABLE "Training" ALTER COLUMN "date" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "Match" ALTER COLUMN "date" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "Match" ALTER COLUMN "time" SET DATA TYPE varchar(5);--> statement-breakpoint
ALTER TABLE "Training" ADD COLUMN "time" varchar(5) NOT NULL;