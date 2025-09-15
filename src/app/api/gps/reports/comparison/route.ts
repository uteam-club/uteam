import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport, training, trainingCategory } from '@/db/schema';
import { eq, and, gte, desc, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const eventType = searchParams.get('eventType');
    const teamId = searchParams.get('teamId');

    if (!eventId || !eventType || !teamId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Получаем информацию о текущей тренировке с категорией
    const currentTraining = await db
      .select({
        id: training.id,
        title: training.title,
        type: training.type,
        date: training.date,
        categoryId: training.categoryId,
        categoryName: trainingCategory.name
      })
      .from(training)
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(and(
        eq(training.id, eventId),
        eq(training.clubId, session.user.clubId)
      ))
      .limit(1);

    if (currentTraining.length === 0) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }

    const trainingInfo = currentTraining[0];
    const trainingCategoryId = trainingInfo.categoryId;
    const trainingCategoryName = trainingInfo.categoryName || 'Без категории';
    const trainingDate = new Date(trainingInfo.date);

    // Если у тренировки нет категории, не делаем сравнение
    if (!trainingCategoryId) {
      return NextResponse.json({
        currentTraining: {
          id: trainingInfo.id,
          title: trainingInfo.title,
          type: trainingInfo.type,
          date: trainingInfo.date,
          categoryName: 'Без категории'
        },
        comparisonData: null,
        message: 'У тренировки не указана категория. Сравнение недоступно.'
      });
    }

    // Вычисляем дату 30 дней назад
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Получаем все тренировки той же категории за последние 30 дней
    const similarTrainings = await db
      .select({
        id: training.id,
        title: training.title,
        type: training.type,
        date: training.date,
        categoryId: training.categoryId,
        categoryName: trainingCategory.name
      })
      .from(training)
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(and(
        trainingCategoryId ? eq(training.categoryId, trainingCategoryId) : isNull(training.categoryId),
        eq(training.clubId, session.user.clubId),
        eq(training.teamId, teamId),
        gte(training.date, thirtyDaysAgo.toISOString().split('T')[0])
      ))
      .orderBy(desc(training.date));

    // Получаем GPS отчеты для этих тренировок
    const trainingIds = similarTrainings.map(t => t.id);
    
    if (trainingIds.length === 0) {
      return NextResponse.json({
        currentTraining: {
          id: trainingInfo.id,
          title: trainingInfo.title,
          type: trainingInfo.type,
          date: trainingInfo.date,
          categoryName: trainingCategoryName
        },
        comparisonData: null,
        message: `За последние 30 дней нет тренировок с категорией "${trainingCategoryName}"`
      });
    }

    // Получаем GPS отчеты только для найденных тренировок с нужной категорией
    const gpsReports = await db
      .select()
      .from(gpsReport)
      .where(and(
        eq(gpsReport.clubId, session.user.clubId),
        eq(gpsReport.teamId, teamId),
        eq(gpsReport.eventType, eventType as 'training' | 'match')
      ));

    // Фильтруем отчеты только для найденных тренировок
    const relevantReports = gpsReports.filter(report => 
      trainingIds.includes(report.eventId)
    );

    // Отладочные логи для понимания что происходит
    console.log('🔍 Comparison API Debug:', {
      trainingCategoryId,
      trainingCategoryName,
      similarTrainings: similarTrainings.length,
      trainingIds,
      allGpsReports: gpsReports.length,
      relevantReports: relevantReports.length,
      reportEventIds: relevantReports.map(r => r.eventId)
    });

    if (relevantReports.length === 0) {
      return NextResponse.json({
        currentTraining: {
          id: trainingInfo.id,
          title: trainingInfo.title,
          type: trainingInfo.type,
          date: trainingInfo.date,
          categoryName: trainingCategoryName
        },
        comparisonData: null,
        message: `За последние 30 дней нет GPS отчетов для тренировок категории "${trainingCategoryName}"`
      });
    }

    // Группируем отчеты по тренировкам
    const reportsByTraining = relevantReports.reduce((acc, report) => {
      if (!acc[report.eventId]) {
        acc[report.eventId] = [];
      }
      acc[report.eventId].push(report);
      return acc;
    }, {} as Record<string, typeof relevantReports>);

    return NextResponse.json({
      currentTraining: {
        id: trainingInfo.id,
        title: trainingInfo.title,
        type: trainingInfo.type,
        date: trainingInfo.date,
        categoryName: trainingCategoryName
      },
      comparisonData: {
        trainingCategoryId,
        trainingCategoryName,
        totalTrainings: similarTrainings.length,
        totalReports: relevantReports.length,
        reportsByTraining,
        dateRange: {
          from: thirtyDaysAgo.toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Error fetching GPS comparison data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
