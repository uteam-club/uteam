import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fitnessTestResult } from '@/db/schema/fitnessTestResult';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';

const saveResultsSchema = z.object({
  testId: z.string(),
  teamId: z.string(),
  results: z.array(z.object({
    playerId: z.string(),
    value: z.string().or(z.number()),
    date: z.string().optional(),
  })),
});

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, session: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  // Глобальный SUPER_ADMIN имеет доступ ко всем клубам
  if (session.user.role === 'SUPER_ADMIN' && session.user.clubId === '00000000-0000-0000-0000-000000000000') {
    return true;
  }
  return session.user.clubId === club.id;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req: req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const hasAccess = await checkClubAccess(req, session);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const testId = searchParams.get('testId');
  const teamId = searchParams.get('teamId');
  const playerId = searchParams.get('playerId');
  if (!testId || !teamId) {
    return NextResponse.json({ error: 'Missing testId or teamId' }, { status: 400 });
  }
  let results;
  if (playerId) {
    results = await db.select().from(fitnessTestResult)
      .where(and(eq(fitnessTestResult.testId, testId), eq(fitnessTestResult.teamId, teamId), eq(fitnessTestResult.playerId, playerId)))
      .orderBy(fitnessTestResult.date);
  } else {
    results = await db.select().from(fitnessTestResult)
      .where(and(eq(fitnessTestResult.testId, testId), eq(fitnessTestResult.teamId, teamId)));
  }
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req: req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const parse = saveResultsSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
  const { testId, teamId, results } = parse.data;
  if (!results.length || !results[0].date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }
  // Используем дату, которую выбрал тренер
  const date = new Date(results[0].date);
  // Удаляем все старые результаты за эту дату для этого теста и команды
  await db.delete(fitnessTestResult)
    .where(and(
      eq(fitnessTestResult.testId, testId),
      eq(fitnessTestResult.teamId, teamId),
      eq(fitnessTestResult.date, date)
    ));
  const toInsert = results.map(r => ({
    testId,
    teamId,
    playerId: r.playerId,
    value: String(r.value),
    date,
    createdBy: session.user.id,
  }));
  await db.insert(fitnessTestResult).values(toInsert);
  return NextResponse.json({ success: true });
} 