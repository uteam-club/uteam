import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
// Используется Telegram-бот @UTEAM_infoBot
import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { db } from '@/lib/db';
import { player, team } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Токен должен быть от @UTEAM_infoBot
const botToken = process.env.TELEGRAM_BOT_TOKEN || '7555689553:AAFSDvBcAC_PU7o5vq3vVoGy5DS8R9q5aPU';
const bot = new Telegraf(botToken);

const SURVEY_URL = 'https://fdcvista.uteam.club/survey';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clubId) {
    return NextResponse.json({ error: 'No clubId in session' }, { status: 400 });
  }

  const clubId = session.user.clubId;

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
      .where(and(
        isNotNull(player.telegramId), 
        eq(team.clubId, clubId)
      ));

    console.log(`Found ${players.length} players with telegramId for club ${clubId}`);

    if (!players.length) {
      return NextResponse.json({ message: 'Нет игроков с Telegram ID для рассылки.' });
    }

    let sent = 0;
    let errors = 0;

    for (const player of players) {
      const link = `${SURVEY_URL}?tenantId=${player.clubId}`;
      const text = `Доброе утро! Пожалуйста, пройди утренний опросник: ${link}\n\nВход по твоему 6-значному пинкоду.`;
      
      try {
        await bot.telegram.sendMessage(player.telegramId!, text);
        sent++;
        console.log(`Sent message to ${player.firstName} ${player.lastName} (${player.telegramId})`);
      } catch (e) {
        console.error(`Failed to send message to ${player.telegramId}:`, e);
        errors++;
      }
    }

    return NextResponse.json({ 
      message: `Рассылка выполнена. Отправлено: ${sent}${errors > 0 ? `, ошибок: ${errors}` : ''}` 
    });
  } catch (e) {
    console.error('Broadcast error:', e);
    return NextResponse.json({ message: 'Ошибка рассылки' }, { status: 500 });
  }
} 