#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

const BATCH_SIZE = 500;
let deletedReports = 0;
let deletedProfiles = 0;

async function wipeGpsData() {
  const logMessages: string[] = [];
  
  function logMessage(message: string) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    console.log(logLine);
    logMessages.push(logLine);
  }

  try {
    // Подключаемся к БД
    await client.connect();
    logMessage('🔌 Connected to database for GPS data wipe');

    // A) Удаление GpsReport
    logMessage('🗑️  Starting GpsReport deletion...');
    
    // Получаем все ID отчётов
    const reportsResult = await client.query('SELECT id FROM public."GpsReport" ORDER BY "createdAt"');
    const reportIds = reportsResult.rows.map(row => row.id);
    
    logMessage(`📊 Found ${reportIds.length} GpsReport records to delete`);

    // Удаляем батчами
    for (let i = 0; i < reportIds.length; i += BATCH_SIZE) {
      const batch = reportIds.slice(i, i + BATCH_SIZE);
      
      try {
        await client.query('BEGIN');
        logMessage(`🔧 Deleting GpsReport batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(reportIds.length / BATCH_SIZE)} (${batch.length} records)`);
        
        const deleteResult = await client.query(
          'DELETE FROM public."GpsReport" WHERE id = ANY($1::uuid[])',
          [batch]
        );
        
        await client.query('COMMIT');
        deletedReports += deleteResult.rowCount || 0;
        logMessage(`✅ Deleted ${deleteResult.rowCount || 0} GpsReport records`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        logMessage(`❌ Failed to delete GpsReport batch: ${error}`);
        throw error;
      }
    }

    logMessage(`✅ GpsReport deletion completed: ${deletedReports} records deleted`);

    // B) Удаление GpsProfile
    logMessage('🗑️  Starting GpsProfile deletion...');
    
    // Получаем все ID профилей
    const profilesResult = await client.query('SELECT id FROM public."GpsProfile" ORDER BY "createdAt"');
    const profileIds = profilesResult.rows.map(row => row.id);
    
    logMessage(`📊 Found ${profileIds.length} GpsProfile records to delete`);

    // Удаляем батчами
    for (let i = 0; i < profileIds.length; i += BATCH_SIZE) {
      const batch = profileIds.slice(i, i + BATCH_SIZE);
      
      try {
        await client.query('BEGIN');
        logMessage(`🔧 Deleting GpsProfile batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(profileIds.length / BATCH_SIZE)} (${batch.length} records)`);
        
        const deleteResult = await client.query(
          'DELETE FROM public."GpsProfile" WHERE id = ANY($1::uuid[])',
          [batch]
        );
        
        await client.query('COMMIT');
        deletedProfiles += deleteResult.rowCount || 0;
        logMessage(`✅ Deleted ${deleteResult.rowCount || 0} GpsProfile records`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        logMessage(`❌ Failed to delete GpsProfile batch: ${error}`);
        throw error;
      }
    }

    logMessage(`✅ GpsProfile deletion completed: ${deletedProfiles} records deleted`);

    // Итоговая сводка
    logMessage(`🎯 GPS data wipe completed successfully`);
    logMessage(`📊 Total deleted: ${deletedReports} GpsReport records, ${deletedProfiles} GpsProfile records`);

  } catch (error) {
    logMessage(`💥 GPS data wipe failed: ${error}`);
    throw error;
  } finally {
    await client.end();
    logMessage('🔌 Database connection closed');
    
    // Сохраняем лог
    writeFileSync('artifacts/wipe-gps.log', logMessages.join('\n'));
    logMessage('📁 Log saved to artifacts/wipe-gps.log');
  }
}

// Запускаем удаление
wipeGpsData()
  .then(() => {
    console.log(`\n🎯 GPS data wipe completed: ${deletedReports} reports, ${deletedProfiles} profiles deleted`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 GPS data wipe failed:', error);
    process.exit(1);
  });
