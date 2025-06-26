// Используется Telegram-бот @UTEAM_infoBot
import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { db } from '@/lib/db';
import { player, team } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';

// Токен должен быть от @UTEAM_infoBot
const botToken = process.env.TELEGRAM_BOT_TOKEN || '7555689553:AAFSDvBcAC_PU7o5vq3vVoGy5DS8R9q5aPU';
const bot = new Telegraf(botToken);

const SURVEY_URL = 'https://fdcvista.uteam.club/survey';
const TENANT_ID = process.env.TENANT_ID || '';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH'];

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    // Выбираем игроков с telegramId и нужным clubId
    const players = await db.select({
      telegramId: player.telegramId,
      firstName: player.firstName,
      lastName: player.lastName,
      teamId: player.teamId
    })
      .from(player)
      .where(and(isNotNull(player.telegramId), TENANT_ID ? eq(player.teamId, TENANT_ID) : undefined));
    if (!players.length) {
      return NextResponse.json({ message: 'Нет игроков с Telegram ID для рассылки.' });
    }
    let sent = 0;
    for (const playerRow of players) {
      // Получаем clubId через join с team
      let clubId = TENANT_ID;
      if (!clubId && playerRow.teamId) {
        const [teamRow] = await db.select({ clubId: team.clubId }).from(team).where(eq(team.id, playerRow.teamId));
        clubId = teamRow?.clubId || '';
      }
      const link = `${SURVEY_URL}?tenantId=${clubId}`;
      const text = `Доброе утро! Пожалуйста, пройди утренний опросник: ${link}\n\nВход по твоему 6-значному пинкоду.`;
      try {
        await bot.telegram.sendMessage(playerRow.telegramId!, text);
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