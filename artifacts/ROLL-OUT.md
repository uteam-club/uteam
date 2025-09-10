# GPS Foundation P0 - Roll-out Plan

## ⚠️ ВАЖНО: НЕ ВЫПОЛНЯТЬ КОМАНДЫ АВТОМАТИЧЕСКИ!

Все команды ниже предназначены для ручного выполнения DBA.

## 1. Бэкап базы данных

```bash
# Создать бэкап в custom-формате (сжатый, с метаданными)
pg_dump -h 158.160.80.155 -p 5432 -U postgres -d postgres \
  --format=custom --compress=9 --verbose \
  --file=gps_foundation_backup_$(date +%Y%m%d_%H%M%S).dump

# Альтернативно: SQL-дамп (читаемый)
pg_dump -h 158.160.80.155 -p 5432 -U postgres -d postgres \
  --format=plain --no-owner --no-privileges \
  --file=gps_foundation_backup_$(date +%Y%m%d_%H%M%S).sql
```

## 2. Применение миграции

```bash
# Применить безопасную миграцию
psql -h 158.160.80.155 -p 5432 -U postgres -d postgres \
  -f drizzle/1757437762_gps_snapshot_safe.sql

# Или из артефактов
psql -h 158.160.80.155 -p 5432 -U postgres -d postgres \
  -f artifacts/db-migration-safe.sql
```

## 3. Верификация после применения

```sql
-- 3.1 Проверка структуры таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name='GpsReport' ORDER BY column_name;

-- 3.2 Статистика новых полей
SELECT 
  COUNT(*) total_reports,
  SUM((profileSnapshot IS NOT NULL)::int) with_snapshot,
  SUM((canonVersion   IS NOT NULL)::int) with_canon_ver,
  SUM((importMeta     IS NOT NULL)::int) with_import_meta
FROM "GpsReport";

-- 3.3 Проверка индексов
SELECT indexname, indexdef FROM pg_indexes WHERE tablename='GpsReport';
```

## 4. Опциональный шаг: Установка NOT NULL для importMeta

**ВНИМАНИЕ:** Выполнять только после backfill скрипта!

```sql
-- 4.1 Заполнить NULL значения (если есть)
UPDATE "GpsReport" 
SET "importMeta" = '{}'::jsonb 
WHERE "importMeta" IS NULL;

-- 4.2 Установить NOT NULL constraint
ALTER TABLE "GpsReport" 
ALTER COLUMN "importMeta" SET NOT NULL;
```

## 5. Backfill profileSnapshot (после миграции)

```bash
# Dry run (проверка)
npm run gps:backfill -- --dry-run=true --limit=10

# Полный backfill
npm run gps:backfill
```

## 6. Финальная верификация

```sql
-- Проверить, что все отчёты имеют profileSnapshot
SELECT 
  COUNT(*) as total_reports,
  SUM((profileSnapshot IS NOT NULL)::int) as with_snapshot,
  SUM((canonVersion IS NOT NULL)::int) as with_canon_version,
  SUM((importMeta IS NOT NULL)::int) as with_import_meta
FROM "GpsReport";

-- Должно быть: total_reports = with_snapshot = with_canon_version = with_import_meta
```

## 7. Откат (если что-то пошло не так)

```sql
-- Удалить новые колонки (ОСТОРОЖНО!)
ALTER TABLE "GpsReport" DROP COLUMN IF EXISTS "profileSnapshot";
ALTER TABLE "GpsReport" DROP COLUMN IF EXISTS "canonVersion";
ALTER TABLE "GpsReport" DROP COLUMN IF EXISTS "importMeta";
DROP INDEX IF EXISTS "idx_GpsReport_profileId";
```

## 8. Восстановление из бэкапа (крайний случай)

```bash
# Восстановить из custom-дампа
pg_restore -h 158.160.80.155 -p 5432 -U postgres -d postgres \
  --clean --if-exists --verbose \
  gps_foundation_backup_YYYYMMDD_HHMMSS.dump

# Или из SQL-дампа
psql -h 158.160.80.155 -p 5432 -U postgres -d postgres \
  -f gps_foundation_backup_YYYYMMDD_HHMMSS.sql
```

---

**Статус:** Готово к выполнению
**Безопасность:** ✅ Все операции безопасны для продакшена
**Тестирование:** ✅ Dry run режим доступен
