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
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

const saveResultsSchema = z.object({
  testId: z.string(),
  teamId: z.string(),
  results: z.array(z.object({
    playerId: z.string(),
    value: z.string().or(z.number()),
    date: z.string().optional(),
  })),
});

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  // Глобальный SUPER_ADMIN имеет доступ ко всем клубам
  if (token.role === 'SUPER_ADMIN' && token.clubId === '00000000-0000-0000-0000-000000000000') {
    return true;
  }
  return token.clubId === club.id;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req: req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'fitnessTests.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(req, token);
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
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'fitnessTests.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(req, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
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
    createdBy: token.id,
  }));
  await db.insert(fitnessTestResult).values(toInsert);
  return NextResponse.json({ success: true });
} 

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'fitnessTests.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(req, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  const body = await req.json();
  const { id, value, date } = body || {};
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  const updatePayload: any = {};
  if (value !== undefined && value !== null) updatePayload.value = String(value);
  if (date) updatePayload.date = new Date(date);
  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }
  const [updated] = await db.update(fitnessTestResult)
    .set(updatePayload)
    .where(eq(fitnessTestResult.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'fitnessTests.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(req, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  await db.delete(fitnessTestResult).where(eq(fitnessTestResult.id, id));
  return NextResponse.json({ success: true });
}