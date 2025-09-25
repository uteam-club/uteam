#!/bin/bash

echo "🔄 Перезапуск Telegram бота и тестирование"
echo "=========================================="

# Проверяем, запущен ли бот
echo "1️⃣ Проверяем текущий статус бота..."
if pgrep -f "bot_direct_db.py" > /dev/null; then
    echo "✅ Бот запущен, останавливаем..."
    pkill -f "bot_direct_db.py"
    sleep 2
else
    echo "ℹ️ Бот не запущен"
fi

# Переходим в папку бота
echo "2️⃣ Переходим в папку бота..."
cd telegram-bot

# Проверяем зависимости
echo "3️⃣ Проверяем зависимости..."
if [ ! -d "venv" ]; then
    echo "📦 Создаем виртуальное окружение..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements_direct_db.txt > /dev/null 2>&1

# Запускаем бота в фоне
echo "4️⃣ Запускаем бота в фоне..."
nohup python bot_direct_db.py > bot.log 2>&1 &
BOT_PID=$!

# Ждем запуска
echo "5️⃣ Ждем запуска бота (10 секунд)..."
sleep 10

# Проверяем, что бот запустился
if ps -p $BOT_PID > /dev/null; then
    echo "✅ Бот запущен (PID: $BOT_PID)"
else
    echo "❌ Ошибка запуска бота"
    echo "📋 Логи бота:"
    tail -20 bot.log
    exit 1
fi

# Возвращаемся в корневую папку
cd ..

# Тестируем исправления
echo "6️⃣ Тестируем исправления..."
source venv/bin/activate
python3 test-all-fixes.py

echo ""
echo "🎯 Готово! Бот перезапущен и протестирован"
echo "📋 Для остановки бота: kill $BOT_PID"
echo "📋 Логи бота: tail -f telegram-bot/bot.log"
