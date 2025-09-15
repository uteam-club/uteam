import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getGpsReportById, 
  updateGpsReportStatus,
  deleteGpsReport
} from '@/services/gps.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await getGpsReportById(params.id, session.user.clubId);
    if (!report) {
      return NextResponse.json({ error: 'GPS report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching GPS report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GPS report' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, errorMessage } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Check if report exists and belongs to user's club
    const existingReport = await getGpsReportById(params.id, session.user.clubId);
    if (!existingReport) {
      return NextResponse.json({ error: 'GPS report not found' }, { status: 404 });
    }

    const success = await updateGpsReportStatus(params.id, session.user.clubId, status, errorMessage);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update GPS report status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating GPS report status:', error);
    return NextResponse.json(
      { error: 'Failed to update GPS report status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if report exists and belongs to user's club
    const existingReport = await getGpsReportById(params.id, session.user.clubId);
    if (!existingReport) {
      return NextResponse.json({ error: 'GPS report not found' }, { status: 404 });
    }

    const success = await deleteGpsReport(params.id, session.user.clubId);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete GPS report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting GPS report:', error);
    return NextResponse.json(
      { error: 'Failed to delete GPS report' },
      { status: 500 }
    );
  }
}
