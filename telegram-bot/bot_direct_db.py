import os
import asyncio
import psycopg2
import psycopg2.extras
from aiogram import Bot, Dispatcher, types, executor
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
import pytz
import json
from aiohttp import web

load_dotenv()

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

# Конфигурация Telegram бота
API_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
bot = Bot(token=API_TOKEN)
dp = Dispatcher(bot)

LANGUAGES = {'en': 'English', 'ru': 'Русский'}
LANGUAGE_BUTTONS = {
    'en': 'Change language',
    'ru': 'Сменить язык'
}

# Состояния пользователя
user_states = {}

def get_db_connection():
    """Создает подключение к базе данных"""
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"[DB] Ошибка подключения к базе данных: {e}")
        return None

def get_survey_schedules():
    """Получает все активные расписания рассылок с таймзоной команды"""
    connection = get_db_connection()
    if not connection:
        return []
    
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            query = """
            SELECT 
                ss.id,
                ss.teamId,
                ss.sendTime,
                ss.enabled,
                ss."surveyType",
                t.timezone
            FROM "SurveySchedule" ss
            LEFT JOIN "Team" t ON ss.teamId = t.id
            WHERE ss.enabled = true AND ss."surveyType" = 'morning'
            """
            cursor.execute(query)
            schedules = cursor.fetchall()
            return [dict(schedule) for schedule in schedules]
    except Exception as e:
        print(f"[DB] Ошибка получения расписаний: {e}")
        return []
    finally:
        connection.close()

def get_team_players(team_id):
    """Получает всех игроков команды с telegramId"""
    connection = get_db_connection()
    if not connection:
        return []
    
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            query = """
            SELECT 
                p.id,
                p.firstName,
                p.lastName,
                p.telegramId,
                p.pinCode,
                p.language,
                t.clubId
            FROM "Player" p
            LEFT JOIN "Team" t ON p.teamId = t.id
            WHERE p.teamId = %s AND p.telegramId IS NOT NULL
            """
            cursor.execute(query, (team_id,))
            players = cursor.fetchall()
            return [dict(player) for player in players]
    except Exception as e:
        print(f"[DB] Ошибка получения игроков команды {team_id}: {e}")
        return []
    finally:
        connection.close()

def bind_telegram_to_player(pin_code, telegram_id, language='ru'):
    """Привязывает Telegram ID к игроку по PIN-коду"""
    connection = get_db_connection()
    if not connection:
        return False, "Ошибка подключения к базе данных"
    
    try:
        with connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            # Проверяем, не привязан ли уже этот telegramId
            cursor.execute(
                "SELECT id FROM \"Player\" WHERE telegramId = %s",
                (telegram_id,)
            )
            if cursor.fetchone():
                return False, "Этот Telegram аккаунт уже привязан к другому игроку"
            
            # Ищем игрока по PIN-коду
            cursor.execute(
                "SELECT id, telegramId FROM \"Player\" WHERE pinCode = %s",
                (pin_code,)
            )
            player = cursor.fetchone()
            
            if not player:
                return False, "PIN-код не найден"
            
            if player['telegramId']:
                return False, "Этот PIN-код уже привязан к другому Telegram аккаунту"
            
            # Привязываем telegramId и обновляем язык
            cursor.execute(
                "UPDATE \"Player\" SET telegramId = %s, language = %s, updatedAt = NOW() WHERE id = %s",
                (telegram_id, language, player['id'])
            )
            connection.commit()
            
            return True, "Успешно привязано"
            
    except Exception as e:
        print(f"[DB] Ошибка привязки Telegram: {e}")
        return False, "Ошибка базы данных"
    finally:
        connection.close()

@dp.message_handler(commands=['start'])
async def start_handler(message: types.Message):
    """Обработчик команды /start"""
    kb = ReplyKeyboardMarkup(resize_keyboard=True)
    for code, name in LANGUAGES.items():
        kb.add(KeyboardButton(name))
    await message.answer(
        "Welcome! Please select your language / Пожалуйста, выберите язык:",
        reply_markup=kb
    )
    user_states[message.from_user.id] = {'step': 'choose_language'}

