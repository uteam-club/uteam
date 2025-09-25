// 🔍 Диагностический скрипт для ошибки 400 GPS загрузки
// Запустите этот код в консоли браузера на странице с ошибкой

(function() {
  console.log('🔍 Запуск диагностики GPS ошибки 400...');
  
  // 1. Проверяем localStorage
  console.log('\n📊 localStorage данные:');
  const gpsKeys = Object.keys(localStorage).filter(key => 
    key.includes('gps') || key.includes('mapping') || key.includes('player') || key.includes('team')
  );
  gpsKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, value?.length > 100 ? value.substring(0, 100) + '...' : value);
    } catch (e) {
      console.log(`${key}: [ошибка чтения]`);
    }
  });
  
  // 2. Проверяем sessionStorage
  console.log('\n📊 sessionStorage данные:');
  const sessionKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('gps') || key.includes('mapping') || key.includes('player') || key.includes('team')
  );
  sessionKeys.forEach(key => {
    try {
      const value = sessionStorage.getItem(key);
      console.log(`${key}:`, value?.length > 100 ? value.substring(0, 100) + '...' : value);
    } catch (e) {
      console.log(`${key}: [ошибка чтения]`);
    }
  });
  
  // 3. Проверяем активные формы
  console.log('\n📋 Активные формы:');
  const forms = document.querySelectorAll('form');
  forms.forEach((form, index) => {
    console.log(`Форма ${index + 1}:`, {
      action: form.action,
      method: form.method,
      elements: form.elements.length
    });
  });
  
  // 4. Проверяем GPS модальные окна
  console.log('\n🔍 GPS модальные окна:');
  const gpsModals = document.querySelectorAll('[class*="gps"], [data-testid*="gps"], [id*="gps"]');
  gpsModals.forEach((modal, index) => {
    console.log(`GPS модал ${index + 1}:`, {
      className: modal.className,
      id: modal.id,
      visible: modal.offsetParent !== null
    });
  });
  
  // 5. Проверяем последние сетевые запросы
  console.log('\n🌐 Последние GPS запросы:');
  if (window.performance && window.performance.getEntriesByType) {
    const networkEntries = window.performance.getEntriesByType('resource');
    const gpsRequests = networkEntries
      .filter(entry => entry.name.includes('/api/gps/'))
      .slice(-10);
    
    gpsRequests.forEach(entry => {
      console.log(`${entry.name}:`, {
        status: entry.responseStatus || 'pending',
        duration: Math.round(entry.duration),
        size: entry.transferSize || 0
      });
    });
  }
  
  // 6. Проверяем React компоненты (если доступны)
  console.log('\n⚛️ React DevTools:');
  if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
    console.log('✅ React DevTools доступны');
  } else {
    console.log('❌ React DevTools недоступны');
  }
  
  // 7. Проверяем ошибки в консоли
  console.log('\n🚨 Проверка ошибок:');
  const originalError = console.error;
  let errorCount = 0;
  console.error = function(...args) {
    errorCount++;
    originalError.apply(console, args);
  };
  
  // 8. Проверяем состояние приложения
  console.log('\n📱 Состояние приложения:');
  console.log('URL:', window.location.href);
  console.log('User Agent:', navigator.userAgent);
  console.log('Online:', navigator.onLine);
  
  // 9. Проверяем доступные API
  console.log('\n🔌 Доступные API:');
  console.log('Fetch:', typeof fetch);
  console.log('XMLHttpRequest:', typeof XMLHttpRequest);
  console.log('FormData:', typeof FormData);
  
  // 10. Проверяем GPS специфичные элементы
  console.log('\n🎯 GPS элементы:');
  const gpsElements = document.querySelectorAll('[class*="gps"], [id*="gps"], [data-gps]');
  console.log(`Найдено GPS элементов: ${gpsElements.length}`);
  
  gpsElements.forEach((el, index) => {
    if (index < 5) { // Показываем только первые 5
      console.log(`GPS элемент ${index + 1}:`, {
        tag: el.tagName,
        className: el.className,
        id: el.id,
        visible: el.offsetParent !== null
      });
    }
  });
  
  console.log('\n✅ Диагностика завершена!');
  console.log('📋 Следующие шаги:');
  console.log('1. Проверьте ошибки в консоли выше');
  console.log('2. Убедитесь, что все GPS модальные окна открыты');
  console.log('3. Проверьте, что все обязательные поля заполнены');
  console.log('4. Проверьте права доступа пользователя');
  
})();
