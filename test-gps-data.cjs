// Тестовый скрипт для проверки canonical данных
const XLSX = require('xlsx');

// Создаем тестовые данные
const testData = [
  ['Player Name', 'TD', 'Max Speed', 'Z-3 Tempo', 'Z-4 HIR', 'Z-5 Sprint'],
  ['Игрок 1', '5000', '25.5', '1000', '500', '200'],
  ['Игрок 2', '4500', '24.8', '900', '450', '180'],
  ['Игрок 3', '5200', '26.2', '1100', '550', '220']
];

// Создаем Excel файл
const ws = XLSX.utils.aoa_to_sheet(testData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

// Сохраняем файл
XLSX.writeFile(wb, 'test-gps-report.xlsx');

console.log('✅ Тестовый Excel файл создан: test-gps-report.xlsx');
console.log('📊 Данные:', testData);
