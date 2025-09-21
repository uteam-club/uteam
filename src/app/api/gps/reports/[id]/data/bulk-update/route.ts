import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema/gpsReport';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { gpsDataChangeLog } from '@/db/schema/gpsReportData';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = params.id;
    const { updates } = await request.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 });
    }

    // Проверяем, что отчет существует и принадлежит пользователю
    const [report] = await db
      .select()
      .from(gpsReport)
      .where(
        and(
          eq(gpsReport.id, reportId),
          eq(gpsReport.clubId, session.user.clubId || 'default-club')
        )
      )
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const changeLogEntries = [];

    // Обновляем каждое поле
    for (const update of updates) {
      const { dataId, value, reason } = update;

      // Получаем текущее значение
      const [currentData] = await db
        .select()
        .from(gpsReportData)
        .where(eq(gpsReportData.id, dataId));

      if (!currentData) {
        console.warn(`Data entry not found: ${dataId}`);
        continue;
      }

      const oldValue = currentData.value;
      const newValue = typeof value === 'number' ? value : parseFloat(value);

      if (isNaN(newValue)) {
        return NextResponse.json({ 
          error: `Invalid value for field ${currentData.canonicalMetric}: ${value}` 
        }, { status: 400 });
      }

      // Обновляем значение
      await db
        .update(gpsReportData)
        .set({
          value: newValue.toString(),
        })
        .where(eq(gpsReportData.id, dataId));

      // Создаем запись в истории изменений
      changeLogEntries.push({
        reportDataId: dataId,
        reportId: reportId,
        playerId: currentData.playerId,
        clubId: session.user.clubId || 'default-club',
        fieldName: currentData.canonicalMetric,
        fieldLabel: currentData.canonicalMetric, // Можно добавить маппинг на человекочитаемые названия
        oldValue: oldValue?.toString() || null,
        newValue: newValue.toString(),
        changedById: session.user.id,
        changedByName: session.user.name || 'Unknown User',
        changedAt: new Date(),
        changeReason: reason || 'Редактирование через модальное окно',
        changeType: 'manual',
      });
    }

    // Вставляем записи истории изменений
    if (changeLogEntries.length > 0) {
      await db.insert(gpsDataChangeLog).values(changeLogEntries);
    }

    // Обновляем статус отчета (отмечаем, что есть изменения)
    await db
      .update(gpsReport)
      .set({
        hasEdits: true,
        updatedAt: new Date(),
      })
      .where(eq(gpsReport.id, reportId));

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updates.length} fields`,
      updatedCount: updates.length
    });

  } catch (error) {
    console.error('Error updating GPS report data:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
