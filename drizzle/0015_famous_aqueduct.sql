CREATE TABLE IF NOT EXISTS "RPESurveyResponse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playerId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"readAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"rpeScore" integer NOT NULL,
	"surveyId" uuid NOT NULL,
	"tenantId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Permission_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RolePermission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "Role" NOT NULL,
	"permissionId" uuid NOT NULL,
	"allowed" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserPermission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"permissionId" uuid NOT NULL,
	"allowed" boolean NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "GpsReport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"fileUrl" text NOT NULL,
	"fileSize" varchar(50),
	"gpsSystem" varchar(100) NOT NULL,
	"eventType" varchar(20) NOT NULL,
	"eventId" uuid NOT NULL,
	"profileId" uuid NOT NULL,
	"rawData" jsonb,
	"processedData" jsonb,
	"metadata" jsonb,
	"isProcessed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	"uploadedById" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "GpsProfile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"gpsSystem" varchar(100) NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"visualizationConfig" jsonb NOT NULL,
	"metricsConfig" jsonb NOT NULL,
	"customFormulas" jsonb,
	"columnMapping" jsonb NOT NULL,
	"dataFilters" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	"createdById" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "GpsMetric" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"displayName" varchar(255) NOT NULL,
	"description" text,
	"unit" varchar(50),
	"dataType" varchar(50) NOT NULL,
	"isVisible" boolean DEFAULT true NOT NULL,
	"isCustom" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"formula" text,
	"sourceMetrics" jsonb,
	"chartType" varchar(50),
	"color" varchar(7),
	"minValue" jsonb,
	"maxValue" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	"createdById" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Player" ALTER COLUMN "telegramId" SET DATA TYPE bigint;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_Permission_id_fk" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_Permission_id_fk" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
