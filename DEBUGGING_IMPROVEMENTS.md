# GPS Upload Debugging Improvements

## Внесенные улучшения

### 1. **Серверная диагностика** (`src/app/api/gps-reports/route.ts`)

#### Подробное отслеживание шагов:
```typescript
let step: string = 'start';
const ctx: any = {};

// Каждый этап помечен:
step = 'parse-form';     // чтение FormData
step = 'parse-meta';     // парсинг JSON
step = 'validate-meta';  // валидация Zod
step = 'load-profile';   // загрузка профиля
step = 'build-snapshot'; // создание снапшота
step = 'parse-file';     // парсинг файла
step = 'normalize';      // нормализация данных
step = 'map-to-canon';   // канонизация
step = 'persist';        // сохранение в БД
```

#### Контекстная информация:
```typescript
ctx.snapshotCols = snapshot?.columns?.length ?? 0;
ctx.rawCount = parsed?.rows?.length ?? 0;
ctx.normCount = normalized?.objectRows?.length ?? 0;
ctx.canonCount = canonical?.canonical?.rows?.length ?? 0;
```

#### Улучшенная обработка ошибок:
```typescript
catch (err) {
  const e = err as Error & { code?: string };
  const isValidation = 
    e.code?.endsWith('_REQUIRED') ||
    e.code === 'VALIDATION_ERROR' ||
    (e.name === 'ZodError');

  console.error('[gps-reports] FAILED', { step, ctx, err: e });

  return NextResponse.json({
    error: e.code ?? 'UNEXPECTED',
    step,
    message: e.message,
    debug: process.env.NODE_ENV !== 'production' ? ctx : undefined,
  }, { status: isValidation ? 400 : 500 });
}
```

### 2. **Клиентская диагностика** (`src/components/gps/UploadGpsReportModal.tsx`)

#### Улучшенные сообщения об ошибках:
```typescript
if (!res.ok) {
  let j: any = null;
  try { j = await res.json(); } catch {}
  const msg =
    j?.error
      ? `Ошибка: ${j.error}${j.step ? ` @ ${j.step}` : ''}${j.message ? ` — ${j.message}` : ''}`
      : `Upload failed (${res.status})`;
  toast.error(msg);
  console.error('[uploadReport] failed', res.status, j);
  return;
}
```

## Результат

### В случае ошибки пользователь увидит:
- **Код ошибки**: `VALIDATION_ERROR`
- **Шаг выполнения**: `@ parse-meta`
- **Детали**: `— eventId is required`

### В консоли сервера будет:
```json
{
  "step": "parse-meta",
  "ctx": {
    "snapshotCols": 4,
    "rawCount": 0,
    "normCount": 0,
    "canonCount": 0
  },
  "err": { "message": "eventId is required" }
}
```

## Тестирование

1. **Запустите dev-сервер**: `npm run dev`
2. **Откройте DevTools → Network**
3. **Попробуйте загрузить файл** с неполными данными
4. **Проверьте**:
   - Toast с детальной ошибкой
   - Console сервера с контекстом
   - Network tab с полным ответом API

## Преимущества

- ✅ **Быстрая диагностика**: сразу видно на каком шаге ошибка
- ✅ **Контекстная информация**: количество строк на каждом этапе
- ✅ **Пользовательские сообщения**: понятные ошибки в UI
- ✅ **Отладочная информация**: полный контекст в dev-режиме
