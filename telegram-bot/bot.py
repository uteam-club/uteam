import os
from aiogram import Bot, Dispatcher, types, executor
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
import aiohttp
from dotenv import load_dotenv
import ssl

load_dotenv()

API_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
BIND_API_URL = os.getenv('BIND_API_URL')

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

if __name__ == '__main__':
    executor.start_polling(dp, skip_updates=True) 