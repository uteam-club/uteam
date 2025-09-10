#!/usr/bin/env tsx
// scripts/gps/debug-test-data.ts

import { config } from 'dotenv';
import { Client } from 'pg';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function debugTestData() {
  console.log('🔍 Отладка данных профиля "Test"...\n');

  try {
    await client.connect();
    console.log('✅ Подключение к БД установлено');

    // Получаем профиль
    const profileResult = await client.query(`
      SELECT id, name, "gpsSystem"
      FROM public."GpsProfile"
      WHERE name = 'Test'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (profileResult.rows.length === 0) {
      console.log('❌ Профиль "Test" не найден');
      return;
    }

    const profile = profileResult.rows[0];
    console.log(`✅ Профиль: ${profile.name} (${profile.id})`);

    // Получаем последний отчёт
    const reportResult = await client.query(`
      SELECT id, "fileName", "processedData"
      FROM public."GpsReport"
      WHERE "profileId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 1
    `, [profile.id]);

    if (reportResult.rows.length === 0) {
      console.log('❌ Отчёты не найдены');
      return;
    }

    const report = reportResult.rows[0];
    console.log(`✅ Отчёт: ${report.fileName}`);

    // Анализируем структуру processedData
    console.log('\n📊 Структура processedData:');
    console.log('Keys:', Object.keys(report.processedData || {}));
    
    if (report.processedData?.rawData) {
      console.log('rawData length:', report.processedData.rawData.length);
      console.log('rawData[0]:', report.processedData.rawData[0]);
    } else {
      console.log('rawData: отсутствует');
    }

    if (report.processedData?.headers) {
      console.log('headers:', report.processedData.headers);
    } else {
      console.log('headers: отсутствует');
    }

    if (report.processedData?.profileSnapshot) {
      console.log('profileSnapshot keys:', Object.keys(report.processedData.profileSnapshot));
      if (report.processedData.profileSnapshot.columns) {
        console.log('profileSnapshot.columns length:', report.processedData.profileSnapshot.columns.length);
        console.log('profileSnapshot.columns[0]:', report.processedData.profileSnapshot.columns[0]);
      }
    } else {
      console.log('profileSnapshot: отсутствует');
    }

    // Проверяем canonical данные
    if (report.processedData?.canonical) {
      console.log('\n📊 Canonical данные:');
      console.log('canonical keys:', Object.keys(report.processedData.canonical));
      if (report.processedData.canonical.rows) {
        console.log('canonical.rows length:', report.processedData.canonical.rows.length);
        console.log('canonical.rows[0]:', report.processedData.canonical.rows[0]);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await client.end();
    console.log('🔌 Соединение с БД закрыто');
  }
}

// Запускаем отладку
debugTestData();
