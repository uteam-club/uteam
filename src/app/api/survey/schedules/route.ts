import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { surveySchedule, team } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTokenFromRequest } from '@/lib/auth';


export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'morningSurvey.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const whereArr = [];
  if (type) whereArr.push(eq(surveySchedule.surveyType, type));
  const schedules = await db
    .select({
      id: surveySchedule.id,
      teamId: surveySchedule.teamId,
      sendTime: surveySchedule.sendTime,
      enabled: surveySchedule.enabled,
      surveyType: surveySchedule.surveyType,
      timezone: team.timezone,
    })
    .from(surveySchedule)
    .leftJoin(team, eq(surveySchedule.teamId, team.id))
    .where(whereArr.length ? and(...whereArr) : undefined);
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'morningSurvey.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { teamId, enabled } = await req.json();
  if (!teamId || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Missing teamId or enabled' }, { status: 400 });
  }
  // Обновляем статус опросника для команды
  const updated = await db.update(surveySchedule)
    .set({ enabled })
    .where(eq(surveySchedule.teamId, teamId))
    .returning();
  if (!updated.length) {
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, schedule: updated[0] });
} 