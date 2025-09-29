#!/bin/bash

# Скрипт для применения единых стандартов статусов
# Выполняется после обновления кода

echo "🚀 Применение единых стандартов статусов..."

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Проверяем наличие .env файла
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    echo "❌ Ошибка: Файл .env не найден"
    exit 1
fi

echo "📋 Выполняем миграцию базы данных..."

# Выполняем SQL миграцию
if command -v psql &> /dev/null; then
    echo "🔧 Применяем миграцию через psql..."
    psql $DATABASE_URL -f scripts/migrate-status-standards.sql
elif command -v npx &> /dev/null; then
    echo "🔧 Применяем миграцию через npx..."
    npx drizzle-kit push
else
    echo "⚠️  Предупреждение: Не удалось найти psql или npx. Примените миграцию вручную:"
    echo "   psql \$DATABASE_URL -f scripts/migrate-status-standards.sql"
fi

echo "✅ Миграция завершена!"
echo ""
echo "📊 Проверьте результаты миграции в базе данных:"
echo "   - Статусы игроков: 'study' → 'education'"
echo "   - Статусы посещаемости: 'REHAB' → 'REHABILITATION'"
echo ""
echo "🎉 Единые стандарты статусов применены успешно!"
