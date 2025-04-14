-- Проверяем наличие колонки authorId в таблице exercises
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'exercises' 
        AND column_name = 'authorId'
    ) THEN
        -- Добавляем колонку authorId
        ALTER TABLE "exercises" ADD COLUMN "authorId" TEXT REFERENCES "users"("id") ON DELETE SET NULL;
    END IF;
END $$; 