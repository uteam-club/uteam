#!/usr/bin/env python3
"""
Скрипт для диагностики проблем с рассылкой Telegram сообщений
Проверяет данные игрока и настройки рассылки
"""

import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# Конфигурация базы данных
DB_CONFIG = {
    'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
    'port': 6432,
    'database': 'uteam',
    'user': 'uteam_bot_reader',
    'password': 'uteambot567234!',
    'sslmode': 'verify-ca',
    'sslrootcert': './CA.pem'
}

def get_db_connection():
    """Создает подключение к базе данных"""
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"[DB] Ошибка подключения к базе данных: {e}")
        return None

def check_player_data(pin_code):
    """Проверяет данные игрока по PIN-коду"""
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            query = """
            SELECT 
                p."id",
                p."firstName",
                p."lastName",
                p."telegramId",
                p."pinCode",
                p."language",
                p."teamId",
                t."name" as "teamName",
                t."clubId",
                t."timezone"
            FROM "Player" p
            LEFT JOIN "Team" t ON p."teamId" = t."id"
            WHERE p."pinCode" = %s
            """
            cursor.execute(query, (pin_code,))
            player = cursor.fetchone()
            return dict(player) if player else None
    except Exception as e:
        print(f"[DB] Ошибка получения данных игрока: {e}")
        return None
    finally:
        connection.close()

def check_survey_schedules(team_id):
    """Проверяет настройки рассылки для команды"""
    connection = get_db_connection()
    if not connection:
        return []
    
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            # Проверяем утренние опросы
            query_morning = """
            SELECT 
                ss."id",
                ss."teamId",
                ss."sendTime",
                ss."enabled",
                ss."surveyType",
                ss."recipientsConfig",
                t."timezone"
            FROM "SurveySchedule" ss
            LEFT JOIN "Team" t ON ss."teamId" = t."id"
            WHERE ss."teamId" = %s AND ss."surveyType" = 'morning'
            """
            cursor.execute(query_morning, (team_id,))
            schedules = cursor.fetchall()
            return [dict(schedule) for schedule in schedules]
    except Exception as e:
        print(f"[DB] Ошибка получения расписаний: {e}")
        return []
    finally:
        connection.close()

def check_team_players(team_id):
    """Проверяет всех игроков команды с telegramId"""
    connection = get_db_connection()
    if not connection:
        return []
    
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            query = """
            SELECT 
                p."id",
                p."firstName",
                p."lastName",
                p."telegramId",
                p."pinCode",
                p."language"
            FROM "Player" p
            WHERE p."teamId" = %s AND p."telegramId" IS NOT NULL
            ORDER BY p."firstName", p."lastName"
            """
            cursor.execute(query, (team_id,))
            players = cursor.fetchall()
            return [dict(player) for player in players]
    except Exception as e:
        print(f"[DB] Ошибка получения игроков команды: {e}")
        return []
    finally:
        connection.close()

def main():
    print("🔍 Диагностика проблем с рассылкой Telegram сообщений")
    print("=" * 60)
    
    # Запрашиваем PIN-код игрока
    pin_code = input("Введите PIN-код игрока: ").strip()
    
    if not pin_code:
        print("❌ PIN-код не введен")
        return
    
    print(f"\n📋 Проверяем данные игрока с PIN-кодом: {pin_code}")
    print("-" * 40)
    
    # Проверяем данные игрока
    player = check_player_data(pin_code)
    if not player:
        print("❌ Игрок с таким PIN-кодом не найден")
        return
    
    print("✅ Данные игрока найдены:")
    print(f"   ID: {player['id']}")
    print(f"   Имя: {player['firstName']} {player['lastName']}")
    print(f"   Telegram ID: {player['telegramId']}")
    print(f"   Язык: {player['language']}")
    print(f"   Команда: {player['teamName']} (ID: {player['teamId']})")
    print(f"   Клуб: {player['clubId']}")
    print(f"   Часовой пояс: {player['timezone']}")
    
    # Проверяем настройки рассылки
    print(f"\n📅 Проверяем настройки рассылки для команды: {player['teamName']}")
    print("-" * 40)
    
    schedules = check_survey_schedules(player['teamId'])
    if not schedules:
        print("❌ Настройки рассылки не найдены для этой команды")
        print("   Возможные причины:")
        print("   1. Рассылка не настроена в админ-панели")
        print("   2. Рассылка отключена")
        return
    
    for schedule in schedules:
        print(f"✅ Найдено расписание:")
        print(f"   Тип: {schedule['surveyType']}")
        print(f"   Время: {schedule['sendTime']}")
        print(f"   Включено: {schedule['enabled']}")
        print(f"   Настройки получателей: {schedule['recipientsConfig']}")
        
        # Проверяем настройки получателей
        if schedule['recipientsConfig']:
            import json
            try:
                config = json.loads(schedule['recipientsConfig'])
                if config.get('isIndividualMode'):
                    selected_ids = config.get('selectedPlayerIds', [])
                    print(f"   Индивидуальный режим: выбрано {len(selected_ids)} игроков")
                    if player['id'] not in selected_ids:
                        print(f"   ⚠️  ВНИМАНИЕ: Игрок НЕ включен в список получателей!")
                        print(f"      ID игрока: {player['id']}")
                        print(f"      Выбранные ID: {selected_ids}")
                    else:
                        print(f"   ✅ Игрок включен в список получателей")
                else:
                    print(f"   ✅ Общий режим: все игроки команды")
            except Exception as e:
                print(f"   ❌ Ошибка парсинга настроек получателей: {e}")
        else:
            print(f"   ✅ Общий режим: все игроки команды")
    
    # Проверяем всех игроков команды
    print(f"\n👥 Проверяем всех игроков команды с Telegram ID")
    print("-" * 40)
    
    team_players = check_team_players(player['teamId'])
    print(f"Найдено {len(team_players)} игроков с Telegram ID:")
    
    for p in team_players:
        status = "✅" if p['id'] == player['id'] else "  "
        print(f"{status} {p['firstName']} {p['lastName']} (ID: {p['id']}, Telegram: {p['telegramId']})")
    
    # Рекомендации
    print(f"\n💡 Рекомендации:")
    print("-" * 40)
    
    if not player['telegramId']:
        print("❌ У игрока нет Telegram ID")
        print("   Решение: Игрок должен написать /start боту и ввести PIN-код")
    elif not schedules:
        print("❌ Нет настроек рассылки")
        print("   Решение: Настройте рассылку в админ-панели")
    elif not any(s['enabled'] for s in schedules):
        print("❌ Все рассылки отключены")
        print("   Решение: Включите рассылку в админ-панели")
    else:
        # Проверяем индивидуальный режим
        for schedule in schedules:
            if schedule['recipientsConfig']:
                import json
                try:
                    config = json.loads(schedule['recipientsConfig'])
                    if config.get('isIndividualMode') and player['id'] not in config.get('selectedPlayerIds', []):
                        print("❌ Игрок не включен в индивидуальный список получателей")
                        print("   Решение: Добавьте игрока в список получателей в админ-панели")
                        break
                except:
                    pass
        else:
            print("✅ Все настройки выглядят корректно")
            print("   Возможные причины отсутствия сообщений:")
            print("   1. Время рассылки еще не наступило")
            print("   2. Проблемы с ботом (проверьте логи)")
            print("   3. Игрок заблокировал бота")

if __name__ == "__main__":
    main()
