import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { getAllUnits, getUnitsByDimension } from '@/lib/canonical-metrics';

// GET /api/gps/units - получение единиц измерения
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dimension = searchParams.get('dimension');

    let units;
    if (dimension) {
      units = await getUnitsByDimension(dimension);
    } else {
      units = await getAllUnits();
    }

    // Группируем единицы по измерениям
    const groupedUnits = units.reduce((acc, unit) => {
      if (!acc[unit.dimension]) {
        acc[unit.dimension] = [];
      }
      acc[unit.dimension].push(unit);
      return acc;
    }, {} as Record<string, typeof units>);

    return NextResponse.json({
      units,
      groupedUnits
    });

  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { error: 'Failed to fetch units' },
      { status: 500 }
    );
  }
}
