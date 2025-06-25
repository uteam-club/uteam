ALTER TABLE "Player"
  ADD COLUMN "format1" varchar(32),
  ADD COLUMN "formation1" varchar(32),
  ADD COLUMN "positionIndex1" integer,
  ADD COLUMN "format2" varchar(32),
  ADD COLUMN "formation2" varchar(32),
  ADD COLUMN "positionIndex2" integer;

-- Добавить поле teamType в Team
ALTER TABLE "Team" ADD COLUMN "teamType" varchar(16) NOT NULL DEFAULT 'academy';

-- Добавить contractStartDate и contractEndDate в Player
ALTER TABLE "Player" ADD COLUMN "contractStartDate" timestamptz;
ALTER TABLE "Player" ADD COLUMN "contractEndDate" timestamptz; 