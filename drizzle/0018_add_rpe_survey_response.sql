-- Создание таблицы для ответов на RPE опросник
CREATE TABLE IF NOT EXISTS "RPESurveyResponse" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerId" uuid NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "readAt" timestamp with time zone,
  "completedAt" timestamp with time zone,
  "rpeScore" integer NOT NULL,
  "surveyId" uuid NOT NULL,
  "tenantId" uuid NOT NULL
); 