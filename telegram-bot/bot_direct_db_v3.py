import os
import asyncio
import psycopg2
import psycopg2.extras
from aiogram import Bot, Dispatcher, types
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.dispatcher import FSMContext
from aiogram.dispatcher.filters.state import State, StatesGroup
from aiogram.contrib.fsm_storage.memory import MemoryStorage
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
import pytz
import json
from aiohttp import web

load_dotenv()
print(f"[DEBUG] TELEGRAM_BOT_TOKEN={os.getenv('TELEGRAM_BOT_TOKEN')}")

# Конфигурация базы данных для бота
DB_CONFIG = {
    'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
    'port': 6432,
    'database': 'uteam',
    'user': 'uteam_bot_reader',
    'password': 'uteambot567234!',
    'sslmode': 'require'
}

# Конфигурация Telegram бота
API_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
bot = Bot(token=API_TOKEN)
storage = MemoryStorage()
dp = Dispatcher(bot, storage=storage)

LANGUAGES = {'en': 'English', 'ru': 'Русский'}
LANGUAGE_BUTTONS = {
    'en': 'Change language',
    'ru': 'Сменить язык'
}

# Состояния пользователя
class UserStates(StatesGroup):
    choose_language = State()
    enter_pin = State()

# Главное меню
MAIN_MENU = ReplyKeyboardMarkup(resize_keyboard=True)
MAIN_MENU.add(KeyboardButton('Сменить язык'), KeyboardButton('Отвязать TelegramID'))

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
                ss."id",
                ss."teamId",
                ss."sendTime",
                ss."enabled",
                ss."surveyType",
                t."timezone"
            FROM "SurveySchedule" ss
            LEFT JOIN "Team" t ON ss."teamId" = t."id"
            WHERE ss."enabled" = true AND ss."surveyType" = 'morning'
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
                p."id",
                p."firstName",
                p."lastName",
                p."telegramId",
                p."pinCode",
                p."language",
                t."clubId"
            FROM "Player" p
            LEFT JOIN "Team" t ON p."teamId" = t."id"
            WHERE p."teamId" = %s AND p."telegramId" IS NOT NULL
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
                "SELECT id FROM \"Player\" WHERE \"telegramId\" = %s",
                (telegram_id,)
            )
            if cursor.fetchone():
                return False, "Этот Telegram аккаунт уже привязан к другому игроку"
            
            # Ищем игрока по PIN-коду
            cursor.execute(
                "SELECT id, \"telegramId\" FROM \"Player\" WHERE \"pinCode\" = %s",
                (pin_code,)
            )
            player = cursor.fetchone()
            
            if not player:
                return False, "PIN-код не найден"
            
            if player['telegramId']:
                return False, "Этот PIN-код уже привязан к другому Telegram аккаунту"
            
            # Привязываем telegramId и обновляем язык
            cursor.execute(
                "UPDATE \"Player\" SET \"telegramId\" = %s, \"language\" = %s, \"updatedAt\" = NOW() WHERE \"id\" = %s",
                (telegram_id, language, player['id'])
            )
            connection.commit()
            
            return True, "Успешно привязано"
            
    except Exception as e:
        print(f"[DB] Ошибка привязки Telegram: {e}")
        return False, "Ошибка базы данных"
    finally:
        connection.close()

def update_player_language(telegram_id, language):
    """Обновляет язык игрока в базе данных"""
    connection = get_db_connection()
    if not connection:
        return False, "Ошибка подключения к базе данных"
    
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'UPDATE "Player" SET "language" = %s, "updatedAt" = NOW() WHERE "telegramId" = %s',
                (language, str(telegram_id))
            )
            connection.commit()
            if cursor.rowcount > 0:
                return True, "Язык успешно обновлен"
            else:
                return False, "Игрок с таким TelegramID не найден"
    except Exception as e:
        print(f"[DB] Ошибка обновления языка: {e}")
        return False, "Ошибка базы данных"
    finally:
        connection.close()

def is_telegram_bound(telegram_id):
    """Проверяет, привязан ли Telegram ID к игроку"""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT id FROM "Player" WHERE "telegramId" = %s', (str(telegram_id),))
            return cursor.fetchone() is not None
    except Exception as e:
        print(f"[DB] Ошибка проверки привязки TelegramID: {e}")
        return False
    finally:
        connection.close()

def unbind_telegram_id(telegram_id):
    """Удаляет telegramId у игрока по Telegram user id"""
    connection = get_db_connection()
    if not connection:
        return False, "Ошибка подключения к базе данных"
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                'UPDATE "Player" SET "telegramId" = NULL, "updatedAt" = NOW() WHERE "telegramId" = %s',
                (str(telegram_id),)
            )
            connection.commit()
            if cursor.rowcount > 0:
                return True, "TelegramID успешно отвязан"
            else:
                return False, "TelegramID не найден в базе"
    except Exception as e:
        print(f"[DB] Ошибка отвязки Telegram: {e}")
        return False, "Ошибка базы данных"
    finally:
        connection.close()

