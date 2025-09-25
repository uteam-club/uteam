#!/usr/bin/env python3
"""
Исправление проблем с повторной отправкой сообщений
"""

import requests
import json
import sys

def check_bot_endpoints():
    """Проверяет доступные endpoints бота"""
    print("🔍 Проверяем доступные endpoints бота")
    print("=" * 50)
    
    base_url = "http://158.160.189.99:8080"
    
    # Список возможных endpoints
    endpoints = [
        "/send-morning-survey",
        "/send-survey-success", 
        "/send-rpe-survey",
        "/",
        "/health",
        "/status"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            print(f"✅ {endpoint}: {response.status_code}")
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"   Ответ: {json.dumps(data, indent=2)}")
                except:
                    print(f"   Ответ: {response.text[:100]}...")
        except requests.exceptions.ConnectionError:
            print(f"❌ {endpoint}: Недоступен")
        except Exception as e:
            print(f"⚠️ {endpoint}: {e}")

def test_real_telegram_id():
    """Тестирует с реальным Telegram ID из базы данных"""
    print("\n🧪 Тестируем с реальными данными")
    print("=" * 50)
    
    # Получаем реального игрока из базы
    import psycopg2
    import psycopg2.extras
    
    DB_CONFIG = {
        'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
        'port': 6432,
        'database': 'uteam',
        'user': 'uteam_bot_reader',
        'password': 'uteambot567234!',
        'sslmode': 'require'
    }
    
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            # Находим игрока с Telegram ID
            cursor.execute("""
                SELECT p."id", p."firstName", p."lastName", p."telegramId", 
                       t."clubId", t."id" as "teamId"
                FROM "Player" p
                LEFT JOIN "Team" t ON p."teamId" = t."id"
                WHERE p."telegramId" IS NOT NULL
                LIMIT 1
            """)
            player = cursor.fetchone()
            
            if not player:
                print("❌ Не найдено игроков с Telegram ID")
                return
            
            print(f"✅ Найден игрок: {player['firstName']} {player['lastName']}")
            print(f"   Telegram ID: {player['telegramId']}")
            print(f"   Клуб: {player['clubId']}")
            print(f"   Команда: {player['teamId']}")
            
            # Тестируем отправку сообщения
            test_data = {
                "telegramId": str(player['telegramId']),
                "clubId": str(player['clubId']),
                "teamId": str(player['teamId']),
                "date": "2024-01-15",
                "surveyType": "morning"
            }
            
            print(f"\n📤 Тестируем отправку сообщения...")
            try:
                response = requests.post(
                    "http://158.160.189.99:8080/send-morning-survey",
                    json=test_data,
                    timeout=10
                )
                print(f"Статус: {response.status_code}")
                print(f"Ответ: {response.text}")
                
                if response.status_code == 200:
                    print("✅ Сообщение отправлено успешно!")
                else:
                    print("❌ Ошибка при отправке")
                    
            except Exception as e:
                print(f"❌ Ошибка: {e}")
                
    except Exception as e:
        print(f"❌ Ошибка подключения к БД: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

def check_bot_logs():
    """Проверяет логи бота"""
    print("\n📋 Проверяем логи бота")
    print("=" * 50)
    
    # Пробуем получить логи через API
    try:
        response = requests.get("http://158.160.189.99:8080/logs", timeout=5)
        if response.status_code == 200:
            print("✅ Логи получены:")
            print(response.text)
        else:
            print(f"❌ Не удалось получить логи (статус: {response.status_code})")
    except Exception as e:
        print(f"❌ Ошибка получения логов: {e}")

def main():
    print("🔧 Исправление проблем с повторной отправкой")
    print("=" * 60)
    
    # Проверяем endpoints бота
    check_bot_endpoints()
    
    # Тестируем с реальными данными
    test_real_telegram_id()
    
    # Проверяем логи
    check_bot_logs()
    
    print("\n💡 Найденные проблемы и решения:")
    print("=" * 40)
    print("1. ❌ Endpoint /send-rpe-survey не найден")
    print("   Решение: Добавить endpoint в бота")
    print()
    print("2. ❌ Ошибка 'chat not found' для тестового ID")
    print("   Решение: Использовать реальные Telegram ID")
    print()
    print("3. ❌ Next.js API требует авторизацию")
    print("   Решение: Добавить токен авторизации")
    print()
    print("4. 🔧 Рекомендации:")
    print("   - Проверить, что бот запущен")
    print("   - Убедиться, что все endpoints реализованы")
    print("   - Проверить логи бота на ошибки")

if __name__ == "__main__":
    main()
