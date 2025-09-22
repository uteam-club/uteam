# Итоговая структура API для GPS метрик

## 🎯 Что у нас есть в итоге

### 1. API для средних значений (Team Averages & Game Models)
**Эндпоинт:** `/api/gps/canonical-metrics`
- **Назначение:** Только для расчета средних значений команды и игровых моделей
- **Количество метрик:** 48 усредняемых метрик
- **Используется в:**
  - `TeamAverageGauges` компонент
  - `PlayerGameModels` компонент
  - API `/api/gps/reports/[id]/team-averages`
  - API `/api/players/[playerId]/game-model`

### 2. API для маппинга колонок (Column Mapping)
**Эндпоинт:** `/api/gps/canonical-metrics-for-mapping`
- **Назначение:** Для сопоставления колонок GPS файлов с каноническими метриками
- **Количество метрик:** 57 метрик (все активные)
- **Используется в:**
  - `NewGpsReportModal` компонент
  - `ColumnMappingModal` компонент
  - `ColumnMappingStep` компонент
  - `NewGpsProfileModal` компонент
  - `EditGpsProfileModal` компонент

### 3. API для единиц измерения
**Эндпоинт:** `/api/gps/units`
- **Назначение:** Получение единиц измерения для конвертации
- **Формат ответа:** `{ units: [...], groupedUnits: {...} }`
- **Используется во всех компонентах маппинга**

## 📊 Разбивка метрик

### Всего метрик: 57
1. **Identity** (2): athlete_name, position
2. **Participation** (1): duration
3. **Distance** (7): total_distance, distance_zone1-6
4. **Speed** (8): max_speed, avg_speed, time_in_speed_zone1-6
5. **Acceleration** (12): acc_zone1-6_count, dec_zone1-6_count, max_acceleration, max_deceleration
6. **Load** (3): player_load, power_score, work_ratio
7. **Intensity** (4): hsr_distance, sprint_distance, sprints_count, hsr_percentage
8. **Heart Rate** (8): avg_heart_rate, max_heart_rate, time_in_hr_zone1-6
9. **Derived** (12): speed_zone1-6_entries, hml_distance, explosive_distance, distance_per_min, impacts_count

### Усредняемые метрики: 48
Исключены: athlete_name, position, max_speed, avg_speed, max_acceleration, max_deceleration, avg_heart_rate, max_heart_rate, duration

## 🔧 Исправленные проблемы

### 1. Ошибка "units.filter is not a function"
**Проблема:** API `/api/gps/units` возвращает объект `{ units: [...] }`, а код ожидал массив
**Решение:** Изменено `setUnits(unitsData || [])` на `setUnits(unitsData.units || [])`

### 2. Неполный список метрик для маппинга
**Проблема:** Маппинг колонок показывал только 48 метрик вместо 57
**Решение:** Создан отдельный API `/api/gps/canonical-metrics-for-mapping`

### 3. Смешивание ответственности API
**Проблема:** Один API использовался для разных целей
**Решение:** Разделены API по назначению

## ✅ Результат

### Система работает корректно:
- ✅ Маппинг колонок показывает все 57 метрик
- ✅ Средние значения рассчитываются по 48 усредняемым метрикам
- ✅ Единицы измерения загружаются правильно
- ✅ Нет ошибок компиляции
- ✅ Четкое разделение ответственности между API

### Готово к использованию:
- ✅ Загрузка GPS файлов с полным маппингом колонок
- ✅ Создание профилей визуализации
- ✅ Расчет средних значений команды
- ✅ Создание игровых моделей игроков

## 🎉 Заключение

Система GPS метрик полностью функциональна с правильным разделением ответственности между API. Пользователи могут:
1. Сопоставлять любые колонки GPS файлов с 57 каноническими метриками
2. Настраивать профили визуализации
3. Просматривать средние значения команды
4. Анализировать индивидуальные игровые модели игроков

**Дата:** 22 сентября 2025  
**Статус:** ✅ ГОТОВО К ПРОДАКШЕНУ
