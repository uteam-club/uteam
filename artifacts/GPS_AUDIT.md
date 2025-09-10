# GPS Конвейер - Аудит "As-Is"

## Обзор цепочки обработки

### 1. Создание профиля GPS
**Файл**: `src/components/gps/CreateGpsProfileModal.tsx`
**Функция**: `handleSave()`

**Поля FormData/JSON**:
```typescript
{
  name: string,                    // Название профиля
  gpsSystem: string,              // B-SIGHT, Polar, Catapult, etc.
  columns: Array<{
    type: 'column',
    name: string,                 // displayName
    mappedColumn: string,         // sourceHeader
    canonicalKey: string,         // athlete_name, total_distance_m, etc.
    isVisible: boolean,
    order: number,
    displayUnit: string           // km/h, %, m/s, etc.
  }>
}
```

**API**: `POST /api/gps-profiles`

### 2. Построение снапшота профиля
**Файл**: `src/services/gps/profileSnapshot.service.ts`
**Функция**: `buildProfileSnapshot(profile: GpsProfile)`

**Структура snapshot.columns**:
```typescript
interface ProfileSnapshotColumn {
  sourceHeader: string,           // Исходный заголовок из файла
  canonicalKey: string,           // athlete_name, total_distance_m, etc.
  displayName: string,            // Отображаемое имя
  order: number,                  // Порядок сортировки
  isVisible: boolean,             // Видимость в UI
  unit: string | null,            // Единица из профиля
  transform: string | null,       // Функция преобразования
  displayUnit: string | undefined, // Единица отображения (km/h, %, etc.)
  sourceIndex?: number            // Индекс в исходном файле
}
```

### 3. Загрузка GPS отчёта
**Файл**: `src/app/api/gps-reports/route.ts`
**Функция**: `POST(req: Request)`

**Поля FormData**:
```typescript
// FormData
file: Blob,                      // Excel/CSV файл
meta: string,                    // JSON строка с метаданными

// meta JSON
{
  eventId: string,               // UUID события
  teamId: string,                // UUID команды
  gpsSystem: string,             // B-SIGHT, Polar, etc.
  profileId: string,             // UUID профиля
  fileName: string,              // Имя файла
  eventType: 'TRAINING' | 'MATCH',
  playerMappings: Array<{        // Игнорируется в диагностическом режиме
    sourceName: string,
    selectedPlayerId?: string,
    confidence?: number,
    action?: 'confirm' | 'create'
  }>
}
```

### 4. Нормализация данных
**Файл**: `src/services/gps/normalizeRowsForMapping.ts`
**Функция**: `normalizeRowsForMapping(input: ParsedTable, snapshot: ProfileSnapshot)`

**Стратегии нормализации**:
- `empty` - Нет данных
- `objects` - Уже объекты
- `byHeaders` - По заголовкам файла
- `bySourceIndex` - По sourceIndex из снапшота
- `heuristics` - Эвристический fallback
- `unknown` - Неизвестная форма

**Результат**:
```typescript
{
  rows: Record<string, unknown>[], // Нормализованные строки
  strategy: string,                // Использованная стратегия
  warnings: string[],              // Предупреждения
  sizes: { headers: number, rows: number }
}
```

### 5. Каноническое маппинг
**Файл**: `src/services/canon.mapper.ts`
**Функция**: `mapRowsToCanonical(dataRows, mappedColumns)`

**Канонические единицы** (из `src/canon/metrics.registry.json`):
```typescript
{
  distance: "m",                  // Метры
  time: "s",                     // Секунды
  speed: "m/s",                  // Метры в секунду
  acceleration: "m/s^2",         // Метры в секунду в квадрате
  heart_rate: "bpm",             // Удары в минуту
  count: "count",                // Количество
  load: "AU",                    // Arbitrary Units
  ratio: "ratio",                // Отношение (0-1)
  identity: "string"             // Строка
}
```

**Конвертация единиц**:
- `km/h -> m/s`: ×0.2777777778
- `min -> s`: ×60
- `% -> ratio`: ×0.01
- `km -> m`: ×1000

### 6. Фильтрация строк
**Файл**: `src/services/gps/dataFilter.service.ts`
**Функция**: `filterCanonicalData(rows, columns)`

**Критерии фильтрации**:
- Пустые строки (все значения null/undefined)
- Строки без имени игрока
- Строки с некорректными данными

### 7. Сохранение отчёта
**Файл**: `src/app/api/gps-reports/route.ts`
**Функция**: `POST` (блок persist)

