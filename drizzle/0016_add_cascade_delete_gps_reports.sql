-- Добавляем каскадное удаление GPS отчетов при удалении матчей и тренировок

-- Создаем триггерную функцию для удаления GPS отчетов при удалении матчей
CREATE OR REPLACE FUNCTION delete_gps_reports_on_match_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Удаляем все GPS отчеты, связанные с удаляемым матчем
    DELETE FROM "GpsReport" 
    WHERE "eventId" = OLD.id AND "eventType" = 'MATCH';
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для матчей
DROP TRIGGER IF EXISTS trigger_delete_gps_reports_on_match_delete ON "Match";
CREATE TRIGGER trigger_delete_gps_reports_on_match_delete
    BEFORE DELETE ON "Match"
    FOR EACH ROW
    EXECUTE FUNCTION delete_gps_reports_on_match_delete();

-- Создаем триггерную функцию для удаления GPS отчетов при удалении тренировок
CREATE OR REPLACE FUNCTION delete_gps_reports_on_training_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Удаляем все GPS отчеты, связанные с удаляемой тренировкой
    DELETE FROM "GpsReport" 
    WHERE "eventId" = OLD.id AND "eventType" = 'TRAINING';
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для тренировок
DROP TRIGGER IF EXISTS trigger_delete_gps_reports_on_training_delete ON "Training";
CREATE TRIGGER trigger_delete_gps_reports_on_training_delete
    BEFORE DELETE ON "Training"
    FOR EACH ROW
    EXECUTE FUNCTION delete_gps_reports_on_training_delete();

-- Добавляем комментарии для документации
COMMENT ON FUNCTION delete_gps_reports_on_match_delete() IS 'Автоматически удаляет GPS отчеты при удалении матча';
COMMENT ON FUNCTION delete_gps_reports_on_training_delete() IS 'Автоматически удаляет GPS отчеты при удалении тренировки';
COMMENT ON TRIGGER trigger_delete_gps_reports_on_match_delete ON "Match" IS 'Триггер для каскадного удаления GPS отчетов матчей';
COMMENT ON TRIGGER trigger_delete_gps_reports_on_training_delete ON "Training" IS 'Триггер для каскадного удаления GPS отчетов тренировок'; 