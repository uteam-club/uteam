ALTER TABLE "Player"
  ADD COLUMN "passportData" varchar(255),
  ADD COLUMN "insuranceNumber" varchar(255),
  ADD COLUMN "visaExpiryDate" timestamptz; 