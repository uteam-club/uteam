-- Добавление полей для файлов и автора в таблицу упражнений
ALTER TABLE "exercises" ADD COLUMN "length" INTEGER;
ALTER TABLE "exercises" ADD COLUMN "width" INTEGER;
ALTER TABLE "exercises" ADD COLUMN "fileUrl" TEXT;
ALTER TABLE "exercises" ADD COLUMN "fileName" TEXT;
ALTER TABLE "exercises" ADD COLUMN "fileType" TEXT;
ALTER TABLE "exercises" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "exercises" ADD COLUMN "authorId" TEXT REFERENCES "users"("id") ON DELETE SET NULL; 