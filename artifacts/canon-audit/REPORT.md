# Canon Registry Audit Report

**Дата:** 2025-09-10T10:21:23.326Z

## Сводка
- **OK:** 3
- **MISMATCH:** 8
- **MISSING:** 49
- **EXTRA:** 48
- **DUPLICATES:** 0

## ✅ OK

| Key | Name (RU) | Dimension | Unit |
|-----|-----------|-----------|------|
| distance_per_min_m | Дистанция за минуту (м/мин) | speed | m/min |
| max_speed_kmh | Макс. скорость (км/ч) | speed | km/h |
| minutes_played | Время на поле (мин) | time | min |

## ❌ MISMATCH

| Key | Field | Expected | Actual |
|-----|-------|----------|--------|
| athlete_name | nameRu | Имя игрока | Имя игрока |
| athlete_name | dimension | text | identity |
| duration_s | nameRu | Длительность (сек) | Время на поле (сек) |
| hsr_distance_m | nameRu | Дистанция HSR (м) | Дистанция HSR |
| hsr_ratio | nameRu | HSR % от общей | HSR % от общей |
| hsr_ratio | unit | ratio | % |
| max_speed_ms | nameRu | Макс. скорость (м/с) | Максимальная скорость |
| position | nameRu | Позиция | Позиция |
| position | dimension | text | identity |
| sprint_distance_m | nameRu | Спринт-дистанция (м) | Дистанция в спринте |
| total_distance_m | nameRu | Общая дистанция (м) | Общая дистанция |

## ⚠️  MISSING

| Key | Name (RU) | Dimension | Unit |
|-----|-----------|-----------|------|
| accelerations_count | Кол-во ускорений | count | count |
| accelerations_high_count | Кол-во ускорений (высокие) | count | count |
| accumulated_load_au | Накопленная нагрузка (AU) | au | au |
| aee_kcal | Активная энергозатрата (ккал) | energy | kcal |
| average_speed_ms | Средняя скорость (м/с) | speed | m/s |
| body_mass_kg | Масса тела (кг) | mass | kg |
| decelerations_count | Кол-во торможений | count | count |
| decelerations_high_count | Кол-во торможений (высокие) | count | count |
| distance_zone_0_m | Дистанция зона 0 (м) | distance | m |
| distance_zone_1_m | Дистанция зона 1 (м) | distance | m |
| distance_zone_2_m | Дистанция зона 2 (м) | distance | m |
| distance_zone_3_m | Дистанция зона 3 (м) | distance | m |
| distance_zone_4_m | Дистанция зона 4 (м) | distance | m |
| distance_zone_5_m | Дистанция зона 5 (м) | distance | m |
| flying_sprints_count | Кол-во «летящих» спринтов | count | count |
| gps_system | GPS система | text | text |
| hard_running_distance_m | Дистанция HR (м) | distance | m |
| hard_running_distance_ratio | Доля HR от общей | ratio | ratio |
| heart_rate_avg_bpm | Пульс средний (уд/мин) | bpm | bpm |
| heart_rate_max_bpm | Пульс максимум (уд/мин) | bpm | bpm |
| heart_rate_time_in_zone_1_s | Время в пульс-зоне 1 (сек) | time | s |
| heart_rate_time_in_zone_2_s | Время в пульс-зоне 2 (сек) | time | s |
| heart_rate_time_in_zone_3_s | Время в пульс-зоне 3 (сек) | time | s |
| heart_rate_time_in_zone_4_s | Время в пульс-зоне 4 (сек) | time | s |
| heart_rate_time_in_zone_5_s | Время в пульс-зоне 5 (сек) | time | s |
| left_foot_contacts_count | Кол-во контактов левой | count | count |
| meters_per_acceleration_m | Метров на ускорение (м) | distance | m |
| meters_per_deceleration_m | Метров на торможение (м) | distance | m |
| neuromuscular_load_au | Нейромышечная нагрузка (AU) | au | au |
| number_of_sprints_count | Кол-во спринтов | count | count |
| player_external_id | Внешний ID игрока | text | text |
| right_foot_contacts_count | Кол-во контактов правой | count | count |
| session_rpe_au | sRPE (AU) | au | au |
| sprint_duration_s | Длительность спринтов (сек) | time | s |
| sprint_max_speed_ms | Макс. скорость в спринте (м/с) | speed | m/s |
| sprint_ratio | Доля спринта от общей | ratio | ratio |
| sprint_time_per_run_s | Среднее время спринта (сек) | time | s |
| sprint_total_time_s | Суммарное время спринтов (сек) | time | s |
| standing_time_s | Время стоя (сек) | time | s |
| steps_total_count | Кол-во шагов всего | count | count |
| total_load_au | Общая нагрузка (AU) | au | au |
| uptime_s | Время работы датчика (сек) | time | s |
| very_high_speed_distance_m | Дистанция VHSR (м) | distance | m |
| very_high_speed_ratio | VHSR % от общей | ratio | ratio |
| walking_time_s | Время ходьбы (сек) | time | s |
| work_ratio | Рабочая доля времени | ratio | ratio |
| work_time_s | Время работы (сек) | time | s |
| x_pos_m | X позиция (м) | distance | m |
| y_pos_m | Y позиция (м) | distance | m |

