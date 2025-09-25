#!/usr/bin/env python3
"""
Проверка игрока с PIN-кодом 550595 (без SSL)
"""

import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# Попробуем разные варианты подключения
DB_CONFIGS = [
    {
        'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
        'port': 6432,
        'database': 'uteam',
        'user': 'uteam_bot_reader',
        'password': 'uteambot567234!',
        'sslmode': 'disable'
    },
    {
        'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
        'port': 6432,
        'database': 'uteam',
        'user': 'uteam_bot_reader',
        'password': 'uteambot567234!',
        'sslmode': 'require'
    },
    {
        'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
        'port': 6432,
        'database': 'uteam',
        'user': 'uteam_bot_reader',
        'password': 'uteambot567234!',
        'sslmode': 'prefer'
    }
]

def check_player_550595():
    """Проверка игрока с PIN-кодом 550595"""
    pin_code = "550595"
    print(f"🔍 Проверка игрока с PIN-кодом: {pin_code}")
    print("=" * 60)
    
    connection = None
    for i, config in enumerate(DB_CONFIGS):
        try:
            print(f"Попытка подключения {i+1}/3: sslmode={config['sslmode']}")
            connection = psycopg2.connect(**config)
            print(f"✅ Подключение успешно с sslmode={config['sslmode']}")
            break
        except Exception as e:
            print(f"❌ Ошибка подключения {i+1}: {e}")
            if i == len(DB_CONFIGS) - 1:
                print("❌ Все попытки подключения неудачны")
                return
    
    if not connection:
        print("❌ Не удалось подключиться к базе данных")
        return
    
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            
            # 1. Проверяем игрока
            print("\n1️⃣ Проверяем данные игрока...")
            cursor.execute("""
                SELECT p.*, t."name" as "teamName", t."clubId", t."timezone"
                FROM "Player" p
                LEFT JOIN "Team" t ON p."teamId" = t."id"
                WHERE p."pinCode" = %s
            """, (pin_code,))
            player = cursor.fetchone()
            
            if not player:
                print("❌ Игрок с PIN-кодом 550595 не найден в базе данных")
                return
            
            print(f"✅ Игрок найден:")
            print(f"   ID: {player['id']}")
            print(f"   Имя: {player['firstName']} {player['lastName']}")
            print(f"   Telegram ID: {player['telegramId'] or 'НЕТ'}")
            print(f"   Язык: {player['language']}")
            print(f"   Команда: {player['teamName']} (ID: {player['teamId']})")
            print(f"   Клуб: {player['clubId']}")
            print(f"   Часовой пояс: {player['timezone']}")
            
            if not player['telegramId']:
                print("\n❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: У игрока нет Telegram ID")
                print("   Решение: Игрок должен написать /start боту и ввести PIN-код")
                return
            
            # 2. Проверяем настройки рассылки для команды
            print(f"\n2️⃣ Проверяем настройки рассылки для команды '{player['teamName']}'...")
            cursor.execute("""
                SELECT ss.*, t."timezone"
                FROM "SurveySchedule" ss
                LEFT JOIN "Team" t ON ss."teamId" = t."id"
                WHERE ss."teamId" = %s AND ss."surveyType" = 'morning'
            """, (player['teamId'],))
            schedule = cursor.fetchone()
            
            if not schedule:
                print("❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Нет настроек рассылки для команды")
                print("   Решение: Настройте рассылку в админ-панели")
                return
            
            print(f"✅ Настройки рассылки найдены:")
            print(f"   Время рассылки: {schedule['sendTime']}")
            print(f"   Включена: {schedule['enabled']}")
            print(f"   Настройки получателей: {schedule['recipientsConfig'] or 'Нет (общий режим)'}")
            
            if not schedule['enabled']:
                print("\n❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Рассылка отключена")
                print("   Решение: Включите рассылку в админ-панели")
                return
            
            # 3. Проверяем настройки получателей
            print(f"\n3️⃣ Проверяем настройки получателей...")
            if schedule['recipientsConfig']:
                import json
                try:
                    config = json.loads(schedule['recipientsConfig'])
                    if config.get('isIndividualMode'):
                        selected_ids = config.get('selectedPlayerIds', [])
                        print(f"   Режим: Индивидуальный")
                        print(f"   Выбрано игроков: {len(selected_ids)}")
                        print(f"   ID выбранных игроков: {selected_ids}")
                        
                        if player['id'] not in selected_ids:
                            print(f"\n❌ КРИТИЧЕСКАЯ ПРОБЛЕМА: Игрок НЕ включен в список получателей")
                            print(f"   ID игрока: {player['id']}")
                            print(f"   Выбранные ID: {selected_ids}")
                            print("   Решение: Добавьте игрока в список получателей в админ-панели")
                            return
                        else:
                            print(f"   ✅ Игрок включен в список получателей")
                    else:
                        print(f"   ✅ Общий режим: все игроки команды получают сообщения")
                except Exception as e:
                    print(f"   ⚠️ Ошибка парсинга настроек получателей: {e}")
            else:
                print(f"   ✅ Общий режим: все игроки команды получают сообщения")
            
            # 4. Проверяем других игроков команды
            print(f"\n4️⃣ Проверяем других игроков команды...")
            cursor.execute("""
                SELECT p."id", p."firstName", p."lastName", p."telegramId"
                FROM "Player" p
                WHERE p."teamId" = %s AND p."telegramId" IS NOT NULL
                ORDER BY p."firstName", p."lastName"
            """, (player['teamId'],))
            team_players = cursor.fetchall()
            
            print(f"   Всего игроков с Telegram ID в команде: {len(team_players)}")
            for p in team_players:
                status = "✅" if p['id'] == player['id'] else "  "
                print(f"   {status} {p['firstName']} {p['lastName']} (ID: {p['id']}, Telegram: {p['telegramId']})")
            
            # 5. Проверяем активные опросники
            print(f"\n5️⃣ Проверяем активные опросники...")
            cursor.execute("""
                SELECT s.*
                FROM "Survey" s
                WHERE s."tenantId" = %s AND s."type" = 'morning' AND s."isActive" = true
                ORDER BY s."createdAt" DESC
                LIMIT 1
            """, (player['clubId'],))
            survey = cursor.fetchone()
            
            if survey:
                print(f"   ✅ Активный опросник найден (ID: {survey['id']})")
            else:
                print(f"   ❌ ПРОБЛЕМА: Нет активного опросника для клуба")
                print("   Решение: Создайте опросник в админ-панели")
                return
            
            # Итоговый результат
            print(f"\n🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ:")
            print("=" * 40)
            print("✅ Все основные проверки пройдены успешно!")
            print(f"   Игрок: {player['firstName']} {player['lastName']}")
            print(f"   Telegram ID: {player['telegramId']}")
            print(f"   Команда: {player['teamName']}")
            print(f"   Время рассылки: {schedule['sendTime']}")
            print(f"   Рассылка включена: {schedule['enabled']}")
            
            if schedule['recipientsConfig']:
                config = json.loads(schedule['recipientsConfig'])
                if config.get('isIndividualMode'):
                    print(f"   Режим: Индивидуальный (игрок включен)")
                else:
                    print(f"   Режим: Общий")
            else:
                print(f"   Режим: Общий")
            
            print(f"\n💡 Если игрок все еще не получает сообщения:")
            print("   1. Проверьте, что время рассылки наступило")
            print("   2. Убедитесь, что бот запущен")
            print("   3. Проверьте, что игрок не заблокировал бота")
            print("   4. Проверьте логи бота на ошибки")
            
    except Exception as e:
        print(f"❌ Ошибка выполнения запросов: {e}")
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    check_player_550595()
