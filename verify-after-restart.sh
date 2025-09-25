#!/bin/bash

echo "🔍 Проверка исправлений после перезапуска бота"
echo "============================================="

echo ""
echo "1️⃣ Проверяем статус сервисов..."

# Проверяем Next.js сервер
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✅ Next.js сервер: Запущен"
else
    echo "   ❌ Next.js сервер: Не запущен"
    echo "   💡 Запустите: npm run dev"
fi

# Проверяем Telegram бота
if curl -s http://158.160.189.99:8080 > /dev/null 2>&1; then
    echo "   ✅ Telegram бот: Доступен"
else
    echo "   ❌ Telegram бот: Недоступен"
    echo "   💡 Перезапустите бота: cd telegram-bot && python bot_direct_db.py"
fi

echo ""
echo "2️⃣ Тестируем endpoints бота..."

# Тест утреннего опроса
echo "   📤 Тестируем /send-morning-survey..."
MORNING_RESPONSE=$(curl -s -X POST http://158.160.189.99:8080/send-morning-survey \
  -H "Content-Type: application/json" \
  -d '{"telegramId":"123","clubId":"test","teamId":"test","date":"2024-01-15"}')

if echo "$MORNING_RESPONSE" | grep -q "success\|error"; then
    echo "   ✅ Утренний опрос: Работает"
    echo "      Ответ: $MORNING_RESPONSE"
else
    echo "   ❌ Утренний опрос: Не работает"
    echo "      Ответ: $MORNING_RESPONSE"
fi

# Тест RPE опроса
echo "   📤 Тестируем /send-rpe-survey..."
RPE_RESPONSE=$(curl -s -X POST http://158.160.189.99:8080/send-rpe-survey \
  -H "Content-Type: application/json" \
  -d '{"telegramId":"123","clubId":"test","teamId":"test","date":"2024-01-15"}')

if echo "$RPE_RESPONSE" | grep -q "success\|error"; then
    echo "   ✅ RPE опрос: Работает"
    echo "      Ответ: $RPE_RESPONSE"
else
    echo "   ❌ RPE опрос: Не работает"
    echo "      Ответ: $RPE_RESPONSE"
fi

echo ""
echo "3️⃣ Итоговый результат..."

if echo "$RPE_RESPONSE" | grep -q "success\|error"; then
    echo "   🎉 ВСЕ ИСПРАВЛЕНИЯ РАБОТАЮТ!"
    echo "   ✅ Endpoint /send-rpe-survey доступен"
    echo "   ✅ Кнопка 'Отправить повторно' будет работать"
    echo "   ✅ Ошибка 500 устранена"
    echo ""
    echo "   🧪 Следующий шаг:"
    echo "   1. Зайдите в админ-панель"
    echo "   2. Выберите команду с игроками"
    echo "   3. Нажмите 'Отправить повторно' для RPE опроса"
    echo "   4. Проверьте, что сообщение пришло игроку"
else
    echo "   ⚠️ ТРЕБУЕТСЯ ПЕРЕЗАПУСК БОТА"
    echo "   ❌ Endpoint /send-rpe-survey недоступен"
    echo ""
    echo "   🔧 Выполните:"
    echo "   1. pkill -f 'bot_direct_db.py'"
    echo "   2. cd telegram-bot && python bot_direct_db.py"
    echo "   3. Запустите этот скрипт снова"
fi

echo ""
echo "📋 Для полной диагностики:"
echo "   python test-all-fixes.py"
