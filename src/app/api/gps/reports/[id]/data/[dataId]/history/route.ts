import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsDataChangeLog } from '@/db/schema/gpsReportData';
import { eq, desc } from 'drizzle-orm';

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

    const history = await db.select()
      .from(gpsDataChangeLog)
      .where(eq(gpsDataChangeLog.reportDataId, dataId))
      .orderBy(desc(gpsDataChangeLog.changedAt));

    return NextResponse.json({ history });

  } catch (error) {
    console.error('Error fetching change history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
