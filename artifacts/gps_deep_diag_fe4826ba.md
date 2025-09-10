# GPS Deep Diagnostic Report

**Report ID:** fe4826ba-da7f-400d-af9e-08fe7a95c46a
**Generated:** 2025-09-10T11:25:29.225Z

## Report Summary
- **Name:** FDC Vista-17.05.25_Accel + FT(Тренировка)
- **GPS System:** B-SIGHT
- **Profile ID:** 32e9c4a8-183e-442a-a687-11c6a711fbf0
- **Is Processed:** true
- **Canon Version:** 1.0.1
- **Has Profile Snapshot:** true

## Raw Data Analysis
- **Structure:** array[99]
- **Total Rows:** 99
- **Headers:** 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13

### First Two Rows
```json
[
  [
    "Akanni Adedayo Saheed",
    "FB",
    "01:19:22",
    6153,
    669,
    361,
    121,
    6,
    482,
    8,
    37,
    43,
    30.86,
    78
  ],
  [
    "Akomonla Angelo Luciano Beaugars",
    "MF",
    "01:19:57",
    6423,
    619,
    164,
    44,
    3,
    208,
    3,
    11,
    34,
    34.23,
    80
  ]
]
```

## Processed Data Analysis
- **Structure:** object{profile,canonical}
- **Canonical Rows:** 0
- **Has Canonical:** true

## Snapshot Analysis
- **Source:** db
- **Columns Count:** 5

### Snapshot Columns
1. **Игрок** → `athlete_name` (N/A) [visible]
2. **Индивидуальное время** → `minutes_played` (min) [visible]
3. **Дистанция общая, м** → `total_distance_m` (m) [visible]
4. **ВиБ, %** → `hsr_ratio` (%) [visible]
5. **Макс. скорость, км/ч** → `max_speed_kmh` (km/h) [visible]

## Mapping Test Results
- **Total Input Rows:** 10
- **Matched Rows:** 10
- **Filtered Rows:** 0
- **Canonical Keys:** 

### Sample Mapped Rows
```json
[
  {},
  {},
  {}
]
```

### Filter Reasons
No filtering applied

## Root Cause Analysis
**ROOT CAUSE:** rawData лежит на top-level, а не в processedData (наш прошлый скрипт смотрел не туда)

## Summary
- **RAW_ROWS:** 99
- **CANON_ROWS:** 10
- **SNAPSHOT_COLS:** 5
- **ROOT_CAUSE:** rawData лежит на top-level, а не в processedData (наш прошлый скрипт смотрел не туда)
