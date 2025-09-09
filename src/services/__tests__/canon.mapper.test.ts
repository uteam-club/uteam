import { buildCanonColumns, mapRowsToCanonical } from '../canon.mapper';

describe('canon.mapper', () => {
  const profileColumns = [
    { type: 'column', mappedColumn: 'Player Name', canonicalKey: 'athlete_name', name: 'Игрок' },
    { type: 'column', mappedColumn: 'TD', canonicalKey: 'total_distance_m', name: 'Общая дистанция' },
    { type: 'column', mappedColumn: 'Max Speed (km/h)', canonicalKey: 'max_speed_ms', name: 'Макс. скорость' },
    { type: 'column', mappedColumn: 'HSR%', canonicalKey: 'hsr_ratio', name: 'HSR %' },
  ];

  const rows = [
    { 'Player Name': 'Игрок 1', TD: '12345', 'Max Speed (km/h)': '32.4', 'HSR%': '8.5' },
    { 'Player Name': 'Игрок 2', TD: '9800',  'Max Speed (km/h)': '34.2', 'HSR%': '12,1' },
  ];

  test('maps and converts to canonical', () => {
    const cols = buildCanonColumns(profileColumns as any);
    const { rows: out, meta } = mapRowsToCanonical(rows, cols);
    
    expect(out.length).toBe(2);
    expect(out[0].athlete_name).toBe('Игрок 1');
    expect(out[0].total_distance_m).toBeCloseTo(12345, 6);
    // 32.4 km/h -> 9.0 m/s
    expect(out[0].max_speed_ms).toBeCloseTo(9.0, 3);
    // 8.5% -> 0.085 ratio (теперь корректно конвертируется)
    expect(out[0].hsr_ratio).toBeCloseTo(0.085, 6);
    expect(meta.canonVersion).toBeDefined();
  });

  test('buildCanonColumns filters out invalid columns', () => {
    const mixedColumns = [
      { type: 'column', mappedColumn: 'Valid', canonicalKey: 'total_distance_m', name: 'Valid' },
      { type: 'formula', mappedColumn: 'Formula', canonicalKey: 'invalid_key', name: 'Formula' },
      { type: 'column', mappedColumn: 'NoKey', name: 'No Key' },
      { type: 'column', mappedColumn: 'InvalidKey', canonicalKey: 'unknown_metric', name: 'Invalid' },
    ];

    const cols = buildCanonColumns(mixedColumns as any);
    expect(cols.length).toBe(1);
    expect(cols[0].canonicalKey).toBe('total_distance_m');
  });

  test('handles identity fields correctly', () => {
    const identityColumns = [
      { type: 'column', mappedColumn: 'Player', canonicalKey: 'athlete_name', name: 'Игрок' },
    ];

    const identityRows = [
      { 'Player': 'Игрок 1' },
      { 'Player': 'Игрок 2' },
    ];

    const cols = buildCanonColumns(identityColumns as any);
    const { rows: out } = mapRowsToCanonical(identityRows, cols);
    
    expect(out.length).toBe(2);
    expect(out[0].athlete_name).toBe('Игрок 1');
    expect(out[1].athlete_name).toBe('Игрок 2');
  });

  test('handles empty rows gracefully', () => {
    const cols = buildCanonColumns(profileColumns as any);
    const { rows: out } = mapRowsToCanonical([], cols);
    
    expect(out.length).toBe(0);
  });

  test('handles null/undefined values', () => {
    const cols = buildCanonColumns(profileColumns as any);
    const rowsWithNulls = [
      { 'Player Name': 'Игрок 1', TD: null, 'Max Speed (km/h)': undefined, 'HSR%': '' },
    ];

    const { rows: out } = mapRowsToCanonical(rowsWithNulls, cols);
    
    expect(out.length).toBe(1);
    expect(out[0].athlete_name).toBe('Игрок 1');
    expect(out[0].total_distance_m).toBeUndefined();
    expect(out[0].max_speed_ms).toBeUndefined();
    expect(out[0].hsr_ratio).toBeUndefined();
  });

  test('converts units correctly', () => {
    const speedColumns = [
      { type: 'column', mappedColumn: 'Speed (km/h)', canonicalKey: 'max_speed_ms', name: 'Скорость' },
    ];

    const speedRows = [
      { 'Speed (km/h)': '36' }, // 36 km/h = 10 m/s
    ];

    const cols = buildCanonColumns(speedColumns as any);
    const { rows: out } = mapRowsToCanonical(speedRows, cols);
    
    expect(out.length).toBe(1);
    expect(out[0].max_speed_ms).toBeCloseTo(10, 3);
  });

  test('handles comma decimal separator', () => {
    const cols = buildCanonColumns(profileColumns as any);
    const rowsWithCommas = [
      { 'Player Name': 'Игрок 1', TD: '12345,67', 'Max Speed (km/h)': '32,4', 'HSR%': '8,5' },
    ];

    const { rows: out } = mapRowsToCanonical(rowsWithCommas, cols);
    
    expect(out.length).toBe(1);
    expect(out[0].total_distance_m).toBeCloseTo(12345.67, 6);
    expect(out[0].max_speed_ms).toBeCloseTo(9.0, 3);
    expect(out[0].hsr_ratio).toBeCloseTo(0.085, 6);
  });

  test('ratio from percent sign header (HSR%) -> ratio 0..1', () => {
    const profileColumns = [
      { type: 'column', mappedColumn: 'HSR%', canonicalKey: 'hsr_ratio', name: 'HSR %' },
    ];
    const rows = [{ 'HSR%': '8.5' }, { 'HSR%': '12,0' }]; // запятая тоже поддерживается
    const cols = buildCanonColumns(profileColumns as any);
    const { rows: out } = mapRowsToCanonical(rows as any, cols);
    expect(out[0].hsr_ratio).toBeCloseTo(0.085, 6);
    expect(out[1].hsr_ratio).toBeCloseTo(0.12, 6);
  });

  test('ratio fallback without unit: values >1 and <=100 treated as %', () => {
    const profileColumns = [
      { type: 'column', mappedColumn: 'Some Ratio', canonicalKey: 'hsr_ratio', name: 'Some Ratio' },
    ];
    const rows = [{ 'Some Ratio': 7 }, { 'Some Ratio': 0.42 }];
    const cols = buildCanonColumns(profileColumns as any);
    const { rows: out } = mapRowsToCanonical(rows as any, cols);
    expect(out[0].hsr_ratio).toBeCloseTo(0.07, 6);  // 7% -> 0.07
    expect(out[1].hsr_ratio).toBeCloseTo(0.42, 6); // Уже доля
  });

  test('generates warnings for values below minimum', () => {
    const cols = buildCanonColumns(profileColumns as any);
    const rowsWithLowValue = [
      { 'Player Name': 'Игрок 1', TD: '-100', 'Max Speed (km/h)': '32.4', 'HSR%': '8.5' }, // TD = -100м (отрицательное значение)
    ];
    
    const { meta } = mapRowsToCanonical(rowsWithLowValue, cols);
    
    expect(meta.warnings).toContain('total_distance_m:below-min:-100');
  });

  test('generates warnings for values above maximum', () => {
    const cols = buildCanonColumns(profileColumns as any);
    const rowsWithHighValue = [
      { 'Player Name': 'Игрок 1', TD: '12345', 'Max Speed (km/h)': '150', 'HSR%': '8.5' }, // Max Speed = 150 km/h (очень много)
    ];
    
    const { meta } = mapRowsToCanonical(rowsWithHighValue, cols);
    
    // 150 km/h -> 41.67 m/s (примерно)
    expect(meta.warnings.some(w => w.startsWith('max_speed_ms:above-max:'))).toBe(true);
  });

  test('ratio double-conversion guard: sourceUnit % and value 0.85 → remains 0.85', () => {
    const cols = buildCanonColumns([
      {
        type: 'column',
        canonicalKey: 'hsr_ratio',
        mappedColumn: 'HSR%',
        name: 'HSR %'
      }
    ] as any);

    // Устанавливаем sourceUnit для колонки
    cols[0].sourceUnit = '%';

    const rows = [
      { 'Player Name': 'Игрок 1', 'HSR%': '0.85' }
    ];

    const { rows: result } = mapRowsToCanonical(rows, cols);

    // 0.85 уже похоже на долю, не должно конвертироваться
    expect(result[0].hsr_ratio).toBe(0.85);
  });

  test('ratio double-conversion guard: sourceUnit % and value 8.5 → 0.085', () => {
    const cols = buildCanonColumns([
      {
        type: 'column',
        canonicalKey: 'hsr_ratio',
        mappedColumn: 'HSR%',
        name: 'HSR %'
      }
    ] as any);

    // Устанавливаем sourceUnit для колонки
    cols[0].sourceUnit = '%';

    const rows = [
      { 'Player Name': 'Игрок 1', 'HSR%': '8.5' }
    ];

    const { rows: result } = mapRowsToCanonical(rows, cols);

    // 8.5% должно конвертироваться в 0.085
    expect(result[0].hsr_ratio).toBe(0.085);
  });

  test('ratio double-conversion guard: no sourceUnit, value 0.85 → remains 0.85', () => {
    const cols = buildCanonColumns([
      {
        type: 'column',
        canonicalKey: 'hsr_ratio',
        mappedColumn: 'HSR',
        name: 'HSR'
      }
    ] as any);

    const rows = [
      { 'Player Name': 'Игрок 1', 'HSR': '0.85' }
    ];

    const { rows: result } = mapRowsToCanonical(rows, cols);

    // 0.85 уже похоже на долю, не должно конвертироваться
    expect(result[0].hsr_ratio).toBe(0.85);
  });

  test('ratio double-conversion guard: no sourceUnit, value 8.5 → 0.085', () => {
    const cols = buildCanonColumns([
      {
        type: 'column',
        canonicalKey: 'hsr_ratio',
        mappedColumn: 'HSR',
        name: 'HSR'
      }
    ] as any);

    const rows = [
      { 'Player Name': 'Игрок 1', 'HSR': '8.5' }
    ];

    const { rows: result } = mapRowsToCanonical(rows, cols);

    // 8.5 должно конвертироваться в 0.085 (как проценты)
    expect(result[0].hsr_ratio).toBe(0.085);
  });

  test('athlete_name is added from various name fields', () => {
    const cols = buildCanonColumns([
      { type: 'column', mappedColumn: 'TD', canonicalKey: 'total_distance_m', name: 'Дистанция' },
    ] as any);

    const testCases = [
      { input: { 'name': 'Игрок 1', 'TD': '1000' }, expected: 'Игрок 1' },
      { input: { 'Name': 'Игрок 2', 'TD': '2000' }, expected: 'Игрок 2' },
      { input: { 'Player': 'Игрок 3', 'TD': '3000' }, expected: 'Игрок 3' },
      { input: { 'Игрок': 'Игрок 4', 'TD': '4000' }, expected: 'Игрок 4' },
      { input: { 'athlete_name': 'Игрок 5', 'TD': '5000' }, expected: 'Игрок 5' },
    ];

    testCases.forEach(({ input, expected }, index) => {
      const { rows: result } = mapRowsToCanonical([input], cols);
      expect(result[0].athlete_name).toBe(expected);
      expect(result[0].total_distance_m).toBe(Number(input.TD));
    });
  });

  test('athlete_name fallback when no name field found', () => {
    const cols = buildCanonColumns([
      { type: 'column', mappedColumn: 'TD', canonicalKey: 'total_distance_m', name: 'Дистанция' },
    ] as any);

    const rows = [
      { 'TD': '1000' }, // нет поля с именем
    ];

    const { rows: result } = mapRowsToCanonical(rows, cols);
    
    expect(result.length).toBe(1);
    expect(result[0].athlete_name).toBeUndefined(); // не добавляется, если нет имени
    expect(result[0].total_distance_m).toBe(1000);
  });

  describe('filtering unmapped rows', () => {
    it('should include all rows when all are mapped', () => {
      const cols = [
        { sourceHeader: 'TD', canonicalKey: 'total_distance_m', dimension: 'distance' as const }
      ];
      
      const rows = [
        { 'TD': '1000', 'name': 'Player 1' },
        { 'TD': '2000', 'name': 'Player 2' }
      ];
      
      const processedRows = [
        { athlete_id: '1', athlete_name: 'Player 1' },
        { athlete_id: '2', athlete_name: 'Player 2' }
      ];

      const { rows: result, meta } = mapRowsToCanonical(rows, cols, { processedRows });
      
      expect(result.length).toBe(2);
      expect(meta.counts).toEqual({
        input: 2,
        filtered: 0,
        canonical: 2
      });
      expect(result[0].athlete_name).toBe('Player 1');
      expect(result[1].athlete_name).toBe('Player 2');
    });

    it('should filter out unmapped rows and return counts', () => {
      const cols = [
        { sourceHeader: 'TD', canonicalKey: 'total_distance_m', dimension: 'distance' as const }
      ];
      
      const rows = [
        { 'TD': '1000', 'name': 'Player 1' },
        { 'TD': '2000', 'name': 'Player 2' },
        { 'TD': '3000', 'name': 'Player 3' }
      ];
      
      const processedRows = [
        { athlete_id: '1', athlete_name: 'Player 1' },
        { athlete_id: null, athlete_name: 'Player 2' }, // unmapped
        { athlete_id: '3', athlete_name: 'Player 3' }
      ];

      const { rows: result, meta } = mapRowsToCanonical(rows, cols, { processedRows });
      
      expect(result.length).toBe(2);
      expect(meta.counts).toEqual({
        input: 3,
        filtered: 1,
        canonical: 2
      });
      expect(result[0].athlete_name).toBe('Player 1');
      expect(result[1].athlete_name).toBe('Player 3');
    });

    it('should filter all rows when none are mapped', () => {
      const cols = [
        { sourceHeader: 'TD', canonicalKey: 'total_distance_m', dimension: 'distance' as const }
      ];
      
      const rows = [
        { 'TD': '1000', 'name': 'Player 1' },
        { 'TD': '2000', 'name': 'Player 2' }
      ];
      
      const processedRows = [
        { athlete_id: null, athlete_name: 'Player 1' },
        { athlete_id: null, athlete_name: 'Player 2' }
      ];

      const { rows: result, meta } = mapRowsToCanonical(rows, cols, { processedRows });
      
      expect(result.length).toBe(0);
      expect(meta.counts).toEqual({
        input: 2,
        filtered: 2,
        canonical: 0
      });
    });
  });
});
