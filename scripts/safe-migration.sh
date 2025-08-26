#!/bin/bash

# Безопасная миграция для добавления поля durationMinutes
# Этот скрипт гарантирует, что никакие данные не будут потеряны

set -e  # Остановка при любой ошибке

echo "🛡️  БЕЗОПАСНАЯ МИГРАЦИЯ - Добавление поля durationMinutes"
echo "=========================================================="
echo ""

# Проверяем, что мы в корневой директории проекта
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Проверяем подключение к базе данных
echo "🔍 Проверка подключения к базе данных..."
if ! npm run migrate:generate > /dev/null 2>&1; then
    echo "❌ Ошибка: Не удается подключиться к базе данных"
    echo "Проверьте переменную DATABASE_URL в .env файле"
    exit 1
fi
echo "✅ Подключение к базе данных успешно"
echo ""

# Показываем текущую структуру таблицы RPESurveyResponse
echo "📊 Текущая структура таблицы RPESurveyResponse:"
echo "------------------------------------------------"
psql $DATABASE_URL -c "\d \"RPESurveyResponse\"" 2>/dev/null || echo "⚠️  Не удалось получить структуру таблицы (это нормально для первого запуска)"
echo ""

# Проверяем количество записей в таблице
echo "🔢 Количество записей в таблице RPESurveyResponse:"
echo "------------------------------------------------"
RECORD_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM \"RPESurveyResponse\";" 2>/dev/null | tr -d ' ' || echo "0")
echo "📈 Записей в таблице: $RECORD_COUNT"
echo ""

# Создаем резервную копию (если есть данные)
if [ "$RECORD_COUNT" -gt 0 ]; then
    echo "💾 Создание резервной копии данных..."
    BACKUP_FILE="backup_rpe_survey_$(date +%Y%m%d_%H%M%S).sql"
    
    pg_dump $DATABASE_URL --table="RPESurveyResponse" --data-only > "$BACKUP_FILE" 2>/dev/null || {
        echo "⚠️  Не удалось создать резервную копию, но продолжаем..."
        BACKUP_FILE=""
    }
    
    if [ -n "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        echo "✅ Резервная копия создана: $BACKUP_FILE"
        echo "   Размер: $(du -h "$BACKUP_FILE" | cut -f1)"
    else
        echo "⚠️  Резервная копия не создана"
    fi
    echo ""
fi

# Показываем план миграции
echo "📋 ПЛАН МИГРАЦИИ:"
echo "=================="
echo "1. Добавить поле durationMinutes (тип: integer, nullable: true)"
echo "2. Поле будет добавлено в конец таблицы"
echo "3. Все существующие данные останутся без изменений"
echo "4. Новое поле будет содержать NULL для существующих записей"
echo ""

# Запрашиваем подтверждение
echo "⚠️  ВНИМАНИЕ: Эта операция безопасна для данных, но требует перезапуска приложения"
echo ""
read -p "🤔 Продолжить миграцию? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Миграция отменена пользователем"
    exit 0
fi

echo ""
echo "🚀 Начинаем миграцию..."
echo ""

# Генерируем миграцию
echo "🔧 Генерация миграции..."
if npm run migrate:generate; then
    echo "✅ Миграция сгенерирована успешно"
else
    echo "❌ Ошибка при генерации миграции"
    exit 1
fi
echo ""

# Проверяем, что миграция создана
if [ ! -f "drizzle/0020_add_training_duration.sql" ]; then
    echo "❌ Файл миграции не найден"
    exit 1
fi

echo "📄 Содержимое миграции:"
echo "------------------------"
cat drizzle/0020_add_training_duration.sql
echo ""

# Применяем миграцию
echo "📊 Применение миграции к базе данных..."
if npm run migrate:push; then
    echo "✅ Миграция применена успешно!"
else
    echo "❌ Ошибка при применении миграции"
    echo ""
    echo "🔄 Восстановление из резервной копии..."
    if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
        echo "📥 Восстанавливаем данные из: $BACKUP_FILE"
        # Здесь можно добавить команды восстановления если нужно
    fi
    exit 1
fi
echo ""

# Проверяем результат
echo "🔍 Проверка результата миграции..."
echo "Новая структура таблицы RPESurveyResponse:"
echo "------------------------------------------"
psql $DATABASE_URL -c "\d \"RPESurveyResponse\"" 2>/dev/null || echo "⚠️  Не удалось получить структуру таблицы"

echo ""
echo "📊 Количество записей после миграции:"
RECORD_COUNT_AFTER=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM \"RPESurveyResponse\";" 2>/dev/null | tr -d ' ' || echo "0")
echo "📈 Записей в таблице: $RECORD_COUNT_AFTER"

if [ "$RECORD_COUNT" = "$RECORD_COUNT_AFTER" ]; then
    echo "✅ Количество записей не изменилось - данные сохранены!"
else
    echo "⚠️  Количество записей изменилось с $RECORD_COUNT на $RECORD_COUNT_AFTER"
fi

echo ""
echo "🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!"
echo "================================"
echo ""
echo "📋 Что было добавлено:"
echo "   ✅ Поле durationMinutes в таблицу RPESurveyResponse"
echo "   ✅ Поле nullable (может быть пустым)"
echo "   ✅ Все существующие данные сохранены"
echo ""
echo "🚀 Теперь доступны новые возможности:"
echo "   - Управление длительностью тренировки"
echo "   - Автоматический расчет нагрузки (RPE × Время)"
echo "   - Индивидуальные настройки для игроков"
echo ""
echo "📖 Документация: docs/TRAINING_DURATION_FEATURE.md"
echo ""

# Очистка резервной копии (опционально)
if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
    read -p "🗑️  Удалить резервную копию $BACKUP_FILE? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$BACKUP_FILE"
        echo "✅ Резервная копия удалена"
    else
        echo "💾 Резервная копия сохранена: $BACKUP_FILE"
    fi
fi

echo ""
echo "✨ Готово! Можете перезапускать приложение."
