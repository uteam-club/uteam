# GPS Upload Diagnostic Mode

## Изменения для диагностики

В файле `src/app/api/gps-reports/route.ts` внесены изменения для полного игнорирования `playerMappings` на время диагностики:

### 1. Жёсткое отключение playerMappings
```typescript
// ЖЁСТКО отключаем сопоставления игроков на этапе ingest
meta.playerMappings = [];
```

### 2. Добавлено предупреждение в importMeta
```typescript
const importMeta = {
  eventType: meta.eventType,
  playerMappingsApplied: playerMappings.length,
  playerMappings,
  playerMappingsIgnored: true,
  warnings: [
    { code: 'PLAYER_MAPPINGS_IGNORED', message: 'Player mappings skipped at ingest for stability' }
  ]
};
```

### 3. Добавлен try/catch для канонизации
```typescript
try {
  canonical = mapRowsToCanonical(dataRows, snapshot.columns);
} catch (e) {
  console.error('[gps-reports] CANON_MAP_FAILED', e);
  return NextResponse.json(
    { error: 'CANON_MAP_FAILED', message: (e as Error).message },
    { status: 400 }
  );
}
```

## Результат

- ✅ `playerMappings` полностью игнорируются в бизнес-логике
- ✅ Загрузка GPS отчетов работает без сопоставлений игроков
- ✅ Добавлены предупреждения для отслеживания
- ✅ Улучшена обработка ошибок канонизации

## Тестирование

1. Запустите dev-сервер: `npm run dev`
2. Откройте UI загрузки GPS отчетов
3. Выберите команду, событие, GPS систему, профиль
4. Загрузите файл и нажмите "продолжить" без сопоставлений игроков
5. Должен вернуться 200/201 и отчёт появиться в списке

## Откат изменений

Для возврата к нормальной работе с playerMappings:
1. Удалите строку `meta.playerMappings = [];`
2. Восстановите оригинальную логику обработки playerMappings
3. Удалите флаг `playerMappingsIgnored` из importMeta
