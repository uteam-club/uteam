import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
// Используется Telegram-бот @UTEAM_infoBot
import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { db } from '@/lib/db';
import { player, team } from '@/db/schema';
import { eq, and, isNotNull, desc } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { survey } from '@/db/schema/survey';

// Токен должен быть от @UTEAM_infoBot
const botToken = process.env.TELEGRAM_BOT_TOKEN || '7555689553:AAFSDvBcAC_PU7o5vq3vVoGy5DS8R9q5aPU';
const bot = new Telegraf(botToken);

const SURVEY_URL = 'https://fdcvista.uteam.club/survey';


export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'morning';
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'telegram.testBroadcast')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.clubId) {
    return NextResponse.json({ error: 'No clubId in session' }, { status: 400 });
  }

  const clubId = session.user.clubId;

  try {
    // Проверяем, что опросник активен
    const [foundSurvey]: any = await db.select({ id: survey.id, isActive: survey.isActive })
      .from(survey)
      .where(and(eq(survey.tenantId, clubId), eq(survey.type, type)))
      .orderBy(desc(survey.createdAt))
      .limit(1);
    if (!foundSurvey || !foundSurvey.isActive) {
      return NextResponse.json({ error: 'Опросник неактивен или не подключён для клуба.' }, { status: 400 });
    }

    // Выбираем игроков с telegramId и нужным clubId через JOIN
    const players = await db.select({
      telegramId: player.telegramId,
      firstName: player.firstName,
      lastName: player.lastName,
      teamId: player.teamId,
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

    for (const playerRow of players) {
      const link = `${SURVEY_URL}?tenantId=${playerRow.clubId}&type=${type}`;
      let text = '';
      if (type === 'rpe') {
        text = `Пожалуйста, оцени, насколько тяжёлой была твоя тренировка (RPE): ${link}\n\nВход по твоему 6-значному пинкоду.`;
      } else {
        text = `Доброе утро! Пожалуйста, пройди утренний опросник: ${link}\n\nВход по твоему 6-значному пинкоду.`;
      }
      
      try {
        await bot.telegram.sendMessage(playerRow.telegramId!, text);
        sent++;
        console.log(`Sent message to ${playerRow.firstName} ${playerRow.lastName} (${playerRow.telegramId})`);
      } catch (e) {
        console.error(`Failed to send message to ${playerRow.telegramId}:`, e);
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