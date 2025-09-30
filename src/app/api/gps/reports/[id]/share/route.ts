import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport, gpsReportShare } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { hasGpsPermission } from '@/lib/gps-permissions';

// POST /api/gps/reports/{id}/share - create share link with 30-day TTL
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = params.id;
    const body = await request.json().catch(() => ({}));
    const profileId = body?.profileId as string | undefined;
    const options = body?.options || {};

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    // Check permission to export
    const permission = await hasGpsPermission(
      session.user.id,
      session.user.clubId,
      null,
      'gps.reports.export'
    );
    if (!permission.hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate report ownership
    const [report] = await db
      .select()
      .from(gpsReport)
      .where(and(eq(gpsReport.id, reportId), eq(gpsReport.clubId, session.user.clubId)));
    
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Create exact 30-day expiry (in ms)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Insert share record
    const [share] = await db
      .insert(gpsReportShare)
      .values({
        reportId: reportId,
        profileId: profileId,
        createdById: session.user.id,
        expiresAt,
        options,
      })
      .returning();

    const shareUrl = `${new URL(request.url).origin}/gps/share/${share.id}`;

    return NextResponse.json({ success: true, shareId: share.id, url: shareUrl });
  } catch (error) {
    console.error('Error creating GPS report share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


