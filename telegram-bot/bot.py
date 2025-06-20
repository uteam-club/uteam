import os
from aiogram import Bot, Dispatcher, types, executor
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
import aiohttp
from dotenv import load_dotenv
import ssl
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
import pytz

load_dotenv()

API_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
BIND_API_URL = os.getenv('BIND_API_URL')
API_BASE_URL = os.getenv('API_BASE_URL', 'https://api.uteam.club')

bot = Bot(token=API_TOKEN)
dp = Dispatcher(bot)

LANGUAGES = {'en': 'English', 'ru': 'Русский'}

# Состояния пользователя
user_states = {}

@dp.message_handler(commands=['start'])
async def start_handler(message: types.Message):
    # Клавиатура выбора языка
    kb = ReplyKeyboardMarkup(resize_keyboard=True)
    for code, name in LANGUAGES.items():
        kb.add(KeyboardButton(name))
    await message.answer(
        "Welcome! Please select your language / Пожалуйста, выберите язык:",
        reply_markup=kb
    )
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

async def send_survey_broadcast():
    """
    Проверяет расписание рассылок и отправляет сообщения игрокам, если наступило время.
    Время сравнивается по таймзоне каждой команды.
    """
    try:
        # Получаем все включенные расписания
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_BASE_URL}/api/survey/schedules") as resp:
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
            if sched.get('sendTime') == now_str:
                # Получаем игроков команды
                team_id = sched.get('teamId')
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{API_BASE_URL}/api/team/{team_id}/players") as resp:
                        if resp.status != 200:
                            continue
                        players = await resp.json()
                # Отправляем сообщения
                for player in players:
                    telegram_id = player.get('telegramId')
                    club_id = player.get('clubId')
                    if not telegram_id or not club_id:
                        continue
                    link = f"https://fdcvista.uteam.club/survey?tenantId={club_id}"
                    text = f"Доброе утро! Пожалуйста, пройди утренний опросник: {link}\n\nВход по твоему 6-значному пинкоду."
                    try:
                        await bot.send_message(telegram_id, text)
                    except Exception as e:
                        print(f"[Scheduler] Ошибка отправки {telegram_id}: {e}")
        print(f"[Scheduler] Проверка рассылок завершена")
    except Exception as e:
        print(f"[Scheduler] Ошибка планировщика: {e}")

def setup_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_survey_broadcast, 'interval', minutes=1)
    scheduler.start()

if __name__ == '__main__':
    setup_scheduler()
    executor.start_polling(dp, skip_updates=True) 