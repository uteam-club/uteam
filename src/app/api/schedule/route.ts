import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { schedule, scheduleEvent } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH'];

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: Request, session: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return session.user.clubId === club.id;
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const hasAccess = await checkClubAccess(request, session);
    if (!hasAccess) {
      return new NextResponse('Нет доступа к этому клубу', { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const date = searchParams.get('date');
    if (!teamId || !date) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }
    const [sched] = await db.select().from(schedule).where(and(eq(schedule.teamId, teamId), eq(schedule.date, new Date(date))));
    let events: any[] = [];
    if (sched) {
      events = await db.select().from(scheduleEvent).where(eq(scheduleEvent.scheduleId, sched.id));
    }
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const body = await request.json();
    const { teamId, date, events } = body;
    if (!teamId || !date || !events) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }
    // Удаляем старые события
    const [sched] = await db.select().from(schedule).where(and(eq(schedule.teamId, teamId), eq(schedule.date, new Date(date))));
    if (sched) {
      await db.delete(scheduleEvent).where(eq(scheduleEvent.scheduleId, sched.id));
    }
    // Создаем или обновляем расписание
    let schedId = sched?.id;
    if (!schedId) {
      const [created] = await db.insert(schedule).values({ teamId, date: new Date(date) }).returning();
      schedId = created.id;
    }
    // Вставляем новые события
    if (events && events.length > 0) {
      await db.insert(scheduleEvent).values(
        events.map((event: any) => ({
          scheduleId: schedId,
          time: event.time,
          description: event.description,
          type: event.type,
        }))
      );
    }
    // Возвращаем расписание с событиями
    const newEvents = await db.select().from(scheduleEvent).where(eq(scheduleEvent.scheduleId, schedId));
    return NextResponse.json({ id: schedId, events: newEvents });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 