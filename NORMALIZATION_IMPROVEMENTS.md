# GPS Normalization Improvements

## Внесенные улучшения

### 1. **Новый нормализатор** (`src/services/gps/normalizeRowsForMapping.ts`)

#### Безопасная архитектура:
- **Никогда не кидает исключения** - всегда возвращает результат
- **Подробная диагностика** - стратегия, размеры, предупреждения
- **Множественные стратегии** - от простых до эвристических

#### Стратегии нормализации:
```typescript
type Strategy = 
  | "empty"           // Нет данных
  | "objects"         // Уже объекты
  | "byHeaders"       // По заголовкам
  | "bySourceIndex"   // По sourceIndex из снапшота
  | "heuristics"      // Эвристический fallback
  | "unknown";        // Неизвестная форма
```

#### Безопасная обработка:
```typescript
// Проверки типов
const isStringArray = (a: unknown): a is string[] => 
  Array.isArray(a) && a.every(v => typeof v === "string");

const isObjectRow = (v: unknown): v is Record<string, unknown> => 
  !!v && typeof v === "object" && !Array.isArray(v);

// Никогда не падает
export function normalizeRowsForMapping(input: ParsedTable, snapshot: ProfileSnapshot): NormalizeResult {
  // ... безопасная логика
}
```

### 2. **Улучшенная диагностика** (`src/app/api/gps-reports/route.ts`)

#### Безопасный вызов нормализатора:
```typescript
step = 'normalize';
let norm;
try {
  const parsedSafe = {
    headers: Array.isArray(parsed?.headers) ? parsed.headers as string[] : [],
    rows: Array.isArray(parsed?.rows) ? parsed.rows as unknown[] : [],
  };
  norm = normalizeRowsForMapping(parsedSafe, snapshot);
  ctx.normalize = { strategy: norm.strategy, sizes: norm.sizes, warnings: norm.warnings };
} catch (e: any) {
  ctx.errorAt = "normalize";
  ctx.normalizeError = String(e?.message ?? e);
  console.error("[gps-reports] normalize FAILED", { ctx });
  return NextResponse.json({ error: "UNEXPECTED", step: "normalize", message: ctx.normalizeError }, { status: 500 });
}
```

#### Расширенная статистика:
```typescript
stats: {
  raw: ctx.rawCount ?? 0,           // Сырые строки
  normalize: ctx.normalize ?? null, // Стратегия + размеры + предупреждения
  canon: ctx.canonCount ?? 0,       // Канонические строки
  warnings: canonical.meta.warnings?.length ?? 0,
}
```

### 3. **Результаты тестирования**

#### ✅ **Успешные тесты:**
- ✅ TypeScript компиляция проходит
- ✅ Next.js сборка завершается успешно
- ✅ Self-test скрипт работает корректно
- ✅ API тест проходит без ошибок

#### 📊 **Ожидаемые результаты:**
- **Ошибки "Cannot read … length" больше нет**
- **В ответе API видна стратегия normalize**: `byHeaders` | `bySourceIndex` | `heuristics`
- **Если снапшот не совпадает с данными** - отчёт всё равно создаётся
- **В warnings будут причины** проблем с нормализацией

### 4. **Примеры ответов API**

#### Успешная нормализация:
```json
{
  "ok": true,
  "id": "test-report-id",
  "stats": {
    "raw": 10,
    "normalize": {
      "strategy": "byHeaders",
      "sizes": { "headers": 4, "rows": 10 },
      "warnings": []
    },
    "canon": 10,
    "warnings": 0
  }
}
```

#### Нормализация с предупреждениями:
```json
{
  "ok": true,
  "id": "test-report-id",
  "stats": {
    "raw": 10,
    "normalize": {
      "strategy": "heuristics",
      "sizes": { "headers": 0, "rows": 10 },
      "warnings": ["HEURISTIC_FALLBACK"]
    },
    "canon": 10,
    "warnings": 0
  }
}
```

## Преимущества

- ✅ **Стабильность**: Нормализатор никогда не падает
- ✅ **Диагностика**: Подробная информация о процессе
- ✅ **Гибкость**: Множественные стратегии обработки
- ✅ **Отказоустойчивость**: Работает даже с неполными данными
- ✅ **Мониторинг**: Детальная статистика в ответах API
