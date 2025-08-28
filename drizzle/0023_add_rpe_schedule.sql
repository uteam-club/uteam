-- Create RPESchedule table
CREATE TABLE IF NOT EXISTS "RPESchedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainingId" uuid NOT NULL,
	"teamId" uuid NOT NULL,
	"scheduledTime" time NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"sentAt" timestamp with time zone,
	"createdById" uuid NOT NULL
);