**Структура сохраняемых данных**:
```typescript
{
  id: string,                    // UUID отчёта
  eventId: string,               // UUID события
  teamId: string,                // UUID команды
  profileId: string,             // UUID профиля
  profileSnapshot: ProfileSnapshot, // Снапшот профиля
  processedData: {
    canonical: {
      rows: Record<string, any>[], // Канонические строки
      summary: Record<string, number> // Суммарные метрики
    },
    meta: {
      counts: { input: number, filtered: number, matched: number },
      warnings: string[]
    }
  },
  importMeta: {
    eventType: string,
    playerMappingsApplied: number,
    playerMappings: any[],
    playerMappingsIgnored: boolean,
    warnings: Array<{code: string, message: string}>
  }
}
```

### 8. Получение списка отчётов
**Файл**: `src/app/api/trainings/route.ts` и `src/app/api/matches/route.ts`
**Параметры**: `?teamId=UUID&forUpload=true`

**Структура ответа**:
```typescript
Array<{
  id: string,                    // UUID события
  name: string,                  // Название
  date: string,                  // Дата ISO
  reportId?: string,             // UUID отчёта (если есть)
  reportName?: string            // Название отчёта
}>
```

### 9. Визуализация в таблице
**Файл**: `src/components/gps/GpsReportTable.tsx`
**Функция**: `formatValue(value, col, displayUnit)`

**Единицы отображения**:
- Дистанция: `m`, `km`, `yd`
- Время: `s`, `min`, `h`
- Скорость: `m/s`, `km/h`, `m/min`
- Отношения: `%`, `ratio`
- Частота пульса: `bpm`

## Проблемные места

### 1. canonRows = 0
**Причины**:
- Несоответствие заголовков файла и sourceHeader в профиле
- Пустые данные после фильтрации
- Ошибки в нормализации (неизвестная стратегия)
- Проблемы с маппингом canonicalKey

### 2. Отчёты не появляются в селекторе
**Причины**:
- Отсутствие revalidatePath после сохранения
- Кэширование API запросов
- Неправильные параметры запроса (teamId, eventType)
- Ошибки в базе данных

## Минимальный план фиксов

### 1. Исправление canonRows = 0
```typescript
// В normalizeRowsForMapping.ts
// Добавить fallback для неизвестных заголовков
const fallbackHeaders = snapshot.columns.map(c => c.sourceHeader);
const availableHeaders = headers.filter(h => 
  fallbackHeaders.some(fh => h.toLowerCase().includes(fh.toLowerCase()))
);

// В mapRowsToCanonical.ts
// Добавить валидацию перед созданием canonicalRow
if (Object.keys(canonicalRow).length === 0) {
  warnings.push(`Row ${rowIndex}: No valid data found`);
  continue; // Пропускаем пустые строки
}
```

### 2. Гарантия появления в селекторе
```typescript
// В POST /api/gps-reports
// Добавить revalidateTag для конкретных запросов
await revalidateTag(`gps-events:${meta.teamId}:${meta.eventType}`);
await revalidatePath("/dashboard/fitness/gps-reports");

// В fetchTrainings/fetchMatches
// Убрать кэширование
const response = await fetch(url, { 
  cache: "no-store",
  next: { revalidate: 0 }
});
```

### 3. Улучшение диагностики
```typescript
// Добавить детальное логирование
console.log('[GPS] Normalize strategy:', normStrategy);
console.log('[GPS] Available headers:', headers);
console.log('[GPS] Expected headers:', snapshot.columns.map(c => c.sourceHeader));
console.log('[GPS] Missing headers:', missingHeaders);
console.log('[GPS] Canon rows before filter:', canonRows.length);
console.log('[GPS] Canon rows after filter:', filteredRows.length);
```

### 4. Валидация профиля
```typescript
// В buildProfileSnapshot
// Проверить соответствие canonicalKey и sourceHeader
const invalidColumns = columns.filter(c => 
  !c.canonicalKey || !c.sourceHeader
);
if (invalidColumns.length > 0) {
  warnings.push(`Invalid columns: ${invalidColumns.map(c => c.name).join(', ')}`);
}
```

## Рекомендации

1. **Добавить валидацию** на каждом этапе пайплайна
2. **Улучшить логирование** для диагностики проблем
3. **Реализовать fallback** стратегии для неизвестных форматов
4. **Добавить метрики** для мониторинга успешности обработки
5. **Создать тесты** для каждого этапа пайплайна

## Статистика

- **Файлов в пайплайне**: 15+
- **API endpoints**: 8
- **Стратегии нормализации**: 6
- **Канонических единиц**: 9
- **Точек отказа**: 12+
