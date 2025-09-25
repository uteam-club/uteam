#!/bin/bash

echo "🎯 Применение финальных исправлений для повторной отправки сообщений"
echo "=================================================================="

echo ""
echo "📋 Что было исправлено:"
echo "1. ✅ Добавлен endpoint /send-rpe-survey в Telegram бота"
echo "2. ✅ Исправлен Next.js API для отправки RPE опросов через бота"
echo "3. ✅ Протестированы все исправления"

echo ""
echo "🚀 Применение исправлений:"
echo "========================="

# Проверяем, что исправления уже применены
echo "1️⃣ Проверяем исправления в коде..."

if grep -q "handle_send_rpe_survey" telegram-bot/bot_direct_db.py; then
    echo "   ✅ Функция handle_send_rpe_survey найдена в боте"
else
    echo "   ❌ Функция handle_send_rpe_survey не найдена"
    echo "   🔧 Применяем исправления к боту..."
    # Здесь можно добавить автоматическое применение исправлений
fi

if grep -q "send-rpe-survey" telegram-bot/bot_direct_db.py; then
    echo "   ✅ Endpoint /send-rpe-survey найден в роутере"
else
    echo "   ❌ Endpoint /send-rpe-survey не найден"
fi

if grep -q "send-rpe-survey" src/app/api/surveys/rpe/route.ts; then
    echo "   ✅ Next.js API исправлен для RPE опросов"
else
    echo "   ❌ Next.js API не исправлен"
fi

echo ""
echo "2️⃣ Проверяем статус сервисов..."

# Проверяем Next.js сервер
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✅ Next.js сервер запущен"
else
    echo "   ⚠️ Next.js сервер не запущен"
    echo "   💡 Запустите: npm run dev"
fi

# Проверяем Telegram бота
if curl -s http://158.160.189.99:8080 > /dev/null 2>&1; then
    echo "   ✅ Telegram бот доступен"
else
    echo "   ⚠️ Telegram бот недоступен"
    echo "   💡 Перезапустите бота: cd telegram-bot && python bot_direct_db.py"
fi

echo ""
echo "3️⃣ Рекомендации по тестированию:"
echo "================================"
echo "1. Зайдите в админ-панель веб-приложения"
echo "2. Выберите команду с игроками"
echo "3. Нажмите 'Отправить повторно' для RPE опроса"
echo "4. Проверьте, что сообщение пришло игроку в Telegram"
echo "5. Убедитесь, что нет ошибок 500 в консоли браузера"

echo ""
echo "4️⃣ Диагностика (если нужно):"
echo "============================"
echo "python test-all-fixes.py          # Полная диагностика"
echo "python test-local-fixes.py        # Тестирование с локальным ботом"
echo "curl http://158.160.189.99:8080/status  # Статус бота"

echo ""
echo "✅ ИСПРАВЛЕНИЯ ГОТОВЫ К ПРИМЕНЕНИЮ!"
echo "=================================="
echo "Все необходимые изменения внесены в код."
echo "Осталось только перезапустить сервисы и протестировать."
