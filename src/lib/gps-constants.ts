// Централизованные константы для GPS системы

// Список метрик, которые можно усреднять (48 метрик)
export const AVERAGEABLE_METRICS = [
  'hsr_percentage',
  'total_distance',
  'time_in_speed_zone1',
  'time_in_speed_zone2',
  'time_in_speed_zone3',
  'time_in_speed_zone4',
  'time_in_speed_zone5',
  'time_in_speed_zone6',
  'speed_zone1_entries',
  'speed_zone2_entries',
  'speed_zone3_entries',
  'speed_zone4_entries',
  'speed_zone5_entries',
  'speed_zone6_entries',
  'sprints_count',
  'acc_zone1_count',
  'player_load',
  'power_score',
  'work_ratio',
  'distance_zone1',
  'distance_zone2',
  'distance_zone3',
  'distance_zone4',
  'distance_zone5',
  'distance_zone6',
  'hsr_distance',
  'sprint_distance',
  'distance_per_min',
  'time_in_hr_zone1',
  'time_in_hr_zone2',
  'time_in_hr_zone3',
  'time_in_hr_zone4',
  'time_in_hr_zone5',
  'time_in_hr_zone6',
  'dec_zone1_count',
  'dec_zone2_count',
  'dec_zone3_count',
  'dec_zone4_count',
  'dec_zone5_count',
  'dec_zone6_count',
  'hml_distance',
  'explosive_distance',
  'acc_zone2_count',
  'acc_zone3_count',
  'acc_zone4_count',
  'acc_zone5_count',
  'acc_zone6_count',
  'impacts_count'
];

// Другие GPS константы можно добавить здесь
export const GPS_CONSTANTS = {
  MAX_FILE_SIZE_MB: 10,
  SUPPORTED_FILE_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/json', // .json
    'text/xml', // .xml
    'application/xml', // .xml
  ],
  SUPPORTED_EXTENSIONS: ['.xlsx', '.xls', '.csv', '.json', '.xml'],
};
