import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { training } from '@/db/schema/training';
import { gpsReport } from '@/db/schema/gpsReport';
import { team } from '@/db/schema/team';
import { trainingCategory } from '@/db/schema/trainingCategory';
import { match } from '@/db/schema/match';
import { eq, and, desc, isNotNull, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем все GPS отчеты клуба (тренировки и матчи)
    const allGpsReports = await db
      .select({
        id: gpsReport.id,
        name: gpsReport.name,
        fileName: gpsReport.fileName,
        status: gpsReport.status,
        createdAt: gpsReport.createdAt,
        fileSize: gpsReport.fileSize,
        eventType: gpsReport.eventType,
        eventId: gpsReport.eventId,
        teamId: gpsReport.teamId
      })
      .from(gpsReport)
      .where(eq(gpsReport.clubId, session.user.clubId))
      .orderBy(desc(gpsReport.createdAt));

    console.log(`[DEBUG] Found ${allGpsReports.length} GPS reports for club ${session.user.clubId}`);

    // Получаем данные тренировок и матчей для отчетов
    const trainingsWithReports = await Promise.all(
      allGpsReports.map(async (report) => {
        let eventData = null;
        
        if (report.eventType === 'training') {
          // Получаем данные тренировки
          const trainingData = await db
            .select({
              id: training.id,
              title: training.title,
              date: training.date,
              time: training.time,
              type: training.type,
              status: training.status,
              categoryName: trainingCategory.name,
              teamName: team.name,
              teamId: team.id
            })
            .from(training)
            .leftJoin(team, eq(training.teamId, team.id))
            .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
            .where(eq(training.id, report.eventId))
            .limit(1);
          
          eventData = trainingData[0];
        } else if (report.eventType === 'match') {
          // Получаем данные матча
          const matchData = await db
            .select({
              id: match.id,
              title: match.opponentName,
              date: match.date,
              time: match.time,
              type: sql<string>`'MATCH'`.as('type'),
              status: match.status,
              categoryName: sql<string>`null`.as('categoryName'),
              teamName: team.name,
              teamId: team.id
            })
            .from(match)
            .leftJoin(team, eq(match.teamId, team.id))
            .where(eq(match.id, report.eventId))
            .limit(1);
          
          eventData = matchData[0];
        }

        return {
          id: report.eventId,
          title: eventData?.title || `Отчет ${report.eventType === 'training' ? 'тренировки' : 'матча'}`,
          date: eventData?.date || report.createdAt.toISOString().split('T')[0],
          time: eventData?.time || '00:00',
          type: eventData?.type || report.eventType.toUpperCase(),
          status: eventData?.status || 'scheduled',
          categoryName: eventData?.categoryName,
          teamName: eventData?.teamName || 'Команда',
          teamId: eventData?.teamId || report.teamId,
          gpsReport: {
            id: report.id,
            name: report.name,
            fileName: report.fileName,
            status: report.status,
            createdAt: report.createdAt,
            fileSize: report.fileSize,
            eventId: report.eventId,
            eventType: report.eventType
          }
        };
      })
    );


    return NextResponse.json(trainingsWithReports);
  } catch (error) {
    console.error('Error fetching trainings with GPS reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainings with GPS reports' },
      { status: 500 }
    );
  }
}
