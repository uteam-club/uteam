ALTER TABLE "Team" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Team" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Team" ALTER COLUMN "clubId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Player" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Player" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Player" ALTER COLUMN "teamId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "MorningSurveyResponse" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "MorningSurveyResponse" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "MorningSurveyResponse" ALTER COLUMN "playerId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "MorningSurveyResponse" ALTER COLUMN "surveyId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "MorningSurveyResponse" ALTER COLUMN "tenantId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Survey" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Survey" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "Survey" ALTER COLUMN "tenantId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "SurveySchedule" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "SurveySchedule" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "SurveySchedule" ALTER COLUMN "teamId" SET DATA TYPE varchar(255);