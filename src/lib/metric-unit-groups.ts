/**
 * Группы единиц измерения для канонических метрик GPS
 * 
 * Этот файл определяет, какие единицы измерения подходят для каждой группы метрик.
 * Это позволяет тренеру выбирать sourceUnit и displayUnit из подходящих вариантов.
 */

// Группы единиц измерения по типам метрик
export const METRIC_UNIT_GROUPS = {
  // === ДИСТАНЦИЯ ===
  distance: {
    name: 'Дистанция',
    description: 'Метрики расстояния и дистанции',
    units: ['m', 'km', 'yd'],
    defaultSourceUnit: 'm',
    defaultDisplayUnit: 'm',
    examples: [
      'total_distance',
      'distance_zone1', 'distance_zone2', 'distance_zone3', 'distance_zone4', 'distance_zone5', 'distance_zone6',
      'hsr_distance',
      'sprint_distance',
      'hml_distance',
      'explosive_distance'
    ]
  },

  // === ВРЕМЯ ===
  time: {
    name: 'Время',
    description: 'Метрики времени и продолжительности',
    units: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss'],
    defaultSourceUnit: 'hh:mm:ss',
    defaultDisplayUnit: 'min',
    examples: [
      'duration',
      'time_in_speed_zone1', 'time_in_speed_zone2', 'time_in_speed_zone3', 'time_in_speed_zone4', 'time_in_speed_zone5', 'time_in_speed_zone6',
      'time_in_hr_zone1', 'time_in_hr_zone2', 'time_in_hr_zone3', 'time_in_hr_zone4', 'time_in_hr_zone5', 'time_in_hr_zone6'
    ]
  },

  // === СКОРОСТЬ ===
  speed: {
    name: 'Скорость',
    description: 'Метрики скорости движения',
    units: ['m/s', 'km/h', 'm/min', 'mph'],
    defaultSourceUnit: 'km/h',
    defaultDisplayUnit: 'km/h',
    examples: [
      'max_speed',
      'avg_speed',
      'distance_per_min' // м/мин - это тоже скорость
    ]
  },

  // === УСКОРЕНИЕ ===
  acceleration: {
    name: 'Ускорение',
    description: 'Метрики ускорения и торможения',
    units: ['m/s^2', 'g'],
    defaultSourceUnit: 'm/s^2',
    defaultDisplayUnit: 'm/s^2',
    examples: [
      'max_acceleration',
      'max_deceleration'
    ]
  },

  // === ПУЛЬС ===
  heart_rate: {
    name: 'Пульс',
    description: 'Метрики частоты сердечных сокращений',
    units: ['bpm', '%HRmax'],
    defaultSourceUnit: 'bpm',
    defaultDisplayUnit: 'bpm',
    examples: [
      'avg_heart_rate',
      'max_heart_rate'
    ]
  },

  // === СЧЕТЧИКИ ===
  count: {
    name: 'Количество',
    description: 'Метрики подсчета событий',
    units: ['count'],
    defaultSourceUnit: 'count',
    defaultDisplayUnit: 'count',
    examples: [
      'speed_zone1_entries', 'speed_zone2_entries', 'speed_zone3_entries', 'speed_zone4_entries', 'speed_zone5_entries', 'speed_zone6_entries',
      'sprints_count',
      'acc_zone1_count', 'acc_zone2_count', 'acc_zone3_count', 'acc_zone4_count', 'acc_zone5_count', 'acc_zone6_count',
      'dec_zone1_count', 'dec_zone2_count', 'dec_zone3_count', 'dec_zone4_count', 'dec_zone5_count', 'dec_zone6_count',
      'impacts_count'
    ]
  },

  // === НАГРУЗКА ===
  load: {
    name: 'Нагрузка',
    description: 'Метрики игровой нагрузки',
    units: ['AU'],
    defaultSourceUnit: 'AU',
    defaultDisplayUnit: 'AU',
    examples: [
      'player_load'
    ]
  },

  // === МОЩНОСТЬ ===
  power: {
    name: 'Мощность',
    description: 'Метрики мощности и интенсивности',
    units: ['W/kg'],
    defaultSourceUnit: 'W/kg',
    defaultDisplayUnit: 'W/kg',
    examples: [
      'power_score'
    ]
  },

  // === ПРОЦЕНТЫ И ОТНОШЕНИЯ ===
  ratio: {
    name: 'Проценты и отношения',
    description: 'Метрики в процентах и отношениях',
    units: ['%', 'ratio'],
    defaultSourceUnit: '%',
    defaultDisplayUnit: '%',
    examples: [
      'hsr_percentage',
      'work_ratio'
    ]
  },

  // === ИДЕНТИФИКАТОРЫ ===
  identity: {
    name: 'Идентификаторы',
    description: 'Текстовые поля и идентификаторы',
    units: ['string'],
    defaultSourceUnit: 'string',
    defaultDisplayUnit: 'string',
    examples: [
      'athlete_name',
      'position'
    ]
  }
} as const;

// Типы групп единиц измерения
export type MetricUnitGroup = keyof typeof METRIC_UNIT_GROUPS;

// Функция для определения группы единиц измерения по ключу метрики
export function getUnitGroupForMetric(metricKey: string): MetricUnitGroup | null {
  // Проверяем каждую группу
  for (const [groupKey, group] of Object.entries(METRIC_UNIT_GROUPS)) {
    if ((group as any).examples.includes(metricKey)) {
      return groupKey as MetricUnitGroup;
    }
  }
  
  // Если не найдено, возвращаем null
  return null;
}

// Функция для получения доступных единиц измерения для метрики
export function getAvailableUnitsForMetric(metricKey: string): string[] {
  const group = getUnitGroupForMetric(metricKey);
  if (!group) {
    return ['string']; // По умолчанию для неизвестных метрик
  }
  
  return [...METRIC_UNIT_GROUPS[group].units];
}

// Функция для получения рекомендуемых единиц по умолчанию
export function getDefaultUnitsForMetric(metricKey: string): { sourceUnit: string; displayUnit: string } {
  const group = getUnitGroupForMetric(metricKey);
  if (!group) {
    return { sourceUnit: 'string', displayUnit: 'string' };
  }
  
  const groupConfig = METRIC_UNIT_GROUPS[group];
  return {
    sourceUnit: groupConfig.defaultSourceUnit,
    displayUnit: groupConfig.defaultDisplayUnit
  };
}

// Функция для получения информации о группе единиц измерения
export function getUnitGroupInfo(groupKey: MetricUnitGroup) {
  return METRIC_UNIT_GROUPS[groupKey];
}

// Функция для получения всех доступных групп
export function getAllUnitGroups() {
  return Object.entries(METRIC_UNIT_GROUPS).map(([key, value]) => ({
    key: key as MetricUnitGroup,
    ...value
  }));
}

// Функция для проверки, поддерживает ли группа единиц измерения
export function isUnitSupportedForMetric(metricKey: string, unit: string): boolean {
  const availableUnits = getAvailableUnitsForMetric(metricKey);
  return availableUnits.includes(unit);
}

// Функция для получения метрик по группе единиц измерения
export function getMetricsByUnitGroup(groupKey: MetricUnitGroup): string[] {
  return [...METRIC_UNIT_GROUPS[groupKey].examples];
}
