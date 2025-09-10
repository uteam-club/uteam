# GPS Диагностика: Test Report Issues

**Дата:** 2025-09-10T09:34:44.248Z

## 1. Анализ отчёта
- **ID:** c13c770e-eae7-4c4f-8954-2e859ae121d1
- **File:** FDC Vista-17.05.25_Accel + FT(Тренировка).xlsx

### Raw Headers:
```
Akanni Adedayo Saheed, FB, 01:19:22, 6153, 669, 361, 121, 6, 482, 8, 37, 43, 30.86, 78
```

### Первые 10 строк Raw данных:
```
1: Akanni Adedayo Saheed, FB, 01:19:22, 6153, 669, 361, 121, 6, 482, 8, 37, 43, 30.86, 78
2: Akomonla Angelo Luciano Beaugars, MF, 01:19:57, 6423, 619, 164, 44, 3, 208, 3, 11, 34, 34.23, 80
3: Campos Tovar Juan Manuel, W, 01:17:25, 5614, 408, 202, 6, 1, 208, 4, 23, 28, 27.88, 73
4: Chimuka Lweendo, S, 01:16:16, 5795, 454, 415, 181, 9, 596, 10, 38, 33, 32.44, 76
5: Duffour Kofi, MF, 01:16:44, 5750, 711, 311, 146, 5, 457, 8, 36, 50, 100.65, 75
6: Fagboun Ayomide Oluwagbemiga, MF, 01:17:24, 5521, 544, 160, 75, 4, 235, 4, 24, 22, 30.84, 71
7: Gongo Holo Henry Joel, W, 01:18:05, 6325, 614, 211, 41, 4, 253, 4, 20, 14, 28.16, 81
8: Gonzalez Izarra Elisaul Alejandro, CB, 01:19:59, 6365, 889, 406, 39, 3, 446, 7, 42, 41, 28.82, 80
9: Ngululu Fredrick, W, 01:17:14, 5575, 676, 353, 109, 7, 462, 8, 33, 36, 31.62, 72
10: Okiki Ogheneoruese, MF, 01:17:58, 6587, 622, 313, 42, 3, 356, 5, 30, 19, 30.93, 84
```

## 2. Анализ Canonical данных
- **Всего строк:** 98

### ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Позиции вместо имён
- **Позиции (MF, W, S, etc.):** 11 из 13
- **Имена:** 0 из 13
- **Процент позиций:** 85%

### Анализ Display Units:
- **Speed keys:** max_speed_kmh
- **Ratio keys:** hsr_ratio

### Проблемные строки:
- **Всего проблемных:** 98 из 98

#### Примеры проблемных строк:
```json
[
  {
    "hsr_ratio": 80,
    "athlete_name": "MF",
    "max_speed_kmh": 208,
    "minutes_played": 79.95,
    "total_distance_m": 6423
  },
  {
    "hsr_ratio": 73,
    "athlete_name": "W",
    "max_speed_kmh": 208,
    "minutes_played": 77.41666666666667,
    "total_distance_m": 5614
  },
  {
    "hsr_ratio": 76,
    "athlete_name": "S",
    "max_speed_kmh": 596,
    "minutes_played": 76.26666666666667,
    "total_distance_m": 5795
  },
  {
    "hsr_ratio": 75,
    "athlete_name": "MF",
    "max_speed_kmh": 457,
    "minutes_played": 76.73333333333333,
    "total_distance_m": 5750
  },
  {
    "hsr_ratio": 71,
    "athlete_name": "MF",
    "max_speed_kmh": 235,
    "minutes_played": 77.4,
    "total_distance_m": 5521
  },
  {
    "hsr_ratio": 81,
    "athlete_name": "W",
    "max_speed_kmh": 253,
    "minutes_played": 78.08333333333333,
    "total_distance_m": 6325
  },
  {
    "hsr_ratio": 80,
    "athlete_name": "CB",
    "max_speed_kmh": 446,
    "minutes_played": 79.98333333333333,
    "total_distance_m": 6365
  },
  {
    "hsr_ratio": 72,
    "athlete_name": "W",
    "max_speed_kmh": 462,
    "minutes_played": 77.23333333333333,
    "total_distance_m": 5575
  },
  {
    "hsr_ratio": 84,
    "athlete_name": "MF",
    "max_speed_kmh": 356,
    "minutes_played": 77.96666666666667,
    "total_distance_m": 6587
  },
  {
    "hsr_ratio": 77,
    "athlete_name": "W",
    "max_speed_kmh": 417,
    "minutes_played": 76.78333333333333,
    "total_distance_m": 5941
  }
]
```

### Анализ значений:
#### Первая строка:
- **athlete_name:** MF
- **hsr_ratio:** 80 (❌ Похоже на проценты, а не ratio)
- **max_speed_kmh:** 208 (❌ Слишком высокая скорость)
- **minutes_played:** 79.95
- **total_distance_m:** 6423

## 3. Рекомендации

### 🔧 Исправление маппинга athlete_name:
- **Проблема:** В колонку имён попали позиции игроков
- **Решение:** Изменить sourceHeader для athlete_name с "Игрок" на первую колонку с именами
- **Предлагаемый sourceHeader:** Первая колонка raw данных (содержит полные имена)

### 🔧 Исправление HSR значений:
- **Проблема:** hsr_ratio содержит проценты (80, 73, 76), а не ratio (0.8, 0.73, 0.76)
- **Решение:** Добавить transform для конвертации % → ratio (деление на 100)

### 🔧 Исправление Max Speed значений:
- **Проблема:** max_speed_kmh содержит слишком высокие значения
- **Решение:** Проверить единицы измерения в исходных данных

### 🧹 Санитизация данных:
- **Удалить:** 98 проблемных строк
- **Оставить:** только строки с валидными именами игроков
- **Результат:** ~0 чистых строк