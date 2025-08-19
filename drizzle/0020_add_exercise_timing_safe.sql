-- Безопасная миграция: добавляем поля для таймингов упражнений в таблицу TrainingExercise
-- Эта миграция НЕ удаляет существующие данные

-- Добавляем новые поля с значением по умолчанию NULL
ALTER TABLE "TrainingExercise" ADD COLUMN IF NOT EXISTS "series" integer;
ALTER TABLE "TrainingExercise" ADD COLUMN IF NOT EXISTS "repetitions" integer;
ALTER TABLE "TrainingExercise" ADD COLUMN IF NOT EXISTS "repetitionTime" integer;
ALTER TABLE "TrainingExercise" ADD COLUMN IF NOT EXISTS "pauseBetweenRepetitions" integer;
ALTER TABLE "TrainingExercise" ADD COLUMN IF NOT EXISTS "pauseBetweenSeries" integer;

-- Добавляем комментарии к новым полям
COMMENT ON COLUMN "TrainingExercise"."series" IS 'Количество серий упражнения';
COMMENT ON COLUMN "TrainingExercise"."repetitions" IS 'Количество повторов в серии';
COMMENT ON COLUMN "TrainingExercise"."repetitionTime" IS 'Время выполнения повтора в секундах';
COMMENT ON COLUMN "TrainingExercise"."pauseBetweenRepetitions" IS 'Пауза между повторами в секундах';
COMMENT ON COLUMN "TrainingExercise"."pauseBetweenSeries" IS 'Пауза между сериями в секундах';

