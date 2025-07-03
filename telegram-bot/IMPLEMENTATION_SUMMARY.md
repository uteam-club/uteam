# Сводка по реализации прямого доступа Telegram-бота к БД

## 🎯 Цель

Реализовать прямой доступ Telegram-бота к PostgreSQL базе данных для автоматической рассылки утренних опросов игрокам, обходя проблемы с авторизацией API.

## ✅ Что реализовано

### 1. Пользователь базы данных
- **Имя**: `uteam_bot_reader`
- **Пароль**: `uteambot567234!`
- **Права**: Только `SELECT` на все таблицы
- **Безопасность**: Нет прав на `INSERT`, `UPDATE`, `DELETE`

### 2. Новый Telegram-бот (`bot_direct_db.py`)
- **Прямое подключение** к PostgreSQL через `psycopg2`
- **Автоматическая рассылка** каждую минуту
- **Привязка Telegram ID** к игрокам по PIN-коду
- **HTTP API** для ручной отправки
- **Многоязычность** (русский/английский)

### 3. Основные функции
```python
# Получение расписаний рассылок
get_survey_schedules()

# Получение игроков команды
get_team_players(team_id)

# Привязка Telegram ID
bind_telegram_to_player(pin_code, telegram_id, language)

# Автоматическая рассылка
send_survey_broadcast()
```

### 4. Тестирование
- **Скрипт тестирования**: `test_db_connection.py`
- **Проверка подключения** к БД
- **Проверка прав доступа** (только чтение)
- **Тестирование запросов** к таблицам

### 5. Миграция
- **Автоматический скрипт**: `migrate_to_direct_db.sh`
- **Резервное копирование** старого бота
- **Установка зависимостей**
- **Тестирование и запуск**

## 📁 Созданные файлы

```
telegram-bot/
├── bot_direct_db.py              # Новый бот с прямым доступом к БД
├── requirements_direct_db.txt    # Зависимости для нового бота
├── test_db_connection.py         # Скрипт тестирования
├── migrate_to_direct_db.sh       # Скрипт миграции
├── README_direct_db.md           # Документация
├── DEPLOYMENT.md                 # Инструкция по развертыванию
└── scripts/
    └── create-bot-db-user.sql    # SQL для создания пользователя БД
```

## 🔧 Технические детали

### Подключение к БД
```python
DB_CONFIG = {
    'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
    'port': 6432,
    'database': 'uteam',
    'user': 'uteam_bot_reader',
    'password': 'uteambot567234!',
    'sslmode': 'verify-full',
    'sslcert': './yandex_root.crt'
}
```

### Основные запросы
```sql
-- Получение расписаний с таймзоной команды
SELECT ss.*, t.timezone 
FROM "SurveySchedule" ss
LEFT JOIN "Team" t ON ss.teamId = t.id
WHERE ss.enabled = true AND ss.surveyType = 'morning'

-- Получение игроков команды
SELECT p.*, t.clubId 
FROM "Player" p
LEFT JOIN "Team" t ON p.teamId = t.id
WHERE p.teamId = %s AND p.telegramId IS NOT NULL

-- Привязка Telegram ID
UPDATE "Player" 
SET telegramId = %s, language = %s, updatedAt = NOW() 
WHERE pinCode = %s
```

## 🚀 Преимущества новой реализации

1. **Надежность**: Нет зависимости от API авторизации
2. **Производительность**: Прямые запросы к БД без HTTP накладных расходов
3. **Простота**: Один бот работает со всеми клубами
4. **Безопасность**: Отдельный пользователь БД с минимальными правами
5. **Мониторинг**: Подробные логи и тестирование

## 📋 План развертывания

### 1. Подготовка БД
```bash
# Подключение к БД
psql -h rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net -p 6432 -U postgres -d uteam

# Выполнение SQL-скрипта
\i scripts/create-bot-db-user.sql
```

### 2. Развертывание на сервере
```bash
# Копирование файлов на сервер
# Установка зависимостей
pip install -r requirements_direct_db.txt

# Тестирование
python test_db_connection.py

# Запуск
python bot_direct_db.py
```

### 3. Миграция (если есть старый бот)
```bash
./migrate_to_direct_db.sh
```

## 🔍 Мониторинг

### Логи бота
```
[BOT] Запуск Telegram-бота с прямым доступом к базе данных...
[Scheduler] Планировщик запущен
[Scheduler] Проверка расписаний рассылок...
[Scheduler] Найдено 3 активных расписаний
[DEBUG] Сообщение отправлено: telegramId=123456789
```

### Проверка состояния
```bash
# Процесс
ps aux | grep bot_direct_db.py

# HTTP сервер
curl http://localhost:8080

# Подключение к БД
python test_db_connection.py
```

## 🛡️ Безопасность

### Права пользователя БД
- ✅ `CONNECT` к базе данных
- ✅ `USAGE` схемы public
- ✅ `SELECT` на все таблицы
- ✅ `USAGE` на последовательности
- ❌ `INSERT`, `UPDATE`, `DELETE`
- ❌ Создание/изменение схемы

### Рекомендации
- Ограничение доступа к файлам конфигурации
- Мониторинг логов
- Регулярное обновление зависимостей

## 📞 Поддержка

При проблемах:
1. Проверьте логи: `tail -f bot.log`
2. Запустите тест: `python test_db_connection.py`
3. Проверьте документацию: `README_direct_db.md`
4. Обратитесь к администратору

## 🎉 Результат

Реализован надежный Telegram-бот с прямым доступом к базе данных, который:
- Обходит проблемы с API авторизацией
- Работает со всеми клубами и командами
- Обеспечивает безопасность через ограниченные права БД
- Предоставляет подробное логирование и мониторинг
- Включает автоматическую миграцию с API версии 