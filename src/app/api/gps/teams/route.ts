import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { team } from '@/db/schema/team';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем команды для клуба пользователя, отсортированные по порядку
    const teams = await db
      .select({
        id: team.id,
        name: team.name,
      })
      .from(team)
      .where(eq(team.clubId, session.user.clubId || 'default-club'))
      .orderBy(asc(team.order));

    return NextResponse.json({ 
      success: true, 
      teams 
    });

  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}