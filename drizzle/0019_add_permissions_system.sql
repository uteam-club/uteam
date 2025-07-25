-- Таблица прав
CREATE TABLE "Permission" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" varchar(64) NOT NULL UNIQUE,
    "description" text,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Таблица связей ролей и прав
CREATE TABLE "RolePermission" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "role" varchar(32) NOT NULL,
    "permissionId" uuid NOT NULL REFERENCES "Permission"("id"),
    "allowed" boolean NOT NULL DEFAULT true,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Таблица индивидуальных прав пользователя
CREATE TABLE "UserPermission" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" uuid NOT NULL REFERENCES "User"("id"),
    "permissionId" uuid NOT NULL REFERENCES "Permission"("id"),
    "allowed" boolean NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
); 