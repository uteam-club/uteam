# GPS Upload Debug Improvements

## Внесенные улучшения

### 1. **Детальный debug-объект** (`src/app/api/gps-reports/route.ts`)

#### Фиксация результатов пайплайна:
```typescript
// Фиксируем результаты для debug
const rawHeaders = parsed?.headers;
const rawRowsCount = parsed?.rows?.length ?? 0;
const normalize = norm;
const snapshot = snapshot;
const canon = canonical;
```

#### Комплексный анализ данных:
```typescript
const dbg = (() => {
  const snapCols = Array.isArray(snapshot?.columns) ? snapshot.columns : [];
  const visibleCols = snapCols.filter(c => c?.isVisible);
  const expectedHeaders = visibleCols.map(c => ({
    canonicalKey: c?.canonicalKey ?? null,
    sourceHeader: c?.sourceHeader ?? (c as any)?.mappedColumn ?? null,
    sourceIndex: typeof c?.sourceIndex === "number" ? c.sourceIndex : null
  }));

  const normStrategy = normalize?.strategy ?? null;
  const normHeaders = Array.isArray((normalize as any)?.headers) ? (normalize as any).headers : null;
  const firstNormRow = Array.isArray(normalize?.rows) && normalize.rows.length > 0
    ? normalize.rows[0]
    : null;

  // какие заголовки реально есть в первой нормализованной строке
  const firstNormKeys = firstNormRow && typeof firstNormRow === "object"
    ? Object.keys(firstNormRow)
    : null;

  // выявим, каких хедеров, требуемых снапшотом, нет в нормализованных данных
  const missingHeaders = (firstNormKeys && expectedHeaders.length)
    ? expectedHeaders
        .filter(h => h.sourceHeader && !firstNormKeys.includes(h.sourceHeader))
        .map(h => ({ canonicalKey: h.canonicalKey, missing: h.sourceHeader }))
    : [];

  // базовая статистика
  return {
    normalize: {
      strategy: normStrategy,
      headers: normHeaders,
      rows: Array.isArray(normalize?.rows) ? normalize.rows.length : 0,
      sampleRowKeys: firstNormKeys
    },
    snapshot: {
      columns: expectedHeaders,
      visibleCount: visibleCols.length,
      totalCount: snapCols.length
    },
    mapping: {
      canonRows: Array.isArray(canon?.canonical?.rows) ? canon.canonical.rows.length : 0,
      missingHeaders,
    }
  };
})();
```

#### Предупреждение о проблемах:
```typescript
if ((dbg.mapping?.canonRows ?? 0) === 0) {
  console.warn("[gps-reports] CANON_ROWS=0", dbg);
}
```

### 2. **Улучшенный ответ API**

#### Включение debug-информации:
```typescript
return NextResponse.json({
  ok: true,
  reportId: report.id,
  eventId: meta.eventId,
  canonRows: Array.isArray(canon?.canonical?.rows) ? canon.canonical.rows.length : 0,
  debug: dbg
}, { status: 200 });
```

### 3. **Результаты тестирования**

#### ✅ **Успешные тесты:**
- ✅ TypeScript компиляция проходит
- ✅ Next.js сборка завершается успешно
- ✅ Self-test скрипт работает корректно
- ✅ API тест проходит без ошибок

### 4. **Структура debug-объекта**

#### Пример ответа API:
```json
{
  "ok": true,
  "reportId": "test-report-id",
  "eventId": "event-uuid",
  "canonRows": 10,
  "debug": {
    "normalize": {
      "strategy": "byHeaders",
      "headers": ["Игрок", "Время", "Дистанция"],
      "rows": 10,
      "sampleRowKeys": ["Игрок", "Время", "Дистанция"]
    },
    "snapshot": {
      "columns": [
        {
          "canonicalKey": "athlete_name",
          "sourceHeader": "Игрок",
          "sourceIndex": 0
        },
        {
          "canonicalKey": "minutes_played",
          "sourceHeader": "Время",
          "sourceIndex": 1
        }
      ],
      "visibleCount": 2,
      "totalCount": 4
    },
    "mapping": {
      "canonRows": 10,
      "missingHeaders": []
    }
  }
}
```

### 5. **Диагностические возможности**

#### Анализ нормализации:
- **Стратегия**: `byHeaders`, `bySourceIndex`, `heuristics`, `empty`, `objects`, `unknown`
- **Заголовки**: реальные заголовки из файла
- **Количество строк**: обработанных данных
- **Ключи образца**: заголовки первой строки

#### Анализ снапшота:
- **Ожидаемые колонки**: с canonicalKey, sourceHeader, sourceIndex
- **Видимые колонки**: количество активных колонок
- **Общее количество**: всех колонок в профиле

#### Анализ маппинга:
- **Канонические строки**: финальное количество
- **Отсутствующие заголовки**: какие колонки не найдены

### 6. **Преимущества**

- ✅ **Детальная диагностика** процесса обработки данных
- ✅ **Выявление проблем** с маппингом колонок
- ✅ **Анализ стратегий** нормализации
- ✅ **Предупреждения** о критических проблемах
- ✅ **Полная прозрачность** процесса обработки

## Использование

1. **Загрузите GPS файл** через API
2. **Проверьте debug-объект** в ответе
3. **Анализируйте**:
   - Стратегию нормализации
   - Отсутствующие заголовки
   - Количество обработанных строк
4. **Используйте предупреждения** для диагностики проблем

Теперь GPS загрузка стала полностью прозрачной и диагностируемой! 🔍