@dp.message_handler(commands=['start'])
async def start_handler(message: types.Message, state: FSMContext):
    """Обработчик команды /start"""
    kb = ReplyKeyboardMarkup(resize_keyboard=True)
    for code, name in LANGUAGES.items():
        kb.add(KeyboardButton(name))
    await message.answer(
        "Welcome! Please select your language / Пожалуйста, выберите язык:",
        reply_markup=kb
    )
    await state.set_state(UserStates.choose_language.state)

@dp.message_handler(lambda m: m.text in LANGUAGE_BUTTONS.values())
async def change_language_handler(message: types.Message, state: FSMContext):
    """Обработчик смены языка"""
    kb = ReplyKeyboardMarkup(resize_keyboard=True)
    for code, name in LANGUAGES.items():
        kb.add(KeyboardButton(name))
    await message.answer("Пожалуйста, выберите язык:", reply_markup=kb)
    await state.set_state(UserStates.choose_language.state)

@dp.message_handler(lambda m: m.text in LANGUAGES.values())
async def language_handler(message: types.Message, state: FSMContext):
    """Обработчик выбора языка"""
    lang_code = 'en' if message.text == 'English' else 'ru'
    telegram_id = message.from_user.id
    
    # Проверяем, привязан ли уже Telegram ID
    if is_telegram_bound(telegram_id):
        # Если уже привязан, обновляем язык в базе
        success, message_text = update_player_language(telegram_id, lang_code)
        if success:
            if lang_code == 'en':
                await message.answer("✅ Language changed successfully.", reply_markup=MAIN_MENU)
            else:
                await message.answer("✅ Язык успешно изменён.", reply_markup=MAIN_MENU)
        else:
            if lang_code == 'en':
                await message.answer(f"❌ Error: {message_text}", reply_markup=MAIN_MENU)
            else:
                await message.answer(f"❌ Ошибка: {message_text}", reply_markup=MAIN_MENU)
        await state.finish()
        return
    
    # Для новых пользователей - сохраняем язык и переходим к пин-коду
    await state.update_data(language=lang_code)
    await state.set_state(UserStates.enter_pin.state)
    
    if lang_code == 'en':
        await message.answer("Please enter your 6-digit pin code:", reply_markup=types.ReplyKeyboardRemove())
    else:
        await message.answer("Пожалуйста, введите ваш 6-значный пин-код:", reply_markup=types.ReplyKeyboardRemove())

@dp.message_handler(state=UserStates.enter_pin)
async def pin_handler(message: types.Message, state: FSMContext):
    """Обработчик ввода PIN-кода"""
    pin = message.text.strip()
    data = await state.get_data()
    lang = data.get('language', 'en')
    
    if not pin.isdigit() or len(pin) != 6:
        if lang == 'en':
            await message.answer("Invalid pin code. Please enter a 6-digit number.")
        else:
            await message.answer("Некорректный пин-код. Введите 6-значное число.")
        return
    
    # Привязываем Telegram ID к игроку
    success, message_text = bind_telegram_to_player(pin, message.from_user.id, lang)
    
    if success:
        if lang == 'en':
            await message.answer("✅ Successfully linked! You will now receive morning surveys.", reply_markup=MAIN_MENU)
        else:
            await message.answer("✅ Успешно привязано! Теперь вы будете получать утренние опросы.", reply_markup=MAIN_MENU)
    else:
        if lang == 'en':
            await message.answer(f"❌ Error: {message_text}")
        else:
            await message.answer(f"❌ Ошибка: {message_text}")
    
    await state.finish()

@dp.message_handler(lambda m: m.text == 'Сменить язык')
async def menu_change_language(message: types.Message, state: FSMContext):
    """Обработчик кнопки смены языка в меню"""
    kb = ReplyKeyboardMarkup(resize_keyboard=True)
    for code, name in LANGUAGES.items():
        kb.add(KeyboardButton(name))
    await message.answer('Пожалуйста, выберите язык:', reply_markup=kb)
    await state.set_state(UserStates.choose_language.state)

@dp.message_handler(lambda m: m.text == 'Отвязать TelegramID')
async def menu_unbind_telegram(message: types.Message, state: FSMContext):
    """Обработчик кнопки отвязки TelegramID в меню"""
    success, msg = unbind_telegram_id(message.from_user.id)
    if success:
        await message.answer('Ваш TelegramID отвязан. Теперь вы можете привязать новый аккаунт, введя пинкод.', reply_markup=MAIN_MENU)
    else:
        await message.answer(f'Ошибка: {msg}', reply_markup=MAIN_MENU)

