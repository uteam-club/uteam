import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { getCanonicalMetrics } from '@/lib/gps-queries';
import { gpsCacheKeys } from '@/lib/db-cache';
import { AVERAGEABLE_METRICS } from '@/lib/gps-constants';

// GET /api/gps/canonical-metrics - Только усредняемые метрики (для расчетов)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем канонические метрики с кэшированием
    const cacheKey = gpsCacheKeys.canonicalMetrics(session.user.clubId || 'default-club');
    const canonicalMetrics = await getCanonicalMetrics(cacheKey, false);

    // Фильтруем только усредняемые метрики
    const averageableMetrics = canonicalMetrics.filter(metric =>
      AVERAGEABLE_METRICS.includes(metric.code)
    );

    // Группируем по категориям
    const groupedMetrics = (averageableMetrics || []).reduce((acc, metric) => {
      const category = metric.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(metric);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      metrics: averageableMetrics,
      groupedMetrics,
      totalCount: averageableMetrics.length
    });

  } catch (error) {
    console.error('Error fetching canonical metrics:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Failed to fetch canonical metrics'
    }, { status: 500 });
  }
}