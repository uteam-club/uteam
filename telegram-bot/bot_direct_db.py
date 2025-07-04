import os
import asyncio
import psycopg2
import psycopg2.extras
from aiogram import Bot, Dispatcher, types, F
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import Command
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
import pytz
import json
from aiohttp import web
import signal
from aiogram.fsm.context import FSMContext

load_dotenv()
print(f"[DEBUG] TELEGRAM_BOT_TOKEN={os.getenv('TELEGRAM_BOT_TOKEN')}")

# Конфигурация базы данных для бота
DB_CONFIG = {
    'host': 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
    'port': 6432,
    'database': 'uteam',
    'user': 'uteam_bot_reader',
    'password': 'uteambot567234!',
    'sslmode': 'verify-ca',
    'sslrootcert': './CA.pem'
}

# Конфигурация Telegram бота
API_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

LANGUAGES = {'en': 'English', 'ru': 'Русский'}
LANGUAGE_BUTTONS = {
    'en': 'Change language',
    'ru': 'Сменить язык'
}

# Состояния пользователя
user_states = {}

# Главное меню
MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text='Сменить язык'), KeyboardButton(text='Отвязать TelegramID')]
    ],
    resize_keyboard=True
)

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

def get_user_language(telegram_id):
    # Сначала пробуем из user_states
    lang = user_states.get(telegram_id, {}).get('language')
    if lang:
        return lang
    # Если нет — пробуем из базы
    connection = get_db_connection()
    if connection:
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT "language" FROM "Player" WHERE "telegramId" = %s', (str(telegram_id),))
                row = cursor.fetchone()
                if row and row[0] in LANGUAGES:
                    return row[0]
        except Exception as e:
            print(f"[DB] Ошибка получения языка пользователя: {e}")
        finally:
            connection.close()
    return 'ru'  # по умолчанию

def is_telegram_bound(telegram_id):
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

# --- Хендлеры ---
async def start_handler(message: types.Message):
    kb = types.ReplyKeyboardMarkup(
        keyboard=[[types.KeyboardButton(text=name)] for code, name in LANGUAGES.items()],
        resize_keyboard=True
    )
    await message.answer(
        "Welcome! Please select your language / Пожалуйста, выберите язык:",
        reply_markup=kb
    )
    user_states[message.from_user.id] = {'step': 'choose_language'}

async def change_language_handler(message: types.Message):
    kb = types.ReplyKeyboardMarkup(
        keyboard=[[types.KeyboardButton(text=name)] for code, name in LANGUAGES.items()],
        resize_keyboard=True
    )
    lang = user_states.get(message.from_user.id, {}).get('language', 'en')
    if lang == 'en':
        await message.answer("Please select your language:", reply_markup=kb)
    else:
        await message.answer("Пожалуйста, выберите язык:", reply_markup=kb)
    user_states[message.from_user.id] = {'step': 'choose_language'}

async def language_handler(message: types.Message, state: FSMContext):
    lang_code = 'en' if message.text == 'English' else 'ru'
    telegram_id = message.from_user.id
    user_state = user_states.get(telegram_id, {})
    # Если это смена языка через меню и пользователь уже привязан
    if user_state.get('step') == 'change_language' and (user_state.get('is_bound') or is_telegram_bound(telegram_id)):
        connection = get_db_connection()
        if connection:
            try:
                with connection.cursor() as cursor:
                    cursor.execute('UPDATE "Player" SET "language" = %s, "updatedAt" = NOW() WHERE "telegramId" = %s', (lang_code, str(telegram_id)))
                    connection.commit()
            except Exception as e:
                print(f"[DB] Ошибка обновления языка: {e}")
            finally:
                connection.close()
        await message.answer('Язык успешно изменён.' if lang_code == 'ru' else 'Language changed successfully.', reply_markup=types.ReplyKeyboardRemove())
        user_states.pop(telegram_id, None)
        await state.clear()
        return
    # Обычная логика для новых пользователей (ещё не привязанных)
    user_states[telegram_id] = {'step': 'enter_pin', 'language': lang_code}
    if lang_code == 'en':
        await message.answer("Please enter your 6-digit pin code:", reply_markup=types.ReplyKeyboardRemove())
    else:
        await message.answer("Пожалуйста, введите ваш 6-значный пин-код:", reply_markup=types.ReplyKeyboardRemove())

async def pin_handler(message: types.Message):
    pin = message.text.strip()
    lang = user_states[message.from_user.id].get('language', 'en')
    if not pin.isdigit() or len(pin) != 6:
        if lang == 'en':
            await message.answer("Invalid pin code. Please enter a 6-digit number.")
        else:
            await message.answer("Некорректный пин-код. Введите 6-значное число.")
        return
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

@dp.message(Command('menu'))
async def menu_handler(message: types.Message, state: FSMContext):
    lang = get_user_language(message.from_user.id)
    if lang == 'en':
        menu_text = 'Main menu:'
        menu_kb = types.ReplyKeyboardMarkup(
            keyboard=[[types.KeyboardButton(text='Change language'), types.KeyboardButton(text='Unlink TelegramID')]],
            resize_keyboard=True
        )
    else:
        menu_text = 'Главное меню:'
        menu_kb = types.ReplyKeyboardMarkup(
            keyboard=[[types.KeyboardButton(text='Сменить язык'), types.KeyboardButton(text='Отвязать TelegramID')]],
            resize_keyboard=True
        )
    await message.answer(menu_text, reply_markup=menu_kb)

