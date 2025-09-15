import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllCanonicalMetrics, getAllMetricGroups } from '@/lib/canonical-metrics';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'groups') {
      const groups = getAllMetricGroups();
      return NextResponse.json(groups);
    } else {
      const metrics = getAllCanonicalMetrics();
      return NextResponse.json(metrics);
    }
  } catch (error) {
    console.error('Error fetching canonical metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canonical metrics' },
      { status: 500 }
    );
  }
}
