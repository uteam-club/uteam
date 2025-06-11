DO $$ BEGIN
 CREATE TYPE "Role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'COACH', 'MEMBER', 'SCOUT', 'DOCTOR', 'DIRECTOR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Club" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"subdomain" varchar(255) NOT NULL,
	"logoUrl" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"broadcastTime" varchar(10),
	CONSTRAINT "Club_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"password" varchar(255) NOT NULL,
	"role" "Role" DEFAULT 'MEMBER' NOT NULL,
	"emailVerified" timestamp with time zone,
	"imageUrl" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	"order" integer DEFAULT 999 NOT NULL,
	"timezone" varchar(64) DEFAULT 'Europe/Moscow' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"startDate" timestamp with time zone NOT NULL,
	"endDate" timestamp with time zone,
	"location" varchar(255),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	"teamId" uuid,
	"createdById" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Training" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"date" timestamp with time zone NOT NULL,
	"time" varchar(10) NOT NULL,
	"location" varchar(255),
	"notes" text,
	"status" varchar(20) DEFAULT 'SCHEDULED' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	"teamId" uuid NOT NULL,
	"categoryId" uuid NOT NULL,
	"createdById" uuid NOT NULL,
	"type" varchar(20) DEFAULT 'TRAINING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstName" varchar(255) NOT NULL,
	"lastName" varchar(255) NOT NULL,
	"middleName" varchar(255),
	"number" integer,
	"position" varchar(255),
	"strongFoot" varchar(255),
	"dateOfBirth" timestamp with time zone,
	"academyJoinDate" timestamp with time zone,
	"nationality" varchar(255),
	"imageUrl" text,
	"status" varchar(255),
	"birthCertificateNumber" varchar(255),
	"pinCode" varchar(255) NOT NULL,
	"telegramId" varchar(255),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"teamId" uuid NOT NULL,
	CONSTRAINT "Player_telegramId_unique" UNIQUE("telegramId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MediaItem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"url" text NOT NULL,
	"size" integer NOT NULL,
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	"eventId" uuid,
	"uploadedById" uuid NOT NULL,
	"exerciseId" uuid,
	"publicUrl" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "TrainingCategory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Exercise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"authorId" uuid NOT NULL,
	"clubId" uuid NOT NULL,
	"categoryId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"length" double precision,
	"width" double precision
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ExerciseCategory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ExerciseTag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	"exerciseCategoryId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "TrainingExercise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position" integer NOT NULL,
	"trainingId" uuid NOT NULL,
	"exerciseId" uuid NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "PlayerDocument" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"url" text NOT NULL,
	"publicUrl" text,
	"size" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"playerId" uuid NOT NULL,
	"clubId" uuid NOT NULL,
	"uploadedById" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "TeamCoach" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teamId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" varchar(255),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "PlayerAttendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playerId" uuid NOT NULL,
	"trainingId" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'TRAINED' NOT NULL,
	"comment" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competitionType" varchar(50) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"time" varchar(10) NOT NULL,
	"isHome" boolean NOT NULL,
	"teamId" uuid NOT NULL,
	"opponentName" varchar(255) NOT NULL,
	"teamGoals" integer DEFAULT 0 NOT NULL,
	"opponentGoals" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	"formation" varchar(255),
	"gameFormat" varchar(255),
	"markerColor" varchar(255),
	"notes" text,
	"playerPositions" text,
	"positionAssignments" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "PlayerMatchStat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matchId" uuid NOT NULL,
	"playerId" uuid NOT NULL,
	"isStarter" boolean DEFAULT false NOT NULL,
	"minutesPlayed" integer DEFAULT 0 NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"yellowCards" integer DEFAULT 0 NOT NULL,
	"redCards" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teamId" uuid NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ScheduleEvent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduleId" uuid NOT NULL,
	"type" varchar(50) DEFAULT 'TRAINING' NOT NULL,
	"time" varchar(10) NOT NULL,
	"description" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MorningSurveyResponse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playerId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"readAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"sleepDuration" double precision NOT NULL,
	"sleepQuality" integer NOT NULL,
	"recovery" integer NOT NULL,
	"mood" integer NOT NULL,
	"muscleCondition" integer NOT NULL,
	"surveyId" uuid NOT NULL,
	"tenantId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "PainArea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"surveyId" uuid NOT NULL,
	"areaName" varchar(255) NOT NULL,
	"painLevel" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MuscleArea" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"view" varchar(50) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Survey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenantId" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
