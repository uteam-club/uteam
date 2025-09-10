// src/canon/__tests__/registry.v101.test.ts

import fs from 'fs';
import path from 'path';

describe('Canon Registry v1.0.1', () => {
  let registry: any;

  beforeAll(() => {
    const registryPath = path.resolve('src/canon/metrics.registry.json');
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    registry = JSON.parse(registryContent);
  });

  describe('Registry structure', () => {
    test('should have metrics array', () => {
      expect(registry.metrics).toBeDefined();
      expect(Array.isArray(registry.metrics)).toBe(true);
    });

    test('should have dimensions object', () => {
      expect(registry.dimensions).toBeDefined();
      expect(typeof registry.dimensions).toBe('object');
    });
  });

  describe('Key metrics v1.0.1', () => {
    const getMetric = (key: string) => {
      return registry.metrics.find((m: any) => m.key === key);
    };

    test('max_speed_kmh should have correct dimension and unit', () => {
      const metric = getMetric('max_speed_kmh');
      expect(metric).toBeDefined();
      expect(metric.dimension).toBe('speed');
      expect(metric.unit).toBe('km/h');
      expect(metric.labels?.ru).toBe('Макс. скорость (км/ч)');
    });

    test('hsr_ratio should have correct dimension and unit', () => {
      const metric = getMetric('hsr_ratio');
      expect(metric).toBeDefined();
      expect(metric.dimension).toBe('ratio');
      expect(metric.unit).toBe('ratio');
      expect(metric.labels?.ru).toBe('HSR % от общей');
    });

    test('athlete_name should have correct dimension and unit', () => {
      const metric = getMetric('athlete_name');
      expect(metric).toBeDefined();
      expect(metric.dimension).toBe('text');
      expect(metric.unit).toBe('text');
      expect(metric.labels?.ru).toBe('Имя игрока');
    });

    test('total_distance_m should have correct dimension and unit', () => {
      const metric = getMetric('total_distance_m');
      expect(metric).toBeDefined();
      expect(metric.dimension).toBe('distance');
      expect(metric.unit).toBe('m');
      expect(metric.labels?.ru).toBe('Общая дистанция (м)');
    });

    test('duration_s should have correct dimension and unit', () => {
      const metric = getMetric('duration_s');
      expect(metric).toBeDefined();
      expect(metric.dimension).toBe('time');
      expect(metric.unit).toBe('s');
      expect(metric.labels?.ru).toBe('Длительность (сек)');
    });

    test('minutes_played should have correct dimension and unit', () => {
      const metric = getMetric('minutes_played');
      expect(metric).toBeDefined();
      expect(metric.dimension).toBe('time');
      expect(metric.unit).toBe('min');
      expect(metric.labels?.ru).toBe('Время на поле (мин)');
    });
  });

  describe('Required metrics presence', () => {
    const requiredKeys = [
      'athlete_name', 'position', 'player_external_id', 'gps_system',
      'total_distance_m', 'distance_per_min_m', 'hsr_distance_m',
      'duration_s', 'minutes_played', 'work_time_s',
      'average_speed_ms', 'max_speed_ms', 'max_speed_kmh',
      'number_of_sprints_count', 'flying_sprints_count',
      'accelerations_count', 'decelerations_count',
      'hsr_ratio', 'sprint_ratio', 'work_ratio',
      'heart_rate_avg_bpm', 'heart_rate_max_bpm',
      'steps_total_count', 'total_load_au', 'aee_kcal', 'body_mass_kg'
    ];

    requiredKeys.forEach(key => {
      test(`should have ${key} metric`, () => {
        const metric = registry.metrics.find((m: any) => m.key === key);
        expect(metric).toBeDefined();
        expect(metric.key).toBe(key);
      });
    });
  });

  describe('Deprecated metrics', () => {
    test('should have deprecated metrics marked correctly', () => {
      const deprecatedMetrics = registry.metrics.filter((m: any) => m.deprecated === true);
      expect(deprecatedMetrics.length).toBeGreaterThan(0);
      
      deprecatedMetrics.forEach(metric => {
        expect(metric.deprecatedReason).toBe('Not in canon v1.0.1');
      });
    });
  });

  describe('Registry integrity', () => {
    test('should have unique metric keys', () => {
      const keys = registry.metrics.map((m: any) => m.key);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    test('should have valid dimensions for all metrics', () => {
      registry.metrics.forEach((metric: any) => {
        expect(metric.dimension).toBeDefined();
        expect(typeof metric.dimension).toBe('string');
        expect(metric.dimension.length).toBeGreaterThan(0);
      });
    });

    test('should have valid units for all metrics', () => {
      registry.metrics.forEach((metric: any) => {
        expect(metric.unit).toBeDefined();
        expect(typeof metric.unit).toBe('string');
        expect(metric.unit.length).toBeGreaterThan(0);
      });
    });

    test('should have Russian labels for all metrics', () => {
      registry.metrics.forEach((metric: any) => {
        expect(metric.labels?.ru).toBeDefined();
        expect(typeof metric.labels.ru).toBe('string');
        expect(metric.labels.ru.length).toBeGreaterThan(0);
      });
    });
  });
});
