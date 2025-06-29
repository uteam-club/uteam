import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { muscleArea } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') as 'front' | 'back';

  if (!view || (view !== 'front' && view !== 'back')) {
    return NextResponse.json(
      { error: 'Invalid view parameter' },
      { status: 400 }
    );
  }

  try {
    const muscles = await db.select({ number: muscleArea.number, name: muscleArea.name })
      .from(muscleArea)
      .where(eq(muscleArea.view, view));
    return NextResponse.json(muscles);
  } catch (error) {
    console.error('Error fetching muscles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch muscles' },
      { status: 500 }
    );
  }
} 