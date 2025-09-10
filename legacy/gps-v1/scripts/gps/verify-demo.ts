#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function verifyDemo() {
  const results: string[] = [];
  
  function addResult(message: string) {
    console.log(message);
    results.push(message);
  }

  try {
    // Подключаемся к БД
    await client.connect();
    addResult('🔌 Connected to database for demo verification');

    // a) Сводка по отчётам
    addResult('\n📊 GPS Reports Summary:');
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        SUM(("profileSnapshot" IS NOT NULL)::int) as with_snapshot,
        SUM(("canonVersion" IS NOT NULL)::int) as with_canon
      FROM public."GpsReport"
    `);
    
    const summary = summaryResult.rows[0];
    addResult(`Total reports: ${summary.total}`);
    addResult(`With profileSnapshot: ${summary.with_snapshot}`);
    addResult(`With canonVersion: ${summary.with_canon}`);

    // b) Проверка конкретных отчётов
    addResult('\n📋 Demo Reports Check:');
    const reportsResult = await client.query(`
      SELECT 
        id, 
        name, 
        ("importMeta"->>'seedDemo')::bool AS seedDemo,
        ("profileSnapshot"->'columns') IS NOT NULL AS hasCols,
        "canonVersion"
      FROM public."GpsReport"
      WHERE name IN ('Polar Demo Report','STATSports Demo Report')
      ORDER BY name
    `);
    
    for (const report of reportsResult.rows) {
      addResult(`${report.name}: ${report.id}`);
      addResult(`  seedDemo: ${report.seeddemo}`);
      addResult(`  hasColumns: ${report.hascols}`);
      addResult(`  canonVersion: ${report.canonversion}`);
    }

    // c) Проверка видимых колонок из snapshot
    addResult('\n📊 Profile Snapshot Columns:');
    const columnsResult = await client.query(`
      SELECT 
        name,
        "profileSnapshot"->'columns' as columns
      FROM public."GpsReport"
      WHERE name IN ('Polar Demo Report','STATSports Demo Report')
      ORDER BY name
    `);
    
    for (const report of columnsResult.rows) {
      addResult(`\n${report.name}:`);
      const columns = report.columns || [];
      for (let i = 0; i < Math.min(4, columns.length); i++) {
        const col = columns[i];
        addResult(`  ${i + 1}. ${col.displayName} (${col.canonicalKey}) - order: ${col.order}`);
      }
    }

    // d) Проверка унификации канона
    addResult('\n🔢 Canonical Data Unification:');
    try {
      const canonResult = await client.query(`
        SELECT
          SUM(CASE WHEN name LIKE 'Polar%' THEN ("processedData"->'canonical'->'summary'->>'total_distance_m')::decimal ELSE 0 END) AS td_polar_sum,
          SUM(CASE WHEN name LIKE 'STATSports%' THEN ("processedData"->'canonical'->'summary'->>'total_distance_m')::decimal ELSE 0 END) AS td_statsports_sum
        FROM public."GpsReport"
        WHERE name IN ('Polar Demo Report','STATSports Demo Report')
      `);
      
      const canon = canonResult.rows[0];
      addResult(`Polar total_distance_m sum: ${canon.td_polar_sum || 'N/A'}`);
      addResult(`STATSports total_distance_m sum: ${canon.td_statsports_sum || 'N/A'}`);
      
      if (canon.td_polar_sum && canon.td_statsports_sum) {
        const polarKm = canon.td_polar_sum / 1000; // Convert m to km
        const statsportsKm = canon.td_statsports_sum / 1000;
        addResult(`Polar (converted to km): ${polarKm.toFixed(2)} km`);
        addResult(`STATSports (converted to km): ${statsportsKm.toFixed(2)} km`);
        addResult(`Difference: ${Math.abs(polarKm - statsportsKm).toFixed(2)} km`);
      }
    } catch (error) {
      addResult(`⚠️  Canonical data check failed: ${error}`);
    }

    // e) Проверка профилей
    addResult('\n📊 GPS Profiles:');
    const profilesResult = await client.query(`
      SELECT id, name, "gpsSystem", "columnMapping"
      FROM public."GpsProfile"
      WHERE name IN ('Polar Demo', 'STATSports Demo')
      ORDER BY name
    `);
    
    for (const profile of profilesResult.rows) {
      addResult(`${profile.name} (${profile.gpsSystem}): ${profile.id}`);
      const mapping = profile.columnMapping || [];
      addResult(`  Column mappings: ${mapping.length}`);
    }

    // f) Проверка игроков (пропускаем - схема не поддерживает)
    addResult('\n👥 Players: Skipped (schema not supported)');

    // g) Dev URLs для просмотра отчётов
    addResult('\n🌐 Dev URLs for Report Viewing:');
    const devReportsResult = await client.query(`
      SELECT id, name
      FROM public."GpsReport"
      WHERE name IN ('Polar Demo Report','STATSports Demo Report')
      ORDER BY name
    `);
    
    for (const report of devReportsResult.rows) {
      const devUrl = `http://localhost:3000/dev/gps-report/${report.id}`;
      addResult(`${report.name}: ${devUrl}`);
    }

  } catch (error) {
    addResult(`❌ Verification failed: ${error}`);
    throw error;
  } finally {
    await client.end();
    addResult('🔌 Database connection closed');
    
    // Сохраняем результаты
    writeFileSync('artifacts/verify-demo.txt', results.join('\n'));
    addResult('📁 Verification results saved to artifacts/verify-demo.txt');
  }
}

// Запускаем проверку
verifyDemo()
  .then(() => {
    console.log('🎯 Demo verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Demo verification failed:', error);
    process.exit(1);
  });
