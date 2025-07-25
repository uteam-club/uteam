import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { club } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { surveySchedule } from '@/db/schema/surveySchedule';
import { team } from '@/db/schema/team';
import { and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getToken } from 'next-auth/jwt';


// GET: получить время рассылки для клуба
export async function GET(req: NextRequest) {
  const token = await getToken({ req: req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'telegram.broadcastTime.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const clubId = session.user.clubId;
  if (!clubId) {
    return NextResponse.json({ error: 'No clubId' }, { status: 400 });
  }
  const [clubRow] = await db.select().from(club).where(eq(club.id, clubId));
  return NextResponse.json({ time: clubRow?.broadcastTime || '08:00' });
}

// POST: сохранить время рассылки для команды (через SurveySchedule)
export async function POST(req: NextRequest) {
  const token = await getToken({ req: req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'telegram.broadcastTime.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = session.user.clubId;
    if (!clubId) {
      return NextResponse.json({ error: 'No clubId in session', session }, { status: 400 });
    }
    const { teamId, time, enabled, type = 'morning' } = await req.json();
    if (!teamId || typeof teamId !== 'string') {
      return NextResponse.json({ error: 'No teamId provided', teamId }, { status: 400 });
    }
    if (!time || typeof time !== 'string') {
      return NextResponse.json({ error: 'Invalid time value', time }, { status: 400 });
    }
    // Проверяем, что команда принадлежит клубу
    const [teamRow] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.clubId, clubId)));
    if (!teamRow) {
      return NextResponse.json({ error: 'Team not found or not in your club', teamId }, { status: 404 });
    }
    // Проверяем, есть ли уже расписание для этой команды и типа опроса
    const [existing] = await db.select().from(surveySchedule).where(and(eq(surveySchedule.teamId, teamId), eq(surveySchedule.surveyType, type)));
    let result;
    if (existing) {
      // Обновляем
      [result] = await db.update(surveySchedule)
        .set({ sendTime: time, enabled: enabled ?? true, updatedAt: new Date() })
        .where(eq(surveySchedule.id, existing.id))
        .returning();
    } else {
      // Создаём
      [result] = await db.insert(surveySchedule).values({
        id: uuidv4(),
        teamId,
        surveyType: type,
        sendTime: time,
        enabled: enabled ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
    }
    return NextResponse.json({ message: 'Время рассылки сохранено!', schedule: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
} 