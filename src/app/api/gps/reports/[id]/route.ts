import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema/gpsReport';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { gpsDataChangeLog } from '@/db/schema/gpsReportData';
import { team } from '@/db/schema/team';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = params.id;

    // Получаем информацию об отчете с названием команды
    const [report] = await db
      .select({
        id: gpsReport.id,
        name: gpsReport.name,
        fileName: gpsReport.fileName,
        gpsSystem: gpsReport.gpsSystem,
        eventType: gpsReport.eventType,
        teamId: gpsReport.teamId,
        playersCount: gpsReport.playersCount,
        isProcessed: gpsReport.isProcessed,
        hasEdits: gpsReport.hasEdits,
        status: gpsReport.status,
        createdAt: gpsReport.createdAt,
        updatedAt: gpsReport.updatedAt,
        teamName: team.name,
      })
      .from(gpsReport)
      .leftJoin(team, eq(gpsReport.teamId, team.id))
      .where(
        and(
          eq(gpsReport.id, reportId),
          eq(gpsReport.clubId, session.user.clubId || 'default-club')
        )
      );

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      report: {
        ...report,
        createdAt: report.createdAt?.toISOString(),
        updatedAt: report.updatedAt?.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error fetching GPS report:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = params.id;

    // Проверяем, что отчет существует и принадлежит пользователю
    const [existingReport] = await db
      .select()
      .from(gpsReport)
      .where(
        and(
          eq(gpsReport.id, reportId),
          eq(gpsReport.clubId, session.user.clubId || 'default-club')
        )
      );

    if (!existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Удаляем связанные данные в правильном порядке
    // 1. Удаляем историю изменений
    await db
      .delete(gpsDataChangeLog)
      .where(eq(gpsDataChangeLog.reportId, reportId));

    // 2. Удаляем данные отчета
    await db
      .delete(gpsReportData)
      .where(eq(gpsReportData.gpsReportId, reportId));

    // 3. Удаляем сам отчет
    await db
      .delete(gpsReport)
      .where(eq(gpsReport.id, reportId));

    return NextResponse.json({ 
      success: true, 
      message: 'GPS отчет успешно удален' 
    });

  } catch (error) {
    console.error('Error deleting GPS report:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}