// Скрипт для диагностики ошибки 400 при загрузке GPS файла
// Запустите этот скрипт в консоли браузера на странице с ошибкой

console.log('🔍 Диагностика ошибки 400 при загрузке GPS файла');

// 1. Проверяем данные в localStorage/sessionStorage
console.log('\n📊 Данные в localStorage:');
Object.keys(localStorage).forEach(key => {
  if (key.includes('gps') || key.includes('mapping') || key.includes('player')) {
    console.log(`${key}:`, localStorage.getItem(key));
  }
});

// 2. Проверяем данные в sessionStorage
console.log('\n📊 Данные в sessionStorage:');
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('gps') || key.includes('mapping') || key.includes('player')) {
    console.log(`${key}:`, sessionStorage.getItem(key));
  }
});

// 3. Проверяем активные элементы формы
console.log('\n📋 Активные элементы формы:');
const formElements = document.querySelectorAll('input, select, textarea');
formElements.forEach(el => {
  if (el.value && el.value !== '') {
    console.log(`${el.name || el.id || el.className}:`, el.value);
  }
});

// 4. Проверяем состояние модального окна GPS
console.log('\n🔍 Состояние GPS модального окна:');
const gpsModal = document.querySelector('[data-testid="gps-modal"], .gps-modal, [class*="gps"]');
if (gpsModal) {
  console.log('GPS модальное окно найдено:', gpsModal);
} else {
  console.log('GPS модальное окно не найдено');
}

// 5. Проверяем данные в React DevTools (если доступны)
console.log('\n⚛️ Проверка React компонентов:');
if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  console.log('React DevTools доступны');
} else {
  console.log('React DevTools недоступны');
}

// 6. Проверяем последние сетевые запросы
console.log('\n🌐 Последние сетевые запросы:');
if (window.performance && window.performance.getEntriesByType) {
  const networkEntries = window.performance.getEntriesByType('resource');
  const recentRequests = networkEntries
    .filter(entry => entry.name.includes('/api/gps/'))
    .slice(-5);
  
  recentRequests.forEach(entry => {
    console.log(`${entry.name}: ${entry.responseStatus || 'pending'}`);
  });
}

console.log('\n✅ Диагностика завершена. Проверьте вывод выше для выявления проблем.');
