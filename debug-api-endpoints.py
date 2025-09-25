#!/usr/bin/env python3
"""
Диагностика API endpoints для повторной отправки сообщений
"""

import requests
import json
import sys

def test_api_endpoint(url, data, description):
    """Тестирует API endpoint"""
    print(f"\n🔍 Тестируем: {description}")
    print(f"URL: {url}")
    print(f"Данные: {json.dumps(data, indent=2)}")
    print("-" * 50)
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"Статус: {response.status_code}")
        print(f"Заголовки: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Ответ: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
        except:
            print(f"Ответ (текст): {response.text}")
            
        if response.status_code == 200:
            print("✅ Успешно")
        else:
            print("❌ Ошибка")
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Ошибка подключения: {e}")
    except requests.exceptions.Timeout as e:
        print(f"❌ Таймаут: {e}")
    except Exception as e:
        print(f"❌ Ошибка: {e}")

def test_bot_server():
    """Тестирует сервер бота"""
    print("🤖 Тестируем сервер Telegram бота")
    print("=" * 50)
    
    # Тестовые данные
    test_data = {
        "telegramId": "123456789",  # Тестовый ID
        "clubId": "test-club-id",
        "teamId": "test-team-id",
        "date": "2024-01-15",
        "surveyType": "morning"
    }
    
    # Тестируем endpoint для утренних опросов
    test_api_endpoint(
        "http://158.160.189.99:8080/send-morning-survey",
        test_data,
        "Отправка утреннего опроса через бота"
    )
    
    # Тестируем endpoint для RPE опросов
    rpe_data = {
        "telegramId": "123456789",
        "clubId": "test-club-id", 
        "teamId": "test-team-id",
        "date": "2024-01-15",
        "surveyType": "rpe"
    }
    
    test_api_endpoint(
        "http://158.160.189.99:8080/send-rpe-survey",
        rpe_data,
        "Отправка RPE опроса через бота"
    )

def test_nextjs_api():
    """Тестирует Next.js API endpoints"""
    print("\n🌐 Тестируем Next.js API endpoints")
    print("=" * 50)
    
    # Тестовые данные для утренних опросов
    morning_data = {
        "playerId": "test-player-id",
        "teamId": "test-team-id", 
        "date": "2024-01-15"
    }
    
    # Тестируем endpoint для утренних опросов
    test_api_endpoint(
        "http://localhost:3000/api/surveys/morning",
        morning_data,
        "Повторная отправка утреннего опроса"
    )
    
    # Тестовые данные для RPE опросов
    rpe_data = {
        "playerId": "test-player-id",
        "teamId": "test-team-id",
        "date": "2024-01-15"
    }
    
    # Тестируем endpoint для RPE опросов
    test_api_endpoint(
        "http://localhost:3000/api/surveys/rpe",
        rpe_data,
        "Повторная отправка RPE опроса"
    )

def check_bot_server_status():
    """Проверяет статус сервера бота"""
    print("\n📡 Проверяем статус сервера бота")
    print("=" * 50)
    
    try:
        # Пробуем подключиться к серверу бота
        response = requests.get("http://158.160.189.99:8080", timeout=5)
        print(f"✅ Сервер бота доступен (статус: {response.status_code})")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Сервер бота недоступен")
        print("   Возможные причины:")
        print("   1. Бот не запущен")
        print("   2. Неверный IP адрес")
        print("   3. Проблемы с сетью")
        return False
    except Exception as e:
        print(f"❌ Ошибка при проверке сервера: {e}")
        return False

def check_nextjs_server():
    """Проверяет статус Next.js сервера"""
    print("\n🌐 Проверяем статус Next.js сервера")
    print("=" * 50)
    
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        print(f"✅ Next.js сервер доступен (статус: {response.status_code})")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Next.js сервер недоступен")
        print("   Возможные причины:")
        print("   1. Сервер не запущен")
        print("   2. Неверный порт")
        return False
    except Exception as e:
        print(f"❌ Ошибка при проверке сервера: {e}")
        return False

def main():
    print("🔍 Диагностика API endpoints для повторной отправки")
    print("=" * 60)
    
    # Проверяем серверы
    bot_available = check_bot_server_status()
    nextjs_available = check_nextjs_server()
    
    if not bot_available:
        print("\n⚠️ ВНИМАНИЕ: Сервер бота недоступен!")
        print("   Это основная причина ошибки 500")
        print("   Решение: Запустите Telegram бота")
        return
    
    if not nextjs_available:
        print("\n⚠️ ВНИМАНИЕ: Next.js сервер недоступен!")
        print("   Решение: Запустите Next.js сервер")
        return
    
    # Тестируем endpoints
    test_bot_server()
    test_nextjs_api()
    
    print("\n💡 Рекомендации:")
    print("=" * 30)
    print("1. Убедитесь, что Telegram бот запущен")
    print("2. Проверьте, что Next.js сервер запущен")
    print("3. Проверьте логи серверов на ошибки")
    print("4. Убедитесь, что IP адрес бота правильный")

if __name__ == "__main__":
    main()
