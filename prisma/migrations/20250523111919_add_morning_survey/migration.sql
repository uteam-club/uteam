-- CreateTable
CREATE TABLE "MorningSurveyResponse" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sleep_quality" INTEGER,
    "sleep_duration" DOUBLE PRECISION,
    "mood" INTEGER,
    "fatigue_level" INTEGER,
    "muscle_soreness" INTEGER,
    "stress_level" INTEGER,
    "readiness" INTEGER,
    "notes" TEXT,

    CONSTRAINT "MorningSurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MorningSurveyResponse_playerId_idx" ON "MorningSurveyResponse"("playerId");

-- CreateIndex
CREATE INDEX "MorningSurveyResponse_createdAt_idx" ON "MorningSurveyResponse"("createdAt");

-- AddForeignKey
ALTER TABLE "MorningSurveyResponse" ADD CONSTRAINT "MorningSurveyResponse_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
