import os
from aiogram import Bot, Dispatcher, types, executor
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
import aiohttp
from dotenv import load_dotenv
import ssl
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
import pytz
import time

load_dotenv()

API_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
BIND_API_URL = os.getenv('BIND_API_URL')
API_BASE_URL = os.getenv('API_BASE_URL', 'https://api.uteam.club')
BOT_API_TOKEN = os.getenv('BOT_API_TOKEN')
BOT_EMAIL = os.getenv('BOT_EMAIL', 'bot@uteam.club')
BOT_PASSWORD = os.getenv('BOT_PASSWORD', 'StrongBotPassword123!')
SERVICE_LOGIN_URL = f"{API_BASE_URL}/api/auth/service-login"
JWT_TOKEN = None
JWT_TOKEN_EXPIRES_AT = 0

bot = Bot(token=API_TOKEN)
dp = Dispatcher(bot)

LANGUAGES = {'en': 'English', 'ru': 'Русский'}
LANGUAGE_BUTTONS = {
    'en': 'Change language',
    'ru': 'Сменить язык'
}

# Состояния пользователя
user_states = {}

@dp.message_handler(commands=['start'])
async def start_handler(message: types.Message):
    # Клавиатура выбора языка + кнопка смены языка
    kb = ReplyKeyboardMarkup(resize_keyboard=True)
    for code, name in LANGUAGES.items():
        kb.add(KeyboardButton(name))
    await message.answer(
        "Welcome! Please select your language / Пожалуйста, выберите язык:",
        reply_markup=kb
    )
    user_states[message.from_user.id] = {'step': 'choose_language'}

# Кнопка смены языка
@dp.message_handler(lambda m: m.text in [LANGUAGE_BUTTONS['en'], LANGUAGE_BUTTONS['ru']])
async def change_language_handler(message: types.Message):
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
    lang_code = 'en' if message.text == 'English' else 'ru'
    user_states[message.from_user.id] = {'step': 'enter_pin', 'language': lang_code}
    if lang_code == 'en':
        await message.answer("Please enter your 6-digit pin code:", reply_markup=types.ReplyKeyboardRemove())
    else:
        await message.answer("Пожалуйста, введите ваш 6-значный пин-код:", reply_markup=types.ReplyKeyboardRemove())

@dp.message_handler(lambda m: user_states.get(m.from_user.id, {}).get('step') == 'enter_pin')
async def pin_handler(message: types.Message):
    pin = message.text.strip()
    lang = user_states[message.from_user.id].get('language', 'en')
    if not pin.isdigit() or len(pin) != 6:
        if lang == 'en':
            await message.answer("Invalid pin code. Please enter a 6-digit number.")
        else:
            await message.answer("Некорректный пин-код. Введите 6-значное число.")
        return
    # Отправляем запрос на API
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(BIND_API_URL, json={
                'pinCode': pin,
                'telegramId': str(message.from_user.id),
                'language': lang
            }, ssl=ssl_context) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get('success'):
                    if lang == 'en':
                        await message.answer("Success! You are now linked and will receive notifications.")
                    else:
                        await message.answer("Успешно! Вы привязаны и будете получать уведомления.")
                else:
                    if lang == 'en':
                        await message.answer("Pin code not found or already linked. Contact your coach.")
                    else:
                        await message.answer("Пин-код не найден или уже привязан. Обратитесь к тренеру.")
        except Exception as e:
            print("ERROR:", e)
            if lang == 'en':
                await message.answer("Server error. Please try again later.")
            else:
                await message.answer("Ошибка сервера. Попробуйте позже.")
    user_states.pop(message.from_user.id, None)

async def fetch_jwt_token():
    global JWT_TOKEN, JWT_TOKEN_EXPIRES_AT
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                SERVICE_LOGIN_URL,
                json={"email": BOT_EMAIL, "password": BOT_PASSWORD}
            ) as resp:
                data = await resp.json()
                if resp.status == 200 and data.get('token'):
                    JWT_TOKEN = data['token']
                    # Токен живёт 1 день, обновим за 12 часов до истечения
                    JWT_TOKEN_EXPIRES_AT = time.time() + 60 * 60 * 12
                    print('[BOT] JWT-токен успешно получен')
                else:
                    print('[BOT] Не удалось получить JWT-токен:', data)
        except Exception as e:
            print('[BOT] Ошибка при получении JWT-токена:', e)

async def ensure_jwt_token():
    global JWT_TOKEN, JWT_TOKEN_EXPIRES_AT
    if not JWT_TOKEN or time.time() > JWT_TOKEN_EXPIRES_AT:
        await fetch_jwt_token()

async def send_survey_broadcast():
    """
    Проверяет расписание рассылок и отправляет сообщения игрокам, если наступило время.
    Время сравнивается по таймзоне каждой команды.
    """
    try:
        await ensure_jwt_token()
        headers = {}
        if JWT_TOKEN:
            headers['Authorization'] = f'Bearer {JWT_TOKEN}'
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_BASE_URL}/api/survey/schedules", headers=headers) as resp:
                if resp.status != 200:
                    print("[Scheduler] Не удалось получить расписания рассылок")
                    return
                schedules = await resp.json()
        for sched in schedules:
            if not sched.get('enabled'):
                continue
            tz = sched.get('timezone') or 'Europe/Moscow'
            try:
                now = datetime.now(pytz.timezone(tz))
            except Exception:
                now = datetime.utcnow() + timedelta(hours=3)  # fallback
            now_str = now.strftime('%H:%M')
            print(f"[DEBUG] Проверка: sendTime={sched.get('sendTime')}, now_str={now_str}, timezone={tz}")
            if sched.get('sendTime') == now_str:
                # Получаем игроков команды (исправленный путь!)
                team_id = sched.get('teamId')
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{API_BASE_URL}/api/teams/{team_id}/players") as resp:
                        if resp.status != 200:
                            print(f"[DEBUG] Не удалось получить игроков для team_id={team_id}")
                            continue
                        players = await resp.json(content_type=None)
                print(f"[DEBUG] Получено игроков для рассылки: {len(players)}")
                print(f"[DEBUG] Получено игроков: {players}")
                for player in players:
                    print(f"[DEBUG] Игрок: id={player.get('id')}, telegramId={player.get('telegramId')}")
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
    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_survey_broadcast, 'interval', minutes=1)
    scheduler.start()

# --- HTTP endpoint для ручной отправки опроса ---
from aiohttp import web
import asyncio

async def handle_send_morning_survey(request):
    data = await request.json()
    telegram_id = data.get('telegramId')
    club_id = data.get('clubId')
    team_id = data.get('teamId')
    date = data.get('date')
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
    data = await request.json()
    telegram_id = data.get('telegramId')
    lang = data.get('language', 'ru')
    if not telegram_id:
        return web.json_response({'error': 'telegramId обязателен'}, status=400)
    await send_survey_success_message(telegram_id, lang)
    return web.json_response({'success': True})

app = web.Application()
app.router.add_post('/send-morning-survey', handle_send_morning_survey)
app.router.add_post('/send-survey-success', handle_send_survey_success)

def run_web_app():
    loop = asyncio.get_event_loop()
    runner = web.AppRunner(app)
    loop.run_until_complete(runner.setup())
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    loop.run_until_complete(site.start())
    print('HTTP server started on port 8080')

async def send_survey_success_message(telegram_id, lang='ru'):
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

if __name__ == '__main__':
    setup_scheduler()
    run_web_app()
    executor.start_polling(dp, skip_updates=True)
