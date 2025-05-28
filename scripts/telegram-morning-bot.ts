import { Telegraf, Context } from 'telegraf';
import { PrismaClient, Player } from '../src/generated/prisma';
import dotenv from 'dotenv';

dotenv.config();

// Telegram-бот @UTEAM_infoBot для сбора Telegram ID игроков
const botToken = process.env.TELEGRAM_BOT_TOKEN || '7555689553:AAFSDvBcAC_PU7o5vq3vVoGy5DS8R9q5aPU';
const bot = new Telegraf(botToken);
const prisma = new PrismaClient();

// Состояния пользователей (userId -> state)
const userStates: Record<number, { step: 'idle' | 'awaiting_pin'; tenantId?: string }> = {};

bot.start(async (ctx: Context) => {
  userStates[ctx.from!.id] = { step: 'awaiting_pin' };
  await ctx.reply('Привет! Ты используешь бота @UTEAM_infoBot. Для привязки аккаунта введи свой 6-значный пинкод (тот же, что для опросника).');
});

bot.on('text', async (ctx: Context) => {
  const state = userStates[ctx.from!.id];
  // Проверяем, что это текстовое сообщение
  const text = 'text' in ctx.message! ? ctx.message.text.trim() : '';

  if (!state || state.step !== 'awaiting_pin') {
    await ctx.reply('Для начала работы отправь команду /start.');
    return;
  }

  // Проверяем формат пинкода
  if (!/^\d{6}$/.test(text)) {
    await ctx.reply('Пинкод должен состоять из 6 цифр. Попробуй ещё раз.');
    return;
  }

  // Ищем игрока по пинкоду (и tenantId, если нужно)
  const player = await prisma.player.findFirst({
    where: { pinCode: text },
  });

  if (!player) {
    await ctx.reply('Игрок с таким пинкодом не найден. Проверь правильность и попробуй снова.');
    return;
  }

  // Проверяем, не привязан ли уже другой Telegram
  if (player.telegramId && player.telegramId !== String(ctx.from!.id)) {
    await ctx.reply('У этого игрока уже привязан другой Telegram-аккаунт. Обратись к тренеру.');
    return;
  }

  // Привязываем Telegram ID
  await prisma.player.update({
    where: { id: player.id },
    data: { telegramId: String(ctx.from!.id) },
  });

  userStates[ctx.from!.id] = { step: 'idle' };
  await ctx.reply('Готово! Теперь ты будешь получать рассылки и опросы через этого бота.');
});

bot.launch().then(() => {
  console.log('Telegram-бот для сбора Telegram ID запущен!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 