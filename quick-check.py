#!/usr/bin/env python3
"""
Быстрая проверка проблем с рассылкой
"""

import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
    'port': 6432,
    'database': 'uteam',
    'user': 'uteam_bot_reader',
    'password': 'uteambot567234!',
    'sslmode': 'verify-ca',
    'sslrootcert': './CA.pem'
}

def quick_check(pin_code):
    """Быстрая проверка всех возможных проблем"""
    print(f"🔍 Быстрая проверка для PIN: {pin_code}")
    print("=" * 50)
    
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            
            # 1. Проверяем игрока
            cursor.execute("""
                SELECT p.*, t."name" as "teamName", t."clubId"
                FROM "Player" p
                LEFT JOIN "Team" t ON p."teamId" = t."id"
                WHERE p."pinCode" = %s
            """, (pin_code,))
            player = cursor.fetchone()
            
            if not player:
                print("❌ Игрок не найден")
                return
            
            print(f"✅ Игрок: {player['firstName']} {player['lastName']}")
            print(f"   Telegram ID: {player['telegramId'] or 'НЕТ'}")
            print(f"   Команда: {player['teamName']}")
            
            if not player['telegramId']:
                print("❌ ПРОБЛЕМА: Нет Telegram ID")
                print("   Решение: Игрок должен написать /start боту")
                return
            
            # 2. Проверяем настройки рассылки
            cursor.execute("""
                SELECT ss.*, t."timezone"
                FROM "SurveySchedule" ss
                LEFT JOIN "Team" t ON ss."teamId" = t."id"
                WHERE ss."teamId" = %s AND ss."surveyType" = 'morning'
            """, (player['teamId'],))
            schedule = cursor.fetchone()
            
            if not schedule:
                print("❌ ПРОБЛЕМА: Нет настроек рассылки")
                print("   Решение: Настройте рассылку в админ-панели")
                return
            
            print(f"✅ Рассылка настроена:")
            print(f"   Время: {schedule['sendTime']}")
            print(f"   Включена: {schedule['enabled']}")
            
            if not schedule['enabled']:
                print("❌ ПРОБЛЕМА: Рассылка отключена")
                print("   Решение: Включите рассылку в админ-панели")
                return
            
            # 3. Проверяем настройки получателей
            if schedule['recipientsConfig']:
                import json
                try:
                    config = json.loads(schedule['recipientsConfig'])
                    if config.get('isIndividualMode'):
                        selected_ids = config.get('selectedPlayerIds', [])
                        print(f"✅ Индивидуальный режим: {len(selected_ids)} игроков")
                        if player['id'] not in selected_ids:
                            print("❌ ПРОБЛЕМА: Игрок не в списке получателей")
                            print("   Решение: Добавьте игрока в список получателей")
                            return
                        else:
                            print("✅ Игрок включен в список получателей")
                    else:
                        print("✅ Общий режим: все игроки команды")
                except:
                    print("⚠️ Ошибка парсинга настроек получателей")
            else:
                print("✅ Общий режим: все игроки команды")
            
            # 4. Проверяем других игроков команды
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM "Player"
                WHERE "teamId" = %s AND "telegramId" IS NOT NULL
            """, (player['teamId'],))
            team_count = cursor.fetchone()['count']
            print(f"✅ В команде {team_count} игроков с Telegram ID")
            
            print("\n✅ Все проверки пройдены!")
            print("   Если игрок все еще не получает сообщения:")
            print("   1. Проверьте, что время рассылки наступило")
            print("   2. Убедитесь, что бот запущен")
            print("   3. Проверьте, что игрок не заблокировал бота")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    pin_code = input("Введите PIN-код игрока: ").strip()
    if pin_code:
        quick_check(pin_code)
    else:
        print("❌ PIN-код не введен")
