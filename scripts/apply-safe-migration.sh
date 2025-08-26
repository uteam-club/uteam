#!/bin/bash

# Безопасное применение миграции для добавления durationMinutes
echo "🔧 Применение безопасной миграции для добавления durationMinutes..."

# Проверяем существование файла миграции
if [ ! -f "drizzle/0021_add_duration_minutes_only.sql" ]; then
    echo "❌ Файл миграции не найден!"
    exit 1
fi

# Загружаем переменные окружения
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Переменные окружения загружены"
else
    echo "❌ Файл .env не найден!"
    exit 1
fi

# Проверяем подключение к базе данных
echo "🔍 Проверка подключения к базе данных..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Подключение к базе данных успешно"
else
    echo "❌ Не удалось подключиться к базе данных"
    exit 1
fi

# Проверяем, существует ли уже колонка
echo "🔍 Проверка существования колонки durationMinutes..."
if psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'RPESurveyResponse' AND column_name = 'durationMinutes';" | grep -q "durationMinutes"; then
    echo "✅ Колонка durationMinutes уже существует"
    echo "🎉 Миграция не требуется!"
else
    echo "📝 Колонка durationMinutes не найдена, применяем миграцию..."
    
    # Применяем миграцию
    if psql "$DATABASE_URL" -f drizzle/0021_add_duration_minutes_only.sql; then
        echo "✅ Миграция успешно применена!"
        
        # Проверяем результат
        echo "🔍 Проверка результата..."
        if psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'RPESurveyResponse' AND column_name = 'durationMinutes';" | grep -q "durationMinutes"; then
            echo "✅ Колонка durationMinutes успешно добавлена!"
        else
            echo "❌ Что-то пошло не так при проверке"
            exit 1
        fi
    else
        echo "❌ Ошибка при применении миграции"
        exit 1
    fi
fi

echo "🎉 Миграция завершена успешно!"
