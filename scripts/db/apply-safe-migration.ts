#!/usr/bin/env ts-node

import { readFileSync } from 'fs';
import { writeFileSync } from 'fs';
import { Client } from 'pg';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

// Используем прямой pg-клиент для raw SQL
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function applySafeMigration() {
  const logFile = 'artifacts/migration-apply.log';
  const log: string[] = [];
  
  function logMessage(message: string) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    console.log(logLine);
    log.push(logLine);
  }

  try {
    logMessage('🔄 Starting GPS safe migration...');
    
    // Проверяем наличие DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Подключаемся к БД
    await client.connect();
    logMessage('🔌 Connected to database');
    
    // Устанавливаем statement_timeout = 0
    await client.query('SET statement_timeout = 0');
    logMessage('⏱️ Set statement_timeout = 0');
    
    // Проверки подключения
    const connectionInfo = await client.query(`
      SELECT current_database(), current_schema(), version()
    `);
    logMessage(`📊 Database: ${connectionInfo.rows[0].current_database}`);
    logMessage(`📊 Schema: ${connectionInfo.rows[0].current_schema}`);
    logMessage(`📊 PostgreSQL version: ${connectionInfo.rows[0].version.split(' ')[0]}`);
    
    // Подготавливаем SQL-операторы
    const sqlOperations = [
      'ALTER TABLE "GpsReport" ADD COLUMN IF NOT EXISTS "profileSnapshot" jsonb;',
      'ALTER TABLE "GpsReport" ADD COLUMN IF NOT EXISTS "canonVersion" text;',
      'ALTER TABLE "GpsReport" ADD COLUMN IF NOT EXISTS "importMeta" jsonb;',
      'ALTER TABLE "GpsReport" ALTER COLUMN "importMeta" SET DEFAULT \'{}\'::jsonb;',
      'CREATE INDEX IF NOT EXISTS "idx_GpsReport_profileId" ON "GpsReport" ("profileId");'
    ];
    
    logMessage('🔧 Starting transaction...');
    await client.query('BEGIN');
    
    // Выполняем каждый оператор по отдельности
    for (let i = 0; i < sqlOperations.length; i++) {
      const sql = sqlOperations[i];
      const operationName = [
        'Add profileSnapshot column',
        'Add canonVersion column', 
        'Add importMeta column',
        'Set importMeta default',
        'Create profileId index'
      ][i];
      
      logMessage(`🔧 Step ${i + 1}/5: ${operationName}`);
      logMessage(`📝 SQL: ${sql}`);
      
      try {
        await client.query(sql);
        logMessage(`✅ Step ${i + 1} completed successfully`);
      } catch (error) {
        logMessage(`❌ Step ${i + 1} failed: ${error}`);
        await client.query('ROLLBACK');
        throw new Error(`Migration failed at step ${i + 1}: ${error}`);
      }
    }
    
    // Коммитим транзакцию
    await client.query('COMMIT');
    logMessage('✅ Transaction committed successfully');
    logMessage('🎉 All GPS columns and index added safely');
    
  } catch (error) {
    const errorMsg = `❌ Migration failed: ${error}`;
    logMessage(errorMsg);
    console.error(errorMsg);
    process.exit(1);
  } finally {
    // Закрываем соединение
    await client.end();
    logMessage('🔌 Database connection closed');
    
    // Сохраняем лог
    writeFileSync(logFile, log.join('\n'));
    logMessage(`📋 Log saved to: ${logFile}`);
  }
}

// Запускаем миграцию
applySafeMigration()
  .then(() => {
    console.log('🎯 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });