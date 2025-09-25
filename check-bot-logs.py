#!/usr/bin/env python3
"""
Скрипт для проверки логов Telegram бота
Помогает диагностировать проблемы с рассылкой
"""

import os
import subprocess
import sys
from datetime import datetime, timedelta

def check_bot_process():
    """Проверяет, запущен ли бот"""
    try:
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        lines = result.stdout.split('\n')
        bot_processes = [line for line in lines if 'bot_direct_db.py' in line]
        
        if bot_processes:
            print("✅ Бот запущен:")
            for process in bot_processes:
                print(f"   {process}")
            return True
        else:
            print("❌ Бот не запущен")
            return False
    except Exception as e:
        print(f"❌ Ошибка проверки процессов: {e}")
        return False

def check_bot_logs():
    """Проверяет логи бота"""
    print("\n📋 Последние логи бота:")
    print("-" * 50)
    
    # Ищем файлы логов
    log_files = [
        'bot.log',
        'telegram-bot/bot.log',
        '/var/log/uteam-bot.log',
        'logs/bot.log'
    ]
    
    found_logs = []
    for log_file in log_files:
        if os.path.exists(log_file):
            found_logs.append(log_file)
    
    if not found_logs:
        print("❌ Файлы логов не найдены")
        print("   Возможные расположения:")
        for log_file in log_files:
            print(f"   - {log_file}")
        return
    
    for log_file in found_logs:
        print(f"\n📄 Логи из {log_file}:")
        try:
            # Получаем последние 50 строк
            result = subprocess.run(['tail', '-50', log_file], capture_output=True, text=True)
            if result.stdout:
                print(result.stdout)
            else:
                print("   (файл пуст)")
        except Exception as e:
            print(f"   ❌ Ошибка чтения логов: {e}")

def check_recent_activity():
    """Проверяет недавнюю активность бота"""
    print("\n🕐 Проверяем недавнюю активность:")
    print("-" * 50)
    
    # Проверяем системные логи
    try:
        # Ищем упоминания бота в системных логах за последний час
        result = subprocess.run([
            'journalctl', 
            '--since', '1 hour ago',
            '--grep', 'bot_direct_db'
        ], capture_output=True, text=True)
        
        if result.stdout:
            print("📋 Системные логи за последний час:")
            print(result.stdout)
        else:
            print("❌ Нет записей в системных логах за последний час")
    except Exception as e:
        print(f"❌ Ошибка проверки системных логов: {e}")

def check_telegram_api():
    """Проверяет доступность Telegram API"""
    print("\n🌐 Проверяем доступность Telegram API:")
    print("-" * 50)
    
    try:
        import requests
        response = requests.get('https://api.telegram.org/bot7555689553:AAFSDvBcAC_PU7o5vq3vVoGy5DS8R9q5aPU/getMe', timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                bot_info = data.get('result', {})
                print(f"✅ Telegram API доступен")
                print(f"   Бот: @{bot_info.get('username', 'N/A')}")
                print(f"   Имя: {bot_info.get('first_name', 'N/A')}")
            else:
                print(f"❌ Ошибка Telegram API: {data.get('description', 'Unknown error')}")
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
    except ImportError:
        print("❌ Модуль requests не установлен")
    except Exception as e:
        print(f"❌ Ошибка проверки Telegram API: {e}")

def check_database_connection():
    """Проверяет подключение к базе данных"""
    print("\n🗄️ Проверяем подключение к базе данных:")
    print("-" * 50)
    
    try:
        import psycopg2
        
        DB_CONFIG = {
            'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
            'port': 6432,
            'database': 'uteam',
            'user': 'uteam_bot_reader',
            'password': 'uteambot567234!',
            'sslmode': 'verify-ca',
            'sslrootcert': './CA.pem'
        }
        
        connection = psycopg2.connect(**DB_CONFIG)
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM \"Player\" WHERE \"telegramId\" IS NOT NULL")
            count = cursor.fetchone()[0]
            print(f"✅ Подключение к БД успешно")
            print(f"   Игроков с Telegram ID: {count}")
        
        connection.close()
    except Exception as e:
        print(f"❌ Ошибка подключения к БД: {e}")

def main():
    print("🔍 Диагностика Telegram бота")
    print("=" * 60)
    
    # Проверяем процесс бота
    bot_running = check_bot_process()
    
    if not bot_running:
        print("\n💡 Рекомендации:")
        print("   1. Запустите бот: python telegram-bot/bot_direct_db.py")
        print("   2. Проверьте переменные окружения (.env файл)")
        print("   3. Убедитесь, что все зависимости установлены")
        return
    
    # Проверяем логи
    check_bot_logs()
    
    # Проверяем недавнюю активность
    check_recent_activity()
    
    # Проверяем Telegram API
    check_telegram_api()
    
    # Проверяем базу данных
    check_database_connection()
    
    print("\n💡 Общие рекомендации:")
    print("-" * 50)
    print("1. Проверьте, что время рассылки наступило")
    print("2. Убедитесь, что игрок не заблокировал бота")
    print("3. Проверьте настройки получателей в админ-панели")
    print("4. Убедитесь, что у игрока есть telegramId в базе данных")

if __name__ == "__main__":
    main()
