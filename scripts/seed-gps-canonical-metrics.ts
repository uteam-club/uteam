import { db } from '../src/lib/db';
import { gpsCanonicalMetric, gpsUnit } from '../src/db/schema/gpsCanonicalMetric';

// Полный список канонических метрик GPS (69 метрик)
const canonicalMetrics = [
  // Identity metrics
  {
    code: 'athlete_name',
    name: 'Имя игрока',
    description: 'Отображаемое имя игрока (ФИО или короткое имя)',
    category: 'identity',
    dimension: 'identity',
    canonicalUnit: 'string',
    supportedUnits: ['string']
  },
  {
    code: 'position',
    name: 'Позиция',
    description: 'Игровая позиция (свободный текст или код: GK/DF/MF/FW и т.п.)',
    category: 'identity',
    dimension: 'identity',
    canonicalUnit: 'string',
    supportedUnits: ['string']
  },

  // Participation metrics
  {
    code: 'duration',
    name: 'Время на поле (сек)',
    description: 'Фактическое игровое время игрока в секундах',
    category: 'participation',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },

  // Distance metrics
  {
    code: 'total_distance',
    name: 'Общая дистанция',
    description: 'Суммарная дистанция за сессию',
    category: 'distance',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },

  // Speed metrics
  {
    code: 'max_speed',
    name: 'Максимальная скорость',
    description: 'Пиковая скорость за сессию',
    category: 'speed',
    dimension: 'speed',
    canonicalUnit: 'm/s',
    supportedUnits: ['m/s', 'km/h', 'm/min', 'mph']
  },
  {
    code: 'avg_speed',
    name: 'Средняя скорость',
    description: 'Средняя скорость за сессию',
    category: 'speed',
    dimension: 'speed',
    canonicalUnit: 'm/s',
    supportedUnits: ['m/s', 'km/h', 'm/min', 'mph']
  },

  // Speed zones - Distance
  {
    code: 'distance_zone1',
    name: 'Дистанция зона 1',
    description: 'Дистанция в зоне скорости 1',
    category: 'speed_zones',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },
  {
    code: 'distance_zone2',
    name: 'Дистанция зона 2',
    description: 'Дистанция в зоне скорости 2',
    category: 'speed_zones',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },
  {
    code: 'distance_zone3',
    name: 'Дистанция зона 3',
    description: 'Дистанция в зоне скорости 3',
    category: 'speed_zones',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },
  {
    code: 'distance_zone4',
    name: 'Дистанция зона 4',
    description: 'Дистанция в зоне скорости 4 (высокая скорость)',
    category: 'speed_zones',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },
  {
    code: 'distance_zone5',
    name: 'Дистанция зона 5',
    description: 'Дистанция в зоне скорости 5 (очень высокая скорость)',
    category: 'speed_zones',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },
  {
    code: 'distance_zone6',
    name: 'Дистанция зона 6',
    description: 'Дистанция в зоне скорости 6 (спринт-зона, если используется)',
    category: 'speed_zones',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },

  // Speed zones - Time
  {
    code: 'time_in_speed_zone1',
    name: 'Время в зоне скорости 1',
    description: 'Суммарное время в зоне скорости 1',
    category: 'speed_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },
  {
    code: 'time_in_speed_zone2',
    name: 'Время в зоне скорости 2',
    description: 'Суммарное время в зоне скорости 2',
    category: 'speed_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },
  {
    code: 'time_in_speed_zone3',
    name: 'Время в зоне скорости 3',
    description: 'Суммарное время в зоне скорости 3',
    category: 'speed_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },
  {
    code: 'time_in_speed_zone4',
    name: 'Время в зоне скорости 4',
    description: 'Суммарное время в зоне скорости 4',
    category: 'speed_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },
  {
    code: 'time_in_speed_zone5',
    name: 'Время в зоне скорости 5',
    description: 'Суммарное время в зоне скорости 5',
    category: 'speed_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },
  {
    code: 'time_in_speed_zone6',
    name: 'Время в зоне скорости 6',
    description: 'Суммарное время в зоне скорости 6',
    category: 'speed_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },

  // Speed zones - Entries
  {
    code: 'speed_zone1_entries',
    name: 'Входы в зону скорости 1',
    description: 'Количество входов в зону скорости 1',
    category: 'speed_zones',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'speed_zone2_entries',
    name: 'Входы в зону скорости 2',
    description: 'Количество входов в зону скорости 2',
    category: 'speed_zones',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'speed_zone3_entries',
    name: 'Входы в зону скорости 3',
    description: 'Количество входов в зону скорости 3',
    category: 'speed_zones',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'speed_zone4_entries',
    name: 'Входы в зону скорости 4',
    description: 'Количество входов в зону скорости 4',
    category: 'speed_zones',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'speed_zone5_entries',
    name: 'Входы в зону скорости 5',
    description: 'Количество входов в зону скорости 5',
    category: 'speed_zones',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'speed_zone6_entries',
    name: 'Входы в зону скорости 6',
    description: 'Количество входов в зону скорости 6',
    category: 'speed_zones',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },

  // HSR & Sprint
  {
    code: 'hsr_distance',
    name: 'Дистанция HSR',
    description: 'Дистанция в зоне высокоскоростного бега (порог зависит от системы)',
    category: 'hsr_sprint',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },
  {
    code: 'sprint_distance',
    name: 'Дистанция в спринте',
    description: 'Дистанция на скоростях выше спринт-порога',
    category: 'hsr_sprint',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },
  {
    code: 'sprints_count',
    name: 'Количество спринтов',
    description: 'Число спринтов по правилу системы',
    category: 'hsr_sprint',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'hsr_percentage',
    name: 'HSR %',
    description: 'Процент дистанции в зоне высокоскоростного бега от общей дистанции',
    category: 'hsr_sprint',
    dimension: 'ratio',
    canonicalUnit: '%',
    supportedUnits: ['%', 'ratio']
  },

  // Accelerations/Decelerations - Counts
  {
    code: 'acc_zone1_count',
    name: 'Ускорения зона 1 (шт.)',
    description: 'Количество ускорений в зоне 1',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'acc_zone2_count',
    name: 'Ускорения зона 2 (шт.)',
    description: 'Количество ускорений в зоне 2',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'acc_zone3_count',
    name: 'Ускорения зона 3 (шт.)',
    description: 'Количество ускорений в зоне 3',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'acc_zone4_count',
    name: 'Ускорения зона 4 (шт.)',
    description: 'Количество ускорений в зоне 4',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'acc_zone5_count',
    name: 'Ускорения зона 5 (шт.)',
    description: 'Количество ускорений в зоне 5',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'acc_zone6_count',
    name: 'Ускорения зона 6 (шт.)',
    description: 'Количество ускорений в зоне 6',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'dec_zone1_count',
    name: 'Торможения зона 1 (шт.)',
    description: 'Количество торможений в зоне 1',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'dec_zone2_count',
    name: 'Торможения зона 2 (шт.)',
    description: 'Количество торможений в зоне 2',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'dec_zone3_count',
    name: 'Торможения зона 3 (шт.)',
    description: 'Количество торможений в зоне 3',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'dec_zone4_count',
    name: 'Торможения зона 4 (шт.)',
    description: 'Количество торможений в зоне 4',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'dec_zone5_count',
    name: 'Торможения зона 5 (шт.)',
    description: 'Количество торможений в зоне 5',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },
  {
    code: 'dec_zone6_count',
    name: 'Торможения зона 6 (шт.)',
    description: 'Количество торможений в зоне 6',
    category: 'acc_dec',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },

  // Accelerations/Decelerations - Peaks
  {
    code: 'max_acceleration',
    name: 'Максимальное ускорение',
    description: 'Пиковое ускорение за сессию',
    category: 'acc_dec',
    dimension: 'acceleration',
    canonicalUnit: 'm/s^2',
    supportedUnits: ['m/s^2', 'g']
  },
  {
    code: 'max_deceleration',
    name: 'Максимальное торможение',
    description: 'Пиковое замедление за сессию (модуль)',
    category: 'acc_dec',
    dimension: 'acceleration',
    canonicalUnit: 'm/s^2',
    supportedUnits: ['m/s^2', 'g']
  },

  // Heart Rate - Summary
  {
    code: 'avg_heart_rate',
    name: 'Средний пульс',
    description: 'Средний ЧСС',
    category: 'heart',
    dimension: 'heart_rate',
    canonicalUnit: 'bpm',
    supportedUnits: ['bpm', '%HRmax']
  },
  {
    code: 'max_heart_rate',
    name: 'Максимальный пульс',
    description: 'Пиковый ЧСС',
    category: 'heart',
    dimension: 'heart_rate',
    canonicalUnit: 'bpm',
    supportedUnits: ['bpm', '%HRmax']
  },

  // Heart Rate Zones
  {
    code: 'time_in_hr_zone1',
    name: 'Время в HR-зоне 1',
    description: 'Время в пульсовой зоне 1',
    category: 'heart_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },
  {
    code: 'time_in_hr_zone2',
    name: 'Время в HR-зоне 2',
    description: 'Время в пульсовой зоне 2',
    category: 'heart_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },
  {
    code: 'time_in_hr_zone3',
    name: 'Время в HR-зоне 3',
    description: 'Время в пульсовой зоне 3',
    category: 'heart_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },
  {
    code: 'time_in_hr_zone4',
    name: 'Время в HR-зоне 4',
    description: 'Время в пульсовой зоне 4',
    category: 'heart_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },
  {
    code: 'time_in_hr_zone5',
    name: 'Время в HR-зоне 5',
    description: 'Время в пульсовой зоне 5',
    category: 'heart_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },
  {
    code: 'time_in_hr_zone6',
    name: 'Время в HR-зоне 6',
    description: 'Время в пульсовой зоне 6 (Red Zone, если используется)',
    category: 'heart_zones',
    dimension: 'time',
    canonicalUnit: 's',
    supportedUnits: ['s', 'min', 'h', 'hh:mm', 'hh:mm:ss']
  },

  // Load & Impacts
  {
    code: 'player_load',
    name: 'Игровая нагрузка (AU)',
    description: 'Нагрузка по акселерометру (условные единицы)',
    category: 'load',
    dimension: 'load',
    canonicalUnit: 'AU',
    supportedUnits: ['AU']
  },
  {
    code: 'impacts_count',
    name: 'Импакты (шт.)',
    description: 'Число столкновений/импактов (порог зависит от системы)',
    category: 'load',
    dimension: 'count',
    canonicalUnit: 'count',
    supportedUnits: ['count']
  },

  // Intensity
  {
    code: 'power_score',
    name: 'Power Score (Вт/кг)',
    description: 'Индекс мощности/интенсивности, нормированный на массу тела (если доступно)',
    category: 'intensity',
    dimension: 'power_mass_norm',
    canonicalUnit: 'W/kg',
    supportedUnits: ['W/kg']
  },
  {
    code: 'work_ratio',
    name: 'Work Ratio (%)',
    description: 'Доля активного времени (проценты)',
    category: 'intensity',
    dimension: 'ratio',
    canonicalUnit: '%',
    supportedUnits: ['%', 'ratio']
  },
  {
    code: 'hml_distance',
    name: 'HML дистанция',
    description: 'Дистанция в эпизодах высокой метаболической нагрузки (если доступно из вендора)',
    category: 'intensity',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },
  {
    code: 'explosive_distance',
    name: 'Взрывная дистанция',
    description: 'Дистанция в «взрывных» эпизодах по определению системы (если доступно)',
    category: 'intensity',
    dimension: 'distance',
    canonicalUnit: 'm',
    supportedUnits: ['m', 'km', 'yd']
  },

  // Derived
  {
    code: 'distance_per_min',
    name: 'Дистанция за минуту (м/мин)',
    description: 'Производная интенсивности: метров в минуту',
    category: 'derived',
    dimension: 'speed',
    canonicalUnit: 'm/min',
    supportedUnits: ['m/min', 'm/s', 'km/h', 'mph']
  }
];

// Единицы измерения
const units = [
  // Distance units
  { code: 'm', name: 'Meters', dimension: 'distance', conversionFactor: '1.000000' },
  { code: 'km', name: 'Kilometers', dimension: 'distance', conversionFactor: '1000.000000' },
  { code: 'yd', name: 'Yards', dimension: 'distance', conversionFactor: '0.914400' },
  
  // Time units
  { code: 's', name: 'Seconds', dimension: 'time', conversionFactor: '1.000000' },
  { code: 'min', name: 'Minutes', dimension: 'time', conversionFactor: '60.000000' },
  { code: 'h', name: 'Hours', dimension: 'time', conversionFactor: '3600.000000' },
  { code: 'hh:mm', name: 'HH:MM', dimension: 'time', conversionFactor: '3600.000000' },
  { code: 'hh:mm:ss', name: 'HH:MM:SS', dimension: 'time', conversionFactor: '1.000000' },
  
  // Speed units
  { code: 'm/s', name: 'm/s', dimension: 'speed', conversionFactor: '1.000000' },
  { code: 'km/h', name: 'km/h', dimension: 'speed', conversionFactor: '0.277778' },
  { code: 'm/min', name: 'm/min', dimension: 'speed', conversionFactor: '0.016667' },
  { code: 'mph', name: 'mph', dimension: 'speed', conversionFactor: '0.447040' },
  
  // Acceleration units
  { code: 'm/s^2', name: 'm/s²', dimension: 'acceleration', conversionFactor: '1.000000' },
  { code: 'g', name: 'g', dimension: 'acceleration', conversionFactor: '9.806650' },
  
  // Heart rate units
  { code: 'bpm', name: 'bpm', dimension: 'heart_rate', conversionFactor: '1.000000' },
  { code: '%HRmax', name: '%HRmax', dimension: 'heart_rate', conversionFactor: '1.000000' },
  
  // Count units
  { code: 'count', name: 'count', dimension: 'count', conversionFactor: '1.000000' },
  
  // Load units
  { code: 'AU', name: 'AU', dimension: 'load', conversionFactor: '1.000000' },
  
  // Power units
  { code: 'W/kg', name: 'W/kg', dimension: 'power_mass_norm', conversionFactor: '1.000000' },
  
  // Ratio units
  { code: '%', name: '%', dimension: 'ratio', conversionFactor: '0.010000' },
  { code: 'ratio', name: 'ratio', dimension: 'ratio', conversionFactor: '1.000000' },
  
  // Identity units
  { code: 'string', name: 'string', dimension: 'identity', conversionFactor: '1.000000' }
];

async function seedGpsCanonicalMetrics() {
  console.log('🌱 Начало заполнения канонических метрик GPS...');

  try {
    // Добавляем единицы измерения
    console.log('📏 Добавление единиц измерения...');
    for (const unit of units) {
      await db.insert(gpsUnit).values(unit).onConflictDoNothing();
    }
    console.log(`✅ Добавлено ${units.length} единиц измерения`);

    // Добавляем канонические метрики
    console.log('📊 Добавление канонических метрик...');
    for (const metric of canonicalMetrics) {
      await db.insert(gpsCanonicalMetric).values(metric).onConflictDoNothing();
    }
    console.log(`✅ Добавлено ${canonicalMetrics.length} канонических метрик`);

    console.log('🎉 Заполнение канонических метрик GPS завершено!');
  } catch (error) {
    console.error('❌ Ошибка при заполнении канонических метрик:', error);
    throw error;
  }
}

// Запускаем скрипт
if (require.main === module) {
  seedGpsCanonicalMetrics()
    .then(() => {
      console.log('✅ Скрипт выполнен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}

export { seedGpsCanonicalMetrics };
