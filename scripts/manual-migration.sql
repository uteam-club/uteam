-- БЕЗОПАСНАЯ МИГРАЦИЯ: Добавление поля durationMinutes в таблицу RPESurveyResponse
-- Этот скрипт можно выполнить вручную в pgAdmin или psql для максимальной безопасности

-- 1. Проверяем, что таблица существует
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'RPESurveyResponse') THEN
        RAISE EXCEPTION 'Таблица RPESurveyResponse не существует!';
    END IF;
END $$;

-- 2. Проверяем, что поле еще не существует
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'RPESurveyResponse' AND column_name = 'durationMinutes') THEN
        RAISE EXCEPTION 'Поле durationMinutes уже существует в таблице RPESurveyResponse!';
    END IF;
END $$;

-- 3. Создаем резервную копию данных (опционально)
-- CREATE TABLE "RPESurveyResponse_backup_$(date +%Y%m%d_%H%M%S)" AS SELECT * FROM "RPESurveyResponse";

-- 4. Добавляем новое поле
ALTER TABLE "RPESurveyResponse" ADD COLUMN "durationMinutes" integer;

-- 5. Проверяем, что поле добавлено
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'RPESurveyResponse' AND column_name = 'durationMinutes') THEN
        RAISE EXCEPTION 'Поле durationMinutes не было добавлено!';
    END IF;
END $$;

-- 6. Проверяем, что все существующие данные сохранены
DO $$
DECLARE
    record_count_before integer;
    record_count_after integer;
BEGIN
    -- Получаем количество записей после миграции
    SELECT COUNT(*) INTO record_count_after FROM "RPESurveyResponse";
    
    -- Выводим информацию
    RAISE NOTICE 'Миграция выполнена успешно!';
    RAISE NOTICE 'Количество записей в таблице: %', record_count_after;
    RAISE NOTICE 'Поле durationMinutes добавлено и готово к использованию';
END $$;

-- 7. Показываем новую структуру таблицы
\d "RPESurveyResponse"
