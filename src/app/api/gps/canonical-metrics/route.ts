import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsCanonicalMetric } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/gps/canonical-metrics - Единый эндпоинт для получения метрик с фильтрами
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'averageable'; // По умолчанию усредняемые
    const category = searchParams.get('category');

    // Строим условия фильтрации
    const conditions = [eq(gpsCanonicalMetric.isActive, true)];
    
    if (filter === 'averageable') {
      conditions.push(eq(gpsCanonicalMetric.isAverageable, true));
    }
    
    if (category) {
      conditions.push(eq(gpsCanonicalMetric.category, category));
    }

    // Выполняем запрос
    const canonicalMetrics = await db
      .select({
        id: gpsCanonicalMetric.id,
        code: gpsCanonicalMetric.code,
        name: gpsCanonicalMetric.name,
        description: gpsCanonicalMetric.description,
        category: gpsCanonicalMetric.category,
        dimension: gpsCanonicalMetric.dimension,
        canonicalUnit: gpsCanonicalMetric.canonicalUnit,
        supportedUnits: gpsCanonicalMetric.supportedUnits,
        isDerived: gpsCanonicalMetric.isDerived,
        isAverageable: gpsCanonicalMetric.isAverageable,
        formula: gpsCanonicalMetric.formula,
        metadata: gpsCanonicalMetric.metadata,
      })
      .from(gpsCanonicalMetric)
      .where(and(...conditions))
      .orderBy(gpsCanonicalMetric.category, gpsCanonicalMetric.name);

    // Группируем по категориям для удобного отображения
    const groupedMetrics = canonicalMetrics.reduce((acc, metric) => {
      const category = metric.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(metric);
      return acc;
    }, {} as Record<string, typeof canonicalMetrics>);

    // Сортируем категории для лучшего отображения
    const sortedCategories = Object.keys(groupedMetrics).sort((a, b) => {
      const categoryOrder = [
        'identity',           // Идентификация игрока
        'participation',      // Участие в игре
        'distance',           // Дистанция
        'speed',              // Скорость
        'speed_zones',        // Скоростные зоны
        'hsr_sprint',         // HSR и спринты
        'acc_dec',            // Ускорения и торможения
        'load',               // Нагрузка
        'intensity',          // Интенсивность
        'heart',              // Пульс
        'heart_zones',        // Пульсовые зоны
        'derived',            // Производные метрики
        'other'               // Прочие
      ];
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    const sortedGroupedMetrics: Record<string, typeof canonicalMetrics> = {};
    sortedCategories.forEach(category => {
      sortedGroupedMetrics[category] = groupedMetrics[category];
    });

    return NextResponse.json({
      success: true,
      metrics: canonicalMetrics,
      groupedMetrics: sortedGroupedMetrics,
      totalCount: canonicalMetrics.length,
      categories: sortedCategories,
      filter: filter,
      category: category
    });

  } catch (error) {
    console.error('Error fetching canonical metrics:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}