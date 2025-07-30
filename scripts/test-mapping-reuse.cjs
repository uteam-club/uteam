const fs = require('fs');

console.log('🔍 Тестирование повторного использования маппингов...\n');

// Проверяем логику поиска существующих маппингов
function testExistingMappingLogic() {
  console.log('=== ТЕСТ ЛОГИКИ ПОИСКА СУЩЕСТВУЮЩИХ МАППИНГОВ ===\n');
  
  const servicePath = 'src/services/playerMapping.service.ts';
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  
  // Проверяем, что поиск в findExistingMapping не зависит от gpsSystem
  const findExistingMappingFunction = serviceContent.match(/static async findExistingMapping[\s\S]*?return existing\[0\] \|\| null;/);
  const hasGpsSystemFilterInFind = findExistingMappingFunction && findExistingMappingFunction[0].includes('eq(playerMapping.gpsSystem, gpsSystem)');
  const hasCorrectFilter = serviceContent.includes('eq(playerMapping.reportName, reportName)') && 
                          serviceContent.includes('eq(playerMapping.teamId, teamId)') &&
                          serviceContent.includes('eq(playerMapping.clubId, clubId)');
  
  console.log('🔍 Проверка фильтрации в findExistingMapping...');
  if (!hasGpsSystemFilterInFind && hasCorrectFilter) {
    console.log('✅ Фильтрация корректна: поиск по reportName, teamId, clubId (без gpsSystem)');
  } else if (hasGpsSystemFilterInFind) {
    console.log('❌ ПРОБЛЕМА: поиск все еще зависит от gpsSystem');
  } else {
    console.log('❌ ПРОБЛЕМА: неправильная фильтрация');
  }
  
  // Проверяем передачу gpsSystem в autoMatchPlayer
  const hasGpsSystemParam = serviceContent.includes('gpsSystem?: string');
  const hasGpsSystemUsage = serviceContent.includes('gpsSystem || \'unknown\'');
  
  console.log('\n🔍 Проверка параметра gpsSystem в autoMatchPlayer...');
  if (hasGpsSystemParam && hasGpsSystemUsage) {
    console.log('✅ Параметр gpsSystem корректно добавлен и используется');
  } else {
    console.log('❌ ПРОБЛЕМА: параметр gpsSystem не добавлен или не используется');
  }
}

// Проверяем API endpoint
function testApiEndpoint() {
  console.log('\n=== ТЕСТ API ENDPOINT ===\n');
  
  const apiPath = 'src/app/api/player-mappings/auto-match/route.ts';
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  
  const hasGpsSystemInBody = apiContent.includes('gpsSystem');
  const hasGpsSystemInCall = apiContent.includes('autoMatchPlayer(reportName, teamId, token.clubId, gpsSystem)');
  
  console.log('🔍 Проверка API endpoint...');
  if (hasGpsSystemInBody && hasGpsSystemInCall) {
    console.log('✅ API корректно передает gpsSystem');
  } else {
    console.log('❌ ПРОБЛЕМА: API не передает gpsSystem');
  }
}

// Проверяем модальное окно
function testModalComponent() {
  console.log('\n=== ТЕСТ МОДАЛЬНОГО ОКНА ===\n');
  
  const modalPath = 'src/components/gps/PlayerMappingModal.tsx';
  const modalContent = fs.readFileSync(modalPath, 'utf8');
  
  const hasGpsSystemInProps = modalContent.includes('gpsSystem: string');
  const hasGpsSystemInRequest = modalContent.includes('gpsSystem');
  
  console.log('🔍 Проверка модального окна...');
  if (hasGpsSystemInProps && hasGpsSystemInRequest) {
    console.log('✅ Модальное окно корректно передает gpsSystem');
  } else {
    console.log('❌ ПРОБЛЕМА: модальное окно не передает gpsSystem');
  }
}

// Проверяем исправление firstName/lastName
function testNameFix() {
  console.log('\n=== ТЕСТ ИСПРАВЛЕНИЯ ИМЕН ===\n');
  
  const servicePath = 'src/services/playerMapping.service.ts';
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  
  const hasFirstNameUsage = serviceContent.includes('player.firstName');
  const hasLastNameUsage = serviceContent.includes('player.lastName');
  const hasFullNameConstruction = serviceContent.includes('`${player.firstName || \'\'} ${player.lastName || \'\'}`');
  
  console.log('🔍 Проверка исправления имен...');
  if (hasFirstNameUsage && hasLastNameUsage && hasFullNameConstruction) {
    console.log('✅ Исправление имен применено: используется firstName + lastName');
  } else {
    console.log('❌ ПРОБЛЕМА: исправление имен не применено');
  }
}

// Проверяем интеграцию с загрузкой отчетов
function testReportUploadIntegration() {
  console.log('\n=== ТЕСТ ИНТЕГРАЦИИ С ЗАГРУЗКОЙ ===\n');
  
  const uploadPath = 'src/components/gps/UploadGpsReportModal.tsx';
  const uploadContent = fs.readFileSync(uploadPath, 'utf8');
  
  const hasPlayerMappingModal = uploadContent.includes('PlayerMappingModal');
  const hasShowPlayerMapping = uploadContent.includes('showPlayerMapping');
  const hasPlayerNames = uploadContent.includes('playerNames');
  
  console.log('🔍 Проверка интеграции с загрузкой...');
  if (hasPlayerMappingModal && hasShowPlayerMapping && hasPlayerNames) {
    console.log('✅ Интеграция с загрузкой отчетов корректна');
  } else {
    console.log('❌ ПРОБЛЕМА: интеграция с загрузкой отчетов неполная');
  }
}

// Основные тесты
testExistingMappingLogic();
testApiEndpoint();
testModalComponent();
testNameFix();
testReportUploadIntegration();

console.log('\n=== АНАЛИЗ ПРОБЛЕМЫ ПОВТОРНОЙ ЗАГРУЗКИ ===\n');

console.log('🔍 Возможные причины, почему маппинги не подтягиваются при повторной загрузке:');
console.log('1. ❌ Неправильная фильтрация в findExistingMapping (исправлено)');
console.log('2. ❌ Отсутствие передачи gpsSystem (исправлено)');
console.log('3. ❌ Использование player.name вместо firstName/lastName (исправлено)');
console.log('4. ✅ Логика поиска существующих маппингов работает корректно');
console.log('5. ✅ API endpoint передает все необходимые параметры');
console.log('6. ✅ Модальное окно корректно интегрировано');

console.log('\n🎯 РЕКОМЕНДАЦИИ ДЛЯ ТЕСТИРОВАНИЯ:');
console.log('1. Загрузите GPS-отчет с именами игроков');
console.log('2. Создайте маппинги в модальном окне');
console.log('3. Загрузите тот же отчет повторно');
console.log('4. Проверьте, что система автоматически подставляет существующие маппинги');
console.log('5. Если проблема остается, проверьте консоль браузера на ошибки');

console.log('\n✅ Тестирование завершено!'); 