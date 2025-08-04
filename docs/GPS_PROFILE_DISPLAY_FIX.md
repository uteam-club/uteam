# Исправление отображения данных GPS профиля

## 🐛 Проблема
После исправления маппинга GPS профиля для поддержки русских названий колонок возникли две проблемы:

1. **Пустые колонки Zone 3, Zone 4, Zone 5** - данные не отображались в таблице
2. **Неправильные названия колонок** - отображались технические названия вместо пользовательских

## 🔍 Диагностика

### **Проблема с маппингом**
Изначально GPS профиль был настроен на **русские названия** из исходного файла:
```
Zone 3 → Дист з 3, м ❌
Zone 4 → Дист з 4, м ❌  
Zone 5 → Дист з 5, м ❌
```

Но в `processedData` данные уже **обработаны** и переименованы в **английские названия**:
```
Z-3 Tempo ✅
Z-4 HIR ✅
Z-5 Sprint ✅
```

### **Проблема с отображением**
API игровой модели возвращал данные с ключами `name` (например, "HSR", "Zone 3"), но фронтенд ожидал `displayName` для отображения.

## ✅ Исправления

### **1. Исправлен маппинг GPS профиля**
**Файл:** `scripts/fix-gps-profile-mapping.cjs` (временный скрипт)

#### **До исправления:**
```javascript
{
  name: "Zone 3",
  mappedColumn: "Дист з 3, м",  // ❌ Не существует в данных
  displayName: "Зона 3"
}
```

#### **После исправления:**
```javascript
{
  name: "Zone 3",
  mappedColumn: "Z-3 Tempo",    // ✅ Существует в данных
  displayName: "Зона 3"
}
```

### **2. Исправлен API игровой модели**
**Файл:** `src/app/api/players/[playerId]/game-model/route.ts`

#### **Изменения:**
- API теперь возвращает данные с ключами `displayName` вместо `name`
- Это обеспечивает правильное отображение пользовательских названий

```javascript
// До исправления
metrics[column.name] = normalizedValue;

// После исправления  
const displayKey = column.displayName || column.name;
metrics[displayKey] = normalizedValue;
```

### **3. Исправлен фронтенд компонент**
**Файл:** `src/components/players/PlayerGameModelModal.tsx`

#### **Изменения:**
- Поиск метрик теперь использует `displayName`
- Отображение названий использует `displayName`

```javascript
// До исправления
const metricData = averageMetrics[column.name];
<h4>{column.name}</h4>

// После исправления
const displayKey = column.displayName || column.name;
const metricData = averageMetrics[displayKey];
<h4>{column.displayName || column.name}</h4>
```

### **4. Исправлен компонент визуализации GPS данных**
**Файл:** `src/components/gps/GpsVisualization.tsx`

#### **Проблема:**
Компонент отображал таблицу "Детальные данные игроков" с неправильными данными:
- Использовал `col.name` вместо `col.mappedColumn` для поиска данных
- Отображал технические названия вместо пользовательских
- Колонки Zone 3, Zone 4, Zone 5 оставались пустыми

#### **Изменения:**
- **Поиск данных**: теперь использует `col.mappedColumn` для поиска данных в GPS отчете
- **Отображение заголовков**: использует `col.displayName` для пользовательских названий
- **Сортировка**: исправлена для работы с правильными ключами данных
- **Вычисление средних значений**: использует `mappedColumn` для корректных расчетов

```javascript
// До исправления
const dataKey = col.name || col.internalField || columnName;

// После исправления
const dataKey = (col.name === 'Player' || col.internalField === 'Player') ? 'name' : (col.mappedColumn || col.name || col.internalField || columnName);
```

## 🎯 Результат

### **До исправления:**
- ❌ **Zone 3, Zone 4, Zone 5** - пустые колонки
- ❌ **Названия колонок** - технические (HSR, Zone 3)
- ❌ **Данные не найдены** - неправильный маппинг

### **После исправления:**
- ✅ **Zone 3, Zone 4, Zone 5** - заполнены данными
- ✅ **Названия колонок** - пользовательские (Зона 3, Зона 4, Зона 5)
- ✅ **Все данные отображаются** - правильный маппинг

## 📊 Пример данных

### **Данные в GPS отчете:**
```javascript
{
  "Z-3 Tempo": 497,
  "Z-4 HIR": 319,
  "Z-5 Sprint": 320
}
```

