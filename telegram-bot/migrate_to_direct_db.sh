#!/bin/bash

# Скрипт миграции Telegram-бота с API на прямой доступ к базе данных
# Выполняется на сервере с ботом

set -e  # Остановка при ошибке

echo "🚀 Миграция Telegram-бота на прямой доступ к базе данных"
echo "=================================================="

# Проверка наличия необходимых файлов
echo "📋 Проверка файлов..."

if [ ! -f "bot.py" ]; then
    echo "❌ Файл bot.py не найден"
    exit 1
fi

if [ ! -f "bot_direct_db.py" ]; then
    echo "❌ Файл bot_direct_db.py не найден"
    exit 1
fi

if [ ! -f "requirements_direct_db.txt" ]; then
    echo "❌ Файл requirements_direct_db.txt не найден"
    exit 1
fi

if [ ! -f "test_db_connection.py" ]; then
    echo "❌ Файл test_db_connection.py не найден"
    exit 1
fi

if [ ! -f "yandex_root.crt" ]; then
    echo "❌ Файл yandex_root.crt не найден"
    exit 1
fi

echo "✅ Все необходимые файлы найдены"

# Остановка старого бота
echo "🛑 Остановка старого бота..."
if pgrep -f "python.*bot.py" > /dev/null; then
    pkill -f "python.*bot.py"
    echo "✅ Старый бот остановлен"
else
    echo "ℹ️  Старый бот не был запущен"
fi

# Установка новых зависимостей
echo "📦 Установка новых зависимостей..."
pip install -r requirements_direct_db.txt
echo "✅ Зависимости установлены"

# Тестирование подключения к базе данных
echo "🔍 Тестирование подключения к базе данных..."
if python test_db_connection.py; then
    echo "✅ Подключение к базе данных успешно"
else
    echo "❌ Ошибка подключения к базе данных"
    echo "Проверьте:"
    echo "1. Создан ли пользователь uteam_bot_reader"
    echo "2. Правильные ли права доступа"
    echo "3. Доступен ли SSL сертификат"
    exit 1
fi

# Создание резервной копии старого бота
echo "💾 Создание резервной копии..."
cp bot.py bot_api_backup.py
echo "✅ Резервная копия создана: bot_api_backup.py"

# Запуск нового бота
echo "🚀 Запуск нового бота..."
nohup python bot_direct_db.py > bot_direct_db.log 2>&1 &
BOT_PID=$!
echo "✅ Новый бот запущен (PID: $BOT_PID)"

# Проверка запуска
echo "🔍 Проверка запуска бота..."
sleep 5
if ps -p $BOT_PID > /dev/null; then
    echo "✅ Бот успешно запущен"
else
    echo "❌ Ошибка запуска бота"
    echo "Проверьте логи: tail -f bot_direct_db.log"
    exit 1
fi

# Проверка HTTP сервера
echo "🌐 Проверка HTTP сервера..."
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ HTTP сервер работает"
else
    echo "⚠️  HTTP сервер не отвечает (может быть нормально)"
fi

echo ""
echo "🎉 Миграция завершена успешно!"
echo ""
echo "📋 Что было сделано:"
echo "1. ✅ Остановлен старый бот"
echo "2. ✅ Установлены новые зависимости"
echo "3. ✅ Протестировано подключение к БД"
echo "4. ✅ Создана резервная копия старого бота"
echo "5. ✅ Запущен новый бот с прямым доступом к БД"
echo ""
echo "📁 Файлы:"
echo "- Новый бот: bot_direct_db.py"
echo "- Резервная копия: bot_api_backup.py"
echo "- Логи: bot_direct_db.log"
echo "- Тест подключения: test_db_connection.py"
echo ""
echo "🔧 Управление:"
echo "- Остановить бота: pkill -f bot_direct_db.py"
echo "- Посмотреть логи: tail -f bot_direct_db.log"
echo "- Тест подключения: python test_db_connection.py"
echo ""
echo "📖 Документация: README_direct_db.md" 