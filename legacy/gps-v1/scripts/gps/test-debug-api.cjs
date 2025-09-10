#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки debug-функциональности через API
 * Создаёт тестовый файл и отправляет POST запрос
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

console.log('🧪 Тестирование debug-функциональности через API...\n');

async function testDebugUpload() {
  try {
    // 1. Создаём тестовый CSV файл
    console.log('1. Создание тестового файла...');
    const testCsv = `Игрок,Индивидуальное время,Дистанция общая м,Макс. скорость км/ч
Иван Петров,01:20:00,8200,32.4
Петр Сидоров,00:45:00,5100,28.7`;
    
    const testFile = path.join(process.cwd(), 'artifacts', 'test-gps-debug.csv');
    fs.writeFileSync(testFile, testCsv);
    console.log(`   ✅ Создан: ${testFile}`);
    
    // 2. Подготавливаем FormData
    console.log('\n2. Подготовка FormData...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFile));
    
    const meta = {
      eventId: 'test-event-id',
      teamId: 'test-team-id', 
      gpsSystem: 'B-SIGHT',
      profileId: 'test-profile-id',
      fileName: 'test-gps-debug.csv',
      eventType: 'TRAINING',
      playerMappings: []
    };
    
    formData.append('meta', JSON.stringify(meta));
    console.log('   ✅ FormData подготовлен');
    
    // 3. Отправляем POST запрос
    console.log('\n3. Отправка POST запроса...');
    const response = await fetch('http://localhost:3000/api/gps-reports', {
      method: 'POST',
      body: formData
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Ошибка: ${errorText}`);
      return;
    }
    
    const result = await response.json();
    console.log('   ✅ Запрос успешен');
    
    // 4. Проверяем debug файл
    console.log('\n4. Проверка debug файла...');
    const debugPath = path.join(process.cwd(), 'artifacts', 'last-upload-debug.json');
    
    if (!fs.existsSync(debugPath)) {
      console.log('   ❌ Debug файл не найден!');
      return;
    }
    
    const debugData = JSON.parse(fs.readFileSync(debugPath, 'utf8'));
    console.log('   ✅ Debug файл найден');
    
    // 5. Анализируем debug данные
    console.log('\n📊 Анализ debug данных:');
    console.log(`   Timestamp: ${debugData.timestamp}`);
    console.log(`   Event ID: ${debugData.meta.eventId}`);
    console.log(`   Profile ID: ${debugData.meta.profileId}`);
    console.log(`   File: ${debugData.meta.fileName}`);
    
    const { debug } = debugData;
    
    console.log('\n🔍 Нормализация:');
    console.log(`   Strategy: ${debug.normalize.strategy}`);
    console.log(`   Headers: ${debug.normalize.headers?.length || 0}`);
    console.log(`   Rows: ${debug.normalize.rows}`);
    console.log(`   Sample keys: ${debug.normalize.sampleRowKeys?.join(', ') || 'none'}`);
    
    console.log('\n📋 Снапшот:');
    console.log(`   Visible columns: ${debug.snapshot.visibleCount}`);
    console.log(`   Total columns: ${debug.snapshot.totalCount}`);
    console.log(`   Expected headers: ${debug.snapshot.columns.map(c => c.sourceHeader).join(', ')}`);
    
    console.log('\n🗺️ Маппинг:');
    console.log(`   Canon rows: ${debug.mapping.canonRows}`);
    console.log(`   Missing headers: ${debug.mapping.missingHeaders.length}`);
    
    if (debug.mapping.missingHeaders.length > 0) {
      console.log('   Missing:');
      debug.mapping.missingHeaders.forEach(m => {
        console.log(`     - ${m.canonicalKey}: ${m.missing}`);
      });
    }
    
    // 6. Проверяем критические проблемы
    const issues = [];
    
    if (debug.mapping.canonRows === 0) {
      issues.push('❌ canonRows = 0');
    }
    
    if (debug.normalize.strategy === 'unknown') {
      issues.push('❌ Unknown normalization strategy');
    }
    
    if (debug.mapping.missingHeaders.length > 0) {
      issues.push(`⚠️  Missing ${debug.mapping.missingHeaders.length} headers`);
    }
    
    if (issues.length === 0) {
      console.log('\n✅ Все проверки пройдены успешно!');
    } else {
      console.log('\n🚨 Обнаружены проблемы:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    console.log(`\n📄 Полный debug сохранён в: ${debugPath}`);
    
    // 7. Очистка
    fs.unlinkSync(testFile);
    console.log('\n🧹 Тестовый файл удалён');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    process.exit(1);
  }
}

// Проверяем, что сервер запущен
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/test');
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Проверка доступности сервера...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Сервер не запущен на localhost:3000');
    console.log('   Запустите: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Сервер доступен\n');
  await testDebugUpload();
}

main();