### **Маппинг в профиле:**
```javascript
{
  name: "Zone 3",
  mappedColumn: "Z-3 Tempo",
  displayName: "Зона 3"
}
```

### **Результат в API:**
```javascript
{
  "Зона 3": 497,
  "Зона 4": 319,
  "Зона 5": 320
}
```

### **Отображение в интерфейсе:**
- **Название колонки:** "Зона 3"
- **Значение:** 497

## 🔧 Технические детали

### **Принцип работы:**
1. **`name`** - внутреннее техническое название (Zone 3)
2. **`mappedColumn`** - название колонки в данных (Z-3 Tempo)
3. **`displayName`** - пользовательское название для отображения (Зона 3)

### **Поток данных:**
1. GPS отчет содержит данные с ключами `mappedColumn`
2. API извлекает данные по `mappedColumn`
3. API возвращает данные с ключами `displayName`
4. Фронтенд отображает данные с названиями `displayName`

## 🧪 Тестирование

### **Сценарии для проверки:**
1. **Отображение всех колонок** - Zone 3, Zone 4, Zone 5 должны быть заполнены
2. **Правильные названия** - должны отображаться "Зона 3", "Зона 4", "Зона 5"
3. **Корректные значения** - данные должны соответствовать GPS отчету
4. **Работа с разными профилями** - система должна работать с любыми GPS профилями

### **Команды для проверки:**
```bash
# Проверка данных в базе
node scripts/simple-test-zone-data.cjs

# Проверка API ответа
curl -H "Authorization: Bearer TOKEN" \
  "http://alashkert.localhost:3000/api/players/PLAYER_ID/game-model?profileId=PROFILE_ID&teamId=TEAM_ID"
```

## 🔮 Будущие улучшения

### **Возможные дополнения:**
- 🌐 **Автоматическое определение маппинга** при загрузке файлов
- 📋 **Валидация соответствия** названий колонок
- 🤖 **AI-рекомендации** по настройке маппинга
- 📊 **Предварительный просмотр** данных перед сохранением профиля 

## 🧪 Диагностика и результаты

### **Проверка GPS профиля:**
- ✅ **Профиль**: B-Sight (ID: 81bc2762-87c2-41a1-9c57-a9f12a385bb3)
- ✅ **Колонки настроены правильно**: 11 колонок с корректными маппингами
- ✅ **Данные есть в отчете**: все колонки содержат данные

### **Проверка соответствия названий:**
Согласно диагностике, названия колонок в GPS профиле **точно соответствуют** тому, что отображается:

| Профиль | Отображается | Статус |
|---------|--------------|--------|
| Игрок | Игрок | ✅ |
| Время | Время | ✅ |
| Общая дистанция | Общая дистанция | ✅ |
| Зона 3 | Зона 3 | ✅ |
| Зона 4 | Зона 4 | ✅ |
| Зона 5 | Зона 5 | ✅ |
| Высокоинтенсивный бег | Высокоинтенсивный бег | ✅ |
| HSR % | HSR % | ✅ |
| Ускорения | Ускорения | ✅ |
| Торможения | Торможения | ✅ |
| Максимальная скорость | Максимальная скорость | ✅ |

### **Проверка данных:**
Все колонки содержат данные в GPS отчете:
- ✅ **Zone 3 (Z-3 Tempo)**: 497
- ✅ **Zone 4 (Z-4 HIR)**: 319  
- ✅ **Zone 5 (Z-5 Sprint)**: 320
- ✅ **Max Speed**: 34.13

### **Возможные причины проблемы:**
1. **Кэширование браузера** - старые данные могут отображаться
2. **Неправильный отчет** - может отображаться другой GPS отчет
3. **Ошибка в компоненте** - несмотря на исправления, может быть другая проблема

### **Рекомендации:**
1. **Очистить кэш браузера** (Ctrl+F5 или Cmd+Shift+R)
2. **Проверить, какой отчет открыт** - убедиться, что это правильный GPS отчет
3. **Проверить консоль браузера** - могут быть ошибки JavaScript 

## 🎯 **Финальное решение проблемы**

