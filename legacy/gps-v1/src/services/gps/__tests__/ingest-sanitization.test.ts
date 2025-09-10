// services/gps/__tests__/ingest-sanitization.test.ts
import { readFileSync } from 'fs';
import { parseSpreadsheet, applyProfile, GpsProfile } from '../ingest.service';
import { buildProfileSnapshot } from '../profileSnapshot.service';
import { mapRowsToCanonical } from '@/services/canon.mapper';
import { validateAthleteNameColumn } from '../validators/nameColumn.validator';
import { sanitizeRowsWithWarnings } from '../sanitizers/rowSanitizer';

describe('GPS Ingest Sanitization Integration', () => {
  test('B-SIGHT fixture should be sanitized correctly', async () => {
    // Создаем тестовые данные B-SIGHT
    const parsed = {
      headers: ['Игрок', 'Индивидуальное время', 'Дистанция общая, м', 'ВиБ, %', 'Макс. скорость, км/ч'],
      rows: [
        ['Иван Петров', '90', '5200', '15', '28.4'],
        ['Анна Сидорова', '85', '4800', '12', '26.8'],
        ['Михаил Козлов', '95', '5600', '18', '30.2'],
        ['Итого', '270', '15600', '45', '85.4'],
        ['', '', '', '', ''],
        ['n/a', 'n/a', 'n/a', 'n/a', 'n/a']
      ]
    };
    
    // Создаем тестовый профиль B-SIGHT
    const profile: GpsProfile = {
      id: 'test-bsight-profile',
      gpsSystem: 'B-SIGHT',
      columnMapping: [
        { name: 'Игрок', sourceHeader: 'Игрок', canonicalKey: 'athlete_name', displayName: 'Игрок', isVisible: true, order: 1 },
        { name: 'Индивидуальное время', sourceHeader: 'Индивидуальное время', canonicalKey: 'minutes_played', displayName: 'Время', isVisible: true, order: 2 },
        { name: 'Дистанция общая, м', sourceHeader: 'Дистанция общая, м', canonicalKey: 'total_distance_m', displayName: 'Дистанция', isVisible: true, order: 3 },
        { name: 'ВиБ, %', sourceHeader: 'ВиБ, %', canonicalKey: 'hsr_ratio', displayName: 'HSR%', isVisible: true, order: 4 },
        { name: 'Макс. скорость, км/ч', sourceHeader: 'Макс. скорость, км/ч', canonicalKey: 'max_speed_kmh', displayName: 'Max speed', isVisible: true, order: 5 }
      ],
      createdAt: new Date().toISOString()
    };

    // Применяем профиль
    const profileResult = applyProfile(parsed, profile);
    
    // Валидация колонки имён
    const nameColumn = profileResult.mappedColumns.find(col => col.canonicalKey === 'athlete_name');
    let nameValidation = { warnings: [], suggestions: {} };
    
    if (nameColumn && parsed.rows.length > 0) {
      const nameValues = parsed.rows
        .slice(0, 50)
        .map(row => {
          const rowArray = row as (string | number | null)[];
          const nameIndex = parsed.headers.findIndex(h => h === nameColumn.sourceHeader);
          return nameIndex >= 0 ? String(rowArray[nameIndex] || '') : '';
        });
      
      nameValidation = validateAthleteNameColumn(nameValues, parsed.headers, nameColumn.sourceHeader);
    }

    // Строим снапшот профиля
    const profileSnapshot = buildProfileSnapshot(profile);
    
    // Маппим в канонические данные
    const dataRows: Record<string, (string | number | null)[]> = {};
    profileResult.mappedColumns.forEach(col => {
      const headerIndex = parsed.headers.findIndex(h => h === col.sourceHeader);
      if (headerIndex >= 0) {
        dataRows[col.canonicalKey] = parsed.rows.map(row => {
          const rowArray = row as (string | number | null)[];
          return rowArray[headerIndex] || null;
        });
      }
    });

    // Создаем mock canonical result для тестирования
    const canonResult = {
      canonical: {
        rows: [
          { athlete_name: 'Иван Петров', minutes_played: 90, total_distance_m: 5200, hsr_ratio: 0.15, max_speed_kmh: 28.4 },
          { athlete_name: 'Анна Сидорова', minutes_played: 85, total_distance_m: 4800, hsr_ratio: 0.12, max_speed_kmh: 26.8 },
          { athlete_name: 'Михаил Козлов', minutes_played: 95, total_distance_m: 5600, hsr_ratio: 0.18, max_speed_kmh: 30.2 },
          { athlete_name: 'Итого', minutes_played: 270, total_distance_m: 15600, hsr_ratio: 0.45, max_speed_kmh: 85.4 },
          { athlete_name: '', minutes_played: null, total_distance_m: null, hsr_ratio: null, max_speed_kmh: null },
          { athlete_name: 'n/a', minutes_played: null, total_distance_m: null, hsr_ratio: null, max_speed_kmh: null }
        ],
        summary: {}
      }
    };
    
    // Санитизация строк
    const metricKeys = profileSnapshot.columns
      .filter(col => col.canonicalKey !== 'athlete_name' && col.isVisible)
      .map(col => col.canonicalKey);
    
    const rowsForSanitization = canonResult.canonical.rows.map(row => {
      const sanitizedRow: Record<string, any> = {};
      profileSnapshot.columns.forEach(col => {
        sanitizedRow[col.canonicalKey] = row[col.canonicalKey];
      });
      return sanitizedRow;
    });
    
    const sanitizationResult = sanitizeRowsWithWarnings(rowsForSanitization, metricKeys, {});
    
    // Проверяем результаты
    expect(canonResult.canonical.rows.length).toBeGreaterThan(0);
    expect(sanitizationResult.sanitizedRows.length).toBeLessThanOrEqual(canonResult.canonical.rows.length);
    
    // Проверяем, что отфильтрованы пустые строки
    const hasEmptyRows = sanitizationResult.sanitizedRows.some(row => 
      !row.athlete_name || row.athlete_name === '' || row.athlete_name === 'n/a'
    );
    expect(hasEmptyRows).toBe(false);
    
    // Проверяем, что отфильтрованы сводные строки
    const hasSummaryRows = sanitizationResult.sanitizedRows.some(row => 
      row.athlete_name && (
        row.athlete_name.toLowerCase().includes('итог') ||
        row.athlete_name.toLowerCase().includes('total') ||
        row.athlete_name.toLowerCase().includes('summary')
      )
    );
    expect(hasSummaryRows).toBe(false);
    
    // Проверяем warnings
    expect(sanitizationResult.updatedImportMeta.warnings).toBeDefined();
    expect(Array.isArray(sanitizationResult.updatedImportMeta.warnings)).toBe(true);
    
    // Проверяем, что есть warning о санитизации, если строки были отфильтрованы
    if (sanitizationResult.sanitizedRows.length < canonResult.canonical.rows.length) {
      const sanitizationWarning = sanitizationResult.updatedImportMeta.warnings.find(
        (w: any) => w.code === 'ROWS_SANITIZED'
      );
      expect(sanitizationWarning).toBeDefined();
    }
  });

  test('should detect position mapping in name column', () => {
    // Тестируем случай, когда в колонку имён попали позиции
    const values = ['MF', 'W', 'CB', 'GK', 'ST'];
    const headers = ['Позиция', 'Игрок', 'Дистанция', 'Скорость'];
    const sourceHeader = 'Позиция';
    
    const result = validateAthleteNameColumn(values, headers, sourceHeader);
    
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe('POSITION_MAPPED_AS_NAME');
    expect(result.warnings[0].column).toBe('Позиция');
    expect(result.suggestions.athleteNameHeader).toBe('Игрок');
  });

  test('should not warn for valid name columns', () => {
    // Тестируем случай с валидными именами
    const values = ['Иван Петров', 'Анна Сидорова', 'Михаил Козлов'];
    const headers = ['Игрок', 'Позиция', 'Дистанция', 'Скорость'];
    const sourceHeader = 'Игрок';
    
    const result = validateAthleteNameColumn(values, headers, sourceHeader);
    
    expect(result.warnings).toHaveLength(0);
    expect(result.suggestions.athleteNameHeader).toBeUndefined();
  });
});
