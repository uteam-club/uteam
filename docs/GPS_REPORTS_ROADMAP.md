# Дорожная карта GPS отчетов

## 🎯 Цель
Создать универсальную систему GPS отчетов, которая поддерживает любые GPS системы и обеспечивает бесшовную совместимость между разными производителями.

## 🏗️ Архитектура

### Основные компоненты:
1. **Канонические метрики** - единый стандарт для всех GPS систем
2. **GPS профили** - настройки для конкретных систем (Polar, Statsport и т.д.)
3. **GPS отчеты** - загруженные файлы с данными
4. **Маппинги игроков** - привязка строк отчета к игрокам
5. **Анализ и визуализация** - отображение данных

### Принципы:
- **Универсальность**: поддержка любых GPS систем
- **Совместимость**: бесшовная работа с разными системами
- **Гибкость**: настройка отображения под нужды команды
- **Масштабируемость**: поддержка множества команд и клубов

## 📋 План работы

### Этап 1: База данных и схемы
- [x] Создать файл канонических метрик
- [ ] Создать схемы БД для GPS системы
  - [ ] `gpsProfile` - профили GPS систем
  - [ ] `gpsReport` - загруженные отчеты
  - [ ] `gpsColumnMapping` - маппинг столбцов
  - [ ] `gpsPlayerMapping` - маппинг игроков
  - [ ] `gpsReportData` - данные отчета

### Этап 2: API Endpoints
- [ ] Создать API для GPS профилей
- [ ] Создать API для GPS отчетов
- [ ] Создать API для маппингов
- [ ] Создать API для анализа данных

### Этап 3: Пользовательский интерфейс
- [ ] Создать страницу GPS отчетов
- [ ] Реализовать вкладку "GPS профили"
- [ ] Реализовать вкладку "Маппинги игроков"
- [ ] Реализовать вкладку "Анализ"

### Этап 4: Интеграция
- [ ] Добавить в навигационное меню
- [ ] Интегрировать с системой прав доступа
- [ ] Добавить поддержку мультитенантности

### Этап 5: Тестирование и оптимизация
- [ ] Тестирование с разными GPS системами
- [ ] Оптимизация производительности
- [ ] Документация

## 🗄️ Структура базы данных

### GPS профили
```sql
CREATE TABLE "GpsProfile" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  gpsSystem VARCHAR(100) NOT NULL, -- Polar, Statsport, etc.
  clubId UUID NOT NULL REFERENCES "Club"(id),
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### GPS отчеты
```sql
CREATE TABLE "GpsReport" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  filePath TEXT NOT NULL,
  gpsProfileId UUID NOT NULL REFERENCES "GpsProfile"(id),
  trainingId UUID REFERENCES "Training"(id),
  matchId UUID REFERENCES "Match"(id),
  clubId UUID NOT NULL REFERENCES "Club"(id),
  status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, processed, error
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Маппинг столбцов
```sql
CREATE TABLE "GpsColumnMapping" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpsProfileId UUID NOT NULL REFERENCES "GpsProfile"(id),
  sourceColumn VARCHAR(255) NOT NULL, -- исходное название столбца
  customName VARCHAR(255) NOT NULL, -- кастомное название
  canonicalMetric VARCHAR(100) NOT NULL, -- каноническая метрика
  isVisible BOOLEAN DEFAULT true,
  displayOrder INTEGER DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Маппинг игроков
```sql
CREATE TABLE "GpsPlayerMapping" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpsReportId UUID NOT NULL REFERENCES "GpsReport"(id),
  playerId UUID NOT NULL REFERENCES "Player"(id),
  rowIndex INTEGER NOT NULL, -- индекс строки в отчете
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Данные отчета
```sql
CREATE TABLE "GpsReportData" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpsReportId UUID NOT NULL REFERENCES "GpsReport"(id),
  playerId UUID NOT NULL REFERENCES "Player"(id),
  canonicalMetric VARCHAR(100) NOT NULL,
  value DECIMAL(15,6) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Технические детали

### Обработка файлов
1. **Загрузка**: поддержка CSV, Excel файлов
2. **Парсинг**: автоматическое определение структуры
3. **Валидация**: проверка данных на соответствие каноническим метрикам
4. **Конвертация**: приведение единиц измерения к каноническим

### Маппинг данных
1. **Автоматический**: попытка автоматического сопоставления столбцов
2. **Ручной**: возможность ручной настройки маппинга
3. **Валидация**: проверка корректности маппинга

### Визуализация
1. **Таблицы**: детальный просмотр данных
2. **Графики**: тренды и сравнения
3. **Дашборды**: сводная информация
4. **Экспорт**: выгрузка в различных форматах

## 🚀 Преимущества

1. **Универсальность**: работа с любыми GPS системами
2. **Совместимость**: бесшовный переход между системами
3. **Гибкость**: настройка под нужды команды
4. **Масштабируемость**: поддержка множества команд
5. **Аналитика**: мощные инструменты анализа данных

## 📊 Метрики успеха

1. **Время настройки**: < 5 минут для новой GPS системы
2. **Точность маппинга**: > 95% автоматического сопоставления
3. **Производительность**: < 2 секунды для загрузки отчета
4. **Удобство**: интуитивный интерфейс настройки

## 🔮 Будущие возможности

1. **ИИ-маппинг**: автоматическое сопоставление с помощью ИИ
2. **Предиктивная аналитика**: прогнозирование показателей
3. **Интеграция с видео**: синхронизация с видеозаписями
4. **Мобильное приложение**: просмотр на мобильных устройствах