### **Проблема:**
В GPS профиле колонки настроены с английскими названиями (`Player`, `Time`, `TD`, `Zone 3`, `Zone 4`, `Zone 5`, `HSR`, `HSR%`, `Acc`, `Dec`, `Max speed`), но в отчете отображались русские названия (`Игрок`, `Время`, `Общая дистанция`, `Зона 3`, `Зона 4`, `Зона 5`, `Высокоинтенсивный бег`, `HSR %`, `Ускорения`, `Торможения`, `Максимальная скорость`).

### **Причина:**
Компонент `GpsVisualization.tsx` использовал `displayName` (который содержит русские названия) вместо `name` (английские названия) для отображения заголовков таблицы.

### **Исправления в `src/components/gps/GpsVisualization.tsx`:**

#### **1. Заголовки таблицы (строка 497):**
```typescript
// Было:
<span>{col.displayName || col.name || columnName}</span>

// Стало:
<span>{col.name || col.internalField || columnName}</span>
```

#### **2. Фильтрация метрик (строки 194-198):**
```typescript
// Было:
const isNotPlayerName = !(col.name === 'Player' || col.name === 'name' || col.internalField === 'name' || 
                         (col.displayName && col.displayName.toLowerCase().includes('игрок')));
const isNotTime = !(col.name === 'Time' || col.internalField === 'Time' || 
                   (col.displayName && col.displayName.toLowerCase().includes('время')));

// Стало:
const isNotPlayerName = !(col.name === 'Player' || col.name === 'name' || col.internalField === 'name');
const isNotTime = !(col.name === 'Time' || col.internalField === 'Time');
```

#### **3. Метрики для графиков (строки 205-209):**
```typescript
// Было:
const displayName = col.displayName || col.mappedColumn || col.name || col.internalField || '';
return {
  key,
  label: displayName,
  // ...
};

// Стало:
const label = col.name || col.internalField || '';
return {
  key,
  label: label,
  // ...
};
```

#### **4. Данные зон (строка 384):**
```typescript
// Было:
name: col.displayName || col.name || 'Неизвестная зона',

// Стало:
name: col.name || 'Неизвестная зона',
```

#### **5. Радарные данные (строка 406):**
```typescript
// Было:
metric: col?.displayName || field,

// Стало:
metric: col?.name || col?.internalField || field,
```

### **Результат:**
Теперь в таблице "Детальные данные игроков" отображаются **английские названия колонок** точно как в GPS профиле:
- ✅ **Player** (вместо "Игрок")
- ✅ **Time** (вместо "Время") 
- ✅ **TD** (вместо "Общая дистанция")
- ✅ **Zone 3** (вместо "Зона 3")
- ✅ **Zone 4** (вместо "Зона 4")
- ✅ **Zone 5** (вместо "Зона 5")
- ✅ **HSR** (вместо "Высокоинтенсивный бег")
- ✅ **HSR%** (вместо "HSR %")
- ✅ **Acc** (вместо "Ускорения")
- ✅ **Dec** (вместо "Торможения")
- ✅ **Max speed** (вместо "Максимальная скорость")

### **Дополнительные улучшения:**
- Удалены неиспользуемые переменные `displayName`
- Упрощена логика фильтрации метрик
- Все компоненты теперь используют единообразный подход к отображению названий 

## 🎯 **Исправление игровой модели игрока**

### **Проблема:**
В игровой модели игрока отображались русские названия метрик (`Общая дистанция`, `Высокоинтенсивный бег`, `Ускорения`, `Торможения`, `Максимальная скорость`) вместо английских названий из GPS профиля (`TD`, `HSR`, `Acc`, `Dec`, `Max speed`).

### **Причина:**
1. **API игровой модели** использовал `column.displayName || column.name` для создания ключей метрик
2. **Компонент PlayerGameModelModal** использовал `column.displayName || column.name` для отображения названий

### **Исправления:**

#### **1. API игровой модели (`src/app/api/players/[playerId]/game-model/route.ts`):**

**Строка 340 (создание метрик):**
```typescript
// Было:
const displayKey = column.displayName || column.name;
metrics[displayKey] = normalizedValue;

// Стало:
const displayKey = column.name;
metrics[displayKey] = normalizedValue;
```

**Строка 370 (расчет средних значений):**
```typescript
// Было:
const displayKey = column.displayName || column.name;

// Стало:
const displayKey = column.name;
```

#### **2. Компонент игровой модели (`src/components/players/PlayerGameModelModal.tsx`):**

