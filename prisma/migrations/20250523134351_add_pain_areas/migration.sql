/*
  Warnings:

  - You are about to drop the column `hasPain` on the `MorningSurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `painAreas` on the `MorningSurveyResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MorningSurveyResponse" DROP COLUMN "hasPain",
DROP COLUMN "painAreas";

-- CreateTable
CREATE TABLE "PainArea" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "painLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PainArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PainArea_surveyId_idx" ON "PainArea"("surveyId");

-- AddForeignKey
ALTER TABLE "PainArea" ADD CONSTRAINT "PainArea_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "MorningSurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
