import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { training } from '@/db/schema/training';
import { trainingCategory } from '@/db/schema/trainingCategory';
import { match } from '@/db/schema/match';
import { gpsReport } from '@/db/schema/gpsReport';
import { team } from '@/db/schema/team';
import { eq, and, sql, notInArray, desc, asc, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const eventType = searchParams.get('eventType');
    const withReports = searchParams.get('withReports') === 'true'; // Новый параметр

    if (!teamId || !eventType) {
      return NextResponse.json({ error: 'Missing teamId or eventType' }, { status: 400 });
    }

    // Сначала получаем все события с GPS отчетами
    const existingReports = await db.select({
      eventId: gpsReport.eventId,
      eventType: gpsReport.eventType,
    }).from(gpsReport).where(
      and(
        eq(gpsReport.clubId, session.user.clubId || 'default-club'),
        eq(gpsReport.teamId, teamId)
      )
    );

    // Создаем список событий, которые уже имеют GPS отчеты
    const eventsWithReports = existingReports
      .filter(report => report.eventType === eventType)
      .map(report => report.eventId);

    console.log('GPS Events API: Found', eventsWithReports.length, 'events with reports for type', eventType);
    console.log('GPS Events API: Event IDs:', eventsWithReports);
    console.log('GPS Events API: Request params - teamId:', teamId, 'eventType:', eventType);

    let events: Array<{id: string, name: string, type: string, teamId: string, date: string, time?: string, categoryName?: string}> = [];

    if (eventType === 'training') {
      let whereConditions = [
        eq(training.teamId, teamId),
        eq(training.clubId, session.user.clubId || 'default-club'),
        // Исключаем отмененные тренировки
        sql`${training.status} != 'CANCELLED'`
      ];
      
      if (withReports) {
        // Для анализа показываем только тренировки С GPS отчетами
        if (eventsWithReports.length > 0) {
          whereConditions.push(inArray(training.id, eventsWithReports));
        } else {
          // Если нет событий с отчетами, возвращаем пустой список
          whereConditions.push(sql`1 = 0`);
        }
      } else {
        // Для загрузки новых отчетов показываем тренировки БЕЗ GPS отчетов
        if (eventsWithReports.length > 0) {
          whereConditions.push(notInArray(training.id, eventsWithReports));
        }
      }
      
      // Сначала проверим общее количество тренировок для команды
      const allTrainings = await db.select({ count: sql<number>`count(*)` })
        .from(training)
        .where(and(
          eq(training.teamId, teamId),
          eq(training.clubId, session.user.clubId || 'default-club')
        ));
      console.log('GPS Events API: Total trainings for team:', allTrainings[0]?.count || 0);
      
      // Проверим тренировки по статусам
      const trainingsByStatus = await db.select({ 
        status: training.status, 
        count: sql<number>`count(*)` 
      })
        .from(training)
        .where(and(
          eq(training.teamId, teamId),
          eq(training.clubId, session.user.clubId || 'default-club')
        ))
        .groupBy(training.status);
      console.log('GPS Events API: Trainings by status:', trainingsByStatus);
      
      const trainings = await db.select({
        id: training.id,
        name: training.title,
        type: training.type,
        teamId: training.teamId,
        date: training.date,
        time: training.time,
        categoryName: trainingCategory.name,
      }).from(training)
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(and(...whereConditions))
      .orderBy(desc(training.date), desc(training.time));
      events = trainings.map(t => ({
        ...t,
        categoryName: t.categoryName || undefined
      }));
      console.log('GPS Events API: Found', trainings.length, withReports ? 'trainings with GPS reports' : 'trainings without GPS reports');
      console.log('GPS Events API: Training details:', trainings.map(t => ({ id: t.id, name: t.name, date: t.date, status: 'N/A' })));
    } else if (eventType === 'match') {
      let whereConditions = [
        eq(match.teamId, teamId),
        eq(match.clubId, session.user.clubId || 'default-club'),
        // Исключаем отмененные матчи
        sql`${match.status} != 'CANCELLED'`
      ];
      
      if (withReports) {
        // Для анализа показываем только матчи С GPS отчетами
        if (eventsWithReports.length > 0) {
          whereConditions.push(inArray(match.id, eventsWithReports));
        } else {
          // Если нет событий с отчетами, возвращаем пустой список
          whereConditions.push(sql`1 = 0`);
        }
      } else {
        // Для загрузки новых отчетов показываем матчи БЕЗ GPS отчетов
        if (eventsWithReports.length > 0) {
          whereConditions.push(notInArray(match.id, eventsWithReports));
        }
      }
      
      const matches = await db.select({
        id: match.id,
        name: sql<string>`${match.opponentName} || ' (' || ${match.date} || ')'`,
        type: sql<string>`'match'`,
        teamId: match.teamId,
        date: match.date,
        time: match.time,
        isHome: match.isHome,
        opponentName: match.opponentName,
        teamGoals: match.teamGoals,
        opponentGoals: match.opponentGoals,
        teamName: team.name,
      }).from(match)
      .leftJoin(team, eq(match.teamId, team.id))
      .where(and(...whereConditions))
      .orderBy(desc(match.date));
      events = matches;
      console.log('GPS Events API: Found', matches.length, withReports ? 'matches with GPS reports' : 'matches without GPS reports');
    }

    return NextResponse.json({ events });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
