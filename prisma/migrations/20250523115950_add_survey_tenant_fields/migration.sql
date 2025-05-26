/*
  Warnings:

  - Added the required column `surveyId` to the `MorningSurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `MorningSurveyResponse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MorningSurveyResponse" ADD COLUMN     "surveyId" TEXT NOT NULL,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "MorningSurveyResponse_surveyId_idx" ON "MorningSurveyResponse"("surveyId");

-- CreateIndex
CREATE INDEX "MorningSurveyResponse_tenantId_idx" ON "MorningSurveyResponse"("tenantId");
