# 🔍 Анализ ошибки HTTP 400 при загрузке GPS файла

## 📋 Возможные причины ошибки 400

### 1. **Отсутствие обязательных полей в FormData**
```typescript
const requiredFields = ['teamId', 'eventType', 'eventId', 'parsedData', 'columnMappings', 'playerMappings'];
```

**Проверьте:**
- `teamId` - должен быть валидным UUID или числом
- `eventType` - должен быть 'training' или 'match'
- `eventId` - должен быть валидным UUID или числом
- `parsedData` - должен содержать headers и rows
- `columnMappings` - должен быть массивом активных маппингов
- `playerMappings` - должен быть массивом объектов с маппингом игроков

### 2. **Некорректный формат ID**
```typescript
if (!isValidId(teamId) || !isValidId(eventId)) {
  return NextResponse.json(
    { error: 'Invalid ID format', message: 'Некорректный формат ID' },
    { status: 400 }
  );
}
```

**Проблемы:**
- `teamId` или `eventId` не являются валидными UUID или числами
- ID передаются как null, undefined или пустые строки

### 3. **Некорректный формат GPS данных**
```typescript
if (!validateGpsData(parsedData)) {
  return NextResponse.json(
    { error: 'Invalid GPS data format', message: 'Некорректный формат GPS данных' },
    { status: 400 }
  );
}
```

**Проблемы:**
- `parsedData` не содержит `headers` или `rows`
- `headers` не является массивом строк
- `rows` не является массивом объектов
- Данные повреждены или неправильно распарсены

### 4. **Проблемы с валидацией файла**
```typescript
const fileValidation = validateFile(file, 10, ['.csv', '.xlsx', '.xls']);
if (!fileValidation.valid) {
  return NextResponse.json(
    { error: 'File validation failed', message: fileValidation.error },
    { status: 400 }
  );
}
```

**Проблемы:**
- Файл больше 10MB
- Неподдерживаемый тип файла
- Файл поврежден или пуст

### 5. **Некорректные типы данных**
```typescript
if (!Array.isArray(columnMappings)) {
  throw new Error('columnMappings must be an array');
}
if (!Array.isArray(playerMappings)) {
  throw new Error('playerMappings must be an array');
}
```

**Проблемы:**
- `columnMappings` не является массивом
- `playerMappings` не является массивом
- `parsedData.rows` не является массивом

## 🔧 Диагностические шаги

### 1. **Проверьте консоль браузера**
Откройте DevTools (F12) и проверьте:
- Ошибки JavaScript
- Сетевые запросы (Network tab)
- Состояние React компонентов

### 2. **Проверьте данные в FormData**
Добавьте в код модального окна GPS:
```javascript
console.log('FormData содержимое:');
for (let [key, value] of formData.entries()) {
  console.log(`${key}:`, value);
}
```

### 3. **Проверьте валидацию данных**
Добавьте проверки перед отправкой:
```javascript
// Проверка обязательных полей
const requiredFields = ['teamId', 'eventType', 'eventId', 'parsedData', 'columnMappings', 'playerMappings'];
requiredFields.forEach(field => {
  if (!formData.get(field)) {
    console.error(`Отсутствует поле: ${field}`);
  }
});

// Проверка формата данных
try {
  const parsedData = JSON.parse(formData.get('parsedData'));
  console.log('parsedData:', parsedData);
} catch (e) {
  console.error('Ошибка парсинга parsedData:', e);
}
```

### 4. **Проверьте маппинги игроков**
```javascript
try {
  const playerMappings = JSON.parse(formData.get('playerMappings'));
  console.log('playerMappings:', playerMappings);
  
  // Проверка структуры
  playerMappings.forEach((mapping, index) => {
    if (!mapping.filePlayerName || !mapping.playerId) {
      console.error(`Некорректный маппинг игрока ${index}:`, mapping);
    }
  });
} catch (e) {
  console.error('Ошибка парсинга playerMappings:', e);
}
```

## 🚨 Наиболее частые причины

### 1. **Проблемы с маппингом игроков**
- `playerMappings` содержит некорректные данные
- Игроки не привязаны к команде
- Неправильный формат similarity

### 2. **Проблемы с маппингом колонок**
- `columnMappings` содержит неактивные маппинги
- Отсутствуют обязательные метрики
- Некорректные canonicalMetricId

### 3. **Проблемы с парсингом файла**
- Файл поврежден
- Неподдерживаемый формат
- Отсутствуют обязательные колонки

## 🔧 Решения

### 1. **Добавьте детальное логирование**
```javascript
// В NewGpsReportModal.tsx, функция handleSubmit
console.log('Отправляемые данные:');
console.log('teamId:', selectedTeam);
console.log('eventType:', selectedEventType);
console.log('eventId:', selectedEvent);
console.log('columnMappings:', activeColumnMappings);
console.log('playerMappings:', playerMappingsArray);
console.log('parsedData:', parsedData);
```

### 2. **Проверьте валидацию на клиенте**
```javascript
// Проверка перед отправкой
if (!selectedTeam || !selectedEventType || !selectedEvent) {
  console.error('Отсутствуют обязательные поля');
  return;
}

if (!parsedData || !parsedData.headers || !parsedData.rows) {
  console.error('Некорректные GPS данные');
  return;
}

if (activeColumnMappings.length === 0) {
  console.error('Нет активных маппингов колонок');
  return;
}
```

### 3. **Проверьте права доступа**
Убедитесь, что пользователь имеет права на создание GPS отчетов для выбранной команды.

## 📞 Следующие шаги

1. Запустите диагностический скрипт `debug-gps-400-error.js`
2. Проверьте консоль браузера на наличие ошибок
3. Проверьте данные в FormData перед отправкой
4. Убедитесь, что все обязательные поля заполнены
5. Проверьте права доступа пользователя
