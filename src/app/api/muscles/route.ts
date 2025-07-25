import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { muscleArea } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  // Справочник мышц — не требует проверки прав
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