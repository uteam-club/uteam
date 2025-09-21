import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsCanonicalMetric } from '@/db/schema/gpsCanonicalMetric';
import { gpsUnit } from '@/db/schema/gpsCanonicalMetric';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем канонические метрики
    const metrics = await db.select().from(gpsCanonicalMetric).where(
      eq(gpsCanonicalMetric.isActive, true)
    );

    // Получаем единицы измерения
    const units = await db.select().from(gpsUnit).where(
      eq(gpsUnit.isActive, true)
    );

    // Группируем метрики по категориям
    const groupedMetrics = metrics.reduce((acc, metric) => {
      const category = metric.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: metric.id,
        code: metric.code,
        name: metric.name,
        canonicalUnit: metric.canonicalUnit,
        supportedUnits: metric.supportedUnits as string[],
        dimension: metric.dimension,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      metrics: metrics.map(metric => ({
        id: metric.id,
        code: metric.code,
        name: metric.name,
        category: metric.category,
        dimension: metric.dimension,
        canonicalUnit: metric.canonicalUnit,
        supportedUnits: metric.supportedUnits as string[],
      })),
      groupedMetrics,
      units: units.map(unit => ({
        id: unit.id,
        code: unit.code,
        name: unit.name,
        dimension: unit.dimension,
        conversionFactor: unit.conversionFactor,
      })),
    });

  } catch (error) {
    console.error('Error fetching canonical metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}