@dp.message(F.text == 'Сменить язык')
async def menu_change_language(message: types.Message, state: FSMContext):
    telegram_id = message.from_user.id
    # Проверяем, привязан ли TelegramID
    connection = get_db_connection()
    is_bound = False
    if connection:
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT id FROM "Player" WHERE "telegramId" = %s', (str(telegram_id),))
                is_bound = cursor.fetchone() is not None
        except Exception as e:
            print(f"[DB] Ошибка проверки привязки TelegramID: {e}")
        finally:
            connection.close()
    kb = types.ReplyKeyboardMarkup(
        keyboard=[[types.KeyboardButton(text=name)] for name in LANGUAGES.values()],
        resize_keyboard=True
    )
    await message.answer('Пожалуйста, выберите язык:', reply_markup=kb)
    # Сохраняем в user_states, что это смена языка, а не привязка
    user_states[telegram_id] = {'step': 'change_language', 'is_bound': is_bound}

@dp.message(F.text == 'Отвязать TelegramID')
async def menu_unbind_telegram(message: types.Message, state: FSMContext):
    lang = get_user_language(message.from_user.id)
    success, msg = unbind_telegram_id(message.from_user.id)
    if success:
        if lang == 'en':
            await message.answer('Your TelegramID has been unlinked. Now you can link a new account by entering your pin code.', reply_markup=types.ReplyKeyboardRemove())
        else:
            await message.answer('Ваш TelegramID отвязан. Теперь вы можете привязать новый аккаунт, введя пинкод.', reply_markup=types.ReplyKeyboardRemove())
    else:
        if lang == 'en':
            await message.answer(f'Error: {msg}', reply_markup=types.ReplyKeyboardRemove())
        else:
            await message.answer(f'Ошибка: {msg}', reply_markup=types.ReplyKeyboardRemove())

# --- Регистрация хендлеров ---
dp.message.register(start_handler, Command("start"))
dp.message.register(change_language_handler, F.text.in_([LANGUAGE_BUTTONS['en'], LANGUAGE_BUTTONS['ru']]))
dp.message.register(language_handler, F.text.in_(list(LANGUAGES.values())))
dp.message.register(pin_handler, lambda m: user_states.get(m.from_user.id, {}).get('step') == 'enter_pin')

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
            survey_date = now.strftime('%d.%m.%Y')
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
                    link = f"https://api.uteam.club/survey?tenantId={club_id}"
                    if lang == 'en':
                        text = (
                            f"Good morning! Please complete the morning survey for {survey_date}.\n\n"
                            f"Your pin code for login:\n<code>{pin_code}</code>"
                        )
                        button_text = f"📝 Take the survey for {survey_date}"
                    else:
                        text = (
                            f"Доброе утро! Пожалуйста, пройди утренний опросник за {survey_date}.\n\n"
                            f"Твой пинкод для входа:\n<code>{pin_code}</code>"
                        )
                        button_text = f"📝 Пройти опрос за {survey_date}"
                    keyboard = None
                    if link:
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
    
    link = f"https://api.uteam.club/survey?tenantId={club_id}"
    
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
    
    keyboard = None
    if link:
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
        return web.json_response({'success': True})
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def send_survey_success_message(telegram_id, lang='ru', survey_date=None):
    """Отправляет сообщение об успешном прохождении опроса"""
    if not survey_date:
        survey_date = datetime.now().strftime('%d.%m.%Y')
    if lang == 'en':
        text = f"✅ Thank you! Your morning survey for {survey_date} has been successfully submitted."
    else:
        text = f"✅ Спасибо! Ваш утренний опросник за {survey_date} успешно заполнен."
    try:
        await bot.send_message(telegram_id, text)
    except Exception as e:
        print(f"[SurveySuccess] Ошибка отправки сообщения: {e}")

async def handle_send_survey_success(request):
    """HTTP endpoint для отправки сообщения об успешном прохождении опроса"""
    data = await request.json()
    telegram_id = data.get('telegramId')
    lang = data.get('language', 'ru')
    survey_date = data.get('surveyDate')
    if not telegram_id:
        return web.json_response({'error': 'telegramId обязателен'}, status=400)
    await send_survey_success_message(telegram_id, lang, survey_date)
    return web.json_response({'success': True})

# --- Новый асинхронный запуск ---
async def main():
    setup_scheduler()
    # Запуск HTTP сервера
    app = web.Application()
    app.router.add_post('/send-morning-survey', handle_send_morning_survey)
    app.router.add_post('/send-survey-success', handle_send_survey_success)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    print('HTTP server started on port 8080')
    # Запуск aiogram
    # Корректная обработка SIGINT/SIGTERM
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop_event.set)
    await dp.start_polling(bot, shutdown_event=stop_event)

if __name__ == '__main__':
    print("[BOT] Запуск Telegram-бота с прямым доступом к базе данных...")
    asyncio.run(main()) 