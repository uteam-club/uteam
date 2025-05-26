-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('TRAINED', 'REHAB', 'SICK', 'EDUCATION', 'OTHER');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'BIRTH_CERTIFICATE', 'MEDICAL_INSURANCE', 'OTHER');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "length" DOUBLE PRECISION,
ADD COLUMN     "width" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 999;

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "status" "TrainingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clubId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingExercise" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "trainingId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "number" INTEGER,
    "position" TEXT,
    "strongFoot" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "academyJoinDate" TIMESTAMP(3),
    "nationality" TEXT,
    "imageUrl" TEXT,
    "status" TEXT,
    "birthCertificateNumber" TEXT,
    "pinCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "playerId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "PlayerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCoach" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamCoach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAttendance" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'TRAINED',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Training_clubId_idx" ON "Training"("clubId");

-- CreateIndex
CREATE INDEX "Training_teamId_idx" ON "Training"("teamId");

-- CreateIndex
CREATE INDEX "Training_categoryId_idx" ON "Training"("categoryId");

-- CreateIndex
CREATE INDEX "Training_date_clubId_idx" ON "Training"("date", "clubId");

-- CreateIndex
CREATE INDEX "Training_createdById_idx" ON "Training"("createdById");

-- CreateIndex
CREATE INDEX "Training_status_idx" ON "Training"("status");

-- CreateIndex
CREATE INDEX "TrainingExercise_trainingId_idx" ON "TrainingExercise"("trainingId");

-- CreateIndex
CREATE INDEX "TrainingExercise_exerciseId_idx" ON "TrainingExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingExercise_trainingId_exerciseId_key" ON "TrainingExercise"("trainingId", "exerciseId");

-- CreateIndex
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_pinCode_teamId_key" ON "Player"("pinCode", "teamId");

-- CreateIndex
CREATE INDEX "PlayerDocument_playerId_idx" ON "PlayerDocument"("playerId");

-- CreateIndex
CREATE INDEX "PlayerDocument_clubId_idx" ON "PlayerDocument"("clubId");

-- CreateIndex
CREATE INDEX "PlayerDocument_uploadedById_idx" ON "PlayerDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "TeamCoach_teamId_idx" ON "TeamCoach"("teamId");

-- CreateIndex
CREATE INDEX "TeamCoach_userId_idx" ON "TeamCoach"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamCoach_teamId_userId_key" ON "TeamCoach"("teamId", "userId");

-- CreateIndex
CREATE INDEX "PlayerAttendance_playerId_idx" ON "PlayerAttendance"("playerId");

-- CreateIndex
CREATE INDEX "PlayerAttendance_trainingId_idx" ON "PlayerAttendance"("trainingId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAttendance_playerId_trainingId_key" ON "PlayerAttendance"("playerId", "trainingId");

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TrainingCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingExercise" ADD CONSTRAINT "TrainingExercise_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingExercise" ADD CONSTRAINT "TrainingExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerDocument" ADD CONSTRAINT "PlayerDocument_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerDocument" ADD CONSTRAINT "PlayerDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCoach" ADD CONSTRAINT "TeamCoach_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCoach" ADD CONSTRAINT "TeamCoach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAttendance" ADD CONSTRAINT "PlayerAttendance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAttendance" ADD CONSTRAINT "PlayerAttendance_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;
