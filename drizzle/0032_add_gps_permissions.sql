-- GPS Permissions tables
CREATE TABLE IF NOT EXISTS "GpsPermission" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" varchar(255) NOT NULL UNIQUE,
    "name" varchar(255) NOT NULL,
    "description" text,
    "category" varchar(100) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- GPS Role Permissions
CREATE TABLE IF NOT EXISTS "GpsRolePermission" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "role" varchar(50) NOT NULL,
    "permissionId" uuid NOT NULL REFERENCES "GpsPermission"("id") ON DELETE CASCADE,
    "allowed" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- GPS User Permissions (for specific teams)
CREATE TABLE IF NOT EXISTS "GpsUserPermission" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" uuid NOT NULL,
    "teamId" uuid,
    "clubId" uuid NOT NULL,
    "canView" boolean DEFAULT false NOT NULL,
    "canEdit" boolean DEFAULT false NOT NULL,
    "canDelete" boolean DEFAULT false NOT NULL,
    "canExport" boolean DEFAULT false NOT NULL,
    "canManageProfiles" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_gps_permission_code" ON "GpsPermission"("code");
CREATE INDEX IF NOT EXISTS "idx_gps_permission_category" ON "GpsPermission"("category");
CREATE INDEX IF NOT EXISTS "idx_gps_role_permission_role" ON "GpsRolePermission"("role");
CREATE INDEX IF NOT EXISTS "idx_gps_role_permission_permission" ON "GpsRolePermission"("permissionId");
CREATE INDEX IF NOT EXISTS "idx_gps_user_permission_user" ON "GpsUserPermission"("userId");
CREATE INDEX IF NOT EXISTS "idx_gps_user_permission_team" ON "GpsUserPermission"("teamId");
CREATE INDEX IF NOT EXISTS "idx_gps_user_permission_club" ON "GpsUserPermission"("clubId");
