# GPS Module Context

## Ключевые модули (из инвентаризации)

### Канонический слой
- **Реестр метрик**: `src/canon/metrics.registry.json` (50+ метрик, v1.0.1, SI единицы)
- **Конвертация единиц**: `src/canon/units.ts` (convertUnit, toCanonical, fromCanonical)
- **Канон-маппер**: `src/services/canon.mapper.ts` (mapRowsToCanonical, buildCanonColumns)

### Профили GPS
- **Схема БД**: `src/db/schema/gpsProfile.ts` (GpsProfile table)
- **Валидация**: `src/validators/gpsProfile.schema.ts` (Zod схемы, уникальность canonicalKey)

### Импорт данных
- **API импорта**: `src/app/api/gps-reports/route.ts` (POST endpoint)
- **Сервис GPS**: `src/services/gps.service.ts` (processGpsReport, createDefaultBSightProfile)

### Визуализация
- **Основная вкладка**: `src/components/gps/GpsReportsTab.tsx` (загружает живой профиль)
- **Публичная страница**: `src/app/public/gps-report/[token]/page.tsx` (тоже живой профиль)

### Маппинг игроков
- **Сервис**: `src/services/playerMapping.service.ts` (fuzzy matching, переиспользование)

### База данных
- **Схемы**: 
  - `src/db/schema/gpsReport.ts` (GpsReport table)
  - `src/db/schema/gpsProfile.ts` (GpsProfile table) 
  - `src/db/schema/playerMapping.ts` (PlayerMapping table)
- **Миграции**: `drizzle/` (0015_famous_aqueduct.sql и др.)

## Критические проблемы (из отчёта)

1. **НЕТ profileSnapshot** - визуализация использует живой профиль
2. **Вендорские костыли** - `if (gpsSystem === 'B-SIGHT')` в пайплайне
3. **Магические индексы** - `row[0]`, `row[1]`, `row[2]` в коде
4. **НЕТ guard на удаление** - TODO в коде

## План исправления

1. Добавить profileSnapshot и canonVersion в GpsReport
2. Создать чистый ingest сервис без вендорщины
3. Переключить визуализацию на snapshot
4. Реализовать guard на удаление профиля
5. Backfill для старых отчётов
6. Тесты и очистка
