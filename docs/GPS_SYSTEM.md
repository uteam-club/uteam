# GPS Система в UTeam

## Обзор

GPS система в UTeam позволяет загружать, обрабатывать и визуализировать данные с GPS датчиков, используемых во время тренировок и матчей. Система поддерживает различные GPS системы (B-SIGHT, Polar и др.) и предоставляет гибкие возможности настройки визуализации.

## Архитектура

### Основные компоненты

1. **GPS Отчеты** (`gpsReport`) - хранит загруженные файлы и обработанные данные
2. **GPS Профили** (`gpsProfile`) - настройки визуализации для разных GPS систем
3. **GPS Метрики** (`gpsMetric`) - настраиваемые метрики для анализа
4. **Обработчик данных** (`GpsDataProcessor`) - сервис для обработки сырых данных

### Структура базы данных

```sql
-- GPS отчеты
CREATE TABLE "GpsReport" (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  fileUrl TEXT NOT NULL,
  gpsSystem VARCHAR(100) NOT NULL,
  eventType VARCHAR(20) NOT NULL, -- TRAINING, MATCH
  eventId UUID NOT NULL,
  profileId UUID NOT NULL,
  rawData JSONB,
  processedData JSONB,
  isProcessed BOOLEAN DEFAULT FALSE,
  clubId UUID NOT NULL,
  uploadedById UUID NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- GPS профили
CREATE TABLE "GpsProfile" (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  gpsSystem VARCHAR(100) NOT NULL,
  isDefault BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  visualizationConfig JSONB NOT NULL,
  metricsConfig JSONB NOT NULL,
  customFormulas JSONB,
  columnMapping JSONB NOT NULL,
  dataFilters JSONB,
  clubId UUID NOT NULL,
  createdById UUID NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Функциональность

### 1. Загрузка отчетов

**Процесс загрузки:**
1. Тренер выбирает файл Excel/CSV с GPS данными
2. Выбирает тренировку или матч для привязки
3. Выбирает профиль визуализации
4. Система парсит файл и сохраняет сырые данные
5. Данные привязываются к выбранному событию

**Поддерживаемые форматы:**
- Excel (.xlsx, .xls)
- CSV (.csv)

### 2. Профили визуализации

**Настройки профиля включают:**
- **Маппинг колонок** - соответствие колонок Excel внутренним полям
- **Конфигурация метрик** - настройки агрегации данных
- **Кастомные формулы** - вычисление производных метрик
- **Настройки графиков** - типы и цвета визуализации

**Пример профиля для B-SIGHT:**
```json
{
  "name": "B-SIGHT Стандартный",
  "gpsSystem": "B-SIGHT",
  "columnMapping": {
    "playerName": "Player Name",
    "distance": "Total Distance (m)",
    "time": "Time (min)",
    "maxSpeed": "Max Speed (km/h)",
    "averageSpeed": "Average Speed (km/h)"
  },
  "metricsConfig": {
    "distance": { "aggregation": "sum", "unit": "м" },
    "time": { "aggregation": "sum", "unit": "мин" },
    "maxSpeed": { "aggregation": "max", "unit": "км/ч" }
  },
  "customFormulas": {
    "distancePerMinute": "distance / time * 60",
    "efficiency": "distance / time"
  }
}
```

### 3. Кастомные формулы

Система поддерживает JavaScript формулы для вычисления производных метрик:

**Примеры формул:**
- `distance / time * 60` - метры в минуту
- `sprints / time * 100` - процент спринтов
- `highIntensityDistance / distance * 100` - процент высокой интенсивности

### 4. Визуализация

**Доступные типы графиков:**
- Столбчатые диаграммы (Bar Chart)
- Линейные графики (Line Chart)
- Круговые диаграммы (Pie Chart)

**Стандартные метрики:**
- Общая дистанция
- Время активности
- Максимальная скорость
- Средняя скорость
- Количество спринтов
- Дистанция высокой интенсивности

## API Endpoints

### GPS Отчеты

```typescript
// Получение списка отчетов
GET /api/gps-reports
GET /api/gps-reports?eventType=TRAINING&teamId=uuid

// Загрузка отчета
POST /api/gps-reports
Content-Type: multipart/form-data
{
  file: File,
  name: string,
  eventType: 'TRAINING' | 'MATCH',
  eventId: string,
  profileId: string
}

