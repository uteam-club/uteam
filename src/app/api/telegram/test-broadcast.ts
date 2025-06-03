// Используется Telegram-бот @UTEAM_infoBot
import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { db } from '@/lib/db';
import { player, team } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

// Токен должен быть от @UTEAM_infoBot
const botToken = process.env.TELEGRAM_BOT_TOKEN || '7555689553:AAFSDvBcAC_PU7o5vq3vVoGy5DS8R9q5aPU';
const bot = new Telegraf(botToken);

const SURVEY_URL = 'https://fdcvista.uteam.club/survey';
const TENANT_ID = process.env.TENANT_ID || '';

export async function POST(req: NextRequest) {
  try {
    // Выборка игроков с telegramId и clubId через join
    const players = await db.select({
      telegramId: player.telegramId,
      firstName: player.firstName,
      lastName: player.lastName,
      clubId: team.clubId
    })
      .from(player)
      .leftJoin(team, eq(player.teamId, team.id))
      .where(and(isNotNull(player.telegramId), TENANT_ID ? eq(team.clubId, TENANT_ID) : undefined));
    if (!players.length) {
      return NextResponse.json({ message: 'Нет игроков с Telegram ID для рассылки.' });
    }
    let sent = 0;
    for (const player of players) {
      const link = `${SURVEY_URL}?tenantId=${player.clubId}`;
      const text = `Доброе утро! Пожалуйста, пройди утренний опросник: ${link}\n\nВход по твоему 6-значному пинкоду.`;
      try {
        await bot.telegram.sendMessage(player.telegramId!, text);
        sent++;
      } catch (e) {
        // ignore errors for now
      }
    }
    return NextResponse.json({ message: `Рассылка выполнена. Отправлено: ${sent}` });
  } catch (e) {
    return NextResponse.json({ message: 'Ошибка рассылки' }, { status: 500 });
  }
} 