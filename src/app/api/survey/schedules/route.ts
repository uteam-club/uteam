export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { surveySchedule, team } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verify } from 'jsonwebtoken';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No token' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded: any = verify(token, process.env.NEXTAUTH_SECRET!, { algorithms: ['HS512'] });
    if (!allowedRoles.includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Возвращаем расписания
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
      .leftJoin(team, eq(surveySchedule.teamId, team.id));
    return NextResponse.json(schedules);
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid token', details: e.message }, { status: 401 });
  }
} 

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
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