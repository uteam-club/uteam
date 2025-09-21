# Система групп единиц измерения для GPS метрик

## Обзор

Система групп единиц измерения позволяет тренеру выбирать подходящие `sourceUnit` и `displayUnit` для каждой канонической метрики из предопределенного списка. Это упрощает настройку GPS профилей и предотвращает ошибки при выборе единиц измерения.

## Группы единиц измерения

### 1. Дистанция (distance)
- **Единицы**: `m`, `km`, `yd`
- **По умолчанию**: `m` → `m`
- **Метрики**: `total_distance`, `distance_zone1-6`, `hsr_distance`, `sprint_distance`, `hml_distance`, `explosive_distance`

### 2. Скорость (speed)
- **Единицы**: `m/s`, `km/h`, `m/min`, `mph`
- **По умолчанию**: `km/h` → `km/h`
- **Метрики**: `max_speed`, `avg_speed`, `distance_per_min`

### 3. Время (time)
- **Единицы**: `s`, `min`, `h`, `hh:mm`, `hh:mm:ss`
- **По умолчанию**: `hh:mm:ss` → `min`
- **Метрики**: `duration`, `time_in_speed_zone1-6`, `time_in_hr_zone1-6`

### 4. Пульс (heart_rate)
- **Единицы**: `bpm`, `%HRmax`
- **По умолчанию**: `bpm` → `bpm`
- **Метрики**: `avg_heart_rate`, `max_heart_rate`

### 5. Количество (count)
- **Единицы**: `count`
- **По умолчанию**: `count` → `count`
- **Метрики**: `speed_zone1-6_entries`, `sprints_count`, `acc_zone1-6_count`, `dec_zone1-6_count`, `impacts_count`

### 6. Нагрузка (load)
- **Единицы**: `AU`
- **По умолчанию**: `AU` → `AU`
- **Метрики**: `player_load`

### 7. Мощность (power)
- **Единицы**: `W/kg`
- **По умолчанию**: `W/kg` → `W/kg`
- **Метрики**: `power_score`

### 8. Проценты и отношения (ratio)
- **Единицы**: `%`, `ratio`
- **По умолчанию**: `%` → `%`
- **Метрики**: `hsr_percentage`, `work_ratio`

### 9. Идентификаторы (identity)
- **Единицы**: `string`
- **По умолчанию**: `string` → `string`
- **Метрики**: `athlete_name`, `position`

## API функций

### `getUnitGroupForMetric(metricKey: string): MetricUnitGroup | null`
Определяет группу единиц измерения для конкретной метрики.

```typescript
const group = getUnitGroupForMetric('max_speed'); // 'speed'
const group = getUnitGroupForMetric('total_distance'); // 'distance'
```

### `getAvailableUnitsForMetric(metricKey: string): string[]`
Получает список доступных единиц измерения для метрики.

```typescript
const units = getAvailableUnitsForMetric('max_speed'); // ['m/s', 'km/h', 'm/min', 'mph']
const units = getAvailableUnitsForMetric('total_distance'); // ['m', 'km', 'yd']
```

### `getDefaultUnitsForMetric(metricKey: string): { sourceUnit: string; displayUnit: string }`
Получает рекомендуемые единицы по умолчанию для метрики.

```typescript
const defaults = getDefaultUnitsForMetric('max_speed'); 
// { sourceUnit: 'km/h', displayUnit: 'km/h' }
```

### `isUnitSupportedForMetric(metricKey: string, unit: string): boolean`
Проверяет, поддерживается ли единица измерения для метрики.

```typescript
const supported = isUnitSupportedForMetric('max_speed', 'km/h'); // true
const supported = isUnitSupportedForMetric('max_speed', 'm'); // false
```

### `getAllUnitGroups(): Array<{ key: MetricUnitGroup; name: string; ... }>`
Получает все доступные группы единиц измерения.

### `getMetricsByUnitGroup(groupKey: MetricUnitGroup): string[]`
Получает список метрик для конкретной группы единиц измерения.

## Использование в UI

### Выбор единиц измерения в модальных окнах

```typescript
import { getAvailableUnitsForMetric, getRecommendedUnitsForMetric } from '@/lib/simple-unit-conversions';

// При выборе метрики
const recommendedUnits = getRecommendedUnitsForMetric(selectedMetric);
setSourceUnit(recommendedUnits.sourceUnit);
setDisplayUnit(recommendedUnits.displayUnit);

// При отображении списка единиц
const availableUnits = getAvailableUnitsForMetric(selectedMetric);
```

### Валидация единиц измерения

```typescript
import { isUnitSupportedForMetric } from '@/lib/simple-unit-conversions';

const isValidSourceUnit = isUnitSupportedForMetric(metric, sourceUnit);
const isValidDisplayUnit = isUnitSupportedForMetric(metric, displayUnit);
```

## Преимущества системы

1. **Упрощение выбора**: Тренер видит только подходящие единицы для каждой метрики
2. **Предотвращение ошибок**: Невозможно выбрать неподходящую единицу измерения
3. **Рекомендации**: Система предлагает оптимальные единицы по умолчанию
4. **Консистентность**: Все метрики одного типа используют одинаковые единицы
5. **Расширяемость**: Легко добавлять новые группы и единицы измерения

## Примеры использования

### Настройка GPS профиля

1. Тренер выбирает метрику `max_speed`
2. Система автоматически предлагает `km/h` как `sourceUnit` и `km/h` как `displayUnit`
3. Тренер может изменить единицы из списка: `['m/s', 'km/h', 'm/min', 'mph']`
4. Система валидирует выбор и предотвращает ошибки

### Конвертация данных

```typescript
import { convertValue } from '@/lib/simple-unit-conversions';

// Конвертация максимальной скорости из км/ч в м/с
const speedInMs = convertValue(25, 'km/h', 'm/s'); // 6.94

// Конвертация дистанции из метров в километры
const distanceInKm = convertValue(5000, 'm', 'km'); // 5
```

## Заключение

Система групп единиц измерения обеспечивает удобный и безопасный способ работы с единицами измерения в GPS метриках, значительно упрощая настройку профилей и предотвращая ошибки конвертации.
