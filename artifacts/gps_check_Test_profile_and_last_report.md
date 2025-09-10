# GPS Check: Test Profile & Last Report

**Дата:** 2025-09-10T09:33:01.905Z

## 1. Профиль "Test"
- **ID:** 12908f78-ca52-42d2-b88f-5b4975ddfb7d
- **Name:** Test
- **GPS System:** B-SIGHT
- **Created:** Wed Sep 10 2025 11:07:11 GMT+0300 (Москва, стандартное время)

### Column Mapping:
```json
[
  {
    "name": "Player",
    "type": "column",
    "order": 1,
    "isVisible": true,
    "canonicalKey": "athlete_name",
    "mappedColumn": "Игрок"
  },
  {
    "name": "Time",
    "type": "column",
    "order": 3,
    "isVisible": true,
    "canonicalKey": "minutes_played",
    "mappedColumn": "Индивидуальное время"
  },
  {
    "name": "TD",
    "type": "column",
    "order": 4,
    "isVisible": true,
    "canonicalKey": "total_distance_m",
    "mappedColumn": "Дистанция общая, м"
  },
  {
    "name": "HSR%",
    "type": "column",
    "order": 10,
    "isVisible": true,
    "canonicalKey": "hsr_ratio",
    "mappedColumn": "ВиБ, %"
  },
  {
    "name": "Max speed",
    "type": "column",
    "order": 13,
    "isVisible": true,
    "canonicalKey": "max_speed_kmh",
    "mappedColumn": "Макс. скорость, км/ч"
  }
]
```

## 2. Последний GPS отчёт
- **ID:** c13c770e-eae7-4c4f-8954-2e859ae121d1
- **File:** FDC Vista-17.05.25_Accel + FT(Тренировка).xlsx
- **GPS System:** B-SIGHT
- **Profile ID:** 12908f78-ca52-42d2-b88f-5b4975ddfb7d
- **Created:** Wed Sep 10 2025 11:07:52 GMT+0300 (Москва, стандартное время)

### Processed Data (Canonical):
- **Columns:** 0
- **Rows:** 98

### Raw Data Headers (первые 10):
```
Akanni Adedayo Saheed, FB, 01:19:22, 6153, 669, 361, 121, 6, 482, 8
```

### Первые 5 строк Canonical данных:
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
  }
]
```
