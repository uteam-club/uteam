import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { getGpsProfileById, archiveGpsProfile, unarchiveGpsProfile } from '@/services/gps.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getGpsProfileById(params.id, session.user.clubId);
    if (!profile) {
      return NextResponse.json({ error: 'GPS profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching GPS profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GPS profile' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'PROFILE_DELETE_DISABLED',
      message: 'Deleting GPS profiles is disabled. Use archive/unarchive instead.',
    },
    { status: 405 }
  );
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

    // Check if profile exists and belongs to user's club
    const profile = await getGpsProfileById(params.id, session.user.clubId);
    if (!profile) {
      return NextResponse.json({ error: 'GPS profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    let updatedProfile;
    if (isActive === false) {
      updatedProfile = await archiveGpsProfile(params.id, session.user.clubId);
    } else {
      updatedProfile = await unarchiveGpsProfile(params.id, session.user.clubId);
    }

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Failed to update GPS profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Error updating GPS profile:', error);
    return NextResponse.json(
      { error: 'Failed to update GPS profile' },
      { status: 500 }
    );
  }
}