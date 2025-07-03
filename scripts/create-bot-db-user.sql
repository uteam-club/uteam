-- SQL-скрипт для создания пользователя базы данных для Telegram-бота
-- Выполняется от имени суперпользователя (cloudadmin/postgres)

-- Создание пользователя для бота
CREATE USER uteam_bot_reader WITH PASSWORD 'uteambot567234!';

-- Предоставление прав подключения к базе данных
GRANT CONNECT ON DATABASE uteam TO uteam_bot_reader;

-- Предоставление прав использования схемы public
GRANT USAGE ON SCHEMA public TO uteam_bot_reader;

-- Предоставление прав SELECT на все существующие таблицы
GRANT SELECT ON ALL TABLES IN SCHEMA public TO uteam_bot_reader;

-- Предоставление прав SELECT на все будущие таблицы (по умолчанию)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO uteam_bot_reader;

-- Предоставление прав на использование последовательностей (для UUID)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO uteam_bot_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO uteam_bot_reader;

-- Проверка созданных прав
\du uteam_bot_reader 