// Простой тест валидации GPS данных
const { GpsDataValidator } = require('./src/lib/gps-validation.ts');

// Тест 1: Валидные данные
console.log('=== Тест 1: Валидные данные ===');
const validData = {
  headers: ['Player', 'Speed', 'Distance'],
  rows: [
    { Player: 'Иванов', Speed: 25, Distance: 5000 },
    { Player: 'Петров', Speed: 30, Distance: 3000 }
  ],
  playerNames: ['Иванов', 'Петров']
};

const validResult = GpsDataValidator.validate(validData);
console.log('Результат:', validResult.isValid ? '✅ Валидные' : '❌ Невалидные');
if (!validResult.isValid) {
  console.log('Ошибки:', GpsDataValidator.formatErrors(validResult.errors));
}

// Тест 2: Некорректные данные
console.log('\n=== Тест 2: Некорректные данные ===');
const invalidData = {
  headers: ['Player', 'Speed', 'Distance'],
  rows: [
    { Player: 'Иванов', Speed: 25, Distance: 5000 },
    { Player: 'Петров', Speed: 'быстро', Distance: 3000 }, // Ошибка!
    { Player: 'Сидоров', Speed: 30, Distance: 'много' } // Ошибка!
  ],
  playerNames: ['Иванов', 'Петров', 'Сидоров']
};

const invalidResult = GpsDataValidator.validate(invalidData);
console.log('Результат:', invalidResult.isValid ? '✅ Валидные' : '❌ Невалидные');
if (!invalidResult.isValid) {
  console.log('Ошибки:', GpsDataValidator.formatErrors(invalidResult.errors));
}

// Тест 3: Отсутствует колонка с игроками
console.log('\n=== Тест 3: Отсутствует колонка с игроками ===');
const noPlayerColumnData = {
  headers: ['Speed', 'Distance'],
  rows: [
    { Speed: 25, Distance: 5000 },
    { Speed: 30, Distance: 3000 }
  ],
  playerNames: []
};

const noPlayerResult = GpsDataValidator.validate(noPlayerColumnData);
console.log('Результат:', noPlayerResult.isValid ? '✅ Валидные' : '❌ Невалидные');
if (!noPlayerResult.isValid) {
  console.log('Ошибки:', GpsDataValidator.formatErrors(noPlayerResult.errors));
}