@dp.message_handler(lambda m: m.text in [LANGUAGE_BUTTONS['en'], LANGUAGE_BUTTONS['ru']])
async def change_language_handler(message: types.Message):
    """Обработчик смены языка"""
    kb = ReplyKeyboardMarkup(resize_keyboard=True)
    for code, name in LANGUAGES.items():
        kb.add(KeyboardButton(name))
    lang = user_states.get(message.from_user.id, {}).get('language', 'en')
    if lang == 'en':
        await message.answer("Please select your language:", reply_markup=kb)
    else:
        await message.answer("Пожалуйста, выберите язык:", reply_markup=kb)
    user_states[message.from_user.id] = {'step': 'choose_language'}

@dp.message_handler(lambda m: m.text in LANGUAGES.values())
async def language_handler(message: types.Message):
    """Обработчик выбора языка"""
    lang_code = 'en' if message.text == 'English' else 'ru'
    user_states[message.from_user.id] = {'step': 'enter_pin', 'language': lang_code}
    if lang_code == 'en':
        await message.answer("Please enter your 6-digit pin code:", reply_markup=types.ReplyKeyboardRemove())
    else:
        await message.answer("Пожалуйста, введите ваш 6-значный пин-код:", reply_markup=types.ReplyKeyboardRemove())

@dp.message_handler(lambda m: user_states.get(m.from_user.id, {}).get('step') == 'enter_pin')
async def pin_handler(message: types.Message):
    """Обработчик ввода PIN-кода"""
    pin = message.text.strip()
    lang = user_states[message.from_user.id].get('language', 'en')
    
    if not pin.isdigit() or len(pin) != 6:
        if lang == 'en':
            await message.answer("Invalid pin code. Please enter a 6-digit number.")
        else:
            await message.answer("Некорректный пин-код. Введите 6-значное число.")
        return
    
    # Привязываем Telegram ID к игроку
    success, message_text = bind_telegram_to_player(pin, str(message.from_user.id), lang)
    
    if success:
        if lang == 'en':
            await message.answer("Success! You are now linked and will receive notifications.")
        else:
            await message.answer("Успешно! Вы привязаны и будете получать уведомления.")
    else:
        if lang == 'en':
            await message.answer(f"Error: {message_text}")
        else:
            await message.answer(f"Ошибка: {message_text}")
    
    user_states.pop(message.from_user.id, None)

async def send_survey_broadcast():
    """Проверяет расписание рассылок и отправляет сообщения игрокам"""
    try:
        print("[Scheduler] Проверка расписаний рассылок...")
        
        # Получаем все активные расписания
        schedules = get_survey_schedules()
        print(f"[Scheduler] Найдено {len(schedules)} активных расписаний")
        
        for schedule in schedules:
            if not schedule['enabled']:
                continue
                
            tz = schedule.get('timezone') or 'Europe/Moscow'
            try:
                now = datetime.now(pytz.timezone(tz))
            except Exception:
                now = datetime.utcnow() + timedelta(hours=3)  # fallback
                
            now_str = now.strftime('%H:%M')
            print(f"[DEBUG] Проверка: sendTime={schedule.get('sendTime')}, now_str={now_str}, timezone={tz}")
            
            if schedule.get('sendTime') == now_str:
                # Получаем игроков команды
                team_id = schedule.get('teamId')
                players = get_team_players(team_id)
                
                print(f"[DEBUG] Получено игроков для рассылки: {len(players)}")
                
                # Отправляем сообщения
                for player in players:
                    telegram_id = player.get('telegramId')
                    club_id = player.get('clubId')
                    pin_code = player.get('pinCode', '------')
                    lang = player.get('language', 'ru')
                    
                    if not telegram_id or not club_id:
                        print(f"[DEBUG] Пропущен игрок без telegramId или clubId: {player}")
                        continue
                    
                    link = f"https://fdcvista.uteam.club/survey?tenantId={club_id}"
                    
                    if lang == 'en':
                        text = (
                            "Good morning! Please complete the morning survey.\n\n"
                            "Your pin code for login:\n"
                            f"<code>{pin_code}</code>"
                        )
                        button_text = "📝 Take the survey"
                    else:
                        text = (
                            "Доброе утро! Пожалуйста, пройди утренний опросник.\n\n"
                            "Твой пинкод для входа:\n"
                            f"<code>{pin_code}</code>"
                        )
                        button_text = "📝 Пройти опрос"
                    
                    keyboard = InlineKeyboardMarkup().add(
                        InlineKeyboardButton(button_text, url=link)
                    )
                    
                    try:
                        await bot.send_message(
                            telegram_id,
                            text,
                            reply_markup=keyboard,
                            parse_mode="HTML"
                        )
                        print(f"[DEBUG] Сообщение отправлено: telegramId={telegram_id}")
                    except Exception as e:
                        print(f"[Scheduler] Ошибка отправки {telegram_id}: {e}")
        
        print(f"[Scheduler] Проверка рассылок завершена")
    except Exception as e:
        print(f"[Scheduler] Ошибка планировщика: {e}")

