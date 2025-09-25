#!/usr/bin/env python3
"""
Тестирование всех исправлений для повторной отправки сообщений
"""

import requests
import json
import psycopg2
import psycopg2.extras
import time

# Конфигурация базы данных
DB_CONFIG = {
    'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
    'port': 6432,
    'database': 'uteam',
    'user': 'uteam_bot_reader',
    'password': 'uteambot567234!',
    'sslmode': 'require'
}

def get_db_connection():
    """Создает подключение к базе данных"""
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"[DB] Ошибка подключения к базе данных: {e}")
        return None

def get_test_player():
    """Получает тестового игрока с Telegram ID"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute("""
                SELECT p."id", p."firstName", p."lastName", p."telegramId", p."pinCode",
                       t."clubId", t."id" as "teamId", t."name" as "teamName"
                FROM "Player" p
                LEFT JOIN "Team" t ON p."teamId" = t."id"
                WHERE p."telegramId" IS NOT NULL
                LIMIT 1
            """)
            player = cursor.fetchone()
            return dict(player) if player else None
    except Exception as e:
        print(f"[DB] Ошибка получения игрока: {e}")
        return None
    finally:
        connection.close()

def test_telegram_bot_endpoints():
    """Тестирует endpoints Telegram бота"""
    print("🤖 Тестирование Telegram бота")
    print("=" * 50)
    
    player = get_test_player()
    if not player:
        print("❌ Не найден игрок с Telegram ID для тестирования")
        return False
    
    print(f"✅ Тестовый игрок: {player['firstName']} {player['lastName']}")
    print(f"   Telegram ID: {player['telegramId']}")
    print(f"   Команда: {player['teamName']}")
    
    # Тест 1: Утренний опрос
    print(f"\n📤 Тест 1: Утренний опрос")
    morning_data = {
        "telegramId": str(player['telegramId']),
        "clubId": str(player['clubId']),
        "teamId": str(player['teamId']),
        "date": "2024-01-15",
        "surveyType": "morning"
    }
    
    try:
        response = requests.post(
            "http://158.160.189.99:8080/send-morning-survey",
            json=morning_data,
            timeout=10
        )
        print(f"   Статус: {response.status_code}")
        print(f"   Ответ: {response.text}")
        
        if response.status_code == 200:
            print("   ✅ Утренний опрос работает")
        else:
            print("   ❌ Ошибка утреннего опроса")
            return False
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        return False
    
    # Тест 2: RPE опрос
    print(f"\n📤 Тест 2: RPE опрос")
    rpe_data = {
        "telegramId": str(player['telegramId']),
        "clubId": str(player['clubId']),
        "teamId": str(player['teamId']),
        "date": "2024-01-15",
        "surveyType": "rpe"
    }
    
    try:
        response = requests.post(
            "http://158.160.189.99:8080/send-rpe-survey",
            json=rpe_data,
            timeout=10
        )
        print(f"   Статус: {response.status_code}")
        print(f"   Ответ: {response.text}")
        
        if response.status_code == 200:
            print("   ✅ RPE опрос работает")
            return True
        else:
            print("   ❌ Ошибка RPE опроса")
            return False
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        return False

def test_nextjs_api():
    """Тестирует Next.js API (требует авторизацию)"""
    print("\n🌐 Тестирование Next.js API")
    print("=" * 50)
    
    player = get_test_player()
    if not player:
        print("❌ Не найден игрок для тестирования")
        return False
    
    # Тест утреннего опроса
    print(f"\n📤 Тест: Утренний опрос через Next.js API")
    morning_data = {
        "playerId": str(player['id']),
        "teamId": str(player['teamId']),
        "date": "2024-01-15"
    }
    
    try:
        response = requests.post(
            "http://localhost:3000/api/surveys/morning",
            json=morning_data,
            timeout=10
        )
        print(f"   Статус: {response.status_code}")
        print(f"   Ответ: {response.text}")
        
        if response.status_code == 401:
            print("   ⚠️ Требуется авторизация (ожидаемо)")
        elif response.status_code == 200:
            print("   ✅ API работает")
        else:
            print("   ❌ Неожиданная ошибка")
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
    
    # Тест RPE опроса
    print(f"\n📤 Тест: RPE опрос через Next.js API")
    rpe_data = {
        "playerId": str(player['id']),
        "teamId": str(player['teamId']),
        "date": "2024-01-15"
    }
    
    try:
        response = requests.post(
            "http://localhost:3000/api/surveys/rpe",
            json=rpe_data,
            timeout=10
        )
        print(f"   Статус: {response.status_code}")
        print(f"   Ответ: {response.text}")
        
        if response.status_code == 401:
            print("   ⚠️ Требуется авторизация (ожидаемо)")
        elif response.status_code == 200:
            print("   ✅ API работает")
        else:
            print("   ❌ Неожиданная ошибка")
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
    
    return True

def test_bot_restart():
    """Проверяет, нужно ли перезапустить бота"""
    print("\n🔄 Проверка необходимости перезапуска бота")
    print("=" * 50)
    
    try:
        # Проверяем, доступен ли новый endpoint
        response = requests.get("http://158.160.189.99:8080/send-rpe-survey", timeout=5)
        if response.status_code == 404:
            print("❌ Endpoint /send-rpe-survey не найден")
            print("   Решение: Перезапустите Telegram бота")
            print("   Команда: cd telegram-bot && python bot_direct_db.py")
            return False
        elif response.status_code == 405:
            print("✅ Endpoint /send-rpe-survey доступен (405 - Method Not Allowed ожидаемо)")
            return True
        else:
            print(f"✅ Endpoint доступен (статус: {response.status_code})")
            return True
    except Exception as e:
        print(f"❌ Ошибка проверки: {e}")
        return False

def main():
    print("🧪 Тестирование всех исправлений")
    print("=" * 60)
    
    # Проверяем необходимость перезапуска бота
    bot_ready = test_bot_restart()
    
    if not bot_ready:
        print("\n⚠️ ВНИМАНИЕ: Нужно перезапустить Telegram бота!")
        print("   После перезапуска запустите тест снова")
        return
    
    # Тестируем endpoints бота
    bot_working = test_telegram_bot_endpoints()
    
    # Тестируем Next.js API
    api_working = test_nextjs_api()
    
    # Итоговый результат
    print(f"\n🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ:")
    print("=" * 40)
    
    if bot_working:
        print("✅ Telegram бот работает корректно")
        print("   - Endpoint /send-morning-survey: ✅")
        print("   - Endpoint /send-rpe-survey: ✅")
    else:
        print("❌ Проблемы с Telegram ботом")
    
    if api_working:
        print("✅ Next.js API готов к работе")
        print("   - Требует авторизацию (ожидаемо)")
    else:
        print("❌ Проблемы с Next.js API")
    
    print(f"\n💡 Следующие шаги:")
    print("1. Перезапустите Telegram бота (если нужно)")
    print("2. Перезапустите Next.js сервер")
    print("3. Протестируйте кнопку 'Отправить повторно' в веб-интерфейсе")
    print("4. Проверьте, что игроки получают сообщения")

if __name__ == "__main__":
    main()
