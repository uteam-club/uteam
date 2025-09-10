# GPS Upload Cache Improvements

## Внесенные улучшения

### 1. **Серверное кэширование** (`src/app/api/gps-reports/route.ts`)

#### Импорт Next.js cache функций:
```typescript
import { revalidatePath, revalidateTag } from "next/cache";
```

#### Автоматическая инвалидация кэша после загрузки:
```typescript
const canonRowsCount = Array.isArray(canonical?.canonical?.rows) ? canonical.canonical.rows.length : 0;
try {
  // если используем tag-ориентированные выборки — раскомментируй и подставь нужный тег
  // revalidateTag(`gps-events:${meta.teamId}:${meta.eventType}`);
  await revalidatePath("/dashboard/fitness/gps-reports");
} catch (e) {
  console.warn("[gps-reports] revalidate failed", e);
}
```

#### Улучшенный ответ API:
```typescript
return NextResponse.json({
  ok: true,
  reportId: report.id,
  eventId: meta.eventId,
  canonRows: canonRowsCount,
  normalize: ctx.normalize ?? null
}, { status: 200 });
```

### 2. **Клиентское кэширование** (`src/components/gps/UploadGpsReportModal.tsx`)

#### Отсутствие кэша при загрузке списков:
```typescript
const fetchTrainings = async (teamId: string) => {
  const response = await fetch(`/api/trainings?teamId=${teamId}&forUpload=true`, { 
    cache: "no-store" 
  });
  // ...
};

const fetchMatches = async (teamId: string) => {
  const response = await fetch(`/api/matches?teamId=${teamId}&forUpload=true`, { 
    cache: "no-store" 
  });
  // ...
};
```

#### Улучшенная обработка успешного ответа:
```typescript
const json = await res.json();
if (!res.ok || !json?.ok) {
  throw new Error((json?.message || json?.error || "Upload failed"));
}
toast({
  title: "Успешно",
  description: `Отчёт загружен: канонических строк ${json.canonRows ?? 0}`
});
if (json?.canonRows === 0) {
  toast({
    title: "Предупреждение",
    description: "Отчёт загружен, но канонических строк = 0. Проверьте профиль/маппинг.",
    variant: "destructive"
  });
}
try {
  // если у модалки есть состояние выбранного события — зафиксируем его
  if (json?.eventId && typeof setSelectedEvent === "function") {
    setSelectedEvent(json.eventId);
  }
} catch {}
router.refresh();
onClose?.();
```

### 3. **Результаты тестирования**

#### ✅ **Успешные тесты:**
- ✅ TypeScript компиляция проходит
- ✅ Next.js сборка завершается успешно
- ✅ Self-test скрипт работает корректно
- ✅ API тест проходит без ошибок

### 4. **Ожидаемые результаты**

#### После загрузки GPS отчёта:
1. **API вернёт**:
   ```json
   {
     "ok": true,
     "reportId": "test-report-id",
     "eventId": "event-uuid",
     "canonRows": 10,
     "normalize": {
       "strategy": "byHeaders",
       "sizes": { "headers": 4, "rows": 10 },
       "warnings": []
     }
   }
   ```

2. **Выполнится revalidatePath** для `/dashboard/fitness/gps-reports`

3. **Модалка сделает router.refresh()** и новая тренировка появится в селекторе

4. **Пользователь увидит**:
   - Успешное сообщение с количеством канонических строк
   - Предупреждение, если строк = 0
   - Обновленный список тренировок/матчей

### 5. **Преимущества**

- ✅ **Автоматическое обновление UI** после загрузки
- ✅ **Свежие данные** в выпадающих списках
- ✅ **Информативные сообщения** о результате загрузки
- ✅ **Предупреждения** о проблемах с данными
- ✅ **Стабильная работа** с кэшированием Next.js

## Тестирование

1. **Запустите dev-сервер**: `npm run dev`
2. **Откройте GPS Reports** страницу
3. **Загрузите файл** через модальное окно
4. **Проверьте**:
   - Сообщение с количеством строк
   - Обновление списка тренировок
   - Отсутствие необходимости перезагружать страницу
