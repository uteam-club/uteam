import { Telegraf } from 'telegraf';
import { PrismaClient } from '../src/generated/prisma';
import dotenv from 'dotenv';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN || '7555689553:AAFSDvBcAC_PU7o5vq3vVoGy5DS8R9q5aPU';
const bot = new Telegraf(botToken);
const prisma = new PrismaClient();

// Настройки рассылки
const SURVEY_URL = 'https://fdcvista.uteam.club/survey'; // Базовая ссылка на опросник
const TENANT_ID = process.env.TENANT_ID || ''; // Можно указать tenantId вручную или из env

async function main() {
  // Получаем всех игроков с telegramId и tenantId (если нужно)
  const players = await prisma.player.findMany({
    where: {
      telegramId: { not: null },
      team: TENANT_ID ? { clubId: TENANT_ID } : undefined,
    },
    select: { telegramId: true, firstName: true, lastName: true, team: { select: { clubId: true } } },
  });

  if (!players.length) {
    console.log('Нет игроков с Telegram ID для рассылки.');
    return;
  }

  for (const player of players) {
    const link = `${SURVEY_URL}?tenantId=${player.team.clubId}`;
    const text = `Доброе утро! Пожалуйста, пройди утренний опросник: ${link}\n\nВход по твоему 6-значному пинкоду.`;
    try {
      await bot.telegram.sendMessage(player.telegramId!, text);
      console.log(`Отправлено: ${player.firstName} ${player.lastName} (${player.telegramId})`);
    } catch (e) {
      console.error(`Ошибка отправки ${player.telegramId}:`, e);
    }
  }

  process.exit(0);
}

main(); 