// Тестовый скрипт для проверки canonical данных через API
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testCanonicalAPI() {
  try {
    console.log('🧪 Тестируем canonical данные через API...');
    
    // Читаем тестовый Excel файл
    const excelBuffer = fs.readFileSync('test-gps-report.xlsx');
    console.log('📊 Excel файл загружен:', excelBuffer.length, 'байт');
    
    // Создаем FormData для загрузки
    const formData = new FormData();
    formData.append('file', excelBuffer, {
      filename: 'test-gps-report.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    formData.append('teamId', '1d83ba7f-362b-487c-8277-1ab4c30c3793'); // Vista team
    formData.append('eventType', 'TRAINING');
    formData.append('eventId', 'test-event-' + Date.now());
    formData.append('profileId', 'test-profile-id'); // Будет создан автоматически
    
    console.log('📤 Отправляем запрос на загрузку GPS-отчёта...');
    
    // Отправляем запрос на загрузку
    const response = await fetch('http://localhost:3000/api/gps-reports', {
      method: 'POST',
      body: formData
    });
    
    console.log('📥 Ответ сервера:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ GPS-отчёт загружен успешно!');
      console.log('📊 ID отчёта:', result.id);
      console.log('📊 Обработан:', result.isProcessed);
      console.log('📊 Canonical данные:', !!result.processedData?.canonical);
      
      if (result.processedData?.canonical) {
        console.log('📊 Canonical rows:', result.processedData.canonical.rows?.length);
        console.log('📊 Первая строка:', result.processedData.canonical.rows?.[0]);
        console.log('📊 Ключи canonical:', Object.keys(result.processedData.canonical.rows?.[0] || {}));
      } else {
        console.log('❌ Canonical данные не найдены');
      }
    } else {
      const error = await response.text();
      console.log('❌ Ошибка загрузки:', error);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testCanonicalAPI();
