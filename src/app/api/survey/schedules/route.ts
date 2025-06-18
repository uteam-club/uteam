export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { surveySchedule, team } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
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