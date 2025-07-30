-- Проверка GPS отчетов в базе данных
-- Запустите этот скрипт в вашей PostgreSQL базе данных

-- Общая статистика по GPS отчетам
SELECT 
  COUNT(*) as total_reports,
  COUNT(CASE WHEN "eventType" = 'TRAINING' THEN 1 END) as training_reports,
  COUNT(CASE WHEN "eventType" = 'MATCH' THEN 1 END) as match_reports,
  COUNT(CASE WHEN "isProcessed" = true THEN 1 END) as processed_reports,
  COUNT(CASE WHEN "isProcessed" = false THEN 1 END) as unprocessed_reports
FROM "GpsReport";

-- Детальная информация о всех GPS отчетах
SELECT 
  gr."id",
  gr."name",
  gr."fileName",
  gr."eventType",
  gr."createdAt",
  gr."updatedAt",
  gr."isProcessed",
  tm."name" as team_name,
  CASE 
    WHEN gr."eventType" = 'TRAINING' THEN t."title"
    WHEN gr."eventType" = 'MATCH' THEN CONCAT(m."opponentName", ' (', m."teamGoals", ':', m."opponentGoals", ')')
    ELSE 'Unknown'
  END as event_info,
  CASE 
    WHEN gr."eventType" = 'TRAINING' THEN t."date"
    WHEN gr."eventType" = 'MATCH' THEN m."date"
    ELSE NULL
  END as event_date
FROM "GpsReport" gr
LEFT JOIN "Team" tm ON gr."teamId" = tm."id"
LEFT JOIN "Training" t ON gr."eventId" = t."id" AND gr."eventType" = 'TRAINING'
LEFT JOIN "Match" m ON gr."eventId" = m."id" AND gr."eventType" = 'MATCH'
ORDER BY gr."createdAt" DESC;

-- GPS отчеты по датам (группировка по месяцам)
SELECT 
  DATE_TRUNC('month', gr."createdAt") as month,
  COUNT(*) as reports_count,
  COUNT(CASE WHEN "eventType" = 'TRAINING' THEN 1 END) as training_count,
  COUNT(CASE WHEN "eventType" = 'MATCH' THEN 1 END) as match_count
FROM "GpsReport" gr
GROUP BY DATE_TRUNC('month', gr."createdAt")
ORDER BY month DESC;

-- Последние 10 загруженных отчетов
SELECT 
  gr."name",
  gr."eventType",
  gr."createdAt",
  tm."name" as team_name,
  CASE 
    WHEN gr."eventType" = 'TRAINING' THEN t."title"
    WHEN gr."eventType" = 'MATCH' THEN CONCAT(m."opponentName", ' (', m."teamGoals", ':', m."opponentGoals", ')')
    ELSE 'Unknown'
  END as event_info
FROM "GpsReport" gr
LEFT JOIN "Team" tm ON gr."teamId" = tm."id"
LEFT JOIN "Training" t ON gr."eventId" = t."id" AND gr."eventType" = 'TRAINING'
LEFT JOIN "Match" m ON gr."eventId" = m."id" AND gr."eventType" = 'MATCH'
ORDER BY gr."createdAt" DESC
LIMIT 10; 