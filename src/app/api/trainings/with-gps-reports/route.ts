import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { training } from '@/db/schema/training';
import { gpsReport } from '@/db/schema/gpsReport';
import { team } from '@/db/schema/team';
import { trainingCategory } from '@/db/schema/trainingCategory';
import { eq, and, desc, isNotNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем все тренировки клуба с загруженными GPS отчетами
    const trainingsWithReports = await db
      .select({
        id: training.id,
        title: training.title,
        date: training.date,
        time: training.time,
        type: training.type,
        status: training.status,
        categoryName: trainingCategory.name,
        teamName: team.name,
        teamId: team.id,
        gpsReport: {
          id: gpsReport.id,
          name: gpsReport.name,
          fileName: gpsReport.fileName,
          status: gpsReport.status,
          createdAt: gpsReport.createdAt,
          fileSize: gpsReport.fileSize,
        }
      })
      .from(training)
      .leftJoin(team, eq(training.teamId, team.id))
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .leftJoin(gpsReport, and(
        eq(gpsReport.trainingId, training.id),
        eq(gpsReport.clubId, session.user.clubId)
      ))
      .where(
        and(
          eq(training.clubId, session.user.clubId),
          isNotNull(gpsReport.id) // Только тренировки с GPS отчетами
        )
      )
      .orderBy(desc(training.date), desc(training.time));

    return NextResponse.json(trainingsWithReports);
  } catch (error) {
    console.error('Error fetching trainings with GPS reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainings with GPS reports' },
      { status: 500 }
    );
  }
}
