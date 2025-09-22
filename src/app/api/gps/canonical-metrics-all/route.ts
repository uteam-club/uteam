import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { getCanonicalMetrics } from '@/lib/gps-queries';
import { gpsCacheKeys } from '@/lib/db-cache';

// GET /api/gps/canonical-metrics-all - Все канонические метрики (для профилей визуализации)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем все канонические метрики с кэшированием
    const cacheKey = gpsCacheKeys.canonicalMetricsAll(session.user.clubId || 'default-club');
    const canonicalMetrics = await getCanonicalMetrics(cacheKey, true);

    // Группируем по категориям
    const groupedMetrics = canonicalMetrics.reduce((acc, metric) => {
      const category = metric.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(metric);
      return acc;
    }, {} as Record<string, typeof canonicalMetrics>);

    return NextResponse.json({
      success: true,
      metrics: canonicalMetrics,
      groupedMetrics,
      totalCount: canonicalMetrics.length
    });

  } catch (error) {
    console.error('Error fetching all canonical metrics:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Failed to fetch canonical metrics'
    }, { status: 500 });
  }
}