def setup_scheduler():
    """Настройка планировщика задач"""
    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_survey_broadcast, 'interval', minutes=1)
    scheduler.start()
    print("[Scheduler] Планировщик запущен")

# HTTP endpoints для ручной отправки
async def handle_send_morning_survey(request):
    """HTTP endpoint для ручной отправки утреннего опроса"""
    data = await request.json()
    telegram_id = data.get('telegramId')
    club_id = data.get('clubId')
    pin_code = data.get('pinCode', '------')
    lang = data.get('language', 'ru')
    
    if not telegram_id or not club_id:
        return web.json_response({'error': 'telegramId и clubId обязательны'}, status=400)
    
    link = f"https://fdcvista.uteam.club/survey?tenantId={club_id}"
    
    if lang == 'en':
        text = (
            "Good morning! Please complete the morning survey.\n\n"
            "Your pin code for login:\n"
            f"<code>{pin_code}</code>"
        )
        button_text = "📝 Take the survey"
    else:
        text = (
            "Доброе утро! Пожалуйста, пройди утренний опросник.\n\n"
            "Твой пинкод для входа:\n"
            f"<code>{pin_code}</code>"
        )
        button_text = "📝 Пройти опрос"
    
    keyboard = InlineKeyboardMarkup().add(
        InlineKeyboardButton(button_text, url=link)
    )
    
    try:
        await bot.send_message(
            telegram_id,
            text,
            reply_markup=keyboard,
            parse_mode="HTML"
        )
        return web.json_response({'success': True})
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def handle_send_survey_success(request):
    """HTTP endpoint для отправки сообщения об успешном прохождении опроса"""
    data = await request.json()
    telegram_id = data.get('telegramId')
    lang = data.get('language', 'ru')
    
    if not telegram_id:
        return web.json_response({'error': 'telegramId обязателен'}, status=400)
    
    await send_survey_success_message(telegram_id, lang)
    return web.json_response({'success': True})

async def send_survey_success_message(telegram_id, lang='ru'):
    """Отправляет сообщение об успешном прохождении опроса"""
    if lang == 'en':
        text = (
            "✅ Thank you! Your morning survey has been successfully submitted.\n"
            "Have a great day and productive training!"
        )
    else:
        text = (
            "✅ Спасибо! Ваш утренний опросник успешно отправлен.\n"
            "Хорошего дня и продуктивной тренировки!"
        )
    try:
        await bot.send_message(telegram_id, text)
    except Exception as e:
        print(f"[SurveySuccess] Ошибка отправки сообщения: {e}")

def run_web_app():
    """Запуск HTTP сервера"""
    app = web.Application()
    app.router.add_post('/send-morning-survey', handle_send_morning_survey)
    app.router.add_post('/send-survey-success', handle_send_survey_success)
    
    loop = asyncio.get_event_loop()
    runner = web.AppRunner(app)
    loop.run_until_complete(runner.setup())
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    loop.run_until_complete(site.start())
    print('HTTP server started on port 8080')

if __name__ == '__main__':
    print("[BOT] Запуск Telegram-бота с прямым доступом к базе данных...")
    setup_scheduler()
    run_web_app()
    executor.start_polling(dp, skip_updates=True) 