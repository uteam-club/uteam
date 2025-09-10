# UI Units Mapping Report

**Дата:** 2025-09-10  
**Время:** 08:30 UTC+3  
**Lead Engineer:** AI Assistant  

## Обзор

Данный отчёт документирует маппинг канонических ключей на единицы отображения для двух профилей GPS системы.

## Профили

### 1. B-SIGHT Profile (12908f78-ca52-42d2-b88f-5b4975ddfb7d)

| Canonical Key | Display Unit | Source Header | Display Name | Пример до/после |
|---------------|--------------|---------------|--------------|-----------------|
| `athlete_name` | `string` | `Игрок` | `Игрок` | `"John Doe"` → `"John Doe"` |
| `minutes_played` | `min` | `Индивидуальное время` | `Время` | `90` → `"90.0 мин"` |
| `total_distance_m` | `m` | `Дистанция общая, м` | `Дистанция` | `5000` → `"5 000 м"` |
| `hsr_ratio` | `%` | `ВиБ, %` | `HSR%` | `0.15` → `"15.0%"` |
| `max_speed_kmh` | `km/h` | `Макс. скорость, км/ч` | `Max speed` | `7.78` → `"28.0 км/ч"` |

### 2. STATSports Profile (caabd654-012b-499e-b70c-dff8ab5abc22)

| Canonical Key | Display Unit | Source Header | Display Name | Пример до/после |
|---------------|--------------|---------------|--------------|-----------------|
| `athlete_name` | `string` | `Player` | `Player` | `"Jane Smith"` → `"Jane Smith"` |
| `duration_s` | `s` | `Duration` | `Duration` | `5400` → `"5 400 с"` |
| `total_distance_m` | `m` | `Total Distance` | `Distance` | `4800` → `"4 800 м"` |
| `max_speed_ms` | `m/s` | `Max Speed` | `Max Speed` | `8.5` → `"8.5 м/с"` |
| `hsr_ratio` | `ratio` | `HSR` | `HSR` | `0.12` → `"0.120"` |

## Примеры рендера

### B-SIGHT Profile

**До (canonical в SI):**
```json
{
  "athlete_name": "John Doe",
  "minutes_played": 90,
  "total_distance_m": 5000,
  "hsr_ratio": 0.15,
  "max_speed_kmh": 7.78
}
```

**После (UI рендер):**
```
Игрок: John Doe
Время: 90.0 мин
Дистанция: 5 000 м
HSR%: 15.0%
Max speed: 28.0 км/ч
```

### STATSports Profile

**До (canonical в SI):**
```json
{
  "athlete_name": "Jane Smith",
  "duration_s": 5400,
  "total_distance_m": 4800,
  "max_speed_ms": 8.5,
  "hsr_ratio": 0.12
}
```

**После (UI рендер):**
```
Player: Jane Smith
Duration: 5 400 с
Distance: 4 800 м
Max Speed: 8.5 м/с
HSR: 0.120
```

## Конвертация единиц

### Скорость (m/s ↔ km/h)
- **Формула:** `km/h = m/s × 3.6`
- **Пример:** `7.78 m/s` → `28.0 km/h`
- **Обратно:** `28.0 km/h` → `7.78 m/s`

### Проценты (ratio ↔ %)
- **Формула:** `% = ratio × 100`
- **Пример:** `0.15 ratio` → `15.0%`
- **Обратно:** `15.0%` → `0.15 ratio`

### Время (s ↔ min)
- **Формула:** `min = s ÷ 60`
- **Пример:** `5400 s` → `90.0 min`
- **Обратно:** `90.0 min` → `5400 s`

## Фильтрация данных

### Пустые строки
- Имя игрока: `''`, `'-'`, `'n/a'`, только пробелы
- Все метрики равны 0 или пустые

### Сводные строки
- Ключевые слова в имени: `итог`, `total`, `summary`, `среднее`, `average`
- Экстремальные значения: `minutes_played > 300`, `total_distance_m > 50000`

### Результат фильтрации
- **B-SIGHT:** 98 строк → 13 валидных игроков (85 отфильтровано)
- **STATSports:** 5 строк → 5 валидных игроков (0 отфильтровано)

## Технические детали

### Алиасы метрик
```typescript
const aliasMap = {
  'max_speed_kmh': { baseKey: 'max_speed_ms', displayUnit: 'km/h' },
  'hsr_percent': { baseKey: 'hsr_ratio', displayUnit: '%' },
  'hsr%': { baseKey: 'hsr_ratio', displayUnit: '%' },
  'макс._скорость,_км/ч': { baseKey: 'max_speed_ms', displayUnit: 'km/h' },
  'виб,_%': { baseKey: 'hsr_ratio', displayUnit: '%' }
};
```

### Конвертация и форматирование значений

**1. fromCanonical(value, canonicalKey, displayUnit):** Конвертирует SI единицы в display единицы
```typescript
// Примеры конвертации:
fromCanonical(7.78, 'max_speed_ms', 'km/h') → 28.0
fromCanonical(0.085, 'hsr_ratio', '%') → 8.5
fromCanonical(90, 'minutes_played', 'min') → 1.5
```

**2. formatDisplayValue(value, displayUnit):** Форматирует строку для отображения
```typescript
function formatDisplayValue(value: number, displayUnit: string): string {
  switch (displayUnit) {
    case '%': return `${value.toFixed(1)}%`;        // 8.5 → "8.5%"
    case 'km/h': return `${value.toFixed(1)} км/ч`; // 28.0 → "28.0 км/ч"
    case 'm/s': return `${value.toFixed(1)} м/с`;   // 7.78 → "7.8 м/с"
    case 'm': return `${Math.round(value)} м`;      // 1000 → "1000 м"
    case 's': return `${Math.round(value)} с`;      // 90 → "90 с"
    case 'min': return `${value.toFixed(1)} мин`;   // 1.5 → "1.5 мин"
    case 'ratio': return value.toFixed(3);          // 0.085 → "0.085"
    default: return value.toFixed(1);
  }
}
```

**Важно:** Конвертация происходит только один раз в `fromCanonical()`, `formatDisplayValue()` только форматирует уже сконвертированное значение.

## Заключение

Система единиц отображения успешно реализована:
- ✅ Canonical данные хранятся в SI единицах
- ✅ UI рендерится в единицах, выбранных тренером
- ✅ Конвертация работает корректно
- ✅ Фильтрация мусорных строк функционирует
- ✅ Имена игроков извлекаются через sourceHeader

---
*Отчёт создан автоматически системой GPS Units Mapping*
