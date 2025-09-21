import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsDataChangeLog } from '@/db/schema/gpsReportData';
import { eq, and, desc } from 'drizzle-orm';

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

    // Получаем историю изменений для отчета
    const history = await db
      .select({
        id: gpsDataChangeLog.id,
        reportDataId: gpsDataChangeLog.reportDataId,
        reportId: gpsDataChangeLog.reportId,
        playerId: gpsDataChangeLog.playerId,
        fieldName: gpsDataChangeLog.fieldName,
        fieldLabel: gpsDataChangeLog.fieldLabel,
        oldValue: gpsDataChangeLog.oldValue,
        newValue: gpsDataChangeLog.newValue,
        changedById: gpsDataChangeLog.changedById,
        changedByName: gpsDataChangeLog.changedByName,
        changedAt: gpsDataChangeLog.changedAt,
        changeReason: gpsDataChangeLog.changeReason,
        changeType: gpsDataChangeLog.changeType,
      })
      .from(gpsDataChangeLog)
      .where(
        and(
          eq(gpsDataChangeLog.reportId, reportId),
          eq(gpsDataChangeLog.clubId, session.user.clubId || 'default-club')
        )
      )
      .orderBy(desc(gpsDataChangeLog.changedAt));

    return NextResponse.json({ 
      success: true, 
      history: history.map(entry => ({
        ...entry,
        changedAt: entry.changedAt?.toISOString(),
      }))
    });

  } catch (error) {
    console.error('Error fetching GPS report history:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}