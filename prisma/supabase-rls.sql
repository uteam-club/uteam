-- Скрипт для настройки Row-Level Security в Supabase для мультитенантной архитектуры
-- Этот скрипт нужно запустить в SQL-редакторе Supabase или через supabase CLI

-- Функция для установки текущего клуба в контексте сессии
CREATE OR REPLACE FUNCTION set_current_club_id(club_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_club_id', club_id::text, false);
END;
$$ LANGUAGE plpgsql;

-- 1. Включаем RLS для всех таблиц
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaItem" ENABLE ROW LEVEL SECURITY;

-- 2. Политика для таблицы User
CREATE POLICY user_tenant_isolation ON "User"
  USING (
    clubId = current_setting('app.current_club_id', true)::uuid
    OR 
    (SELECT role FROM "User" WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );

-- 3. Политика для таблицы Team
CREATE POLICY team_tenant_isolation ON "Team"
  USING (
    clubId = current_setting('app.current_club_id', true)::uuid
    OR 
    (SELECT role FROM "User" WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );

-- 4. Политика для таблицы Event
CREATE POLICY event_tenant_isolation ON "Event"
  USING (
    clubId = current_setting('app.current_club_id', true)::uuid
    OR 
    (SELECT role FROM "User" WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );

-- 5. Политика для таблицы MediaItem
CREATE POLICY media_tenant_isolation ON "MediaItem"
  USING (
    clubId = current_setting('app.current_club_id', true)::uuid
    OR 
    (SELECT role FROM "User" WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );

-- 6. Создаем триггер для автоматической установки clubId при вставке или обновлении
CREATE OR REPLACE FUNCTION check_tenant_access()
RETURNS TRIGGER AS $$
DECLARE
  user_club_id uuid;
  user_role text;
BEGIN
  -- Получаем clubId и роль текущего пользователя
  SELECT "User".clubId, "User".role INTO user_club_id, user_role
  FROM "User"
  WHERE "User".id = auth.uid();
  
  -- Если это суперадмин, разрешаем доступ
  IF user_role = 'SUPER_ADMIN' THEN
    RETURN NEW;
  END IF;
  
  -- Проверяем, что clubId в новой записи совпадает с clubId пользователя
  IF NEW.clubId != user_club_id THEN
    RAISE EXCEPTION 'Access denied: cannot modify data for other clubs';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггер к таблицам
CREATE TRIGGER check_team_tenant_access
  BEFORE INSERT OR UPDATE ON "Team"
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_access();

CREATE TRIGGER check_event_tenant_access
  BEFORE INSERT OR UPDATE ON "Event"
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_access();

CREATE TRIGGER check_media_tenant_access
  BEFORE INSERT OR UPDATE ON "MediaItem"
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_access();

-- 7. Создаем функцию для инициализации контекста в каждом запросе
CREATE OR REPLACE FUNCTION initialize_tenant_context()
RETURNS void AS $$
DECLARE
  user_club_id uuid;
BEGIN
  -- Получаем clubId текущего пользователя
  SELECT "User".clubId INTO user_club_id
  FROM "User"
  WHERE "User".id = auth.uid();
  
  IF user_club_id IS NOT NULL THEN
    PERFORM set_config('app.current_club_id', user_club_id::text, false);
  END IF;
END;
$$ LANGUAGE plpgsql; 