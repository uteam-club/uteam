ALTER TABLE "Team" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "Team" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "Team" ALTER COLUMN "clubId" SET DATA TYPE uuid USING "clubId"::uuid;--> statement-breakpoint
ALTER TABLE "Player" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "Player" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "Player" ALTER COLUMN "teamId" SET DATA TYPE uuid USING "teamId"::uuid;--> statement-breakpoint
ALTER TABLE "MorningSurveyResponse" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "MorningSurveyResponse" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "MorningSurveyResponse" ALTER COLUMN "playerId" SET DATA TYPE uuid USING "playerId"::uuid;--> statement-breakpoint
ALTER TABLE "MorningSurveyResponse" ALTER COLUMN "surveyId" SET DATA TYPE uuid USING "surveyId"::uuid;--> statement-breakpoint
ALTER TABLE "MorningSurveyResponse" ALTER COLUMN "tenantId" SET DATA TYPE uuid USING "tenantId"::uuid;--> statement-breakpoint
ALTER TABLE "Survey" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "Survey" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "Survey" ALTER COLUMN "tenantId" SET DATA TYPE uuid USING "tenantId"::uuid;--> statement-breakpoint
ALTER TABLE "SurveySchedule" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "SurveySchedule" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "SurveySchedule" ALTER COLUMN "teamId" SET DATA TYPE uuid USING "teamId"::uuid;