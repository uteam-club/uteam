-- GPS Reports tables
CREATE TABLE IF NOT EXISTS "GpsReport" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar(255) NOT NULL,
    "fileName" varchar(255) NOT NULL,
    "fileSize" integer,
    "gpsSystem" varchar(100) NOT NULL,
    "eventType" varchar(50) NOT NULL,
    "eventId" uuid NOT NULL,
    "profileId" uuid NOT NULL,
    "metadata" jsonb,
    "profileSnapshot" jsonb,
    "canonVersion" text,
    "isProcessed" boolean NOT NULL DEFAULT false,
    "status" varchar(50) DEFAULT 'uploaded' NOT NULL,
    "processedAt" timestamp with time zone,
    "errorMessage" text,
    "playersCount" integer DEFAULT 0,
    "hasEdits" boolean DEFAULT false,
    "clubId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "uploadedById" uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- GPS Report Data table
CREATE TABLE IF NOT EXISTS "GpsReportData" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "reportId" uuid NOT NULL,
    "playerId" uuid NOT NULL,
    "playerName" varchar(255) NOT NULL,
    "teamId" uuid NOT NULL,
    "clubId" uuid NOT NULL,
    "playerData" jsonb NOT NULL,
    "isEdited" boolean DEFAULT false NOT NULL,
    "lastEditedAt" timestamp with time zone,
    "lastEditedById" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- GPS Data Change Log table
CREATE TABLE IF NOT EXISTS "GpsDataChangeLog" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "reportDataId" uuid NOT NULL,
    "reportId" uuid NOT NULL,
    "playerId" uuid NOT NULL,
    "clubId" uuid NOT NULL,
    "fieldName" varchar(100) NOT NULL,
    "fieldLabel" varchar(255) NOT NULL,
    "oldValue" jsonb,
    "newValue" jsonb NOT NULL,
    "changedById" uuid NOT NULL,
    "changedByName" varchar(255) NOT NULL,
    "changedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "changeReason" text,
    "changeType" varchar(50) DEFAULT 'manual' NOT NULL
);

-- GPS Data Permissions table
CREATE TABLE IF NOT EXISTS "GpsDataPermissions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" uuid NOT NULL,
    "clubId" uuid NOT NULL,
    "teamId" uuid,
    "canView" boolean DEFAULT false NOT NULL,
    "canEdit" boolean DEFAULT false NOT NULL,
    "canDelete" boolean DEFAULT false NOT NULL,
    "canExport" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- GPS Column Mapping table
CREATE TABLE IF NOT EXISTS "GpsColumnMapping" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "profileId" uuid NOT NULL,
    "clubId" uuid NOT NULL,
    "originalColumnName" varchar(255) NOT NULL,
    "sourceUnit" varchar(50),
    "canonicalMetricId" uuid NOT NULL,
    "canonicalMetricCode" varchar(100) NOT NULL,
    "displayOrder" integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "lastUsedAt" timestamp with time zone,
    "metadata" jsonb,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- GPS Visualization Profile table
CREATE TABLE IF NOT EXISTS "GpsVisualizationProfile" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar(255) NOT NULL,
    "description" text,
    "clubId" uuid NOT NULL,
    "createdById" uuid NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- GPS Profile Column table
CREATE TABLE IF NOT EXISTS "GpsProfileColumn" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "profileId" uuid NOT NULL,
    "canonicalMetricId" uuid NOT NULL,
    "displayName" varchar(255) NOT NULL,
    "displayUnit" varchar(50) NOT NULL,
    "displayOrder" integer NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- GPS Profile Team table
CREATE TABLE IF NOT EXISTS "GpsProfileTeam" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "profileId" uuid NOT NULL,
    "teamId" uuid NOT NULL,
    "clubId" uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "GpsColumnMapping" ADD CONSTRAINT "GpsColumnMapping_canonicalMetricId_GpsCanonicalMetric_id_fk" FOREIGN KEY ("canonicalMetricId") REFERENCES "GpsCanonicalMetric"("id") ON DELETE CASCADE;
ALTER TABLE "GpsProfileColumn" ADD CONSTRAINT "GpsProfileColumn_profileId_GpsVisualizationProfile_id_fk" FOREIGN KEY ("profileId") REFERENCES "GpsVisualizationProfile"("id") ON DELETE CASCADE;
ALTER TABLE "GpsProfileColumn" ADD CONSTRAINT "GpsProfileColumn_canonicalMetricId_GpsCanonicalMetric_id_fk" FOREIGN KEY ("canonicalMetricId") REFERENCES "GpsCanonicalMetric"("id") ON DELETE CASCADE;
