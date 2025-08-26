#!/bin/bash

# Скрипт для применения миграции добавления поля durationMinutes в RPE опросники

echo "🚀 Применение миграции для добавления поля durationMinutes..."

# Проверяем, что мы в корневой директории проекта
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Проверяем, что Drizzle установлен
if ! command -v drizzle-kit &> /dev/null; then
    echo "📦 Установка Drizzle Kit..."
    npm install -g drizzle-kit
fi

echo "🔧 Генерация миграции..."
npm run migrate:generate

echo "📊 Применение миграции к базе данных..."
npm run migrate:push

echo "✅ Миграция успешно применена!"
echo ""
echo "📋 Что было добавлено:"
echo "   - Поле durationMinutes в таблицу RPESurveyResponse"
echo "   - API endpoints для управления длительностью тренировки"
echo "   - Компонент TrainingDurationManager"
echo "   - Обновленная таблица RPE с колонками длительности и нагрузки"
echo ""
echo "🎯 Теперь тренеры могут:"
echo "   - Указывать общую длительность тренировки для команды"
echo "   - Задавать индивидуальную длительность для каждого игрока"
echo "   - Автоматически рассчитывать нагрузку (RPE × Время)"
echo "   - Просматривать нагрузку с цветовой индикацией"
echo ""
echo "📖 Подробная документация: docs/TRAINING_DURATION_FEATURE.md"