## ➕ EXTRA

| Key | Name (RU) | Dimension | Unit |
|-----|-----------|-----------|------|
| distance_zone1_m | Дистанция зона 1 | distance | m |
| distance_zone2_m | Дистанция зона 2 | distance | m |
| distance_zone3_m | Дистанция зона 3 | distance | m |
| distance_zone4_m | Дистанция зона 4 | distance | m |
| distance_zone5_m | Дистанция зона 5 | distance | m |
| distance_zone6_m | Дистанция зона 6 | distance | m |
| time_in_speed_zone1_s | Время в зоне скорости 1 | time | s |
| time_in_speed_zone2_s | Время в зоне скорости 2 | time | s |
| time_in_speed_zone3_s | Время в зоне скорости 3 | time | s |
| time_in_speed_zone4_s | Время в зоне скорости 4 | time | s |
| time_in_speed_zone5_s | Время в зоне скорости 5 | time | s |
| time_in_speed_zone6_s | Время в зоне скорости 6 | time | s |
| speed_zone1_entries | Входы в зону скорости 1 | count | count |
| speed_zone2_entries | Входы в зону скорости 2 | count | count |
| speed_zone3_entries | Входы в зону скорости 3 | count | count |
| speed_zone4_entries | Входы в зону скорости 4 | count | count |
| speed_zone5_entries | Входы в зону скорости 5 | count | count |
| speed_zone6_entries | Входы в зону скорости 6 | count | count |
| sprints_count | Количество спринтов | count | count |
| acc_zone1_count | Ускорения зона 1 (шт.) | count | count |
| acc_zone2_count | Ускорения зона 2 (шт.) | count | count |
| acc_zone3_count | Ускорения зона 3 (шт.) | count | count |
| acc_zone4_count | Ускорения зона 4 (шт.) | count | count |
| acc_zone5_count | Ускорения зона 5 (шт.) | count | count |
| acc_zone6_count | Ускорения зона 6 (шт.) | count | count |
| dec_zone1_count | Торможения зона 1 (шт.) | count | count |
| dec_zone2_count | Торможения зона 2 (шт.) | count | count |
| dec_zone3_count | Торможения зона 3 (шт.) | count | count |
| dec_zone4_count | Торможения зона 4 (шт.) | count | count |
| dec_zone5_count | Торможения зона 5 (шт.) | count | count |
| dec_zone6_count | Торможения зона 6 (шт.) | count | count |
| max_acceleration_ms2 | Максимальное ускорение | acceleration | m/s^2 |
| max_deceleration_ms2 | Максимальное торможение | acceleration | m/s^2 |
| avg_speed_ms | Средняя скорость | speed | m/s |
| avg_heart_rate_bpm | Средний пульс | heart_rate | bpm |
| top_heart_rate_bpm | Максимальный пульс | heart_rate | bpm |
| time_in_hr_zone1_s | Время в HR-зоне 1 | time | s |
| time_in_hr_zone2_s | Время в HR-зоне 2 | time | s |
| time_in_hr_zone3_s | Время в HR-зоне 3 | time | s |
| time_in_hr_zone4_s | Время в HR-зоне 4 | time | s |
| time_in_hr_zone5_s | Время в HR-зоне 5 | time | s |
| time_in_hr_zone6_s | Время в HR-зоне 6 | time | s |
| player_load_au | Игровая нагрузка (AU) | load | AU |
| impacts_count | Импакты (шт.) | count | count |
| power_score_wkg | Power Score (Вт/кг) | power_mass_norm | W/kg |
| work_ratio_percent | Work Ratio (%) | ratio | % |
| hml_distance_m | HML дистанция | distance | m |
| explosive_distance_m | Взрывная дистанция | distance | m |
