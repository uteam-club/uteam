import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { match } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

/**
 * GET /api/teams/[teamId]/matches
 * Получение матчей команды с фильтрацией по датам
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'matches.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: teamId } = params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let whereConditions = [eq(match.teamId, teamId)];

    if (startDate) whereConditions.push(gte(match.date, startDate));
    if (endDate) whereConditions.push(lte(match.date, endDate));

    const matches = await db
      .select({
        id: match.id,
        competitionType: match.competitionType,
        date: match.date,
        time: match.time,
        isHome: match.isHome,
        opponentName: match.opponentName,
        teamGoals: match.teamGoals,
        opponentGoals: match.opponentGoals,
        status: match.status,
      })
      .from(match)
      .where(and(...whereConditions))
      .orderBy(desc(match.date), desc(match.time));

    return NextResponse.json(matches);

  } catch (error) {
    console.error('Error fetching team matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team matches' },
      { status: 500 }
    );
  }
}


