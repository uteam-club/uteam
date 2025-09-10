# GPS Debug Диагностика

## Обзор

Добавлена неинвазивная диагностика в `POST /api/gps-reports` для анализа проблем с `canonRows = 0` и отсутствием отчётов в селекторе.

## Функциональность

### 1. Автоматическое сохранение debug данных

После каждого успешного POST запроса в `/api/gps-reports` создаётся файл:
```
artifacts/last-upload-debug.json
```

### 2. Структура debug данных

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "meta": {
    "eventId": "uuid",
    "teamId": "uuid", 
    "profileId": "uuid",
    "fileName": "report.csv",
    "eventType": "TRAINING"
  },
  "debug": {
    "normalize": {
      "strategy": "byHeaders|bySourceIndex|heuristics|empty|objects|unknown",
      "headers": ["Игрок", "Время", "Дистанция"],
      "rows": 2,
      "sampleRowKeys": ["Игрок", "Время", "Дистанция"]
    },
    "snapshot": {
      "columns": [
        {
          "canonicalKey": "athlete_name",
          "sourceHeader": "Игрок", 
          "sourceIndex": 0
        }
      ],
      "visibleCount": 3,
      "totalCount": 3
    },
    "mapping": {
      "canonRows": 2,
      "missingHeaders": [
        {
          "canonicalKey": "athlete_name",
          "missing": "Игрок"
        }
      ]
    }
  }
}
```

### 3. Консольные предупреждения

При `canonRows = 0` выводится:
```
[gps-reports] CANON_ROWS=0 { debug object }
```

## Тестирование

### 1. Self-test (без API)
```bash
npm run gps:test-debug
```

### 2. API тест (требует запущенный сервер)
```bash
# В одном терминале
npm run dev

# В другом терминале  
npm run gps:test-debug:api
```

## Анализ проблем

### canonRows = 0

**Возможные причины:**
1. **Несоответствие заголовков**: `sourceHeader` в профиле не найден в файле
2. **Пустые данные**: Все строки отфильтрованы как пустые
3. **Ошибки нормализации**: Стратегия `unknown`
4. **Проблемы маппинга**: `canonicalKey` не найден

**Диагностика:**
- Проверить `debug.normalize.strategy`
- Сравнить `debug.normalize.sampleRowKeys` с `debug.snapshot.columns[].sourceHeader`
- Проверить `debug.mapping.missingHeaders`

### Отчёты не появляются в селекторе

**Возможные причины:**
1. **Отсутствие revalidatePath**: Кэш не обновляется
2. **Ошибки в API**: Неправильные параметры запроса
3. **Проблемы с БД**: Отчёт не сохраняется

**Диагностика:**
- Проверить логи сервера на ошибки
- Убедиться что `revalidatePath` вызывается
- Проверить параметры запроса в `debug.meta`

## Рекомендации

1. **Регулярно проверяйте** `artifacts/last-upload-debug.json`
2. **Мониторьте консоль** на предупреждения `CANON_ROWS=0`
3. **Используйте тесты** для проверки debug-функциональности
4. **Анализируйте missingHeaders** для улучшения профилей

## Файлы

- `src/app/api/gps-reports/route.ts` - основная диагностика
- `scripts/gps/test-debug-upload.cjs` - self-test
- `scripts/gps/test-debug-api.cjs` - API тест
- `artifacts/last-upload-debug.json` - debug данные