async def send_survey_broadcast():
    """Основная функция рассылки утренних опросов"""
    print(f"[BROADCAST] {datetime.now()} - Проверка расписаний...")
    
    schedules = get_survey_schedules()
    if not schedules:
        print("[BROADCAST] Нет активных расписаний")
        return
    
    for schedule in schedules:
        try:
            # Получаем текущее время в таймзоне команды
            team_timezone = schedule.get('timezone', 'Europe/Moscow')
            tz = pytz.timezone(team_timezone)
            current_time = datetime.now(tz)
            
            # Проверяем, нужно ли отправлять опрос сейчас
            send_time = schedule['sendTime']
            if not send_time:
                continue
                
            # Парсим время отправки
            try:
                hour, minute = map(int, send_time.split(':'))
                schedule_time = current_time.replace(hour=hour, minute=minute, second=0, microsecond=0)
            except:
                print(f"[BROADCAST] Ошибка парсинга времени: {send_time}")
                continue
            
            # Проверяем, прошло ли 5 минут с запланированного времени
            time_diff = abs((current_time - schedule_time).total_seconds())
            if time_diff > 300:  # 5 минут = 300 секунд
                continue
            
            print(f"[BROADCAST] Отправка опроса для команды {schedule['teamId']} в {send_time}")
            
            # Получаем игроков команды
            players = get_team_players(schedule['teamId'])
            if not players:
                print(f"[BROADCAST] Нет игроков с Telegram для команды {schedule['teamId']}")
                continue
            
            # Отправляем опрос каждому игроку
            for player in players:
                try:
                    lang = player.get('language', 'ru')
                    
                    if lang == 'en':
                        text = f"Good morning, {player['firstName']}! How are you feeling today?"
                    else:
                        text = f"Доброе утро, {player['firstName']}! Как вы себя чувствуете сегодня?"
                    
                    # Создаем клавиатуру с вариантами ответов
                    kb = InlineKeyboardMarkup()
                    kb.add(
                        InlineKeyboardButton("😊 Great / Отлично", callback_data="morning_great"),
                        InlineKeyboardButton("😐 Good / Хорошо", callback_data="morning_good")
                    )
                    kb.add(
                        InlineKeyboardButton("😕 Okay / Нормально", callback_data="morning_okay"),
                        InlineKeyboardButton("😞 Bad / Плохо", callback_data="morning_bad")
                    )
                    
                    await bot.send_message(
                        chat_id=player['telegramId'],
                        text=text,
                        reply_markup=kb
                    )
                    
                    print(f"[BROADCAST] Отправлен опрос игроку {player['firstName']} {player['lastName']}")
                    
                except Exception as e:
                    print(f"[BROADCAST] Ошибка отправки игроку {player['firstName']}: {e}")
                    continue
                    
        except Exception as e:
            print(f"[BROADCAST] Ошибка обработки расписания {schedule['id']}: {e}")
            continue

def setup_scheduler():
    """Настройка планировщика задач"""
    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_survey_broadcast, 'interval', minutes=1)
    scheduler.start()
    print("[SCHEDULER] Планировщик запущен")

async def handle_send_morning_survey(request):
    """HTTP endpoint для ручной отправки утреннего опроса"""
    try:
        await send_survey_broadcast()
        return web.json_response({"status": "success", "message": "Morning survey sent"})
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)

async def handle_send_survey_success(request):
    """HTTP endpoint для отправки сообщения об успешном прохождении"""
    try:
        data = await request.json()
        telegram_id = data.get('telegram_id')
        lang = data.get('language', 'ru')
        
        if not telegram_id:
            return web.json_response({"status": "error", "message": "telegram_id required"}, status=400)
        
        await send_survey_success_message(telegram_id, lang)
        return web.json_response({"status": "success", "message": "Success message sent"})
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)

async def send_survey_success_message(telegram_id, lang='ru'):
    """Отправляет сообщение об успешном прохождении опроса"""
    try:
        if lang == 'en':
            text = "✅ Thank you! Your response has been recorded."
        else:
            text = "✅ Спасибо! Ваш ответ записан."
        
        await bot.send_message(chat_id=telegram_id, text=text)
    except Exception as e:
        print(f"[SUCCESS] Ошибка отправки сообщения об успехе: {e}")

def run_web_app():
    """Запускает HTTP сервер для API endpoints"""
    app = web.Application()
    app.router.add_post('/send-morning-survey', handle_send_morning_survey)
    app.router.add_post('/send-survey-success', handle_send_survey_success)
    
    runner = web.AppRunner(app)
    print("[WEB] HTTP сервер настроен на порту 8080")

if __name__ == '__main__':
    print("[BOT] Запуск Telegram-бота с прямым доступом к базе данных...")
    setup_scheduler()
    run_web_app()
    print("[BOT] Бот запускается...")
    from aiogram import executor
    executor.start_polling(dp, skip_updates=True) 