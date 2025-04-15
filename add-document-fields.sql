-- Добавляем поля для документов в таблицу players
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS passportUrl TEXT,
ADD COLUMN IF NOT EXISTS passportFileName TEXT,
ADD COLUMN IF NOT EXISTS passportFileSize INTEGER,
ADD COLUMN IF NOT EXISTS birthCertificateUrl TEXT,
ADD COLUMN IF NOT EXISTS birthCertificateFileName TEXT,
ADD COLUMN IF NOT EXISTS birthCertificateFileSize INTEGER,
ADD COLUMN IF NOT EXISTS insuranceUrl TEXT,
ADD COLUMN IF NOT EXISTS insuranceFileName TEXT,
ADD COLUMN IF NOT EXISTS insuranceFileSize INTEGER; 