# Каскадное удаление GPS отчетов

## Обзор

Реализована система автоматического удаления GPS отчетов при удалении связанных сущностей (матчей и тренировок) для поддержания целостности данных.

## Проблема

Ранее при удалении матча или тренировки из приложения, связанные с ними GPS отчеты оставались в базе данных, что приводило к:
- Накоплению "сиротских" записей в базе данных
- Несоответствию между данными в приложении и базе данных
- Потенциальным ошибкам при попытке доступа к удаленным отчетам

## Решение

### 1. База данных (Триггеры)

Созданы PostgreSQL триггеры, которые автоматически удаляют GPS отчеты при удалении связанных сущностей:

#### Триггер для матчей
```sql
CREATE OR REPLACE FUNCTION delete_gps_reports_on_match_delete()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM "GpsReport" 
    WHERE "eventId" = OLD.id AND "eventType" = 'MATCH';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_gps_reports_on_match_delete
    BEFORE DELETE ON "Match"
    FOR EACH ROW
    EXECUTE FUNCTION delete_gps_reports_on_match_delete();
```

#### Триггер для тренировок
```sql
CREATE OR REPLACE FUNCTION delete_gps_reports_on_training_delete()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM "GpsReport" 
    WHERE "eventId" = OLD.id AND "eventType" = 'TRAINING';
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_gps_reports_on_training_delete
    BEFORE DELETE ON "Training"
    FOR EACH ROW
    EXECUTE FUNCTION delete_gps_reports_on_training_delete();
```

### 2. API Endpoints

В API endpoints для удаления матчей и тренировок также реализовано программное удаление GPS отчетов для дополнительной надежности:

#### Удаление матча (`/api/matches/[id]`)
```typescript
// Каскадное удаление: сначала удаляем связанные GPS отчеты
await db.delete(gpsReport).where(
  and(
    eq(gpsReport.eventId, matchId),
    eq(gpsReport.eventType, 'MATCH')
  )
);

// Удаляем playerMatchStat
await db.delete(playerMatchStat).where(eq(playerMatchStat.matchId, matchId));

// Удаляем сам матч
await db.delete(match).where(eq(match.id, matchId));
```

#### Удаление тренировки (`/api/trainings/[id]`)
```typescript
// Каскадное удаление: сначала удаляем связанные GPS отчеты
await db.delete(gpsReport).where(
  and(
    eq(gpsReport.eventId, trainingId),
    eq(gpsReport.eventType, 'TRAINING')
  )
);

// Удаляем тренировку
await db.delete(training).where(eq(training.id, trainingId));
```

#### Удаление GPS отчета (`/api/gps-reports/[id]`)
```typescript
// Прямое удаление GPS отчета
await db
  .delete(gpsReport)
  .where(
    and(
      eq(gpsReport.id, reportId),
      eq(gpsReport.clubId, token.clubId)
    )
  );
```

## Файлы

### Миграция
- `drizzle/0016_add_cascade_delete_gps_reports.sql` - SQL миграция с триггерами

### Скрипты
- `scripts/check-gps-data.cjs` - Проверка состояния GPS данных
- `scripts/check-orphaned-reports.cjs` - Проверка сиротных отчетов
- `scripts/cleanup-orphaned-reports.cjs` - Очистка сиротных отчетов
- `scripts/test-cascade-delete.cjs` - Тестирование каскадного удаления

### API Endpoints
- `src/app/api/matches/[id]/route.ts` - API для матчей
- `src/app/api/trainings/[id]/route.ts` - API для тренировок  
- `src/app/api/gps-reports/[id]/route.ts` - API для GPS отчетов

## Применение

### 1. Применение миграции
```bash
node scripts/apply-cascade-delete-migration.cjs
```

### 2. Проверка состояния
```bash
node scripts/check-gps-data.cjs
```

### 3. Проверка сиротных отчетов
```bash
node scripts/check-orphaned-reports.cjs
```

### 4. Очистка сиротных отчетов
```bash
node scripts/cleanup-orphaned-reports.cjs
```

### 5. Тестирование
```bash
node scripts/test-cascade-delete.cjs
```

## Результат

✅ **Триггеры созданы и работают**
- `trigger_delete_gps_reports_on_match_delete` - для матчей
- `trigger_delete_gps_reports_on_training_delete` - для тренировок

✅ **API endpoints обновлены**
- Каскадное удаление реализовано на уровне приложения
- Дополнительная проверка прав доступа

✅ **Целостность данных обеспечена**
- GPS отчеты автоматически удаляются при удалении связанных сущностей
- Нет "сиротских" записей в базе данных

✅ **Сиротные отчеты очищены**
- Найден и удален 1 сиротный отчет тренировки
- База данных полностью чистая

## Безопасность

- Триггеры работают только в рамках транзакций
- API endpoints проверяют права доступа пользователя
- Удаление происходит только для отчетов, принадлежащих клубу пользователя

## Мониторинг

### Проверка состояния GPS данных
```bash
node scripts/check-gps-data.cjs
```

Этот скрипт покажет:
- Статистику по клубам
- Детальную информацию по отчетам
- Связи между событиями и отчетами
- Статус триггеров каскадного удаления

### Проверка сиротных отчетов
```bash
node scripts/check-orphaned-reports.cjs
```

Этот скрипт покажет:
- GPS отчеты, ссылающиеся на несуществующие матчи
- GPS отчеты, ссылающиеся на несуществующие тренировки
- Отчеты с некорректными eventType
- Общую статистику и рекомендации

### Очистка сиротных отчетов
```bash
node scripts/cleanup-orphaned-reports.cjs
```

Этот скрипт:
- Найдет все сиротные отчеты
- Покажет их детали
- Безопасно удалит их из базы данных
- Проверит результат очистки

## Текущее состояние

**Последняя проверка:** ✅ База данных чистая
- **Общее количество GPS отчетов:** 9
- **Сиротных отчетов:** 0
- **Триггеры каскадного удаления:** Работают корректно
- **Процент сиротных отчетов:** 0% 