**Строка 245 (поиск данных):**
```typescript
// Было:
const displayKey = column.displayName || column.name;

// Стало:
const displayKey = column.name;
```

**Строка 250 (отображение названий):**
```typescript
// Было:
{column.displayName || column.name}

// Стало:
{column.name}
```

### **Результат:**
Теперь в игровой модели игрока отображаются **английские названия метрик** точно как в GPS профиле:

| Было (русские) | Стало (английские) |
|----------------|-------------------|
| Общая дистанция | **TD** |
| Зона 3 | **Zone 3** |
| Зона 4 | **Zone 4** |
| Зона 5 | **Zone 5** |
| Высокоинтенсивный бег | **HSR** |
| HSR % | **HSR%** |
| Ускорения | **Acc** |
| Торможения | **Dec** |
| Максимальная скорость | **Max speed** |

### **Дополнительные улучшения:**
- ✅ **Единообразие** - все компоненты теперь используют `name` вместо `displayName`
- ✅ **Консистентность** - названия метрик одинаковы во всех частях системы
- ✅ **Простота** - упрощена логика отображения названий 

## 📱 **Мобильная адаптация и исправление публичной страницы**

### **Проблема:**
Публичная страница GPS отчета отображалась неправильно:
- Растянутая таблица
- Неправильные названия столбцов (русские вместо английских)
- Данные съехали в сторону
- Нет мобильной адаптации
- **Плитки игроков со средними показателями не отображались**
- **Плитки игроков накладывались друг на друга на мобильных устройствах**

### **Решение:**
Полностью переработана публичная страница для использования того же компонента `GpsVisualization`, что и в приложении.

### **Исправления в `src/app/public/gps-report/[token]/page.tsx`:**

#### **1. Упрощение кода:**
```typescript
// Было: Дублирование всей логики отображения
// Стало: Использование компонента GpsVisualization
<GpsVisualization
  data={data}
  profile={profile}
  eventName={report.name}
  eventDate={report.createdAt}
  teamName={report.team?.name}
  reportId={report.id}
  teamId={report.teamId}
  eventType={report.eventType}
  isPublic={true} // Добавлен флаг для публичной страницы
/>
```

#### **2. Исправление типизации:**
```typescript
// Добавлены недостающие поля в интерфейс GpsProfile
interface GpsProfile {
  // ... существующие поля
  metricsConfig: {
    primaryMetrics: string[];
    secondaryMetrics: string[];
    chartTypes: { [metric: string]: 'bar' | 'line' | 'radar' | 'pie'; };
  };
  visualizationConfig: {
    colors: { [metric: string]: string; };
    defaultChartType: 'bar' | 'line' | 'radar';
  };
}
```

### **Исправления в `src/components/gps/GpsVisualization.tsx`:**

#### **1. Добавление поддержки публичной страницы:**
```typescript
// Добавлен параметр isPublic в интерфейс
interface GpsVisualizationProps {
  // ... существующие поля
  isPublic?: boolean;
}

// Обновлена функция компонента
export default function GpsVisualization({ 
  data, profile, eventName, eventDate, teamName, 
  reportId, teamId, eventType, isPublic = false 
}: GpsVisualizationProps) {

// Передача флага в PlayerTiles
<PlayerTiles
  gpsData={data}
  teamId={teamId}
  profileId={profile.id}
  currentMatchMinutes={currentMatchMinutes}
  profile={profile}
  isPublic={isPublic} // Передается флаг из пропсов
/>
```

#### **2. Адаптивные отступы:**
```typescript
// Контейнер
<div className="min-h-screen bg-vista-dark p-2 sm:p-6">
<div className="w-full max-w-[1400px] mx-auto space-y-4 sm:space-y-6">

// Заголовок
<h1 className="text-xl sm:text-3xl font-bold text-vista-light mb-2">
```

#### **3. Адаптивная таблица:**
```typescript
// Размер шрифта
<table className="w-full text-xs sm:text-sm">

// Отступы ячеек
<th className="text-center p-1 sm:p-3 ...">
<td className="p-1 sm:p-3 ...">

// Высота полос прогресса
<div className="w-full rounded-md h-6 sm:h-8 relative overflow-hidden">
<div className={`h-6 sm:h-8 rounded-md ... px-1 sm:px-3`}>

// Размеры текста
<span className="text-white text-[10px] sm:text-xs font-medium">
<span className="text-white/80 text-[8px] sm:text-xs">
```

