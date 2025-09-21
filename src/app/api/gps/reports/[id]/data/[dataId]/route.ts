import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; dataId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dataId } = params;
    const body = await request.json();
    const { value, unit } = body;

    // Обновляем данные
    await db.update(gpsReportData)
      .set({
        value: value.toString(),
        unit: unit,
      })
      .where(eq(gpsReportData.id, dataId));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating GPS data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; dataId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dataId } = params;

    const [data] = await db.select()
      .from(gpsReportData)
      .where(eq(gpsReportData.id, dataId));

    if (!data) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Error fetching GPS data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
