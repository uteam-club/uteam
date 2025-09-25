#!/bin/bash

echo "🔧 Применение исправлений для повторной отправки сообщений"
echo "=========================================================="

echo ""
echo "📋 Найденные проблемы:"
echo "1. ❌ Отсутствует endpoint /send-rpe-survey в боте"
echo "2. ❌ Next.js API не отправляет RPE опросы через бота"
echo "3. ✅ Endpoint /send-morning-survey работает корректно"

echo ""
echo "🛠️ Решения:"
echo "1. Добавить endpoint /send-rpe-survey в Telegram бота"
echo "2. Обновить Next.js API для отправки RPE опросов через бота"
echo "3. Перезапустить сервисы"

echo ""
echo "📝 Инструкции по применению исправлений:"
echo "======================================="

echo ""
echo "1️⃣ Обновить Telegram бота:"
echo "   - Откройте файл: telegram-bot/bot_direct_db.py"
echo "   - Добавьте функцию handle_send_rpe_survey (см. telegram-bot-fix-rpe-endpoint.py)"
echo "   - В функции main() добавьте: app.router.add_post('/send-rpe-survey', handle_send_rpe_survey)"
echo "   - Перезапустите бота: cd telegram-bot && python bot_direct_db.py"

echo ""
echo "2️⃣ Обновить Next.js API:"
echo "   - Откройте файл: src/app/api/surveys/rpe/route.ts"
echo "   - Замените функцию POST на код из nextjs-api-rpe-fix.ts"
echo "   - Перезапустите Next.js сервер"

echo ""
echo "3️⃣ Тестирование:"
echo "   - Зайдите в админ-панель"
echo "   - Выберите команду с игроками"
echo "   - Нажмите 'Отправить повторно' для RPE опроса"
echo "   - Проверьте, что сообщение пришло игроку"

echo ""
echo "🔍 Диагностика после исправлений:"
echo "================================="
echo "python3 debug-api-endpoints.py  # Проверить endpoints"
echo "python3 send-test-message.py    # Отправить тестовое сообщение"

echo ""
echo "✅ После применения исправлений:"
echo "   - Кнопка 'Отправить повторно' будет работать для RPE опросов"
echo "   - Игроки будут получать сообщения в Telegram"
echo "   - Не будет ошибок 500 в консоли браузера"

echo ""
echo "📖 Подробная документация: TELEGRAM_RESEND_FIX.md"
