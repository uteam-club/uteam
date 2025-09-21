# GPS Analysis Tab Full Audit Report

## Overview

Вкладка "Анализ" (`GpsAnalysisTab`) рендерит комплексную систему визуализации GPS отчетов, состоящую из:

- **Селектор отчетов** (`GpsReportSelector`) - выбор команды и события
- **Основная визуализация** (`GpsReportVisualization`) - таблица данных с метриками
- **Модал загрузки** (`NewUploadGpsReportModal`) - загрузка новых отчетов

**Маршрут:** `src/app/dashboard/fitness/gps-reports/page.tsx:47-49`

## Data Flow

```
1. GpsAnalysisTab (src/components/gps/GpsAnalysisTab.tsx:23-72)
   ↓
2. GpsReportSelector → handleReportSelected()
   ↓
3. Параллельная загрузка данных:
   - getGpsProfileById() → профиль GPS
   - getGpsColumnMappingsByProfileId() → маппинги колонок
   - fetchGpsPlayerMappings() → маппинги игроков
   - fetch('/api/gps/reports/[id]/data') → сырые данные
   ↓
4. GpsReportVisualization (src/components/gps/GpsReportVisualization.tsx:166-875)
   ↓
5. Рендеринг таблицы с данными и сравнениями
```

## DB Schema & Services

### Используемые таблицы:
- `gpsReport` - отчеты GPS (src/db/schema/gpsReport.ts:1-34)
- `gpsProfile` - профили GPS (src/db/schema/gpsProfile.ts:1-12)
- `gpsColumnMapping` - маппинги колонок (src/db/schema/gpsColumnMapping.ts:1-15)
- `gpsPlayerMapping` - маппинги игроков (src/db/schema/gpsPlayerMapping.ts:1-14)

### API эндпоинты:
- `GET /api/gps/reports/[id]/data` - данные отчета (src/app/api/gps/reports/[id]/data/route.ts:10-118)
- `GET /api/gps/profiles/[id]/mappings` - маппинги профиля (src/app/api/gps/profiles/[id]/mappings/route.ts:17-42)
- `GET /api/gps/reports/[id]/mappings` - маппинги игроков (src/app/api/gps/reports/[id]/mappings/route.ts:24-43)

### Сервисы:
- `getGpsReportById()` - получение отчета (src/services/gps.service.ts:227-239)
- `getGpsColumnMappingsByProfileId()` - маппинги колонок (src/services/gps.service.ts:381-403)
- `fetchGpsPlayerMappings()` - маппинги игроков (src/lib/gps-api.ts:276-279)

## Canonical Metrics & Units

### Конвертация единиц:
**Файл:** `src/lib/canonical-metrics.ts:132-214`
```typescript
export function formatMetricValue(value: number, metricKey: string, unit?: string): string
```

### Использование displayUnit:
**Файл:** `src/components/gps/GpsDataTable.tsx:35-62`
```typescript
const formatValueWithDisplayUnit = (value: number, canonicalMetric: string, fallbackUnit: string, columnMappings?: GpsColumnMapping[]): string => {
  const mapping = columnMappings?.find(m => m.canonicalMetric === canonicalMetric);
  let displayUnit = mapping?.displayUnit;
  if (!displayUnit) {
    displayUnit = getCanonicalUnitForMetric(canonicalMetric);
  }
  return formatMetricValue(value, canonicalMetric, displayUnit);
}
```

### Единый пайплайн:
- **GpsDataTable** - использует `formatValueWithDisplayUnit()` (src/components/gps/GpsDataTable.tsx:196-201)
- **GpsCharts** - использует `formatValue()` (src/components/gps/GpsCharts.tsx:58-79)
- **GpsReportVisualization** - НЕ использует конвертацию единиц (src/components/gps/GpsReportVisualization.tsx:319)

## Column Order vs Canonical-Key

### ORDER-BASED места (критично):

**1. GpsReportVisualization - рендеринг таблицы:**
**Файл:** `src/components/gps/GpsReportVisualization.tsx:646`
```typescript
{columnMappings.map((mapping, index) => {
```
**Проблема:** Прямое использование порядка массива без сортировки.

**2. GpsReportVisualization - рендеринг данных:**
**Файл:** `src/components/gps/GpsReportVisualization.tsx:684`
```typescript
{columnMappings.map((mapping) => {
```
**Проблема:** Порядок данных зависит от порядка массива.

**3. GpsDataTable - рендеринг метрик:**
**Файл:** `src/components/gps/GpsDataTable.tsx:169`
```typescript
{allMetrics.map((metricKey) => (
```
**Проблема:** Порядок метрик определяется порядком массива.

