-- Добавление поля order в таблицу training_exercises
ALTER TABLE "training_exercises" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Заполнение поля order для существующих записей
UPDATE "training_exercises" te
SET "order" = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "trainingId" ORDER BY "createdAt") as row_num
  FROM "training_exercises"
) AS subquery
WHERE te.id = subquery.id; 