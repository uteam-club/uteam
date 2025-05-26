-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('FRIENDLY', 'LEAGUE', 'CUP');

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "competitionType" "CompetitionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL,
    "teamId" TEXT NOT NULL,
    "opponentName" TEXT NOT NULL,
    "teamGoals" INTEGER NOT NULL DEFAULT 0,
    "opponentGoals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clubId" TEXT NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Match_clubId_idx" ON "Match"("clubId");

-- CreateIndex
CREATE INDEX "Match_teamId_idx" ON "Match"("teamId");

-- CreateIndex
CREATE INDEX "Match_date_idx" ON "Match"("date");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
