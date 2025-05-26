/*
  Warnings:

  - You are about to drop the column `fatigue_level` on the `MorningSurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `muscle_soreness` on the `MorningSurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `MorningSurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `readiness` on the `MorningSurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `sleep_duration` on the `MorningSurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `sleep_quality` on the `MorningSurveyResponse` table. All the data in the column will be lost.
  - You are about to drop the column `stress_level` on the `MorningSurveyResponse` table. All the data in the column will be lost.
  - Added the required column `hasPain` to the `MorningSurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `muscleCondition` to the `MorningSurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recovery` to the `MorningSurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sleepDuration` to the `MorningSurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sleepQuality` to the `MorningSurveyResponse` table without a default value. This is not possible if the table is not empty.
  - Made the column `mood` on table `MorningSurveyResponse` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MorningSurveyResponse" DROP COLUMN "fatigue_level",
DROP COLUMN "muscle_soreness",
DROP COLUMN "notes",
DROP COLUMN "readiness",
DROP COLUMN "sleep_duration",
DROP COLUMN "sleep_quality",
DROP COLUMN "stress_level",
ADD COLUMN     "hasPain" BOOLEAN NOT NULL,
ADD COLUMN     "muscleCondition" INTEGER NOT NULL,
ADD COLUMN     "painAreas" JSONB,
ADD COLUMN     "recovery" INTEGER NOT NULL,
ADD COLUMN     "sleepDuration" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sleepQuality" INTEGER NOT NULL,
ALTER COLUMN "mood" SET NOT NULL;
