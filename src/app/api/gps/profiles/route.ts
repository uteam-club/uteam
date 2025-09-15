import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGpsProfilesByClubId, createGpsProfile } from '@/services/gps.service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profiles = await getGpsProfilesByClubId(session.user.clubId);
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Error fetching GPS profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GPS profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, gpsSystem } = body;

    if (!name || !gpsSystem) {
      return NextResponse.json(
        { error: 'Name and GPS system are required' },
        { status: 400 }
      );
    }

    const profile = await createGpsProfile({
      name,
      gpsSystem,
      clubId: session.user.clubId,
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Failed to create GPS profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Error creating GPS profile:', error);
    return NextResponse.json(
      { error: 'Failed to create GPS profile' },
      { status: 500 }
    );
  }
}