#### **4. Адаптивные информационные блоки:**
```typescript
// Сетка
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">

// Отступы блоков
<div className="bg-vista-dark/30 p-2 sm:p-4 rounded-lg">

// Иконки и текст
<Activity className="w-3 h-3 sm:w-4 sm:h-4" />
<span className="text-xs sm:text-sm">GPS профиль</span>
<p className="text-vista-light font-medium text-xs sm:text-sm">
```

### **Исправление плиток игроков:**

#### **Проблема:**
Компонент `PlayerTiles` не отображался в публичном отчете, потому что:
- Не передавался флаг `isPublic`
- Компонент использовал разные API endpoints для публичной и приватной страниц
- **На мобильных устройствах плитки накладывались друг на друга**

#### **Решение:**
```typescript
// В PlayerTiles.tsx уже была логика для публичной страницы
const apiUrl = isPublic ? `/api/public/teams/${teamId}/players` : `/api/teams/${teamId}/players`;

// Добавлен флаг isPublic в GpsVisualization
isPublic={isPublic}

// Передача флага из публичной страницы
<GpsVisualization
  // ... другие пропсы
  isPublic={true}
/>
```

### **Мобильная адаптация плиток игроков в `src/components/gps/PlayerTiles.tsx`:**

#### **1. Адаптивные отступы и размеры:**
```typescript
// Контейнер
<CardContent className="p-3 sm:p-6">
<h3 className="text-lg sm:text-xl font-semibold text-vista-light mb-4 sm:mb-6">

// Карточка игрока
<CardContent className="p-3 sm:p-4">
```

#### **2. Адаптивный заголовок игрока:**
```typescript
// Изменение layout с flex-row на flex-col на мобильных
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">

// Адаптивные размеры аватара
<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ...">
<img className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover">

// Адаптивные размеры текста
<h4 className="text-vista-light font-semibold text-sm sm:text-base">
```

#### **3. Адаптивные бейджи:**
```typescript
// Уменьшенные размеры на мобильных
<Badge className="text-[10px] sm:text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
<Badge className="text-[10px] sm:text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
```

#### **4. Адаптивная сетка метрик:**
```typescript
// Прогрессивная сетка: 2 колонки на мобильных, 6 на десктопе
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
```

#### **5. Адаптивные карточки метрик:**
```typescript
// Отступы
<CardContent className="p-2 sm:p-4">

// Заголовок метрики
<div className="w-12 sm:w-16 h-6 sm:h-7 rounded-md ...">
<h4 className="text-[8px] sm:text-[9px] font-semibold leading-tight">

// Процент изменения
<span className="text-[10px] sm:text-xs font-medium">

// Основное значение
<p className="text-lg sm:text-xl font-bold text-vista-light mb-1">
<span className="text-xs sm:text-sm text-vista-light/50 ml-1">

// Текст "текущий"
<p className="text-[7px] sm:text-[8px] text-vista-light/60">
```

### **Результат:**
- ✅ **Полная идентичность** отображения между приложением и публичной ссылкой
- ✅ **Мобильная адаптация** - таблица помещается на экране телефона
- ✅ **Правильные названия** колонок (английские как в профиле)
- ✅ **Корректное выравнивание** данных и средних значений
- ✅ **Адаптивные размеры** шрифтов и отступов
- ✅ **Плитки игроков** теперь отображаются в публичном отчете
- ✅ **Аккуратная мобильная адаптация** плиток игроков без наложений
- ✅ **Упрощенная поддержка** - один компонент для всех случаев

### **Мобильные особенности:**
- **Таблица**: Полная ширина экрана, мелкий шрифт, компактные отступы
- **Информационные блоки**: 2 колонки на мобильных, 3 на планшетах, 5 на десктопе
- **Полосы прогресса**: Уменьшенная высота на мобильных
- **Текст**: Адаптивные размеры шрифтов для читаемости
- **Плитки игроков**: Адаптивное отображение с правильными API вызовами
- **Сетка метрик**: 2 колонки на мобильных, 3 на планшетах, 4 на средних экранах, 6 на десктопе
- **Заголовки игроков**: Вертикальное расположение на мобильных, горизонтальное на десктопе
- **Размеры элементов**: Уменьшенные размеры аватаров, бейджей и текста на мобильных 