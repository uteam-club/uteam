# CANON AUDIT — Read-only отчёт

## Сводка
- Метрики проверено: 8
- Измерения проверено: 4
- Конвертер: проверены ключевые правила (km/h↔m/s, %↔ratio)
- UI: fromCanonical найден, повторного % нет

### ❌ Итог: найдено расхождений: 4

## PASS детали
- FORMULA ✅ "minutes_played" duration_s/60
- FORMULA ✅ "max_speed_kmh" max_speed_ms*3.6
- FORMULA ✅ "distance_per_min_m" total_distance_m/(duration_s/60)
- UI ✅ fromCanonical используется, повторного умножения на 100 нет

## FAIL детали
- UNITS ❌ отсутствует правило: km/h -> m/s
- UNITS ❌ отсутствует правило: m/s -> km/h
- UNITS ❌ отсутствует правило: % -> ratio
- UNITS ❌ не найдено явной обратной конвертации ratio -> % (ожидаем деление на 0.01 или пометку 'ratio->%')

## Рекомендации по исправлению
- Убедиться, что единицы для speed/ratio/time/distance соответствуют эталону (см. metrics.registry.json).
- Для процентов: хранить как ratio в каноне, а в UI показывать '%' через fromCanonical без повторного *100.
- Для скорости: хранить m/s, показывать km/h при выборе метрики *_kmh или displayUnit='km/h'.
- Проверить наличие formula_expr у производных и соответствие формулам.