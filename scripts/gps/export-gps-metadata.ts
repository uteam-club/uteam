#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync, statSync } from 'fs';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function exportGpsMetadata() {
  try {
    // Подключаемся к БД
    await client.connect();
    console.log('🔌 Connected to database for metadata export');

    // 1. Экспорт метаданных GpsReport
    console.log('📊 Exporting GpsReport metadata...');
    const reportsResult = await client.query(`
      SELECT 
        id,
        "profileId",
        "fileName",
        "createdAt",
        "isProcessed",
        ("profileSnapshot" IS NOT NULL) as "hasSnapshot",
        ("canonVersion" IS NOT NULL) as "hasCanon",
        pg_column_size("rawData") as "rawSize",
        pg_column_size("processedData") as "processedSize"
      FROM public."GpsReport"
      ORDER BY "createdAt"
    `);

    const reportsJsonl = reportsResult.rows.map(row => JSON.stringify({
      id: row.id,
      profileId: row.profileId,
      fileName: row.fileName,
      createdAt: row.createdAt.toISOString(),
      isProcessed: row.isProcessed,
      hasSnapshot: row.hasSnapshot,
      hasCanon: row.hasCanon,
      rawSize: row.rawSize,
      processedSize: row.processedSize
    })).join('\n');

    writeFileSync('artifacts/pre-wipe-gpsreport.jsonl', reportsJsonl);
    console.log(`✅ Exported ${reportsResult.rows.length} GpsReport records`);

    // 2. Экспорт метаданных GpsProfile
    console.log('📊 Exporting GpsProfile metadata...');
    const profilesResult = await client.query(`
      SELECT 
        p.id,
        p.name,
        p."gpsSystem",
        p."createdAt",
        (SELECT COUNT(*) FROM public."GpsReport" WHERE "profileId" = p.id) as "usageCount"
      FROM public."GpsProfile" p
      ORDER BY p."createdAt"
    `);

    const profilesJsonl = profilesResult.rows.map(row => JSON.stringify({
      id: row.id,
      name: row.name,
      gpsSystem: row.gpsSystem,
      createdAt: row.createdAt.toISOString(),
      usageCount: parseInt(row.usageCount)
    })).join('\n');

    writeFileSync('artifacts/pre-wipe-gpsprofile.jsonl', profilesJsonl);
    console.log(`✅ Exported ${profilesResult.rows.length} GpsProfile records`);

    // 3. Статистика файлов
    const reportsFileSize = statSync('artifacts/pre-wipe-gpsreport.jsonl').size;
    const profilesFileSize = statSync('artifacts/pre-wipe-gpsprofile.jsonl').size;

    console.log('\n📁 Export Summary:');
    console.log(`GpsReport: ${reportsResult.rows.length} records, ${reportsFileSize} bytes`);
    console.log(`GpsProfile: ${profilesResult.rows.length} records, ${profilesFileSize} bytes`);
    console.log(`Total size: ${reportsFileSize + profilesFileSize} bytes`);

  } catch (error) {
    console.error('❌ Metadata export failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Запускаем экспорт
exportGpsMetadata()
  .then(() => {
    console.log('🎯 Metadata export completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Metadata export failed:', error);
    process.exit(1);
  });
