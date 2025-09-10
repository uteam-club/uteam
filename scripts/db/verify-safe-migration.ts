#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

// Используем прямой pg-клиент для raw SQL
const client = new Client({
  connectionString: process.env.DATABASE_URL
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

    // a) Структура столбцов
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = CURRENT_SCHEMA AND table_name = 'GpsReport'
      ORDER BY column_name;
    `);
    addResult('Структура столбцов GpsReport', columnsResult.rows);

    // b) Статистика новых полей
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) AS total_reports,
        SUM(("profileSnapshot" IS NOT NULL)::int) AS with_snapshot,
        SUM(("canonVersion"   IS NOT NULL)::int) AS with_canon_ver,
        SUM(("importMeta"     IS NOT NULL)::int) AS with_import_meta
      FROM "GpsReport";
    `);
    addResult('Статистика новых полей', statsResult.rows);

    // c) Робастная проверка индексов
    const indexOidResult = await client.query(`
      SELECT to_regclass('public."idx_GpsReport_profileId"') AS idx_oid;
    `);
    addResult('Проверка OID индекса idx_GpsReport_profileId', indexOidResult.rows);

    const allIndexesResult = await client.query(`
      SELECT i.relname AS indexname, pg_get_indexdef(ix.indexrelid) AS indexdef
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'GpsReport';
    `);
    addResult('Все индексы таблицы GpsReport', allIndexesResult.rows);

    const profileIdIndexResult = await client.query(`
      SELECT i.relname AS indexname, pg_get_indexdef(ix.indexrelid) AS indexdef
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'GpsReport'
        AND pg_get_indexdef(ix.indexrelid) ILIKE '%("profileId")%';
    `);
    addResult('Индексы по колонке profileId', profileIdIndexResult.rows);

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
