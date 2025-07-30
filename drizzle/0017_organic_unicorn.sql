CREATE TABLE IF NOT EXISTS "PlayerMapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reportName" varchar(255) NOT NULL,
	"gpsSystem" varchar(100) NOT NULL,
	"playerId" uuid NOT NULL,
	"teamId" uuid NOT NULL,
	"confidenceScore" real NOT NULL,
	"mappingType" varchar(50) NOT NULL,
	"notes" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"clubId" uuid NOT NULL,
	"createdById" uuid NOT NULL
);
