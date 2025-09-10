import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gpsReport } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileId = params.id;
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // Подсчитываем количество GPS отчетов, использующих этот профиль
    const [usageResult] = await db
      .select({ count: count() })
      .from(gpsReport)
      .where(eq(gpsReport.profileId, profileId));

    const usageCount = usageResult?.count || 0;

    return NextResponse.json({ usageCount });
  } catch (error) {
    console.error('Error fetching profile usage count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
