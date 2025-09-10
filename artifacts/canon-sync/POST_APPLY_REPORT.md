# Canon Registry Sync - Post Apply Report

**Дата:** 2025-09-10T10:32:15.000Z

## Результаты синхронизации

### ✅ Успешно выполнено:
- **MISSING:** 0 (все метрики эталона добавлены)
- **MISMATCH:** 0 (все метрики эталона обновлены)
- **EXTRA:** 49 (помечены как deprecated)

### 📊 Статистика изменений:
- **Добавлено метрик:** 45
- **Обновлено метрик:** 7
- **Помечено deprecated:** 49
- **Всего метрик в реестре:** 104

### 🔄 Обновлённые метрики:
1. `athlete_name` - dimension: identity → text
2. `position` - dimension: identity → text  
3. `total_distance_m` - nameRu: "Общая дистанция" → "Общая дистанция (м)"
4. `hsr_distance_m` - nameRu: "Дистанция HSR" → "Дистанция HSR (м)"
5. `duration_s` - nameRu: "Время на поле (сек)" → "Длительность (сек)"
6. `max_speed_ms` - nameRu: "Максимальная скорость" → "Макс. скорость (м/с)"
7. `hsr_ratio` - unit: "%" → "ratio"

### ➕ Добавленные метрики (45):
- Идентификаторы: `player_external_id`, `gps_system`
- Дистанции: `very_high_speed_distance_m`, `hard_running_distance_m`
- Время: `work_time_s`, `standing_time_s`, `walking_time_s`
- Скорость: `average_speed_ms`, `sprint_max_speed_ms`
- Счётчики: `number_of_sprints_count`, `flying_sprints_count`, `accelerations_count`, etc.
- Соотношения: `sprint_ratio`, `very_high_speed_ratio`, `work_ratio`
- Пульс: `heart_rate_avg_bpm`, `heart_rate_max_bpm`, `heart_rate_time_in_zone_*_s`
- Шаги: `steps_total_count`, `left_foot_contacts_count`, `right_foot_contacts_count`
- Нагрузка: `total_load_au`, `neuromuscular_load_au`, `accumulated_load_au`, `session_rpe_au`
- Энергия/масса: `aee_kcal`, `body_mass_kg`
- Зоны дистанции: `distance_zone_0_m` до `distance_zone_5_m`
- Позиции: `x_pos_m`, `y_pos_m`
- Время работы: `uptime_s`

### ⚠️ Deprecated метрики (49):
Все метрики, не входящие в эталон v1.0.1, помечены как deprecated с причиной "Not in canon v1.0.1".

## Верификация

### ✅ Проверки пройдены:
- MISSING = 0 ✅
- MISMATCH = 0 ✅
- Все метрики эталона присутствуют ✅
- Deprecated метрики сохранены ✅

### 📁 Артефакты:
- `backup.metrics.registry.json` - бэкап исходного реестра
- `PLAN.json` - план изменений
- `REPORT.md` - детальный отчёт
- `POST_APPLY_REPORT.md` - этот отчёт

## Заключение

Реестр успешно синхронизирован с эталоном v1.0.1. Все требуемые метрики добавлены или обновлены, лишние метрики помечены как deprecated без удаления.
