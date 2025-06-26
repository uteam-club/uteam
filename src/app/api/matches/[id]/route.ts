import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { match, team, playerMatchStat, player } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH'];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }
    const hasAccess = await checkClubAccess(request, session.user);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
    }
    const matchId = params.id;
    // Получаем детали матча с join
    const [row] = await db.select({
      id: match.id,
      competitionType: match.competitionType,
      date: match.date,
      time: match.time,
      isHome: match.isHome,
      teamId: match.teamId,
      opponentName: match.opponentName,
      teamGoals: match.teamGoals,
      opponentGoals: match.opponentGoals,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
      clubId: match.clubId,
      formation: match.formation,
      gameFormat: match.gameFormat,
      markerColor: match.markerColor,
      notes: match.notes,
      playerPositions: match.playerPositions,
      positionAssignments: match.positionAssignments,
      team_id: team.id,
      team_name: team.name,
      status: match.status
    })
      .from(match)
      .leftJoin(team, eq(match.teamId, team.id))
      .where(and(eq(match.id, matchId), eq(match.clubId, session.user.clubId)));
    if (!row) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 });
    }
    // Получаем playerStats с join на player
    const stats = await db.select({
      id: playerMatchStat.id,
      matchId: playerMatchStat.matchId,
      playerId: playerMatchStat.playerId,
      isStarter: playerMatchStat.isStarter,
      minutesPlayed: playerMatchStat.minutesPlayed,
      goals: playerMatchStat.goals,
      assists: playerMatchStat.assists,
      yellowCards: playerMatchStat.yellowCards,
      redCards: playerMatchStat.redCards,
      createdAt: playerMatchStat.createdAt,
      updatedAt: playerMatchStat.updatedAt,
      player: player
    })
      .from(playerMatchStat)
      .leftJoin(player, eq(playerMatchStat.playerId, player.id))
      .where(eq(playerMatchStat.matchId, matchId))
      .orderBy(desc(playerMatchStat.isStarter));
    // Возвращаем team как объект
    return NextResponse.json({
      ...row,
      team: row.team_id && row.team_name ? { id: row.team_id, name: row.team_name } : null,
      playerStats: stats
    });
  } catch (error) {
    console.error('Ошибка при получении деталей матча:', error);
    return NextResponse.json({ error: 'Ошибка при получении деталей матча' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }
    const matchId = params.id;
    const body = await request.json();
    // Проверяем, существует ли матч и принадлежит ли он клубу пользователя
    const [existing] = await db.select().from(match).where(and(eq(match.id, matchId), eq(match.clubId, session.user.clubId)));
    if (!existing) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 });
    }
    // Подготавливаем данные для обновления
    const updateData: any = {};
    if ('date' in body) updateData.date = new Date(body.date);
    if ('time' in body) updateData.time = body.time;
    if ('competitionType' in body) updateData.competitionType = body.competitionType;
    if ('isHome' in body) updateData.isHome = body.isHome;
    if ('teamGoals' in body) updateData.teamGoals = body.teamGoals;
    if ('opponentGoals' in body) updateData.opponentGoals = body.opponentGoals;
    if ('opponentName' in body) updateData.opponentName = body.opponentName;
    if ('gameFormat' in body) updateData.gameFormat = body.gameFormat;
    if ('formation' in body) updateData.formation = body.formation;
    if ('markerColor' in body) updateData.markerColor = body.markerColor;
    if ('notes' in body) updateData.notes = body.notes;
    if ('playerPositions' in body) updateData.playerPositions = JSON.stringify(body.playerPositions);
    if ('positionAssignments' in body) updateData.positionAssignments = JSON.stringify(body.positionAssignments);
    if ('status' in body) updateData.status = body.status;
    const [updated] = await db.update(match)
      .set(updateData)
      .where(eq(match.id, matchId))
      .returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Ошибка при обновлении матча:', error);
    return NextResponse.json({
      error: 'Ошибка при обновлении матча',
      details: (error as Error).message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }
    const matchId = params.id;
    // Проверяем, существует ли матч и принадлежит ли он клубу пользователя
    const [existing] = await db.select().from(match).where(and(eq(match.id, matchId), eq(match.clubId, session.user.clubId)));
    if (!existing) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 });
    }
    // Каскадное удаление: сначала удаляем playerMatchStat
    await db.delete(playerMatchStat).where(eq(playerMatchStat.matchId, matchId));
    // TODO: добавить удаление других связанных сущностей, если появятся
    // Удаляем сам матч
    await db.delete(match).where(eq(match.id, matchId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении матча:', error);
    return NextResponse.json({ error: 'Ошибка при удалении матча', details: (error as Error).message }, { status: 500 });
  }
} 