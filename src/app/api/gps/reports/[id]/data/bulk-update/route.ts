import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema/gpsReport';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { gpsDataChangeLog } from '@/db/schema/gpsReportData';
import { match } from '@/db/schema/match';
import { player } from '@/db/schema/player';
import { playerGameModel } from '@/db/schema/playerGameModel';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { canAccessGpsData } from '@/lib/gps-permissions';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем разрешение на редактирование GPS данных
    const canEdit = await canAccessGpsData(
      session.user.id,
      session.user.clubId || 'default-club',
      null,
      'edit'
    );

    if (!canEdit) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'У вас нет прав для редактирования GPS данных' 
      }, { status: 403 });
    }

    const reportId = params.id;
    const { updates, deletedPlayers, deletedMetrics } = await request.json();

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
        oldValue: oldValue ? oldValue : null,
        newValue: newValue.toString(),
        changedById: session.user.id,
        changedByName: session.user.name || 'Unknown User',
        changedAt: new Date(),
        changeReason: reason || 'Редактирование через модальное окно',
        changeType: 'manual',
      });
    }

    // Обрабатываем удаления игроков
    if (deletedPlayers && Array.isArray(deletedPlayers) && deletedPlayers.length > 0) {
      try {
        // Просто удаляем данные без создания записей в change log
        await db
          .delete(gpsReportData)
          .where(
            and(
              eq(gpsReportData.gpsReportId, reportId),
              inArray(gpsReportData.playerId, deletedPlayers)
            )
          );
      } catch (error) {
        console.error('Error deleting players:', error);
        // Продолжаем выполнение, не прерываем весь процесс
      }
    }

    // Обрабатываем удаления метрик
    if (deletedMetrics && Array.isArray(deletedMetrics) && deletedMetrics.length > 0) {
      try {
        // Просто удаляем данные без создания записей в change log
        await db
          .delete(gpsReportData)
          .where(
            and(
              eq(gpsReportData.gpsReportId, reportId),
              inArray(gpsReportData.canonicalMetric, deletedMetrics)
            )
          );
      } catch (error) {
        console.error('Error deleting metrics:', error);
        // Продолжаем выполнение, не прерываем весь процесс
      }
    }

    // Вставляем записи истории изменений
    if (changeLogEntries.length > 0) {
      console.log('Inserting change log entries:', changeLogEntries.length);
      console.log('Sample entry:', changeLogEntries[0]);
      await db.insert(gpsDataChangeLog).values(changeLogEntries);
      console.log('Change log entries inserted successfully');
    }

    // Обновляем статус отчета (отмечаем, что есть изменения)
    await db
      .update(gpsReport)
      .set({
        hasEdits: true,
        updatedAt: new Date(),
      })
      .where(eq(gpsReport.id, reportId));

           // Автоматический пересчет игровых моделей для команды
           try {
             // Получаем teamId из GPS отчета
             const [report] = await db
               .select({ teamId: gpsReport.teamId })
               .from(gpsReport)
               .where(eq(gpsReport.id, reportId));

             if (!report || !report.teamId) {
               console.log('⚠️ TeamId не найден для GPS отчета');
               return NextResponse.json({ success: true, message: 'Данные обновлены' });
             }

             console.log('🔄 Пересчет игровых моделей для команды:', report.teamId);

             // Используем модуль для расчета игровых моделей
             const { calculateGameModelsForTeam } = await import('@/lib/game-model-calculator');
             await calculateGameModelsForTeam(report.teamId, session.user.clubId || 'default-club');
             
             console.log('✅ Игровые модели пересчитаны');
           } catch (error) {
             console.error('⚠️ Ошибка при автоматическом пересчете игровых моделей:', error);
             // Не прерываем выполнение, так как данные уже обновлены
           }

    const totalChanges = updates.length + 
      (deletedPlayers?.length || 0) + 
      (deletedMetrics?.length || 0);

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updates.length} fields, deleted ${deletedPlayers?.length || 0} players, deleted ${deletedMetrics?.length || 0} metrics`,
      updatedCount: updates.length,
      deletedPlayers: deletedPlayers?.length || 0,
      deletedMetrics: deletedMetrics?.length || 0,
      totalChanges,
      changeLogEntries: changeLogEntries.length
    });

  } catch (error) {
    console.error('Error updating GPS report data:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
