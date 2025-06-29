import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { match, playerMatchStat, player } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Схема валидации для добавления игрока в состав на матч
const playerStatSchema = z.object({
  playerId: z.string().uuid(),
  isStarter: z.boolean().default(false),
  minutesPlayed: z.number().int().min(0).default(0),
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  yellowCards: z.number().int().min(0).default(0),
  redCards: z.number().int().min(0).default(0),
});

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, session: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return session.user.clubId === club.id;
}

// GET для получения всех игроков, участвующих в матче
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const hasAccess = await checkClubAccess(request, session);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  try {
    const matchId = params.id;

    // Получаем статистику игроков для этого матча
    const playerStats = await db.select({
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
      playerFirstName: player.firstName,
      playerLastName: player.lastName,
      playerIdRef: player.id
    })
      .from(playerMatchStat)
      .leftJoin(player, eq(playerMatchStat.playerId, player.id))
      .where(eq(playerMatchStat.matchId, matchId))
      .orderBy(desc(playerMatchStat.isStarter));

    return NextResponse.json(playerStats);
  } catch (error) {
    console.error('Ошибка при получении состава на матч:', error);
    return NextResponse.json({ error: 'Ошибка при получении состава на матч' }, { status: 500 });
  }
}

// POST для добавления игрока в состав на матч
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Валидация данных
    const validationResult = playerStatSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { playerId, isStarter, minutesPlayed, goals, assists, yellowCards, redCards } = validationResult.data;

    // Проверяем, существует ли матч и принадлежит ли он клубу пользователя
    const [matchRow] = await db.select().from(match).where(and(eq(match.id, matchId), eq(match.clubId, session.user.clubId)));

    if (!matchRow) {
      console.error('Матч не найден', { matchId, clubId: session.user.clubId });
      return NextResponse.json({ error: 'Матч не найден', matchId, clubId: session.user.clubId }, { status: 404 });
    }

    // Логируем попытку добавления игрока
    console.log('POST /api/matches/[id]/players', { matchId, playerId, matchTeamId: matchRow.teamId });

    // Проверяем, существует ли игрок и принадлежит ли он команде этого матча
    const [playerRow] = await db.select().from(player).where(and(eq(player.id, playerId), eq(player.teamId, matchRow.teamId)));

    if (!playerRow) {
      console.error('Игрок не найден или не принадлежит команде', { playerId, matchTeamId: matchRow.teamId });
      return NextResponse.json({ error: 'Игрок не найден или не принадлежит команде', playerId, matchTeamId: matchRow.teamId }, { status: 404 });
    }

    // Проверяем, есть ли уже статистика для этого игрока в этом матче
    const [existingPlayerStat] = await db.select().from(playerMatchStat).where(and(eq(playerMatchStat.matchId, matchId), eq(playerMatchStat.playerId, playerId)));

    let playerStat;

    if (existingPlayerStat) {
      // Обновляем существующую статистику
      [playerStat] = await db.update(playerMatchStat)
        .set({ isStarter, minutesPlayed, goals, assists, yellowCards, redCards })
        .where(eq(playerMatchStat.id, existingPlayerStat.id))
        .returning();
    } else {
      // Создаем новую запись статистики
      const now = new Date();
      [playerStat] = await db.insert(playerMatchStat).values({
        id: uuidv4(),
        matchId,
        playerId,
        isStarter,
        minutesPlayed,
        goals,
        assists,
        yellowCards,
        redCards,
        createdAt: now,
        updatedAt: now,
      }).returning();
    }

    // Возвращаем с join на player
    const [result] = await db.select({
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
      playerFirstName: player.firstName,
      playerLastName: player.lastName,
      playerIdRef: player.id
    })
      .from(playerMatchStat)
      .leftJoin(player, eq(playerMatchStat.playerId, player.id))
      .where(eq(playerMatchStat.id, playerStat.id));

    return NextResponse.json(result, { status: existingPlayerStat ? 200 : 201 });
  } catch (error) {
    console.error('Ошибка при добавлении игрока в состав:', error);
    const err = error as Error;
    return NextResponse.json({ error: 'Ошибка при добавлении игрока в состав', details: err.message, stack: err.stack }, { status: 500 });
  }
}

// DELETE для удаления игрока из состава
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
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ error: 'Требуется ID игрока' }, { status: 400 });
    }

    // Проверяем, существует ли матч и принадлежит ли он клубу пользователя
    const [matchRow] = await db.select().from(match).where(and(eq(match.id, matchId), eq(match.clubId, session.user.clubId)));

    if (!matchRow) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 });
    }

    // Удаляем статистику игрока для этого матча
    await db.delete(playerMatchStat).where(and(eq(playerMatchStat.matchId, matchId), eq(playerMatchStat.playerId, playerId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении игрока из состава:', error);
    return NextResponse.json({ error: 'Ошибка при удалении игрока из состава' }, { status: 500 });
  }
} 