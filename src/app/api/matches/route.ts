import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { match, team } from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
dayjs.extend(utc);
dayjs.extend(timezone);

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
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'matches.read')) {
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
    const forUpload = searchParams.get('forUpload') === 'true'; // Новый параметр для модалки загрузки
    
    const whereArr = [eq(match.clubId, token.clubId)];
    if (teamId) whereArr.push(eq(match.teamId, teamId));
    if (fromDate) whereArr.push(gte(match.date, fromDate));
    if (toDate) whereArr.push(lte(match.date, toDate));
    console.log('🔍 Получаем матчи для команды:', teamId);
    console.log('📤 Для загрузки:', forUpload);
    
    // Получаем все матчи
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

    // Проверяем наличие GPS отчетов для каждого матча
    const matchesWithReportInfo = await Promise.all(rows.map(async (row) => {
      const report = await db.select({ 
        id: sql`gr."id"`,
        name: sql`gr."name"`
      })
        .from(sql`"GpsReport" gr`)
        .where(sql`gr."eventId" = ${row.id} AND gr."eventType" = 'MATCH' AND gr."clubId" = ${token.clubId}::uuid`)
        .limit(1);
      
      const hasReport = report.length > 0;
      
      return {
        ...row,
        name: row.teamName,
        opponent: row.opponentName,
        reportId: hasReport ? report[0].id : null,
        reportName: hasReport ? report[0].name : null,
        hasReport
      };
    }));

    // Фильтруем в зависимости от параметра forUpload
    let filteredMatches;
    if (forUpload) {
      // Для модалки загрузки - показываем матчи БЕЗ отчетов
      filteredMatches = matchesWithReportInfo.filter(match => !match.hasReport);
    } else {
      // Для просмотра - показываем матчи С отчетами
      filteredMatches = matchesWithReportInfo.filter(match => match.hasReport);
    }
    
    console.log('📊 Результат запроса матчей:', filteredMatches.length, 'записей');
    return NextResponse.json(filteredMatches);
  } catch (error) {
    console.error('Ошибка при получении матчей:', error);
    return NextResponse.json({ error: 'Ошибка при получении матчей' }, { status: 500 });
  }
}

// POST метод для создания нового матча
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'matches.update')) {
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
    // Преобразуем дату+время в UTC с учётом timezone
    const localDateTime = dayjs.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', teamRow.timezone);
    const utcDateString = localDateTime.utc().format('YYYY-MM-DD');
    const [created] = await db.insert(match).values({
      id: crypto.randomUUID(),
      competitionType,
      date: utcDateString,
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