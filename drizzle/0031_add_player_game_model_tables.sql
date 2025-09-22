-- Создание таблицы для хранения игровых моделей игроков
CREATE TABLE IF NOT EXISTS "PlayerGameModel" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "playerId" uuid NOT NULL,
    "clubId" uuid NOT NULL,
    "calculatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "matchesCount" integer NOT NULL,
    "totalMinutes" integer NOT NULL,
    "metrics" jsonb NOT NULL,
    "matchIds" jsonb NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- Создание таблицы для настроек отображения игровых моделей
CREATE TABLE IF NOT EXISTS "PlayerGameModelSettings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "playerId" uuid NOT NULL,
    "clubId" uuid NOT NULL,
    "selectedMetrics" jsonb NOT NULL,
    "metricUnits" jsonb NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS "idx_player_game_model_player_id" ON "PlayerGameModel" ("playerId");
CREATE INDEX IF NOT EXISTS "idx_player_game_model_club_id" ON "PlayerGameModel" ("clubId");
CREATE INDEX IF NOT EXISTS "idx_player_game_model_calculated_at" ON "PlayerGameModel" ("calculatedAt");

CREATE INDEX IF NOT EXISTS "idx_player_game_model_settings_player_id" ON "PlayerGameModelSettings" ("playerId");
CREATE INDEX IF NOT EXISTS "idx_player_game_model_settings_club_id" ON "PlayerGameModelSettings" ("clubId");

-- Добавление комментариев к таблицам
COMMENT ON TABLE "PlayerGameModel" IS 'Игровые модели игроков с нормализованными метриками за 90 минут';
COMMENT ON TABLE "PlayerGameModelSettings" IS 'Настройки отображения игровых моделей игроков';

COMMENT ON COLUMN "PlayerGameModel"."playerId" IS 'ID игрока';
COMMENT ON COLUMN "PlayerGameModel"."clubId" IS 'ID клуба';
COMMENT ON COLUMN "PlayerGameModel"."calculatedAt" IS 'Дата и время расчета модели';
COMMENT ON COLUMN "PlayerGameModel"."matchesCount" IS 'Количество матчей использованных для расчета (до 10)';
COMMENT ON COLUMN "PlayerGameModel"."totalMinutes" IS 'Общее время игры в минутах';
COMMENT ON COLUMN "PlayerGameModel"."metrics" IS 'Нормализованные метрики за 90 минут в JSON формате';
COMMENT ON COLUMN "PlayerGameModel"."matchIds" IS 'ID матчей использованных для расчета в JSON массиве';
COMMENT ON COLUMN "PlayerGameModel"."version" IS 'Версия модели для отслеживания изменений';

COMMENT ON COLUMN "PlayerGameModelSettings"."playerId" IS 'ID игрока';
COMMENT ON COLUMN "PlayerGameModelSettings"."clubId" IS 'ID клуба';
COMMENT ON COLUMN "PlayerGameModelSettings"."selectedMetrics" IS 'Выбранные метрики для отображения в JSON массиве';
COMMENT ON COLUMN "PlayerGameModelSettings"."metricUnits" IS 'Единицы измерения для каждой метрики в JSON объекте';

