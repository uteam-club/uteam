#!/usr/bin/env python3
"""
Скрипт для принудительной отправки тестового сообщения игроку
Помогает проверить, работает ли отправка сообщений
"""

import os
import asyncio
import psycopg2
import psycopg2.extras
from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
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

# Токен бота
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '7555689553:AAFSDvBcAC_PU7o5vq3vVoGy5DS8R9q5aPU')

def get_db_connection():
    """Создает подключение к базе данных"""
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"[DB] Ошибка подключения к базе данных: {e}")
        return None

def get_player_by_pin(pin_code):
    """Получает данные игрока по PIN-коду"""
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
                t."clubId"
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

async def send_test_message(telegram_id, player_name, language='ru'):
    """Отправляет тестовое сообщение игроку"""
    bot = Bot(token=BOT_TOKEN)
    
    # Формируем сообщение
    if language == 'en':
        text = (
            f"Hello {player_name}! This is a test message from UTeam bot.\n\n"
            f"If you receive this message, the bot is working correctly.\n\n"
            f"Your Telegram ID: {telegram_id}"
        )
        button_text = "✅ Test received"
    else:
        text = (
            f"Привет, {player_name}! Это тестовое сообщение от бота UTeam.\n\n"
            f"Если ты получил это сообщение, значит бот работает корректно.\n\n"
            f"Твой Telegram ID: {telegram_id}"
        )
        button_text = "✅ Тест получен"
    
    # Создаем кнопку
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=button_text, callback_data="test_received")]
    ])
    
    try:
        await bot.send_message(
            telegram_id,
            text,
            reply_markup=keyboard,
            parse_mode="HTML"
        )
        print(f"✅ Тестовое сообщение отправлено игроку {player_name} (ID: {telegram_id})")
        return True
    except Exception as e:
        print(f"❌ Ошибка отправки сообщения: {e}")
        return False
    finally:
        await bot.session.close()

async def send_survey_message(telegram_id, player_name, pin_code, club_id, language='ru', survey_type='morning'):
    """Отправляет сообщение с опросом"""
    bot = Bot(token=BOT_TOKEN)
    
    # Формируем ссылку
    link = f"https://api.uteam.club/survey?tenantId={club_id}&type={survey_type}"
    
    # Формируем сообщение
    if survey_type == 'morning':
        if language == 'en':
            text = (
                f"Good morning, {player_name}! Please complete the morning survey.\n\n"
                f"Your pin code for login:\n<code>{pin_code}</code>"
            )
            button_text = "📝 Take the survey"
        else:
            text = (
                f"Доброе утро, {player_name}! Пожалуйста, пройди утренний опросник.\n\n"
                f"Твой пинкод для входа:\n<code>{pin_code}</code>"
            )
            button_text = "📝 Пройти опрос"
    else:  # RPE
        if language == 'en':
            text = (
                f"Hello {player_name}! Please rate how hard your training was (RPE).\n\n"
                f"Your pin code for login:\n<code>{pin_code}</code>"
            )
            button_text = "📝 Rate RPE"
        else:
            text = (
                f"Привет, {player_name}! Пожалуйста, оцени, насколько тяжёлой была твоя тренировка (RPE).\n\n"
                f"Твой пинкод для входа:\n<code>{pin_code}</code>"
            )
            button_text = "📝 Оценить RPE"
    
    # Создаем кнопку
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=button_text, url=link)]
    ])
    
    try:
        await bot.send_message(
            telegram_id,
            text,
            reply_markup=keyboard,
            parse_mode="HTML"
        )
        print(f"✅ Сообщение с опросом отправлено игроку {player_name} (ID: {telegram_id})")
        return True
    except Exception as e:
        print(f"❌ Ошибка отправки сообщения: {e}")
        return False
    finally:
        await bot.session.close()

async def main():
    print("📤 Отправка тестового сообщения игроку")
    print("=" * 50)
    
    # Запрашиваем PIN-код
    pin_code = input("Введите PIN-код игрока: ").strip()
    if not pin_code:
        print("❌ PIN-код не введен")
        return
    
    # Получаем данные игрока
    player = get_player_by_pin(pin_code)
    if not player:
        print("❌ Игрок с таким PIN-кодом не найден")
        return
    
    print(f"✅ Найден игрок: {player['firstName']} {player['lastName']}")
    print(f"   Telegram ID: {player['telegramId']}")
    print(f"   Язык: {player['language']}")
    print(f"   Команда: {player['teamName']}")
    
    if not player['telegramId']:
        print("❌ У игрока нет Telegram ID")
        print("   Решение: Игрок должен написать /start боту и ввести PIN-код")
        return
    
    # Выбираем тип сообщения
    print("\nВыберите тип сообщения:")
    print("1. Тестовое сообщение")
    print("2. Утренний опрос")
    print("3. RPE опрос")
    
    choice = input("Введите номер (1-3): ").strip()
    
    if choice == "1":
        # Тестовое сообщение
        success = await send_test_message(
            player['telegramId'],
            f"{player['firstName']} {player['lastName']}",
            player['language']
        )
    elif choice == "2":
        # Утренний опрос
        success = await send_survey_message(
            player['telegramId'],
            f"{player['firstName']} {player['lastName']}",
            player['pinCode'],
            player['clubId'],
            player['language'],
            'morning'
        )
    elif choice == "3":
        # RPE опрос
        success = await send_survey_message(
            player['telegramId'],
            f"{player['firstName']} {player['lastName']}",
            player['pinCode'],
            player['clubId'],
            player['language'],
            'rpe'
        )
    else:
        print("❌ Неверный выбор")
        return
    
    if success:
        print("\n✅ Сообщение успешно отправлено!")
        print("   Проверьте, получил ли игрок сообщение в Telegram")
    else:
        print("\n❌ Не удалось отправить сообщение")
        print("   Возможные причины:")
        print("   1. Игрок заблокировал бота")
        print("   2. Неверный токен бота")
        print("   3. Проблемы с сетью")

if __name__ == "__main__":
    asyncio.run(main())
