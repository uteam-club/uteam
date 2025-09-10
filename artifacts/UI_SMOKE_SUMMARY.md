# UI Smoke Test Summary

## 1) Что именно не совпало

### Ошибки тестов:
- **Ожидалось**: 4 заголовка таблицы (`thead th`)
- **Получено**: 0 заголовков таблицы
- **Ожидалось**: 5 строк данных
- **Получено**: Неизвестно (тест упал на проверке заголовков)

### Данные в БД:
- **profileSnapshot**: `false` для всех отчётов
- **processedData**: `false` для всех отчётов  
- **rowsCount**: 0 для всех отчётов
- **columns**: пустой массив для всех отчётов

## 2) Вероятная причина

**Основная проблема**: Dev-страница не может отобразить данные, потому что в БД отсутствуют:
1. `profileSnapshot` - нет данных о колонках для отображения
2. `processedData` - нет канонических данных для таблицы

**Корневая причина**: 
- Либо данные не были корректно сохранены при импорте
- Либо структура БД изменилась и старые данные стали недоступными
- Либо dev-страница обращается к неправильным полям БД

## 3) Минимальный план фикса

### Коммит 1: Диагностика данных
- Проверить, что `npm run gps:import:demo` корректно сохраняет `profileSnapshot` и `processedData`
- Добавить логирование в dev-страницу для отладки полей БД
- Исправить запросы к БД в dev-странице (возможно, проблема с регистром полей)

### Коммит 2: Исправление отображения
- Убедиться, что `profileSnapshot.columns` содержит данные
- Убедиться, что `processedData.canonical.rows` содержит данные
- Обновить dev-страницу для корректного отображения таблицы

## 4) Артефакты

### Скриншоты:
- `artifacts/playwright/gps-report-dev-GPS-Report--b7013-orrectly-with-snapshot-data-chromium/test-failed-1.png`
- `artifacts/playwright/gps-report-dev-GPS-Report--50a51-orrectly-with-snapshot-data-chromium/test-failed-1.png`

### Трассы:
- `artifacts/playwright/gps-report-dev-GPS-Report--b7013-orrectly-with-snapshot-data-chromium/trace.zip`
- `artifacts/playwright/gps-report-dev-GPS-Report--50a51-orrectly-with-snapshot-data-chromium/trace.zip`

### Данные:
- `artifacts/ui-inspect.json` - структура данных в БД
- `artifacts/ui-inspect.md` - человекочитаемый отчёт

## 5) Статус инвариантов

- ❌ **Заголовки совпадают со snapshot** - FAIL (нет snapshot в БД)
- ❌ **Ровно 5 строк в таблице** - FAIL (нет данных в БД)  
- ✅ **Страница доступна только в dev** - PASS (NODE_ENV guard работает)
