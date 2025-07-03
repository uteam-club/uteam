# Инструкция по развертыванию Telegram-бота с прямым доступом к БД

## Предварительные требования

### 1. Доступ к базе данных PostgreSQL

Убедитесь, что у вас есть доступ к базе данных как суперпользователь:

```bash
psql -h rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net -p 6432 -U postgres -d uteam
```

### 2. SSL сертификат

Файл `yandex_root.crt` должен быть доступен на сервере.

### 3. Python окружение

На сервере должен быть установлен Python 3.8+ и pip.

## Пошаговое развертывание

### Шаг 1: Создание пользователя базы данных

Подключитесь к базе данных и выполните SQL-скрипт:

```bash
# Подключение к БД
psql -h rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net -p 6432 -U postgres -d uteam

# В psql выполните:
\i scripts/create-bot-db-user.sql
```

Или выполните команды вручную:

```sql
-- Создание пользователя
CREATE USER uteam_bot_reader WITH PASSWORD 'uteambot567234!';

-- Предоставление прав
GRANT CONNECT ON DATABASE uteam TO uteam_bot_reader;
GRANT USAGE ON SCHEMA public TO uteam_bot_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO uteam_bot_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO uteam_bot_reader;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO uteam_bot_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO uteam_bot_reader;

-- Проверка
\du uteam_bot_reader
```

### Шаг 2: Подготовка сервера

```bash
# Создание директории для бота
mkdir -p /opt/uteam-bot
cd /opt/uteam-bot

# Копирование файлов
# (скопируйте все файлы из telegram-bot/ на сервер)

# Установка зависимостей
pip install -r requirements_direct_db.txt
```

### Шаг 3: Настройка переменных окружения

Создайте файл `.env`:

```bash
cat > .env << EOF
TELEGRAM_BOT_TOKEN=ваш_токен_бота
EOF
```

### Шаг 4: Тестирование

```bash
# Тест подключения к БД
python test_db_connection.py

# Если тест прошел успешно, продолжайте
```

### Шаг 5: Запуск бота

#### Вариант A: Ручной запуск

```bash
# Запуск в фоне
nohup python bot_direct_db.py > bot.log 2>&1 &

# Проверка запуска
ps aux | grep bot_direct_db.py
tail -f bot.log
```

#### Вариант B: Использование systemd

Создайте файл сервиса:

```bash
sudo cat > /etc/systemd/system/uteam-bot.service << EOF
[Unit]
Description=UTeam Telegram Bot
After=network.target

[Service]
Type=simple
User=uteam
WorkingDirectory=/opt/uteam-bot
Environment=PATH=/opt/uteam-bot/venv/bin
ExecStart=/opt/uteam-bot/venv/bin/python bot_direct_db.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

Запустите сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl enable uteam-bot
sudo systemctl start uteam-bot
sudo systemctl status uteam-bot
```

#### Вариант C: Использование Docker

Создайте `Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements_direct_db.txt .
RUN pip install -r requirements_direct_db.txt

COPY . .

CMD ["python", "bot_direct_db.py"]
```

Создайте `docker-compose.yml`:

```yaml
version: '3.8'
services:
  uteam-bot:
    build: .
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    volumes:
      - ./yandex_root.crt:/app/yandex_root.crt:ro
    restart: unless-stopped
```

Запустите:

```bash
docker-compose up -d
```

## Миграция с API версии

Если у вас уже работает бот с API, используйте автоматический скрипт миграции:

```bash
# Остановите старый бот
pkill -f "python.*bot.py"

# Запустите миграцию
./migrate_to_direct_db.sh
```

## Мониторинг и обслуживание

### Просмотр логов

```bash
# Если запущен вручную
tail -f bot.log

# Если запущен через systemd
sudo journalctl -u uteam-bot -f

# Если запущен через Docker
docker-compose logs -f uteam-bot
```

### Проверка состояния

```bash
# Проверка процесса
ps aux | grep bot_direct_db.py

# Проверка HTTP сервера
curl http://localhost:8080

# Тест подключения к БД
python test_db_connection.py
```

### Обновление бота

```bash
# Остановка
sudo systemctl stop uteam-bot  # или pkill -f bot_direct_db.py

# Обновление файлов
# (скопируйте новые версии файлов)

# Перезапуск
sudo systemctl start uteam-bot  # или nohup python bot_direct_db.py > bot.log 2>&1 &
```

## Устранение неполадок

### Ошибки подключения к БД

1. **Ошибка SSL сертификата**:
   ```bash
   # Проверьте наличие файла
   ls -la yandex_root.crt
   
   # Проверьте права доступа
   chmod 644 yandex_root.crt
   ```

2. **Ошибка аутентификации**:
   ```bash
   # Проверьте пользователя в БД
   psql -h rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net -p 6432 -U postgres -d uteam -c "\du uteam_bot_reader"
   ```

3. **Ошибка прав доступа**:
   ```bash
   # Проверьте права на таблицы
   psql -h rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net -p 6432 -U postgres -d uteam -c "\dp \"SurveySchedule\""
   ```

### Ошибки отправки сообщений

1. **Неверный токен бота**:
   ```bash
   # Проверьте токен в .env
   cat .env
   ```

2. **Блокировка Telegram**:
   ```bash
   # Проверьте логи на ошибки API
   grep "API" bot.log
   ```

### Проблемы с планировщиком

1. **Неправильное время**:
   ```bash
   # Проверьте системное время
   date
   timedatectl
   ```

2. **Проблемы с таймзоной**:
   ```bash
   # Установите таймзону
   sudo timedatectl set-timezone Europe/Moscow
   ```

## Безопасность

### Рекомендации

1. **Ограничение доступа к файлам**:
   ```bash
   chmod 600 .env
   chown uteam:uteam /opt/uteam-bot
   ```

2. **Файрвол**:
   ```bash
   # Разрешите только исходящие соединения к Telegram API
   sudo ufw allow out 443/tcp
   sudo ufw allow out 80/tcp
   ```

3. **Мониторинг**:
   ```bash
   # Настройте логирование
   sudo logrotate -f /etc/logrotate.d/uteam-bot
   ```

### Резервное копирование

```bash
# Создание резервной копии конфигурации
tar -czf uteam-bot-backup-$(date +%Y%m%d).tar.gz /opt/uteam-bot
```

## Контакты

При возникновении проблем:

1. Проверьте логи бота
2. Запустите тест подключения
3. Проверьте документацию: `README_direct_db.md`
4. Обратитесь к администратору системы 