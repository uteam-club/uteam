# 🔍 Инструкция по диагностике ошибки 400 GPS загрузки

## 📋 Шаги диагностики

### 1. **Запустите диагностический скрипт в браузере**

Откройте консоль браузера (F12) и выполните:

```javascript
// Скопируйте и вставьте содержимое файла browser-gps-diagnosis.js
```

### 2. **Проверьте логи сервера**

В терминале проекта выполните:

```bash
# Просмотр логов Next.js
npm run dev

# Или если используете PM2
pm2 logs

# Или проверьте логи в production
tail -f /var/log/your-app.log
```

### 3. **Включите детальное логирование**

Замените содержимое `src/app/api/gps/reports/route.ts` на версию из `gps-api-debug-version.ts`:

```bash
cp gps-api-debug-version.ts src/app/api/gps/reports/route.ts
```

### 4. **Проверьте данные в модальном окне GPS**

В консоли браузера выполните:

```javascript
// Проверка состояния React компонентов
const gpsModal = document.querySelector('[class*="gps"], [data-testid*="gps"]');
if (gpsModal) {
  console.log('GPS модальное окно найдено:', gpsModal);
} else {
  console.log('GPS модальное окно не найдено');
}

// Проверка формы
const forms = document.querySelectorAll('form');
forms.forEach((form, index) => {
  console.log(`Форма ${index + 1}:`, {
    action: form.action,
    method: form.method,
    elements: Array.from(form.elements).map(el => ({
      name: el.name,
      value: el.value,
      type: el.type
    }))
  });
});
```

### 5. **Проверьте сетевые запросы**

В DevTools → Network tab:
1. Очистите логи
2. Попробуйте загрузить GPS файл
3. Найдите запрос к `/api/gps/reports`
4. Проверьте:
   - Request Headers
   - Request Payload (FormData)
   - Response

### 6. **Проверьте права доступа**

В консоли браузера:

```javascript
// Проверка сессии
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => {
    console.log('Сессия пользователя:', data);
    console.log('Club ID:', data.user?.clubId);
    console.log('User ID:', data.user?.id);
  });
```

## 🚨 Наиболее частые причины ошибки 400

### 1. **Отсутствие обязательных полей**
- `teamId` - ID команды
- `eventType` - тип события ('training' или 'match')
- `eventId` - ID события
- `parsedData` - распарсенные GPS данные
- `columnMappings` - маппинг колонок
- `playerMappings` - маппинг игроков

### 2. **Некорректный JSON**
- `columnMappings` не является валидным JSON
- `playerMappings` не является валидным JSON
- `parsedData` не является валидным JSON

### 3. **Проблемы с маппингом игроков**
- Игроки не привязаны к команде
- Некорректный формат `playerMappings`
- Отсутствуют обязательные поля в маппинге

### 4. **Проблемы с маппингом колонок**
- `columnMappings` не является массивом
- Отсутствуют активные маппинги
- Некорректные `canonicalMetricId`

### 5. **Проблемы с GPS данными**
- `parsedData` не содержит `headers` или `rows`
- Данные повреждены или неправильно распарсены
- Отсутствуют обязательные колонки

## 🔧 Решения

### 1. **Добавьте валидацию на клиенте**

В `NewGpsReportModal.tsx`:

```javascript
const handleSubmit = async () => {
  // Проверка обязательных полей
  if (!selectedTeam || !selectedEventType || !selectedEvent) {
    console.error('Отсутствуют обязательные поля');
    return;
  }
  
  // Проверка GPS данных
  if (!parsedData || !parsedData.headers || !parsedData.rows) {
    console.error('Некорректные GPS данные');
    return;
  }
  
  // Проверка маппингов
  if (activeColumnMappings.length === 0) {
    console.error('Нет активных маппингов колонок');
    return;
  }
  
  if (Object.keys(selectedPlayerMappings).length === 0) {
    console.error('Нет маппингов игроков');
    return;
  }
  
  // Продолжаем отправку...
};
```

### 2. **Добавьте детальное логирование**

```javascript
console.log('Отправляемые данные:');
console.log('teamId:', selectedTeam);
console.log('eventType:', selectedEventType);
console.log('eventId:', selectedEvent);
console.log('columnMappings:', activeColumnMappings);
console.log('playerMappings:', playerMappingsArray);
console.log('parsedData:', parsedData);
```

### 3. **Проверьте права доступа**

Убедитесь, что пользователь имеет права на создание GPS отчетов для выбранной команды.

## 📞 Следующие шаги

1. Запустите диагностический скрипт
2. Проверьте логи сервера
3. Включите детальное логирование
4. Проверьте данные в модальном окне
5. Проверьте сетевые запросы
6. Проверьте права доступа

После выполнения всех шагов у вас будет полная картина проблемы и пути её решения.