### KEY-BASED места (безопасно):

**1. Поиск маппинга по canonicalMetric:**
**Файл:** `src/components/gps/GpsDataTable.tsx:43`
```typescript
const mapping = columnMappings?.find(m => m.canonicalMetric === canonicalMetric);
```

**2. Поиск колонки с именами:**
**Файл:** `src/components/gps/GpsReportVisualization.tsx:522`
```typescript
const playerColumn = columnMappings.find(m => m.canonicalMetric === 'athlete_name');
```

## "30 дней/тот же тег/тип" — логика сравнения

### Критерии сравнения:
**Файл:** `src/components/gps/GpsReportVisualization.tsx:411-424`
```typescript
const EXCLUDED_FROM_AVERAGES = [
  'athlete_name',
  'time',
  'position',
  'jersey_number',
  'team_name'
];
```

### Логика получения средних:
**Файл:** `src/components/gps/GpsReportVisualization.tsx:457-517`
```typescript
const averages = useMemo(() => {
  if (!comparisonData?.aggregatedData?.averages) {
    return {};
  }
  
  const averages: Record<string, number | string> = {};
  
  columnMappings
    .filter(mapping => mapping.isVisible)
    .forEach(mapping => {
      const isNotExcluded = !EXCLUDED_FROM_AVERAGES.includes(mapping.canonicalMetric);
      if (isNotExcluded) {
        const average = comparisonData.aggregatedData.averages[mapping.canonicalMetric];
        if (average !== undefined) {
          averages[mapping.canonicalMetric] = average;
        }
      }
    });
    
  return averages;
}, [comparisonData, columnMappings]);
```

### Проблемы:
- **Нет фильтрации по 30 дням** - логика не найдена
- **Нет фильтрации по тегу** - поле тега не найдено в схеме
- **Нет фильтрации по типу события** - сравнение не учитывает eventType
- **Текущий отчет не исключается** - может сравниваться сам с собой

## Player Mapping in Analysis

### Фильтрация unassigned:
**Файл:** `src/components/gps/GpsReportVisualization.tsx:676-680`
```typescript
const originalRowIndex = playerMappings.find(mapping => 
  mapping.playerId === getPlayerDisplayName(index, mapping.sourceColumn, rawValue)
)?.rowIndex ?? index;
```

### Обработка null playerId:
**Файл:** `src/components/gps/UploadWizardMappingStep.tsx:537`
```typescript
teamPlayerId: finalPlayer?.id || null,
teamPlayer: finalPlayer,     // null если score < NONE_THRESHOLD или уже используется
```

### Проблемы:
- **Нет явной фильтрации unassigned** - все строки показываются
- **Нет обработки null playerId** - может вызывать ошибки

## Performance & Cache

### CSR/SSR/ISR:
- **CSR** - все данные загружаются на клиенте (src/components/gps/GpsAnalysisTab.tsx:23-72)
- **Нет SWR/React Query** - используется обычный fetch
- **Нет кэширования** - данные загружаются при каждом выборе отчета

### Тяжелые payload'ы:
**Файл:** `src/app/api/gps/reports/[id]/data/route.ts:79-81`
```typescript
const columns = Array.isArray(rawData) && rawData.length > 0
  ? Object.keys(rawData[0])
  : [];
```
**Проблема:** Весь rawData загружается в память без пагинации.

### N+1 вызовы:
**Файл:** `src/components/gps/GpsAnalysisTab.tsx:33-45`
```typescript
const profile = await getGpsProfileById(report.profileId);
const mappings = await getGpsColumnMappingsByProfileId(profile.id);
const playerMaps = await fetchGpsPlayerMappings(report.id);
```
**Проблема:** 4 последовательных API вызова для загрузки одного отчета.

## Security

### Guards и проверки:
**Файл:** `src/services/gps.service.ts:5`
```typescript
import { ensureProfileOwned, ensureReportOwned, ensureMappingOwned } from '@/services/guards/ownership';
```

### Проверки clubId:
**Файл:** `src/app/api/gps/reports/[id]/data/route.ts:15-18`
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.clubId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Проблемы:
- **Все эндпоинты защищены** - есть проверки clubId
- **Нет прямых SQL инъекций** - используется Drizzle ORM
- **Нет XSS уязвимостей** - данные экранируются

## Edge Cases & Flags

### Фичефлаги:
**Файл:** `src/components/gps/NewUploadGpsReportModal.tsx:158-159`
```typescript
// Feature flag для встроенного маппинга
const USE_INLINE_MAPPING = true; // v2 - исправлены ложные срабатывания
```

