// src/services/gps/__tests__/normalizeRowsForMapping.test.ts

import { normalizeRowsForMapping } from '@/services/gps/normalizeRowsForMapping';

const snapshot = {
  columns: [
    { sourceHeader: 'Игрок', canonicalKey: 'athlete_name', isVisible: true, order: 1 },
    { sourceHeader: 'Время', canonicalKey: 'minutes_played', isVisible: true, order: 2 },
    { sourceHeader: 'Дистанция', canonicalKey: 'total_distance_m', isVisible: true, order: 3 },
  ],
} as any;

describe('normalizeRowsForMapping', () => {
  test('byHeaders → строит объекты по заголовкам', () => {
    const rows = [
      ['Иван Петров', '01:20:00', 8200],
      ['Пётр Сидоров', '00:45:00', 5100],
    ];
    const headers = ['Игрок', 'Время', 'Дистанция'];
    const r = normalizeRowsForMapping({ rows, headers, snapshot });
    
    expect(r.strategy).toBe('byHeaders');
    expect(r.warnings).toEqual([]);
    expect(r.objectRows).toHaveLength(2);
    expect(r.objectRows[0]).toEqual({ Игрок: 'Иван Петров', Время: '01:20:00', Дистанция: 8200 });
    expect(r.objectRows[1]).toEqual({ Игрок: 'Пётр Сидоров', Время: '00:45:00', Дистанция: 5100 });
  });

  test('no headers + no index → heuristics', () => {
    const rows = [
      ['Иван Петров', '01:20:00', 8200],
    ];
    const r = normalizeRowsForMapping({ rows, headers: null, snapshot });
    
    expect(r.strategy).toBe('heuristics');
    expect(r.warnings).toContain('NORMALIZE_USING_HEURISTICS');
    expect(r.objectRows).toHaveLength(1);
    expect(Object.keys(r.objectRows[0])).toContain('Игрок');
  });

  test('already objects → byHeaders', () => {
    const rows = [
      { Игрок: 'Иван Петров', Время: '01:20:00', Дистанция: 8200 },
      { Игрок: 'Пётр Сидоров', Время: '00:45:00', Дистанция: 5100 },
    ];
    const r = normalizeRowsForMapping({ rows, headers: null, snapshot });
    
    expect(r.strategy).toBe('byHeaders');
    expect(r.warnings).toEqual([]);
    expect(r.objectRows).toEqual(rows);
  });

  test('bySourceIndex when available', () => {
    const snapshotWithIndex = {
      columns: [
        { sourceHeader: 'Игрок', canonicalKey: 'athlete_name', isVisible: true, order: 1, sourceIndex: 0 },
        { sourceHeader: 'Время', canonicalKey: 'minutes_played', isVisible: true, order: 2, sourceIndex: 2 },
        { sourceHeader: 'Дистанция', canonicalKey: 'total_distance_m', isVisible: true, order: 3, sourceIndex: 3 },
      ],
    } as any;

    const rows = [
      ['Иван Петров', 'FB', '01:20:00', 8200],
      ['Пётр Сидоров', 'MF', '00:45:00', 5100],
    ];
    const r = normalizeRowsForMapping({ rows, headers: null, snapshot: snapshotWithIndex });
    
    expect(r.strategy).toBe('bySourceIndex');
    expect(r.warnings).toContain('NORMALIZE_USING_SOURCE_INDEX');
    expect(r.objectRows).toHaveLength(2);
    expect(r.objectRows[0]).toEqual({ Игрок: 'Иван Петров', Время: '01:20:00', Дистанция: 8200 });
    expect(r.objectRows[1]).toEqual({ Игрок: 'Пётр Сидоров', Время: '00:45:00', Дистанция: 5100 });
  });

  test('empty rows → empty result', () => {
    const r = normalizeRowsForMapping({ rows: [], headers: null, snapshot });
    
    expect(r.strategy).toBe('heuristics');
    expect(r.objectRows).toEqual([]);
  });

  test('heuristics with real data patterns', () => {
    const rows = [
      ['Akanni Adedayo Saheed', 'FB', '01:19:22', 6153, 669, 361, 121, 6, 482, 8, 37, 43, 30.86, 78],
      ['Akomonla Angelo Luciano Beaugars', 'MF', '01:19:57', 6423, 619, 164, 44, 3, 208, 3, 11, 34, 34.23, 80],
    ];
    const r = normalizeRowsForMapping({ rows, headers: null, snapshot });
    
    expect(r.strategy).toBe('heuristics');
    expect(r.warnings).toContain('NORMALIZE_USING_HEURISTICS');
    expect(r.objectRows).toHaveLength(2);
    
    // Проверяем, что эвристики нашли правильные колонки
    const firstRow = r.objectRows[0];
    expect(firstRow.Игрок).toBe('Akanni Adedayo Saheed');
    expect(firstRow.Время).toBe('01:19:22');
    expect(firstRow.Дистанция).toBe(6153);
  });
});
