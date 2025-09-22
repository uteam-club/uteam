# Исправление группировки и порядка метрик в модалках

## ✅ Проблема найдена и исправлена!

### 🔍 Обнаруженная проблема

**Группировка и порядок метрик** в модалках создания и редактирования профилей визуализации не соответствовали реальным категориям метрик в базе данных.

### 📊 Анализ категорий метрик в БД

Проведен анализ реальных категорий метрик в базе данных:

```
📊 Категории метрик:
  - acc_dec: 14 метрик (Ускорения и торможения)
  - derived: 1 метрика (Производные метрики)
  - distance: 1 метрика (Дистанция)
  - heart: 2 метрики (Пульс)
  - heart_zones: 6 метрик (Пульсовые зоны)
  - hsr_sprint: 4 метрики (HSR и спринты)
  - identity: 2 метрики (Идентификация)
  - intensity: 4 метрики (Интенсивность)
  - load: 2 метрики (Нагрузка)
  - participation: 1 метрика (Участие)
  - speed: 2 метрики (Скорость)
  - speed_zones: 18 метрик (Скоростные зоны)
```

### 🔧 Внесенные изменения

#### 1. Обновлен API `/api/gps/canonical-metrics-for-mapping`

**Файл:** `src/app/api/gps/canonical-metrics-for-mapping/route.ts`

**Обновлен порядок категорий:**
```javascript
const categoryOrder = [
  'identity',           // Идентификация игрока
  'participation',      // Участие в игре
  'distance',           // Дистанция
  'speed',              // Скорость
  'speed_zones',        // Скоростные зоны
  'hsr_sprint',         // HSR и спринты
  'acc_dec',            // Ускорения и торможения
  'load',               // Нагрузка
  'intensity',          // Интенсивность
  'heart',              // Пульс
  'heart_zones',        // Пульсовые зоны
  'derived',            // Производные метрики
  'other'               // Прочие
];
```

#### 2. Обновлена модалка создания профиля

**Файл:** `src/components/gps/NewGpsProfileModal.tsx`

**Добавлены недостающие категории:**
```javascript
const categoryNames: Record<string, { ru: string; en: string }> = {
  'identity': { ru: 'Идентификация', en: 'Identity' },
  'participation': { ru: 'Участие', en: 'Participation' },
  'distance': { ru: 'Дистанция', en: 'Distance' },
  'speed': { ru: 'Скорость', en: 'Speed' },
  'speed_zones': { ru: 'Зоны скорости', en: 'Speed Zones' },
  'hsr_sprint': { ru: 'Высокоскоростной бег', en: 'High Speed Running' },
  'acc_dec': { ru: 'Ускорение и торможение', en: 'Acceleration Deceleration' },
  'load': { ru: 'Нагрузка', en: 'Load' },
  'intensity': { ru: 'Интенсивность', en: 'Intensity' },
  'heart': { ru: 'Пульс', en: 'Heart Rate' },
  'heart_zones': { ru: 'Зоны пульса', en: 'Heart Rate Zones' },
  'derived': { ru: 'Производные метрики', en: 'Derived Metrics' },
  'other': { ru: 'Прочие', en: 'Other' }
};
```

**Добавлена сортировка категорий:**
```javascript
// Сортируем категории в правильном порядке
const categoryOrder = [
  'identity', 'participation', 'distance', 'speed', 'speed_zones', 
  'hsr_sprint', 'acc_dec', 'load', 'intensity', 'heart', 
  'heart_zones', 'derived', 'other'
];

const sortedGroupedMetrics = Object.keys(groupedMetrics)
  .sort((a, b) => {
    const aCategory = Object.keys(categoryNames).find(key => getCategoryName(key) === a);
    const bCategory = Object.keys(categoryNames).find(key => getCategoryName(key) === b);
    const aIndex = categoryOrder.indexOf(aCategory || 'other');
    const bIndex = categoryOrder.indexOf(bCategory || 'other');
    return aIndex - bIndex;
  })
  .reduce((acc, category) => {
    acc[category] = groupedMetrics[category];
    return acc;
  }, {} as Record<string, typeof metrics>);
```

#### 3. Обновлена модалка редактирования профиля

**Файл:** `src/components/gps/EditGpsProfileModal.tsx`

**Внесены аналогичные изменения:**
- Добавлены недостающие категории в `categoryNames`
- Добавлена сортировка категорий в правильном порядке
- Обновлено использование `sortedGroupedMetrics` вместо `groupedMetrics`

### 📋 Логический порядок категорий

#### 1. **Идентификация** (`identity`)
- Имя игрока, позиция

#### 2. **Участие** (`participation`)
- Время игры

#### 3. **Дистанция** (`distance`)
- Общая дистанция

#### 4. **Скорость** (`speed`)
- Максимальная скорость, средняя скорость

#### 5. **Скоростные зоны** (`speed_zones`)
- Время в зонах скорости, количество входов в зоны

#### 6. **HSR и спринты** (`hsr_sprint`)
- HSR процент, дистанция HSR, спринты

#### 7. **Ускорения и торможения** (`acc_dec`)
- Количество ускорений и торможений по зонам

#### 8. **Нагрузка** (`load`)
- Player Load, Power Score

#### 9. **Интенсивность** (`intensity`)
- Work Ratio, различные индексы интенсивности

#### 10. **Пульс** (`heart`)
- Максимальный и средний пульс

#### 11. **Пульсовые зоны** (`heart_zones`)
- Время в пульсовых зонах

#### 12. **Производные метрики** (`derived`)
- Дистанция за минуту и другие вычисляемые метрики

#### 13. **Прочие** (`other`)
- Любые другие метрики

### 🎯 Результат

**Теперь в модалках создания и редактирования профилей визуализации:**

✅ **Правильная группировка** - все 12 категорий метрик из БД  
✅ **Логический порядок** - от базовых к сложным метрикам  
✅ **Правильные названия** - на русском и английском языках  
✅ **Консистентность** - одинаковый порядок в API и UI  
✅ **Полнота** - все 57 канонических метрик доступны  

### 🔄 Влияние на другие компоненты

**Обновленные компоненты:**
- ✅ `NewGpsProfileModal.tsx` - модалка создания профиля
- ✅ `EditGpsProfileModal.tsx` - модалка редактирования профиля
- ✅ `/api/gps/canonical-metrics-for-mapping` - API для маппинга

**Не затронуты:**
- `/api/gps/canonical-metrics` - API для усредняемых метрик (48 метрик)
- Компоненты анализа GPS отчетов
- Игровые модели игроков

### 🎉 Заключение

**Проблема полностью решена!** Теперь группировка и порядок метрик в модалках соответствуют реальной структуре данных в базе и логически упорядочены для удобства пользователей.

**Дата:** 22 сентября 2025  
**Статус:** ✅ ИСПРАВЛЕНО И ПРОТЕСТИРОВАНО