### Обработка ошибок:
**Файл:** `src/components/gps/GpsAnalysisTab.tsx:62-71`
```typescript
} catch (error) {
  console.error('Error loading report data:', error);
  toast({
    title: 'Ошибка',
    description: 'Не удалось загрузить данные отчета',
    variant: 'destructive',
  });
}
```

### Проблемы:
- **Молчаливые падения** - некоторые ошибки только в console.error
- **Нет retry логики** - при ошибке сети пользователь должен повторить
- **Нет graceful degradation** - при ошибке показывается пустой экран

## Risks

### Критические риски:

1. **ORDER-BASED рендеринг** (src/components/gps/GpsReportVisualization.tsx:646,684)
   - При изменении displayOrder порядок колонок в таблице изменится
   - Существующие отчеты будут показывать новый порядок

2. **Отсутствие снапшота порядка** (src/db/schema/gpsReport.ts:26)
   - Поле profileSnapshot существует, но не используется для порядка колонок
   - Нет консистентности между отчетами

3. **Некорректная логика сравнения** (src/components/gps/GpsReportVisualization.tsx:457-517)
   - Нет фильтрации по 30 дням, тегу, типу события
   - Текущий отчет может сравниваться сам с собой

4. **Производительность** (src/components/gps/GpsAnalysisTab.tsx:33-45)
   - 4 последовательных API вызова
   - Весь rawData загружается в память
   - Нет кэширования

5. **Обработка unassigned игроков** (src/components/gps/GpsReportVisualization.tsx:676-680)
   - Нет явной фильтрации строк без привязки к игрокам
   - Может показывать некорректные данные

## Recommendations

### Критические исправления:

1. **Исправить ORDER-BASED рендеринг:**
```typescript
// В GpsReportVisualization.tsx
{columnMappings
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((mapping, index) => {
```

2. **Добавить снапшот порядка в отчеты:**
```typescript
// При создании отчета
profileSnapshot: {
  columnOrder: columnMappings
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(m => ({ id: m.id, sourceColumn: m.sourceColumn, canonicalMetric: m.canonicalMetric }))
}
```

3. **Исправить логику сравнения:**
```typescript
// Добавить фильтрацию по дате, тегу, типу события
const comparisonReports = reports.filter(r => 
  r.eventType === currentReport.eventType &&
  r.createdAt >= thirtyDaysAgo &&
  r.id !== currentReport.id
);
```

4. **Оптимизировать производительность:**
```typescript
// Объединить API вызовы
const [profile, mappings, playerMaps, reportData] = await Promise.all([
  getGpsProfileById(report.profileId),
  getGpsColumnMappingsByProfileId(profile.id),
  fetchGpsPlayerMappings(report.id),
  fetch(`/api/gps/reports/${report.id}/data`)
]);
```

5. **Добавить фильтрацию unassigned:**
```typescript
// Фильтровать строки без привязки к игрокам
const assignedRows = rawData.filter((row, index) => 
  playerMappings.some(mapping => mapping.rowIndex === index && mapping.playerId)
);
```

## Test Plan

### Ручные проверки:

1. **Тест порядка колонок:**
   - Изменить displayOrder в профиле
   - Убедиться, что порядок в таблице изменился
   - Проверить, что старые отчеты показывают старый порядок

2. **Тест сравнения:**
   - Создать отчеты за разные периоды
   - Проверить, что сравнение работает корректно
   - Убедиться, что текущий отчет не сравнивается сам с собой

3. **Тест маппинга игроков:**
   - Загрузить отчет без привязки игроков
   - Убедиться, что строки показываются корректно
   - Проверить, что unassigned строки обрабатываются

4. **Тест производительности:**
   - Загрузить большой отчет (>1000 строк)
   - Измерить время загрузки
   - Проверить, что UI не блокируется

5. **Тест ошибок:**
   - Отключить сеть при загрузке отчета
   - Проверить, что показывается ошибка
   - Убедиться, что есть возможность повторить

### Автотесты:

1. **Тест порядка колонок** - проверить, что порядок соответствует displayOrder
2. **Тест снапшота** - проверить, что порядок в отчете не меняется при изменении профиля
3. **Тест сравнения** - проверить, что сравнение работает корректно
4. **Тест маппинга игроков** - проверить, что unassigned строки обрабатываются
5. **Тест производительности** - проверить, что большие отчеты загружаются за разумное время

### Чек-лист перед релизом:

- [ ] ORDER-BASED рендеринг исправлен
- [ ] Снапшот порядка реализован
- [ ] Логика сравнения исправлена
- [ ] Производительность оптимизирована
- [ ] Фильтрация unassigned добавлена
- [ ] Автотесты покрывают все сценарии
- [ ] Ручное тестирование пройдено
- [ ] Документация обновлена
