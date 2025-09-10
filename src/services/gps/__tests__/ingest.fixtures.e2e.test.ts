import { readFileSync } from 'fs';
import { parseSpreadsheet, normalizeHeaders, applyProfile } from '../ingest.service';
import { mapRowsToCanonical } from '../../canon.mapper';
import { Client } from 'pg';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

describe('GPS Ingest Fixtures E2E', () => {
  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  test('Polar demo CSV should be processed correctly', async () => {
    // Загружаем CSV
    const polarCsv = readFileSync('fixtures/gps/polar_demo.csv');
    const polarParsed = await parseSpreadsheet(polarCsv, 'polar_demo.csv');
    const polarNormalized = normalizeHeaders(polarParsed.headers);

    // Находим профиль
    const profileResult = await client.query(`
      SELECT id, name, "gpsSystem", "columnMapping", "createdAt"
      FROM public."GpsProfile"
      WHERE name = 'Polar Demo'
    `);
    
    expect(profileResult.rows.length).toBe(1);
    const profile = {
      id: profileResult.rows[0].id,
      gpsSystem: profileResult.rows[0].gpsSystem,
      sport: 'football',
      columnMapping: profileResult.rows[0].columnMapping || [],
      createdAt: profileResult.rows[0].createdAt.toISOString()
    };

    // Применяем профиль
    const applied = applyProfile(
      { headers: polarNormalized, rows: polarParsed.rows },
      profile
    );

    // Канонизируем данные
    const canonResult = mapRowsToCanonical(applied.dataRows, applied.mappedColumns);

    // Проверяем количество строк
    expect(canonResult.canonical.rows.length).toBe(5);

    // Проверяем первую строку (Ivan Petrov)
    const firstRow = canonResult.canonical.rows[0];
    expect(firstRow.total_distance_m).toBeCloseTo(5200, 0); // 5.2 km -> 5200 m
    expect(firstRow.max_speed_ms).toBeCloseTo(7.8889, 2); // 28.4 km/h -> 7.8889 m/s
    expect(firstRow.minutes_played).toBe(35);

    // Проверяем summary
    expect(canonResult.canonical.summary.total_distance_m).toBeCloseTo(25700, 0); // 5.2+6.1+4.7+5.9+3.8 km -> m
  });

  test('STATSports demo CSV should be processed correctly', async () => {
    // Загружаем CSV
    const statsportsCsv = readFileSync('fixtures/gps/statsports_demo.csv');
    const statsportsParsed = await parseSpreadsheet(statsportsCsv, 'statsports_demo.csv');
    const statsportsNormalized = normalizeHeaders(statsportsParsed.headers);

    // Находим профиль
    const profileResult = await client.query(`
      SELECT id, name, "gpsSystem", "columnMapping", "createdAt"
      FROM public."GpsProfile"
      WHERE name = 'STATSports Demo'
    `);
    
    expect(profileResult.rows.length).toBe(1);
    const profile = {
      id: profileResult.rows[0].id,
      gpsSystem: profileResult.rows[0].gpsSystem,
      sport: 'football',
      columnMapping: profileResult.rows[0].columnMapping || [],
      createdAt: profileResult.rows[0].createdAt.toISOString()
    };

    // Применяем профиль
    const applied = applyProfile(
      { headers: statsportsNormalized, rows: statsportsParsed.rows },
      profile
    );

    // Канонизируем данные
    const canonResult = mapRowsToCanonical(applied.dataRows, applied.mappedColumns);

    // Проверяем количество строк
    expect(canonResult.canonical.rows.length).toBe(5);

    // Проверяем первую строку (Ivan Petrov)
    const firstRow = canonResult.canonical.rows[0];
    expect(firstRow.total_distance_m).toBe(5200); // Уже в метрах
    expect(firstRow.max_speed_ms).toBeCloseTo(7.89, 2); // Уже в м/с
    expect(firstRow.duration_s).toBe(2100);

    // Проверяем summary
    expect(canonResult.canonical.summary.total_distance_m).toBe(25700); // 5200+6100+4700+5900+3800
  });
});
