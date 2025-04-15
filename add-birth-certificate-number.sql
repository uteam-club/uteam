-- Добавляем поле номера свидетельства о рождении
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "birthCertificateNumber" TEXT; 