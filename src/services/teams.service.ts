import { db } from '@/lib/db';
import { team } from '@/db/schema/team';
import { eq } from 'drizzle-orm';
import { Team } from '@/types/events';

export async function getTeamsByClubId(clubId: string): Promise<Team[]> {
  try {
    const results = await db
      .select()
      .from(team)
      .where(eq(team.clubId, clubId))
      .orderBy(team.order);
    
    return results.map(t => ({
      id: t.id,
      name: t.name,
      clubId: t.clubId,
      order: t.order,
      description: t.description,
      teamType: t.teamType as 'academy' | 'contract',
      timezone: t.timezone,
    }));
  } catch (error) {
    console.error('Error fetching teams by club id:', error);
    return [];
  }
}
