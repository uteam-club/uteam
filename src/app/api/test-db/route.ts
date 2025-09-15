import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { player, team, club } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getToken } from 'next-auth/jwt';

// Указываем, что этот маршрут должен быть динамическим
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' });
    }
    const debugInfo = {
      token,
      clubId: token.clubId,
      host: req.headers.get('host'),
      userAgent: req.headers.get('user-agent')
    };
    if (!token.clubId) {
      return NextResponse.json({ 
        error: 'No clubId in token',
        debug: debugInfo
      });
    }
    const clubId = token.clubId;

    // Получаем информацию о клубе
    const [clubInfo] = await db.select().from(club).where(eq(club.id, clubId));

    // Получаем все команды клуба
    const teams = await db.select().from(team).where(eq(team.clubId, clubId));

    // Получаем всех игроков с telegramId для этого клуба
    const playersWithTelegram = await db.select({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      telegramId: player.telegramId,
      teamId: player.teamId,
      teamName: team.name,
      clubId: team.clubId
    })
      .from(player)
      .leftJoin(team, eq(player.teamId, team.id))
      .where(and(
        isNotNull(player.telegramId),
        eq(team.clubId, clubId)
      ));

    // Получаем общее количество игроков в клубе
    const allPlayers = await db.select({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      telegramId: player.telegramId,
      teamId: player.teamId,
      teamName: team.name,
      clubId: team.clubId
    })
      .from(player)
      .leftJoin(team, eq(player.teamId, team.id))
      .where(eq(team.clubId, clubId));

    // Проверяем токен телеграм бота
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '7555689553:AAFSDvBcAC_PU7o5vq3vVoGy5DS8R9q5aPU';

    return NextResponse.json({
      debug: debugInfo,
      club: clubInfo,
      teams: teams.length,
      playersWithTelegramCount: playersWithTelegram.length,
      totalPlayers: allPlayers.length,
      playersWithTelegram: playersWithTelegram,
      allPlayers: allPlayers,
      telegramToken: telegramToken ? 'Set' : 'Not set',
      telegramTokenLength: telegramToken?.length || 0
    });

  } catch (e) {
    console.error('Test DB error:', e);
    return NextResponse.json({ 
      error: 'Database error',
      details: String(e)
    }, { status: 500 });
  }
} 