import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { surveySchedule, team } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { getToken } from 'next-auth/jwt';


// GET: получить время рассылки для команды
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'adminPanel.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');
  if (!teamId) {
    return NextResponse.json({ error: 'No teamId provided' }, { status: 400 });
  }
  // Проверяем, что команда принадлежит клубу пользователя
  const [foundTeam] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.clubId, token.clubId))).limit(1);
  if (!foundTeam) {
    return NextResponse.json({ error: 'Team not found or not in your club' }, { status: 404 });
  }
  const [schedule] = await db.select().from(surveySchedule).where(and(eq(surveySchedule.teamId, teamId), eq(surveySchedule.surveyType, 'morning'))).limit(1);
  return NextResponse.json({
    time: schedule?.sendTime || '08:00',
    enabled: schedule?.enabled ?? true,
  });
}

// POST: сохранить время рассылки для команды
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'adminPanel.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { teamId, time, enabled } = await req.json();
    if (!teamId || typeof time !== 'string' || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid input', teamId, time, enabled }, { status: 400 });
    }
    // Проверяем, что команда принадлежит клубу пользователя
    const [foundTeam] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.clubId, token.clubId))).limit(1);
    if (!foundTeam) {
      return NextResponse.json({ error: 'Team not found or not in your club' }, { status: 404 });
    }
    // Обновляем или создаём расписание
    const [existing] = await db.select().from(surveySchedule).where(and(eq(surveySchedule.teamId, teamId), eq(surveySchedule.surveyType, 'morning'))).limit(1);
    let result;
    if (existing) {
      [result] = await db.update(surveySchedule)
        .set({ sendTime: time, enabled, updatedAt: new Date() })
        .where(eq(surveySchedule.id, existing.id))
        .returning();
    } else {
      [result] = await db.insert(surveySchedule)
        .values({ id: randomUUID(), teamId, surveyType: 'morning', sendTime: time, enabled })
        .returning();
    }
    return NextResponse.json({ message: 'Настройки рассылки сохранены!', result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
} 