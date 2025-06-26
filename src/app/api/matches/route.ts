import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { match, team } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Добавляю тип Token
type Token = { clubId: string; [key: string]: any };

// Схема валидации для создания матча
const matchSchema = z.object({
  competitionType: z.enum(['FRIENDLY', 'LEAGUE', 'CUP']),
  date: z.string(),
  time: z.string(),
  isHome: z.boolean(),
  teamId: z.string().uuid(),
  opponentName: z.string().min(1, 'Введите название команды соперника'),
  status: z.enum(['SCHEDULED', 'FINISHED']).default('SCHEDULED'),
  teamGoals: z.number().int().min(0).nullable().default(null),
  opponentGoals: z.number().int().min(0).nullable().default(null),
});

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH'];

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// GET метод для получения матчей
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const whereArr = [eq(match.clubId, token.clubId)];
    if (teamId) whereArr.push(eq(match.teamId, teamId));
    if (fromDate) whereArr.push(gte(match.date, new Date(fromDate)));
    if (toDate) { const endDate = new Date(toDate); endDate.setHours(23,59,59,999); whereArr.push(lte(match.date, endDate)); }
    const rows = await db.select({
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
      teamName: team.name,
      status: match.status
    })
      .from(match)
      .leftJoin(team, eq(match.teamId, team.id))
      .where(and(...whereArr))
      .orderBy(desc(match.date));
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Ошибка при получении матчей:', error);
    return NextResponse.json({ error: 'Ошибка при получении матчей' }, { status: 500 });
  }
}

// POST метод для создания нового матча
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const validationResult = matchSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    const { competitionType, date, time, isHome, teamId, opponentName, status, teamGoals, opponentGoals } = validationResult.data;
    const [teamRow] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.clubId, token.clubId)));
    if (!teamRow) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
    }
    const now = new Date();
    const [created] = await db.insert(match).values({
      id: crypto.randomUUID(),
      competitionType,
      date: new Date(date),
      time,
      isHome,
      teamId,
      opponentName,
      status,
      teamGoals: status === 'FINISHED' ? teamGoals : null,
      opponentGoals: status === 'FINISHED' ? opponentGoals : null,
      clubId: token.clubId,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const err = error as any;
    console.error('Ошибка при создании матча:', err);
    return NextResponse.json({ error: 'Ошибка при создании матча', details: err?.message, stack: err?.stack }, { status: 500 });
  }
} 