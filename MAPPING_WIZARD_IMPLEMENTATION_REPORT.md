# MAPPING_WIZARD_IMPLEMENTATION_REPORT.md

## Изменённые файлы

### 1. Схема БД
- **`src/db/schema/gpsPlayerMapping.ts`**: Обновлена схема
  - `playerId` → nullable (для "Без привязки")
  - Добавлено `isManual: boolean` (default: false)
  - Добавлено `similarity: integer` (nullable)
  - Добавлен уникальный индекс `(gpsReportId, rowIndex)`

### 2. Миграция
- **`drizzle/0027_update_gps_player_mapping_schema.sql`**: Создана миграция для обновления схемы

### 3. Типы
- **`src/types/gps.ts`**: Обновлены типы
  - `GpsPlayerMapping.playerId: string | null`
  - `GpsPlayerMapping.isManual: boolean`
  - `GpsPlayerMapping.similarity?: number | null`
  - `CreateGpsPlayerMappingRequest` с новыми полями
  - `CreateGpsPlayerMappingBatchRequest` для батч-операций

### 4. Сервисы
- **`src/services/gps.service.ts`**: Обновлены сервисы
  - `createGpsPlayerMapping` поддерживает nullable playerId, isManual, similarity
  - Добавлен `bulkCreateGpsPlayerMappings` для батч-создания

### 5. API
- **`src/app/api/gps/reports/[id]/mappings/route.ts`**: Обновлен API
  - POST поддерживает `playerId: null`, `isManual`, `similarity`
  - Добавлен PATCH для батч-создания маппингов
  - Валидация обновлена

### 6. Визард
- **`src/components/gps/NewUploadGpsReportModal.tsx`**: Добавлен feature flag
  - `USE_INLINE_MAPPING = true` для переключения между встроенным и внешним маппингом
  - Условный рендер `UploadWizardMappingStep` при `step === 'mapping'`
  - Старый `SmartPlayerMappingModal` остаётся как fallback

### 7. Новый компонент
- **`src/components/gps/UploadWizardMappingStep.tsx`**: Встроенный шаг маппинга
  - Группы: Высокое/Среднее/Низкое/Игрок не найден/Ручной выбор
  - Опция "Без привязки" (playerId: null)
  - Тусклые карточки для unassigned игроков
  - Батч-сохранение через PATCH API
  - Сохранение similarity и isManual

### 8. Визуализация
- **`src/components/gps/GpsReportVisualization.tsx`**: Защита от null
  - Guard для `mapping.playerId !== null` в `getPlayerDisplayName`
  - Фильтрация только сопоставленных игроков (исключение unassigned)

## Новые возможности

### Схема БД
- **Nullable playerId**: Поддержка "Без привязки"
- **isManual**: Отметка ручных правок
- **similarity**: Сохранение процента сходства
- **Уникальность**: Предотвращение дублирования маппингов

### API
- **PATCH /api/gps/reports/[id]/mappings**: Батч-создание маппингов
- **Поддержка null**: playerId может быть null
- **Новые поля**: isManual, similarity в payload

### UI/UX
- **Встроенный шаг**: Маппинг внутри визарда (не внешняя модалка)
- **Группировка**: 5 групп по уровню сходства и типу выбора
- **"Без привязки"**: Опция в селекте с value=null
- **Тусклые карточки**: opacity-50 для unassigned игроков
- **Информационные сообщения**: Пояснения о поведении unassigned строк

## Чек-лист UX-требований

- [x] **Шаг «Маппинг игроков» внутри визарда** - реализовано через `UploadWizardMappingStep`
- [x] **Группы: Высокое/Среднее/Низкое/Игрок не найден/Ручной выбор** - реализовано в `similarityGroups`
- [x] **Пункт «Без привязки» (value=null)** - реализовано в селекте
- [x] **Тусклые карточки для unassigned** - реализовано через `opacity-50`
- [x] **Батч-сохранение** - реализовано через PATCH API
- [x] **Сохранение similarity и isManual** - реализовано в `bulkCreateGpsPlayerMappings`
- [x] **Старый SmartPlayerMappingModal за фичефлагом** - реализовано через `USE_INLINE_MAPPING`
- [x] **Защита визуализации от null** - реализовано в `GpsReportVisualization`

## Статусы проверок

- **TypeScript**: ✅ `npm run typecheck:ci` - успешно
- **Lint**: ⚠️ `npm run lint` - ошибки конфигурации ESLint (не связаны с изменениями)
- **Build**: ✅ `npm run build` - успешно

## Нюансы и границы

### Что НЕ изменено
- Контракты вне маппинга/визарда остались прежними
- API `/process-file` не расширен (используется существующая логика)
- Пороги сходства выровнены на текущие (80/60/50)

### Feature Flag
- `USE_INLINE_MAPPING = true` - можно легко переключить на старую логику
- Старый `SmartPlayerMappingModal` остаётся как fallback

### Безопасность
- Все операции защищены guards на `clubId/ownership`
- Батч-операции проверяют принадлежность отчёта клубу

### Миграция
- Создана, но не применена (только код)
- Безопасная: не ломает существующие данные
- Добавляет новые колонки с дефолтными значениями

## Готово к тестированию

Реализация полностью соответствует требованиям:
- Встроенный шаг маппинга в визарде
- Поддержка "Без привязки" через nullable playerId
- Группировка по уровням сходства
- Батч-сохранение с сохранением метаданных
- Защита от регрессов в визуализации
- Feature flag для отката к старой логике