// Обработка отчета
POST /api/gps-reports/{id}/process

// Удаление отчета
DELETE /api/gps-reports/{id}
```

### GPS Профили

```typescript
// Получение списка профилей
GET /api/gps-profiles

// Создание профиля
POST /api/gps-profiles
{
  name: string,
  description: string,
  gpsSystem: string,
  visualizationConfig: object,
  metricsConfig: object,
  customFormulas: object,
  columnMapping: object,
  isDefault: boolean
}

// Обновление профиля
PUT /api/gps-profiles/{id}

// Удаление профиля
DELETE /api/gps-profiles/{id}
```

## Права доступа

### Роли и разрешения

- **gpsReports.read** - просмотр отчетов
- **gpsReports.create** - загрузка отчетов
- **gpsReports.update** - редактирование отчетов
- **gpsReports.delete** - удаление отчетов
- **gpsProfiles.read** - просмотр профилей
- **gpsProfiles.create** - создание профилей
- **gpsProfiles.update** - редактирование профилей
- **gpsProfiles.delete** - удаление профилей

### Назначение прав

- **SUPER_ADMIN** - полный доступ
- **ADMIN** - полный доступ к своему клубу
- **COACH** - чтение и создание отчетов, управление профилями
- **MEMBER** - только просмотр отчетов

## Интеграция с существующей системой

### Связь с тренировками и матчами

GPS отчеты привязываются к существующим тренировкам и матчам через поле `eventId`. Это позволяет:

- Отслеживать прогресс игроков во времени
- Сравнивать данные между тренировками
- Анализировать эффективность тренировочного процесса

### Мультитенантность

Система полностью интегрирована с мультитенантной архитектурой UTeam:

- Все данные изолированы по `clubId`
- Профили настраиваются отдельно для каждого клуба
- Доступ контролируется на уровне клуба

## Настройка и развертывание

### 1. Миграция базы данных

```bash
npm run migrate:generate
npm run migrate:push
```

### 2. Создание стандартных профилей

```typescript
import { createDefaultBSightProfile } from '@/services/gps.service';

// Создание профиля по умолчанию для клуба
const profile = createDefaultBSightProfile(clubId, userId);
```

### 3. Настройка прав доступа

```bash
node scripts/seed-permissions.js
```

## Примеры использования

### Загрузка отчета B-SIGHT

1. Скачайте отчет из личного кабинета B-SIGHT
2. В UTeam перейдите в раздел "Фитнес" → "GPS Отчеты"
3. Нажмите "Загрузить отчет"
4. Выберите файл и тренировку/матч
5. Выберите профиль "B-SIGHT Стандартный"
6. Нажмите "Загрузить"

### Создание кастомного профиля

1. Перейдите на вкладку "Профили отчетов"
2. Нажмите "Создать профиль"
3. Настройте маппинг колонок для вашей GPS системы
4. Добавьте кастомные формулы
5. Настройте визуализацию
6. Сохраните профиль

### Анализ данных

1. Откройте загруженный отчет
2. Просмотрите сводку по команде
3. Изучите графики по дистанции, скорости и эффективности
4. Проанализируйте детальные данные по игрокам
5. Сравните с предыдущими отчетами

## Расширение функциональности

### Добавление новых GPS систем

1. Создайте новый профиль с соответствующим маппингом колонок
2. Настройте метрики и формулы
3. Протестируйте с реальными данными

### Кастомные метрики

Добавьте новые формулы в профиль:

```json
{
  "customFormulas": {
    "workload": "distance * averageSpeed / 1000",
    "intensity": "highIntensityDistance / totalDistance * 100"
  }
}
```

### Новые типы визуализации

Расширьте компонент `GpsReportVisualization` для поддержки новых типов графиков.

## Безопасность

### Валидация файлов

- Проверка типа файла (только Excel/CSV)
- Ограничение размера файла
- Сканирование на вредоносный код

### Обработка данных

- Безопасное выполнение кастомных формул
- Валидация входных данных
- Логирование операций

### Доступ к данным

- Проверка принадлежности к клубу
- Контроль прав доступа
- Аудит операций

## Производительность

### Оптимизация

- Асинхронная обработка больших файлов
- Кэширование обработанных данных
- Пагинация для больших отчетов

### Масштабирование

- Возможность обработки файлов до 100MB
- Поддержка до 100 игроков в одном отчете
- Параллельная обработка нескольких отчетов 