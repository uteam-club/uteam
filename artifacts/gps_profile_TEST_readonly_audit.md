# GPS Profile "Test" - Simple Audit

**Дата:** 2025-09-10T09:58:14.718Z

## 1. Профиль "Test"
- **ID:** 12908f78-ca52-42d2-b88f-5b4975ddfb7d
- **Name:** Test
- **GPS System:** B-SIGHT
- **Created:** Wed Sep 10 2025 11:07:11 GMT+0300 (Москва, стандартное время)

## 2. Последний отчёт
- **ID:** c13c770e-eae7-4c4f-8954-2e859ae121d1
- **File:** FDC Vista-17.05.25_Accel + FT(Тренировка).xlsx
- **Created:** Wed Sep 10 2025 11:07:52 GMT+0300 (Москва, стандартное время)

### Raw Data (первые 20 строк):
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
11: Okiki Oghenevwegba, W, 01:16:47, 5941, 447, 269, 148, 10, 417, 7, 41, 48, 31.57, 77
12: Venezolana Ali Mauricio, S, 01:19:09, 6259, 519, 107, 0, 0, 107, 2, 12, 23, 25.52, 79
13: Среднее, n/a, 01:18:02, 6026, 598, 273, 79, 5, 352, 6, 29, 33, 36.13, 77
14: Сумма, -, 15:36:25, 72307, 7171, 3274, 953, 55, 4227, 71, 347, 391, 433.51, 926
15: 
16: 
17: 
18: 
19: 
20: 
```

### Headers:
```
Akanni Adedayo Saheed, FB, 01:19:22, 6153, 669, 361, 121, 6, 482, 8, 37, 43, 30.86, 78
```

### ProcessedData структура:
```json
{
  "keys": [
    "profile",
    "canonical"
  ],
  "canonical": {
    "hasRows": true,
    "rowsLength": 13,
    "hasColumns": true,
    "columnsLength": 0
  }
}
```

### Canonical Rows (первые 5):
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

### Athlete Names (первые 10):
```
1: MF
2: W
3: S
4: MF
5: MF
6: W
7: CB
8: W
9: MF
10: W
```

### HSR Analysis:
- **Min:** 71
- **Max:** 926
- **Mean:** 142.38
- **Анализ:** ❌ Похоже на проценты (>1)

### Max Speed Analysis:
- **Min:** 107
- **Max:** 4227
- **Mean:** 640.31
- **Анализ единиц:** ❌ Вероятно m/s (слишком высокие значения)

### Column Mapping (из профиля):
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

## 4. Лучший кандидат на колонку с ФИО
- **Header:** Akanni Adedayo Saheed
- **Score:** 84.6% (доля имён)

### Первые 10 значений:
```
1: Akomonla Angelo Luciano Beaugars
2: Campos Tovar Juan Manuel
3: Chimuka Lweendo
4: Duffour Kofi
5: Fagboun Ayomide Oluwagbemiga
6: Gongo Holo Henry Joel
7: Gonzalez Izarra Elisaul Alejandro
8: Ngululu Fredrick
9: Okiki Ogheneoruese
10: Okiki Oghenevwegba
```

## 7. Финальная сводка

### Athlete Name:
- **Raw headers:** Akanni Adedayo Saheed, FB, 01:19:22, 6153, 669, 361, 121, 6, 482, 8, 37, 43, 30.86, 78
- **Первая строка данных:** Akomonla Angelo Luciano Beaugars, MF, 01:19:57, 6423, 619, 164, 44, 3, 208, 3, 11, 34, 34.23, 80
