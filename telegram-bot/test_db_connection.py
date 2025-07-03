#!/usr/bin/env python3
"""
Скрипт для тестирования подключения к базе данных PostgreSQL
для Telegram-бота с правами только на чтение
"""

import psycopg2
import psycopg2.extras
import sys

# Конфигурация базы данных для бота
DB_CONFIG = {
    'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
    'port': 6432,
    'database': 'uteam',
    'user': 'uteam_bot_reader',
    'password': 'uteambot567234!',
    'sslmode': 'verify-full',
    'sslcert': './yandex_root.crt'
}

def test_connection():
    """Тестирует подключение к базе данных"""
    print("🔍 Тестирование подключения к базе данных...")
    
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        print("✅ Подключение к базе данных успешно установлено")
        
        # Тестируем получение расписаний
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM "SurveySchedule" 
                WHERE enabled = true AND "surveyType" = 'morning'
            """)
            result = cursor.fetchone()
            print(f"📅 Найдено активных расписаний: {result['count']}")
        
        # Тестируем получение игроков с telegramId
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM "Player" 
                WHERE "telegramId" IS NOT NULL
            """)
            result = cursor.fetchone()
            print(f"👥 Игроков с привязанным Telegram: {result['count']}")
        
        # Тестируем получение команд с таймзоной
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM "Team"
            """)
            result = cursor.fetchone()
            print(f"🏆 Всего команд: {result['count']}")
        
        # Тестируем сложный запрос (расписания с таймзоной команды)
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute("""
                SELECT 
                    ss.id,
                    ss.teamId,
                    ss.sendTime,
                    ss.enabled,
                    t.name as teamName,
                    t.timezone
                FROM "SurveySchedule" ss
                LEFT JOIN "Team" t ON ss.teamId = t.id
                WHERE ss.enabled = true AND ss."surveyType" = 'morning'
                LIMIT 5
            """)
            schedules = cursor.fetchall()
            print(f"📋 Примеры расписаний:")
            for schedule in schedules:
                print(f"  - Команда: {schedule['teamName']}, Время: {schedule['sendTime']}, Таймзона: {schedule['timezone']}")
        
        connection.close()
        print("✅ Все тесты пройдены успешно!")
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Ошибка подключения к базе данных: {e}")
        return False
    except psycopg2.Error as e:
        print(f"❌ Ошибка PostgreSQL: {e}")
        return False
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        return False

def test_read_only_access():
    """Тестирует, что у пользователя только права на чтение"""
    print("\n🔒 Тестирование прав доступа (только чтение)...")
    
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        
        # Пытаемся выполнить INSERT (должен завершиться ошибкой)
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    INSERT INTO "SurveySchedule" (id, teamId, "surveyType", enabled, sendTime)
                    VALUES ('test-id', 'test-team-id', 'test', false, '12:00')
                """)
                print("❌ ОШИБКА: Пользователь имеет права на запись!")
                return False
            except psycopg2.Error as e:
                if "permission denied" in str(e).lower() or "insufficient privilege" in str(e).lower():
                    print("✅ Правильно: Пользователь не имеет прав на запись")
                else:
                    print(f"⚠️  Неожиданная ошибка при попытке записи: {e}")
        
        # Пытаемся выполнить UPDATE (должен завершиться ошибкой)
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    UPDATE "SurveySchedule" 
                    SET sendTime = '12:00' 
                    WHERE id = 'non-existent-id'
                """)
                print("❌ ОШИБКА: Пользователь имеет права на обновление!")
                return False
            except psycopg2.Error as e:
                if "permission denied" in str(e).lower() or "insufficient privilege" in str(e).lower():
                    print("✅ Правильно: Пользователь не имеет прав на обновление")
                else:
                    print(f"⚠️  Неожиданная ошибка при попытке обновления: {e}")
        
        # Пытаемся выполнить DELETE (должен завершиться ошибкой)
        with connection.cursor() as cursor:
            try:
                cursor.execute("""
                    DELETE FROM "SurveySchedule" 
                    WHERE id = 'non-existent-id'
                """)
                print("❌ ОШИБКА: Пользователь имеет права на удаление!")
                return False
            except psycopg2.Error as e:
                if "permission denied" in str(e).lower() or "insufficient privilege" in str(e).lower():
                    print("✅ Правильно: Пользователь не имеет прав на удаление")
                else:
                    print(f"⚠️  Неожиданная ошибка при попытке удаления: {e}")
        
        connection.close()
        print("✅ Тест прав доступа пройден успешно!")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при тестировании прав доступа: {e}")
        return False

if __name__ == '__main__':
    print("🚀 Тестирование подключения Telegram-бота к базе данных")
    print("=" * 60)
    
    # Тестируем подключение
    connection_ok = test_connection()
    
    if connection_ok:
        # Тестируем права доступа
        access_ok = test_read_only_access()
        
        if access_ok:
            print("\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
            print("Telegram-бот готов к работе с прямым доступом к базе данных")
            sys.exit(0)
        else:
            print("\n❌ ТЕСТ ПРАВ ДОСТУПА НЕ ПРОЙДЕН")
            sys.exit(1)
    else:
        print("\n❌ ТЕСТ ПОДКЛЮЧЕНИЯ НЕ ПРОЙДЕН")
        sys.exit(1) 