import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { player } from '@/db/schema/player';
import { team } from '@/db/schema/team';
import { eq, sql, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
    }

    // Получаем только игроков выбранной команды и клуба
    const players = await db.select({
      id: player.id,
      name: sql<string>`${player.firstName} || ' ' || ${player.lastName}`,
      firstName: player.firstName,
      lastName: player.lastName,
    }).from(player)
    .innerJoin(team, eq(player.teamId, team.id))
    .where(
      and(
        eq(player.teamId, teamId),
        eq(team.clubId, session.user.clubId || 'default-club')
      )
    );

    return NextResponse.json({ players });

  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
