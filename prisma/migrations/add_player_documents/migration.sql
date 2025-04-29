-- Добавление полей для документов игрока
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "passportUrl" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "passportFileName" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "passportFileSize" INTEGER;

ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "birthCertificateUrl" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "birthCertificateFileName" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "birthCertificateFileSize" INTEGER;

ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "insuranceUrl" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "insuranceFileName" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "insuranceFileSize" INTEGER;

ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "birthCertificateNumber" TEXT;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "pinCode" CHAR(6); 