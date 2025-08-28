import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { rpeSchedule } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

/**
 * DELETE /api/rpe-schedules/[scheduleId]
 * Удаление расписания RPE опроса
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'rpeSurvey.update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { scheduleId } = params;

    // Проверяем существование расписания
    const [existingSchedule] = await db
      .select()
      .from(rpeSchedule)
      .where(eq(rpeSchedule.id, scheduleId))
      .limit(1);

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Проверяем, можно ли удалить (не отправленное)
    if (existingSchedule.status === 'sent') {
      return NextResponse.json({ 
        error: 'Cannot delete already sent schedule' 
      }, { status: 400 });
    }

    // Удаляем расписание
    await db
      .delete(rpeSchedule)
      .where(eq(rpeSchedule.id, scheduleId));

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting RPE schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete RPE schedule' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rpe-schedules/[scheduleId]
 * Обновление расписания RPE опроса
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'rpeSurvey.update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { scheduleId } = params;
    const body = await request.json();
    const { scheduledTime, status } = body;

    // Проверяем существование расписания
    const [existingSchedule] = await db
      .select()
      .from(rpeSchedule)
      .where(eq(rpeSchedule.id, scheduleId))
      .limit(1);

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (scheduledTime !== undefined) {
      updateData.scheduledTime = scheduledTime;
    }

    if (status !== undefined) {
      updateData.status = status;
      
      // Если статус меняется на 'sent', записываем время отправки
      if (status === 'sent') {
        updateData.sentAt = new Date();
      }
    }

    // Обновляем расписание
    await db
      .update(rpeSchedule)
      .set(updateData)
      .where(eq(rpeSchedule.id, scheduleId));

    return NextResponse.json({
      success: true,
      message: 'Schedule updated successfully'
    });

  } catch (error) {
    console.error('Error updating RPE schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update RPE schedule' },
      { status: 500 }
    );
  }
}
