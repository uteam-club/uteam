# Post-Sync Canon Guards Report

**Дата:** 2025-09-10T10:45:00.000Z

## Сводка внедрённых гвардов

### 1. Deprecated метрики в коде/БД

**Найдено deprecated ссылок:**
- **Код:** 27 упоминаний deprecated метрик
- **Профили:** 0 с deprecated метриками  
- **Отчёты:** 0 с deprecated метриками

**Deprecated метрики (49):**
- acc_zone1_count, acc_zone2_count, acc_zone3_count, acc_zone4_count, acc_zone5_count, acc_zone6_count
- avg_heart_rate_bpm, avg_speed_ms
- dec_zone1_count, dec_zone2_count, dec_zone3_count, dec_zone4_count, dec_zone5_count, dec_zone6_count
- distance_zone1_m, distance_zone2_m, distance_zone3_m, distance_zone4_m, distance_zone5_m, distance_zone6_m
- explosive_distance_m, hml_distance_m, impacts_count
- max_acceleration_ms2, max_deceleration_ms2
- player_load_au, power_score_wkg
- speed_zone1_entries, speed_zone2_entries, speed_zone3_entries, speed_zone4_entries, speed_zone5_entries, speed_zone6_entries
- sprint_distance_m, sprints_count
- time_in_hr_zone1_s, time_in_hr_zone2_s, time_in_hr_zone3_s, time_in_hr_zone4_s, time_in_hr_zone5_s, time_in_hr_zone6_s
- time_in_speed_zone1_s, time_in_speed_zone2_s, time_in_speed_zone3_s, time_in_speed_zone4_s, time_in_speed_zone5_s, time_in_speed_zone6_s
- top_heart_rate_bpm, work_ratio_percent

### 2. Гварды при создании/редактировании GPS-профиля

**Добавлены проверки в `src/validators/gpsProfile.schema.ts`:**

#### 2.1 Запрет deprecated метрик
- ❌ **Запрещено:** Сохранение колонок с `canonicalKey` из deprecated метрик
- 📝 **Ошибка:** "Метрика «{name}» устарела и недоступна"

#### 2.2 Валидация displayUnit
- ✅ **Обязательно для ratio/ratio:** Требуется указать `displayUnit` (% или ratio)
- ✅ **Валидация speed m/s:** Разрешены только 'm/s' и 'km/h'
- ✅ **Валидация time:** Разрешены 's', 'min', 'h'
- ✅ **Валидация distance:** Разрешены 'm', 'km', 'yd'
- 📝 **Ошибки:** "Не указана единица отображения для «{name}»", "Недопустимая единица отображения для «{name}»"

#### 2.3 Обновление buildProfileSnapshot
- ✅ **Приоритет displayUnit:** Профиль > эвристика > canonical unit
- ✅ **Перенос в snapshot:** `displayUnit` сохраняется в `profileSnapshot.columns[]`

### 3. Предупреждение о неверном маппинге имени игрока

**Добавлена проверка в `src/app/api/gps-reports/route.ts`:**

#### 3.1 Детекция позиций в athlete_name
- 🔍 **Паттерны позиций:** CB, MF, W, S, GK, ST, CM, DM, AM, RM, LM, RW, LW, CF, SS, ВР, ЦЗ, ЛЗ, ПЗ, Н, ПФ, ЛФ, ЦП, ОП, АП, ПП, ЛП, Ф
- 📊 **Порог срабатывания:** >60% значений из первых 50 строк
- ⚠️ **Warning код:** `ATHLETE_NAME_SUSPECT`
- 📝 **Сообщение:** "Колонка имени содержит, похоже, позиции. Проверьте маппинг в профиле."

#### 3.2 Логика проверки
```typescript
const positionCount = nameValues.filter(name => {
  const trimmed = name.trim().toUpperCase();
  return positionPatterns.includes(trimmed) || 
         (trimmed.length <= 3 && /^[A-ZА-ЯЁ]+$/.test(trimmed));
}).length;

const positionRatio = positionCount / totalValidNames;
if (positionRatio > 0.6) {
  // Добавляем warning
}
```

### 4. UI: отображение строго по snapshot + единицы

**Обновлён `src/components/gps/GpsReportTable.tsx`:**

#### 4.1 Строгое использование snapshot
- ✅ **Источник данных:** Только `report.profileSnapshot.columns`
- ❌ **Убран fallback:** К живому профилю/сырым ключам

#### 4.2 Правильная конвертация единиц
- ✅ **Однократная конвертация:** `fromCanonical(canonicalValue, canonicalUnit, displayUnit)`
- ✅ **Только форматирование:** `formatDisplayValue(convertedValue, displayUnit)`
- ❌ **Убрано двойное умножение:** Нет повторной математики %*100

#### 4.3 Unit-тесты
- ✅ **HSR тест:** 0.085 ratio + displayUnit='%' → 8.5% (без двойного умножения)
- ✅ **Speed тест:** 7.78 m/s + displayUnit='km/h' → 28.0
- ✅ **Time тест:** 90 s + displayUnit='min' → 1.5
- ✅ **Distance тест:** 5000 m + displayUnit='km' → 5.0

### 5. Где срабатывает предупреждение ATHLETE_NAME_SUSPECT

**Сценарии срабатывания:**
1. **Профиль "Test":** Колонка "Игрок" маппится на позиции (MF, W, S, CB)
2. **Неправильный маппинг:** Когда `athlete_name` указывает на колонку с позициями
3. **Автоматическое обнаружение:** При загрузке отчёта через API

**Визуализация:**
- 🚨 **Баннер-подсказка:** Отображается в UI при наличии warning
- 📊 **Статистика:** Показывает процент позиций в колонке имён
- 🔧 **Рекомендация:** Предлагает проверить маппинг в профиле

## Заключение

Все гварды успешно внедрены:
- ✅ **Deprecated метрики:** Заблокированы в профилях
- ✅ **DisplayUnit:** Валидация и перенос в snapshot
- ✅ **Имена игроков:** Автоматическое обнаружение позиций
- ✅ **UI отображение:** Строго по snapshot без двойных конвертаций
- ✅ **Unit-тесты:** Покрывают все сценарии конвертации

Система теперь защищена от ошибок профилей и корректно отображает единицы.
