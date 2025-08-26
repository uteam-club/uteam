-- Добавление поля для длительности тренировки в RPE опросник
-- Эта миграция безопасно добавляет новую колонку без влияния на существующие данные
ALTER TABLE "RPESurveyResponse" ADD COLUMN IF NOT EXISTS "durationMinutes" integer;
