#!/bin/bash

echo "🔍 Полная диагностика проблем с Telegram рассылкой"
echo "=================================================="

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Запустите скрипт из корневой директории проекта"
    exit 1
fi

echo ""
echo "1️⃣ Быстрая проверка игрока"
echo "------------------------"
python3 quick-check.py

echo ""
echo "2️⃣ Подробная диагностика"
echo "------------------------"
python3 debug-player-telegram.py

echo ""
echo "3️⃣ Проверка логов бота"
echo "---------------------"
python3 check-bot-logs.py

echo ""
echo "4️⃣ Тестовая отправка сообщения"
echo "-----------------------------"
echo "Хотите отправить тестовое сообщение? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    python3 send-test-message.py
fi

echo ""
echo "📋 Рекомендации:"
echo "==============="
echo "1. Если игрок не найден - проверьте PIN-код"
echo "2. Если нет Telegram ID - игрок должен написать /start боту"
echo "3. Если рассылка отключена - включите в админ-панели"
echo "4. Если игрок не в списке получателей - добавьте его"
echo "5. Если бот не запущен - запустите: cd telegram-bot && python bot_direct_db.py"
echo ""
echo "📖 Подробное руководство: TELEGRAM_DEBUG_GUIDE.md"
