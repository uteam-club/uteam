#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function verifyWipe() {
  const results: string[] = [];
  
  function addResult(message: string) {
    console.log(message);
    results.push(message);
  }

  try {
    // Подключаемся к БД
    await client.connect();
    addResult('🔌 Connected to database for verification');

    // Проверяем количество записей в GpsReport
    const reportsCountResult = await client.query('SELECT COUNT(*) FROM public."GpsReport"');
    const reportsCount = parseInt(reportsCountResult.rows[0].count);
    addResult(`📊 GpsReport count: ${reportsCount}`);

    // Проверяем количество записей в GpsProfile
    const profilesCountResult = await client.query('SELECT COUNT(*) FROM public."GpsProfile"');
    const profilesCount = parseInt(profilesCountResult.rows[0].count);
    addResult(`📊 GpsProfile count: ${profilesCount}`);

    // Проверяем, что таблицы пусты
    if (reportsCount === 0 && profilesCount === 0) {
      addResult('✅ Verification PASSED: Both tables are empty');
    } else {
      addResult('❌ Verification FAILED: Tables are not empty');
    }

    // Дополнительная проверка - убеждаемся, что таблицы существуют
    const tablesExistResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('GpsReport', 'GpsProfile')
      ORDER BY table_name
    `);
    
    const existingTables = tablesExistResult.rows.map(row => row.table_name);
    addResult(`📋 Existing tables: ${existingTables.join(', ')}`);

    if (existingTables.includes('GpsReport') && existingTables.includes('GpsProfile')) {
      addResult('✅ Table structure preserved: Both tables still exist');
    } else {
      addResult('❌ Table structure issue: Some tables missing');
    }

  } catch (error) {
    addResult(`❌ Verification failed: ${error}`);
    throw error;
  } finally {
    await client.end();
    addResult('🔌 Database connection closed');
    
    // Сохраняем результаты
    writeFileSync('artifacts/verify-wipe.txt', results.join('\n'));
    addResult('📁 Verification results saved to artifacts/verify-wipe.txt');
  }
}

// Запускаем проверку
verifyWipe()
  .then(() => {
    console.log('🎯 Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });
