import { normalizeRowsForMapping } from '../normalizeRowsForMapping';
import type { ProfileSnapshot } from '@/types/gps';

describe('normalizeRowsForMapping - Improved', () => {
  const mockSnapshot: ProfileSnapshot = {
    profileId: 'test-profile',
    gpsSystem: 'B-SIGHT',
    sport: 'football',
    columns: [
      {
        sourceHeader: 'Игрок',
        canonicalKey: 'athlete_name',
        displayName: 'Игрок',
        order: 1,
        isVisible: true,
        unit: 'string',
        transform: null,
        displayUnit: undefined,
        sourceIndex: 0
      },
      {
        sourceHeader: 'Индивидуальное время',
        canonicalKey: 'minutes_played',
        displayName: 'Время',
        order: 2,
        isVisible: true,
        unit: 'min',
        transform: null,
        displayUnit: 'min',
        sourceIndex: 1
      },
      {
        sourceHeader: 'Дистанция общая м',
        canonicalKey: 'total_distance_m',
        displayName: 'Дистанция',
        order: 3,
        isVisible: true,
        unit: 'm',
        transform: null,
        displayUnit: 'm',
        sourceIndex: 2
      },
      {
        sourceHeader: 'ВиБ %',
        canonicalKey: 'hsr_ratio',
        displayName: 'HSR%',
        order: 4,
        isVisible: true,
        unit: '%',
        transform: null,
        displayUnit: '%',
        sourceIndex: 3
      },
      {
        sourceHeader: 'Макс. скорость км/ч',
        canonicalKey: 'max_speed_kmh',
        displayName: 'Max Speed',
        order: 5,
        isVisible: true,
        unit: 'km/h',
        transform: null,
        displayUnit: 'km/h',
        sourceIndex: 4
      }
    ],
    profileVersion: 1,
    createdAtISO: '2024-01-01T00:00:00Z'
  };

  describe('Случай 1: Объекты с заголовками', () => {
    it('должен обрабатывать уже нормализованные объекты', () => {
      const input = {
        headers: null,
        rows: [
          { Игрок: 'Иван Петров', 'Индивидуальное время': '01:20:00', 'Дистанция общая м': 8200 },
          { Игрок: 'Петр Сидоров', 'Индивидуальное время': '00:45:00', 'Дистанция общая м': 5100 }
        ]
      };

      const result = normalizeRowsForMapping(input, mockSnapshot);

      expect(result.strategy).toBe('objects');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({ Игрок: 'Иван Петров', 'Индивидуальное время': '01:20:00', 'Дистанция общая м': 8200 });
      expect(result.rows[1]).toEqual({ Игрок: 'Петр Сидоров', 'Индивидуальное время': '00:45:00', 'Дистанция общая м': 5100 });
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Случай 2: Массивы + headers', () => {
    it('должен маппировать массивы по заголовкам', () => {
      const input = {
        headers: ['Игрок', 'Индивидуальное время', 'Дистанция общая м', 'ВиБ %', 'Макс. скорость км/ч'],
        rows: [
          ['Иван Петров', '01:20:00', 8200, 15.5, 32.4],
          ['Петр Сидоров', '00:45:00', 5100, 8.2, 28.7]
        ]
      };

      const result = normalizeRowsForMapping(input, mockSnapshot);

      expect(result.strategy).toBe('byHeaders');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        'Игрок': 'Иван Петров',
        'Индивидуальное время': '01:20:00',
        'Дистанция общая м': 8200,
        'ВиБ %': 15.5,
        'Макс. скорость км/ч': 32.4
      });
      expect(result.warnings).toHaveLength(0);
    });

    it('должен обрабатывать массивы разной длины', () => {
      const input = {
        headers: ['Игрок', 'Время', 'Дистанция'],
        rows: [
          ['Иван Петров', '01:20:00', 8200, 'extra'],
          ['Петр Сидоров', '00:45:00']
        ]
      };

      const result = normalizeRowsForMapping(input, mockSnapshot);

      expect(result.strategy).toBe('byHeaders');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        'Игрок': 'Иван Петров',
        'Время': '01:20:00',
        'Дистанция': 8200
      });
      expect(result.rows[1]).toEqual({
        'Игрок': 'Петр Сидоров',
        'Время': '00:45:00',
        'Дистанция': null
      });
    });
  });

  describe('Случай 3: Массивы без headers (sourceIndex)', () => {
    it('должен использовать sourceIndex из снапшота', () => {
      const input = {
        headers: null,
        rows: [
          ['Иван Петров', '01:20:00', 8200, 15.5, 32.4],
          ['Петр Сидоров', '00:45:00', 5100, 8.2, 28.7]
        ]
      };

      const result = normalizeRowsForMapping(input, mockSnapshot);

      expect(result.strategy).toBe('bySourceIndex');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        'Игрок': 'Иван Петров',
        'Индивидуальное время': '01:20:00',
        'Дистанция общая м': 8200,
        'ВиБ %': 15.5,
        'Макс. скорость км/ч': 32.4
      });
      expect(result.warnings).toContain('NO_HEADERS_USED_SOURCE_INDEX');
    });

    it('должен обрабатывать частичные sourceIndex', () => {
      const partialSnapshot: ProfileSnapshot = {
        ...mockSnapshot,
        columns: [
          {
            sourceHeader: 'Игрок',
            canonicalKey: 'athlete_name',
            displayName: 'Игрок',
            order: 1,
            isVisible: true,
            unit: 'string',
            transform: null,
            displayUnit: undefined,
            sourceIndex: 0
          },
          {
            sourceHeader: 'Дистанция общая м',
            canonicalKey: 'total_distance_m',
            displayName: 'Дистанция',
            order: 3,
            isVisible: true,
            unit: 'm',
            transform: null,
            displayUnit: 'm',
            sourceIndex: 2
          }
        ]
      };

      const input = {
        headers: null,
        rows: [
          ['Иван Петров', '01:20:00', 8200, 15.5, 32.4],
          ['Петр Сидоров', '00:45:00', 5100, 8.2, 28.7]
        ]
      };

      const result = normalizeRowsForMapping(input, partialSnapshot);

      expect(result.strategy).toBe('bySourceIndex');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        'Игрок': 'Иван Петров',
        'Дистанция общая м': 8200
      });
    });
  });

  describe('Случай 4: Эвристика (fallback)', () => {
    it('должен использовать эвристику когда нет headers и sourceIndex', () => {
      const emptySnapshot: ProfileSnapshot = {
        profileId: 'test-profile',
        gpsSystem: 'B-SIGHT',
        sport: 'football',
        columns: [],
        profileVersion: 1,
        createdAtISO: '2024-01-01T00:00:00Z'
      };

      const input = {
        headers: null,
        rows: [
          ['Иван Петров', '01:20:00', 8200, 15.5, 32.4],
          ['Петр Сидоров', '00:45:00', 5100, 8.2, 28.7]
        ]
      };

      const result = normalizeRowsForMapping(input, emptySnapshot);

      expect(result.strategy).toBe('heuristics');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        'Игрок': 'Иван Петров',
        'Время': '01:20:00',
        'Дистанция_м': 8200,
        'Процент': 15.5,
        'Скорость_кмч': 32.4
      });
      expect(result.warnings).toContain('HEURISTIC_FALLBACK');
    });

    it('должен правильно определять типы данных в эвристике', () => {
      const emptySnapshot: ProfileSnapshot = {
        profileId: 'test-profile',
        gpsSystem: 'B-SIGHT',
        sport: 'football',
        columns: [],
        profileVersion: 1,
        createdAtISO: '2024-01-01T00:00:00Z'
      };

      const input = {
        headers: null,
        rows: [
          ['Алексей Козлов', '01:15:30', 7800, 12.1, 30.1],
          ['Михаил Иванов', '00:30:45', 4200, 5.8, 25.3]
        ]
      };

      const result = normalizeRowsForMapping(input, emptySnapshot);

      expect(result.strategy).toBe('heuristics');
      expect(result.rows).toHaveLength(2);
      
      // Проверяем правильное определение типов
      expect(result.rows[0]['Игрок']).toBe('Алексей Козлов');
      expect(result.rows[0]['Время']).toBe('01:15:30');
      expect(result.rows[0]['Дистанция_м']).toBe(7800);
      expect(result.rows[0]['Процент']).toBe(12.1);
      expect(result.rows[0]['Скорость_кмч']).toBe(30.1);
    });
  });

  describe('Граничные случаи', () => {
    it('должен обрабатывать пустые данные', () => {
      const input = { headers: null, rows: [] };
      const result = normalizeRowsForMapping(input, mockSnapshot);

      expect(result.strategy).toBe('empty');
      expect(result.rows).toHaveLength(0);
      expect(result.warnings).toContain('NO_ROWS');
    });

    it('должен обрабатывать null/undefined значения', () => {
      const input = {
        headers: ['Игрок', 'Время', 'Дистанция'],
        rows: [
          ['Иван Петров', null, 8200],
          [null, '00:45:00', undefined]
        ]
      };

      const result = normalizeRowsForMapping(input, mockSnapshot);

      expect(result.strategy).toBe('byHeaders');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        'Игрок': 'Иван Петров',
        'Время': null,
        'Дистанция': 8200
      });
      expect(result.rows[1]).toEqual({
        'Игрок': null,
        'Время': '00:45:00',
        'Дистанция': undefined
      });
    });

    it('должен обрабатывать неизвестную форму данных', () => {
      const input = {
        headers: null,
        rows: [123, 'string', true] // Не массив массивов и не объекты
      };

      const result = normalizeRowsForMapping(input, mockSnapshot);

      expect(result.strategy).toBe('unknown');
      expect(result.rows).toHaveLength(0);
      expect(result.warnings).toContain('UNKNOWN_INPUT_SHAPE');
    });
  });

  describe('Гарантия normalize.rows > 0', () => {
    it('должен всегда возвращать rows > 0 для валидных данных', () => {
      const testCases = [
        // Случай 1: Объекты
        {
          headers: null,
          rows: [{ Игрок: 'Иван', Время: '01:00:00' }]
        },
        // Случай 2: Массивы + headers
        {
          headers: ['Игрок', 'Время'],
          rows: [['Иван', '01:00:00']]
        },
        // Случай 3: Массивы + sourceIndex
        {
          headers: null,
          rows: [['Иван', '01:00:00', 5000]]
        }
      ];

      testCases.forEach((testCase, index) => {
        const result = normalizeRowsForMapping(testCase, mockSnapshot);
        expect(result.rows.length).toBeGreaterThan(0);
        expect(result.strategy).not.toBe('empty');
        expect(result.strategy).not.toBe('unknown');
      });
    });
  });
});
