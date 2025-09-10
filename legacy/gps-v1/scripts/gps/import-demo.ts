#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync, readFileSync } from 'fs';
import { config } from 'dotenv';
import { parseSpreadsheet, normalizeHeaders, applyProfile } from '../../src/services/gps/ingest.service';
import { mapRowsToCanonical } from '../../src/services/canon.mapper';
import { buildProfileSnapshot } from '../../src/services/gps/profileSnapshot.service';
// @ts-ignore
import { CANON } from '../../src/canon/metrics.registry';
import { v4 as uuidv4 } from 'uuid';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

interface ImportResult {
  polarReportId: string;
  statsportsReportId: string;
  polarRowsCount: number;
  statsportsRowsCount: number;
}

async function importDemo() {
  const result: ImportResult = {
    polarReportId: '',
    statsportsReportId: '',
    polarRowsCount: 0,
    statsportsRowsCount: 0
  };

  try {
    // Подключаемся к БД
    await client.connect();
    console.log('🔌 Connected to database for demo import');

    // Загружаем созданные ID
    const seedData = JSON.parse(readFileSync('artifacts/seed-demo.ids.json', 'utf8'));
    console.log('📁 Loaded seed data');

    // 1. Импорт Polar отчёта
    console.log('📊 Importing Polar demo report...');
    const polarCsv = readFileSync('fixtures/gps/polar_demo.csv');
    const polarParsed = await parseSpreadsheet(polarCsv, 'polar_demo.csv');
    const polarNormalized = normalizeHeaders(polarParsed.headers);
    
    // Находим Polar профиль
    const polarProfileResult = await client.query(`
      SELECT id, name, "gpsSystem", "columnMapping", "createdAt"
      FROM public."GpsProfile"
      WHERE name = 'Polar Demo'
    `);
    
    if (polarProfileResult.rows.length === 0) {
      throw new Error('Polar profile not found');
    }
    
    const polarProfile = {
      id: polarProfileResult.rows[0].id,
      gpsSystem: polarProfileResult.rows[0].gpsSystem,
      sport: 'football',
      version: 1,
      columnMapping: polarProfileResult.rows[0].columnMapping || [],
      createdAt: polarProfileResult.rows[0].createdAt.toISOString()
    };

    // Применяем профиль
    const polarApplied = applyProfile(
      { headers: polarNormalized, rows: polarParsed.rows },
      polarProfile
    );

    // Канонизируем данные
    const polarCanonResult = mapRowsToCanonical(polarApplied.dataRows, polarApplied.mappedColumns);
    
    // Строим snapshot
    const polarSnapshot = buildProfileSnapshot(polarProfile);

    // Сохраняем отчёт
    const polarReportResult = await client.query(`
      INSERT INTO public."GpsReport" (
        id, name, "fileName", "fileUrl", "gpsSystem", "eventType", "eventId", "teamId", "profileId", "profileSnapshot", "canonVersion",
        "rawData", "processedData", "importMeta", "isProcessed", "clubId", "uploadedById"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id
    `, [
      uuidv4(),
      'Polar Demo Report',
      'polar_demo.csv',
      'demo://polar_demo.csv',
      polarProfile.gpsSystem,
      'training',
      uuidv4(),
      seedData.teamId,
      polarProfile.id,
      JSON.stringify(polarSnapshot),
      CANON.__meta?.version || '1.0.1',
      JSON.stringify(polarParsed.rows),
      JSON.stringify(polarCanonResult),
      JSON.stringify({ seedDemo: true }),
      true,
      seedData.clubId,
      seedData.clubId // Используем clubId как uploadedById для простоты
    ]);

    result.polarReportId = polarReportResult.rows[0].id;
    result.polarRowsCount = polarParsed.rows.length - 1; // -1 для заголовка
    console.log(`✅ Polar report imported: ${result.polarReportId} (${result.polarRowsCount} rows)`);

    // 2. Импорт STATSports отчёта
    console.log('📊 Importing STATSports demo report...');
    const statsportsCsv = readFileSync('fixtures/gps/statsports_demo.csv');
    const statsportsParsed = await parseSpreadsheet(statsportsCsv, 'statsports_demo.csv');
    const statsportsNormalized = normalizeHeaders(statsportsParsed.headers);
    
    // Находим STATSports профиль
    const statsportsProfileResult = await client.query(`
      SELECT id, name, "gpsSystem", "columnMapping", "createdAt"
      FROM public."GpsProfile"
      WHERE name = 'STATSports Demo'
    `);
    
    if (statsportsProfileResult.rows.length === 0) {
      throw new Error('STATSports profile not found');
    }
    
    const statsportsProfile = {
      id: statsportsProfileResult.rows[0].id,
      gpsSystem: statsportsProfileResult.rows[0].gpsSystem,
      sport: 'football',
      version: 1,
      columnMapping: statsportsProfileResult.rows[0].columnMapping || [],
      createdAt: statsportsProfileResult.rows[0].createdAt.toISOString()
    };

    // Применяем профиль
    const statsportsApplied = applyProfile(
      { headers: statsportsNormalized, rows: statsportsParsed.rows },
      statsportsProfile
    );

    // Канонизируем данные
    const statsportsCanonResult = mapRowsToCanonical(statsportsApplied.dataRows, statsportsApplied.mappedColumns);
    
    // Строим snapshot
    const statsportsSnapshot = buildProfileSnapshot(statsportsProfile);

    // Сохраняем отчёт
    const statsportsReportResult = await client.query(`
      INSERT INTO public."GpsReport" (
        id, name, "fileName", "fileUrl", "gpsSystem", "eventType", "eventId", "teamId", "profileId", "profileSnapshot", "canonVersion",
        "rawData", "processedData", "importMeta", "isProcessed", "clubId", "uploadedById"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id
    `, [
      uuidv4(),
      'STATSports Demo Report',
      'statsports_demo.csv',
      'demo://statsports_demo.csv',
      statsportsProfile.gpsSystem,
      'training',
      uuidv4(),
      seedData.teamId,
      statsportsProfile.id,
      JSON.stringify(statsportsSnapshot),
      CANON.__meta?.version || '1.0.1',
      JSON.stringify(statsportsParsed.rows),
      JSON.stringify(statsportsCanonResult),
      JSON.stringify({ seedDemo: true }),
      true,
      seedData.clubId,
      seedData.clubId // Используем clubId как uploadedById для простоты
    ]);

    result.statsportsReportId = statsportsReportResult.rows[0].id;
    result.statsportsRowsCount = statsportsParsed.rows.length - 1; // -1 для заголовка
    console.log(`✅ STATSports report imported: ${result.statsportsReportId} (${result.statsportsRowsCount} rows)`);

    // Сохраняем сводку
    const summary = `# GPS Demo Import Summary

## Reports Created

| Report | ID | Profile | Rows |
|--------|----|---------|------|
| Polar Demo Report | ${result.polarReportId} | Polar Demo | ${result.polarRowsCount} |
| STATSports Demo Report | ${result.statsportsReportId} | STATSports Demo | ${result.statsportsRowsCount} |

## Notes

- Both reports have profileSnapshot and canonVersion
- Data processed through clean ingest pipeline (no vendor-specific code)
- Canonical metrics unified to SI units
- Generated: ${new Date().toISOString()}
`;

    writeFileSync('artifacts/import-demo.md', summary);
    console.log('📁 Import summary saved to artifacts/import-demo.md');

    console.log('\n🎯 Demo import completed:');
    console.log(`Polar: ${result.polarReportId} (${result.polarRowsCount} rows)`);
    console.log(`STATSports: ${result.statsportsReportId} (${result.statsportsRowsCount} rows)`);

  } catch (error) {
    console.error('❌ Demo import failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Запускаем импорт
importDemo()
  .then(() => {
    console.log('🎯 Demo import completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Demo import failed:', error);
    process.exit(1);
  });
