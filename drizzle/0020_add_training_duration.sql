-- Добавление поля для длительности тренировки в RPE опросник
ALTER TABLE "RPESurveyResponse" ADD COLUMN "durationMinutes" integer;
