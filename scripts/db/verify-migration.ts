#!/usr/bin/env ts-node

import { Client } from 'pg';
import { writeFileSync } from 'fs';

// Используем прямой pg-клиент для raw SQL
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

async function verifyMigration() {
  const logFile = 'artifacts/verification.txt';
  const results: string[] = [];
  
  function addResult(title: string, data: any) {
    results.push(`\n=== ${title} ===`);
    results.push(JSON.stringify(data, null, 2));
  }

  try {
    // Подключаемся к БД
    await client.connect();
    console.log('🔌 Connected to database for verification');

    // 1. Структура столбцов
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name='GpsReport'
      ORDER BY column_name;
    `);
    addResult('Структура столбцов GpsReport', columnsResult.rows);

    // 2. Статистика новых полей
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) AS total_reports,
        SUM((profileSnapshot IS NOT NULL)::int) AS with_snapshot,
        SUM((canonVersion   IS NOT NULL)::int) AS with_canon_ver,
        SUM((importMeta     IS NOT NULL)::int) AS with_import_meta
      FROM "GpsReport";
    `);
    addResult('Статистика новых полей', statsResult.rows);

    // 3. Индексы
    const indexesResult = await client.query(`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename='GpsReport';
    `);
    addResult('Индексы GpsReport', indexesResult.rows);

    // Сохраняем результаты
    writeFileSync(logFile, results.join('\n'));
    console.log(`📋 Verification results saved to: ${logFile}`);

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Запускаем верификацию
verifyMigration()
  .then(() => {
    console.log('🎯 Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });
