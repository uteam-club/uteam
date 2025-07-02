export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { surveySchedule, team } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

export async function GET(req: NextRequest) {
  // Логируем секрет
  console.log('[DEBUG] NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET);
  // Получаем токен из заголовка Authorization или cookie (best practice)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  console.log('[DEBUG] TOKEN:', token);
  // Проверяем разные варианты поля роли
  const role = token?.role || token?.userRole || token?.Role || token?.ROLE;
  console.log('[DEBUG] ROLE:', role);
  if (!token || !role || !allowedRoles.includes(String(role).toUpperCase())) {
    return new Response(JSON.stringify({ error: 'Forbidden', debug: { token, role, allowedRoles } }), { status: 403 });
  }
  // Возвращает все расписания рассылок с таймзоной команды
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