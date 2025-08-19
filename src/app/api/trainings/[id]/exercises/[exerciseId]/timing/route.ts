import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { trainingExercise } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; exerciseId: string } }
) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'trainings.update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: trainingId, exerciseId } = params;
    const timingData = await request.json();

    // Валидация данных
    const { series, repetitions, repetitionTime, pauseBetweenRepetitions, pauseBetweenSeries } = timingData;
    
    if (!series || !repetitions || !repetitionTime) {
      return NextResponse.json(
        { error: 'Необходимо указать количество серий, повторов и время повтора' },
        { status: 400 }
      );
    }

    if (series < 1 || series > 20) {
      return NextResponse.json(
        { error: 'Количество серий должно быть от 1 до 20' },
        { status: 400 }
      );
    }

    if (repetitions < 1 || repetitions > 50) {
      return NextResponse.json(
        { error: 'Количество повторов должно быть от 1 до 50' },
        { status: 400 }
      );
    }

    if (repetitionTime < 5 || repetitionTime > 600) {
      return NextResponse.json(
        { error: 'Время повтора должно быть от 5 до 600 секунд' },
        { status: 400 }
      );
    }

    // Обновляем тайминги упражнения
    const [updatedExercise] = await db
      .update(trainingExercise)
      .set({
        series,
        repetitions,
        repetitionTime,
        pauseBetweenRepetitions: pauseBetweenRepetitions || 0,
        pauseBetweenSeries: pauseBetweenSeries || 0,
        updatedAt: new Date(),
      })
      .where(eq(trainingExercise.id, exerciseId))
      .returning();

    if (!updatedExercise) {
      return NextResponse.json(
        { error: 'Упражнение не найдено' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Тайминги успешно обновлены',
      timing: {
        series: updatedExercise.series,
        repetitions: updatedExercise.repetitions,
        repetitionTime: updatedExercise.repetitionTime,
        pauseBetweenRepetitions: updatedExercise.pauseBetweenRepetitions,
        pauseBetweenSeries: updatedExercise.pauseBetweenSeries,
      },
    });

  } catch (error) {
    console.error('Ошибка при обновлении таймингов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

