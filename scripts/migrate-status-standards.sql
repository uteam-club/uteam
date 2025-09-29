-- Миграция для обновления статусов к единым стандартам
-- Выполнить после обновления кода

-- 1. Обновление статусов игроков в таблице Player
-- Изменяем 'study' на 'education' для согласованности
UPDATE "Player" 
SET status = 'education' 
WHERE status = 'study';

-- 2. Обновление статусов посещаемости в таблице PlayerAttendance
-- Изменяем 'REHAB' на 'REHABILITATION' для согласованности
UPDATE "PlayerAttendance" 
SET status = 'REHABILITATION' 
WHERE status = 'REHAB';

-- 3. Добавление недостающих статусов посещаемости (если нужно)
-- Эти статусы могут быть добавлены через API при необходимости
-- INJURY, NATIONAL_TEAM, OTHER_TEAM уже поддерживаются в коде

-- 4. Проверка результатов миграции
SELECT 
  'Player statuses' as table_name,
  status,
  COUNT(*) as count
FROM "Player" 
WHERE status IS NOT NULL
GROUP BY status
ORDER BY status;

SELECT 
  'PlayerAttendance statuses' as table_name,
  status,
  COUNT(*) as count
FROM "PlayerAttendance" 
GROUP BY status
ORDER BY status;
