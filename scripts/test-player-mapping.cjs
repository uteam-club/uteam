const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Начинаю автоматическую проверку системы маппингов игроков...\n');

// Функция для выполнения команд
function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    const result = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
    console.log(`✅ ${description} - УСПЕШНО`);
    return result;
  } catch (error) {
    console.log(`❌ ${description} - ОШИБКА:`);
    console.log(error.message);
    return null;
  }
}

// Функция для проверки файлов
function checkFile(filePath, description) {
  console.log(`📁 ${description}...`);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description} - НАЙДЕН`);
    return true;
  } else {
    console.log(`❌ ${description} - НЕ НАЙДЕН`);
    return false;
  }
}

// Функция для проверки содержимого файла
function checkFileContent(filePath, searchText, description) {
  console.log(`🔍 ${description}...`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchText)) {
      console.log(`✅ ${description} - НАЙДЕНО`);
      return true;
    } else {
      console.log(`❌ ${description} - НЕ НАЙДЕНО`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description} - ОШИБКА ЧТЕНИЯ`);
    return false;
  }
}

// Основные проверки
console.log('=== ПРОВЕРКА ФАЙЛОВ СИСТЕМЫ ===\n');

// 1. Проверяем основные файлы системы маппингов
const mappingFiles = [
  { path: 'src/services/playerMapping.service.ts', desc: 'Сервис маппингов игроков' },
  { path: 'src/db/schema/playerMapping.ts', desc: 'Схема базы данных маппингов' },
  { path: 'src/components/gps/PlayerMappingModal.tsx', desc: 'Модальное окно маппингов' },
  { path: 'src/components/gps/PlayerMappingsTab.tsx', desc: 'Вкладка управления маппингами' },
  { path: 'src/app/api/player-mappings/route.ts', desc: 'API маппингов (GET/POST)' },
  { path: 'src/app/api/player-mappings/[id]/route.ts', desc: 'API маппингов (DELETE)' },
  { path: 'src/app/api/player-mappings/auto-match/route.ts', desc: 'API автоматического сопоставления' },
  { path: 'src/app/api/gps-reports/extract-players/route.ts', desc: 'API извлечения игроков из файла' }
];

let filesFound = 0;
mappingFiles.forEach(file => {
  if (checkFile(file.path, file.desc)) {
    filesFound++;
  }
});

console.log(`\n📊 Результат: ${filesFound}/${mappingFiles.length} файлов найдено\n`);

// 2. Проверяем ключевые функции в сервисе
console.log('=== ПРОВЕРКА ФУНКЦИОНАЛЬНОСТИ ===\n');

const serviceChecks = [
  { file: 'src/services/playerMapping.service.ts', search: 'findExistingMapping', desc: 'Функция поиска существующих маппингов' },
  { file: 'src/services/playerMapping.service.ts', search: 'autoMatchPlayer', desc: 'Функция автоматического сопоставления' },
  { file: 'src/services/playerMapping.service.ts', search: 'fuzzyMatch', desc: 'Функция нечеткого сопоставления' },
  { file: 'src/services/playerMapping.service.ts', search: 'saveMapping', desc: 'Функция сохранения маппинга' },
  { file: 'src/services/playerMapping.service.ts', search: 'getTeamMappings', desc: 'Функция получения маппингов команды' },
  { file: 'src/services/playerMapping.service.ts', search: 'deleteMapping', desc: 'Функция удаления маппинга' }
];

let functionsFound = 0;
serviceChecks.forEach(check => {
  if (checkFileContent(check.file, check.search, check.desc)) {
    functionsFound++;
  }
});

console.log(`\n📊 Результат: ${functionsFound}/${serviceChecks.length} функций найдено\n`);

// 3. Проверяем интеграцию с основными компонентами
console.log('=== ПРОВЕРКА ИНТЕГРАЦИИ ===\n');

const integrationChecks = [
  { file: 'src/components/gps/UploadGpsReportModal.tsx', search: 'PlayerMappingModal', desc: 'Интеграция с модальным окном загрузки' },
  { file: 'src/app/dashboard/fitness/gps-reports/page.tsx', search: 'PlayerMappingsTab', desc: 'Интеграция с главной страницей GPS' },
  { file: 'src/app/api/gps-reports/route.ts', search: 'PlayerMappingService', desc: 'Интеграция с API загрузки отчетов' },
  { file: 'src/db/schema/index.ts', search: 'playerMapping', desc: 'Экспорт схемы маппингов' }
];

let integrationsFound = 0;
integrationChecks.forEach(check => {
  if (checkFileContent(check.file, check.search, check.desc)) {
    integrationsFound++;
  }
});

console.log(`\n📊 Результат: ${integrationsFound}/${integrationChecks.length} интеграций найдено\n`);

// 4. Проверяем исправления багов
console.log('=== ПРОВЕРКА ИСПРАВЛЕНИЙ БАГОВ ===\n');

const bugFixes = [
  { file: 'src/services/playerMapping.service.ts', search: 'firstName', desc: 'Исправление: использование firstName/lastName вместо name' },
  { file: 'src/services/playerMapping.service.ts', search: 'gpsSystem || \'unknown\'', desc: 'Исправление: передача gpsSystem в autoMatchPlayer' },
  { file: 'src/app/api/player-mappings/auto-match/route.ts', search: 'gpsSystem', desc: 'Исправление: передача gpsSystem в API' },
  { file: 'src/components/gps/PlayerMappingModal.tsx', search: 'gpsSystem', desc: 'Исправление: передача gpsSystem в модальное окно' }
];

let fixesFound = 0;
bugFixes.forEach(fix => {
  if (checkFileContent(fix.file, fix.search, fix.desc)) {
    fixesFound++;
  }
});

console.log(`\n📊 Результат: ${fixesFound}/${bugFixes.length} исправлений найдено\n`);

// 5. Проверяем компиляцию TypeScript
console.log('=== ПРОВЕРКА КОМПИЛЯЦИИ ===\n');

const compileResult = runCommand('npx tsc --noEmit', 'Проверка TypeScript компиляции');

// Итоговый отчет
console.log('\n=== ИТОГОВЫЙ ОТЧЕТ ===\n');

const totalChecks = filesFound + functionsFound + integrationsFound + fixesFound;
const maxChecks = mappingFiles.length + serviceChecks.length + integrationChecks.length + bugFixes.length;

console.log(`📈 Общий результат: ${totalChecks}/${maxChecks} проверок пройдено`);

if (totalChecks >= maxChecks * 0.9) {
  console.log('🎉 Система маппингов готова к использованию!');
} else if (totalChecks >= maxChecks * 0.7) {
  console.log('⚠️  Система маппингов требует доработки');
} else {
  console.log('❌ Система маппингов требует серьезной доработки');
}

console.log('\n=== РЕКОМЕНДАЦИИ ===\n');

if (filesFound < mappingFiles.length) {
  console.log('🔧 Создайте недостающие файлы системы маппингов');
}

if (functionsFound < serviceChecks.length) {
  console.log('🔧 Реализуйте недостающие функции в PlayerMappingService');
}

if (integrationsFound < integrationChecks.length) {
  console.log('🔧 Интегрируйте систему маппингов с основными компонентами');
}

if (fixesFound < bugFixes.length) {
  console.log('🔧 Примените исправления для корректной работы маппингов');
}

if (compileResult === null) {
  console.log('🔧 Исправьте ошибки TypeScript компиляции');
}

console.log('\n✅ Автоматическая проверка завершена!'); 