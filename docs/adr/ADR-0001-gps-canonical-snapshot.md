# ADR-0001 — Canonical GPS Layer & Snapshot-Driven Reports

**Status**: Accepted  
**Date**: 2025-09-09  
**Owners**: GPS / Web

## Context
Мы агрегируем GPS-данные от разных вендоров. Форматы, единицы измерения и названия полей различаются. UI должен быть стабильным и независимым от поставщика. Также нужна воспроизводимость отчётов (immutable snapshots) и детерминированная визуализация.

## Decision
1. **Canonical layer**  
   Канонические ключи и единицы:  
   `minutes_played`, `total_distance_m`, `distance_zone3_m`, `distance_zone4_m`, `distance_zone5_m`,  
   `hsr_distance_m`, `hsr_ratio` (0..1), `sprints_count`, `distance_per_min_m`,  
   `acc_zone1_count`, `dec_zone1_count`, `max_speed_ms`.  
   Реестр метрик — единый источник правды.

2. **Profile templates**  
   Профили используют только `canonicalKey` из реестра. Неизвестные ключи блокируются ревью/CI.

3. **Snapshot-driven отчёты**  
   На импорте фиксируем `profileSnapshot`, `canonVersion`, `importMeta`. UI рендерит отчёт из snapshot'а.

4. **UI contracts**  
   Таблица строит колонки из `profile.columnMapping[].canonicalKey`.  
   Форматирование по `dimension` (ratio/time/distance/speed/count). Пустые/NaN → `—`.

5. **Diagnostics**  
   `GET /api/gps-reports/diag`: `mappedCanonicalKeys`, `sampleCanonicalKeys`, `flags.missingColumns`.

## Consequences
- CI-чек валидирует canonicalKey в профилях.
- Миграция устаревших ключей к актуальным.
- В плитках избегаем `parseFloat(..)||0`; для отсутствующих — `—`.

## Testing
- Unit: `buildProfileSnapshot`, `mapRowsToCanonical`.  
- Readiness check (этот документ) в CI, артефакты: summary MD/JSON.  
- E2E: smoke на загрузку отчёта и рендер таблицы.