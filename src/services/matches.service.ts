import { db } from '@/lib/db';
import { match } from '@/db/schema/match';
import { team } from '@/db/schema/team';
import { eq, and } from 'drizzle-orm';
import { Match } from '@/types/events';
import { ensureMatchOwned } from '@/services/guards/ownership';

export async function getMatchesByTeamId(teamId: string): Promise<Match[]> {
  try {
    const results = await db
      .select({
        id: match.id,
        competitionType: match.competitionType,
        date: match.date,
        time: match.time,
        isHome: match.isHome,
        teamId: match.teamId,
        opponentName: match.opponentName,
        teamGoals: match.teamGoals,
        opponentGoals: match.opponentGoals,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        clubId: match.clubId,
        formation: match.formation,
        gameFormat: match.gameFormat,
        markerColor: match.markerColor,
        notes: match.notes,
        playerPositions: match.playerPositions,
        positionAssignments: match.positionAssignments,
        status: match.status,
        teamName: team.name,
      })
      .from(match)
      .leftJoin(team, eq(match.teamId, team.id))
      .where(eq(match.teamId, teamId));
    
    return results.map(m => ({
      id: m.id,
      competitionType: m.competitionType,
      date: m.date,
      time: m.time,
      isHome: m.isHome,
      teamId: m.teamId,
      opponentName: m.opponentName,
      homeTeam: m.isHome ? 'Наша команда' : m.opponentName, // для совместимости
      awayTeam: m.isHome ? m.opponentName : 'Наша команда', // для совместимости
      teamGoals: m.teamGoals || 0,
      opponentGoals: m.opponentGoals || 0,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      clubId: m.clubId,
      formation: m.formation,
      gameFormat: m.gameFormat,
      markerColor: m.markerColor,
      notes: m.notes,
      playerPositions: m.playerPositions,
      positionAssignments: m.positionAssignments,
      status: m.status,
      team: {
        id: m.teamId,
        name: m.teamName || 'Неизвестная команда'
      }
    }));
  } catch (error) {
    console.error('Error fetching matches by team id:', error);
    return [];
  }
}

export async function getMatchById(id: string, clubId: string) {
  try {
    const [result] = await db.select().from(match)
      .where(and(eq(match.id, id), eq(match.clubId, clubId)));
    return result ?? null;
  } catch (error) {
    console.error('Error fetching match by id:', error);
    return null;
  }
}

export async function updateMatch(id: string, clubId: string, data: Partial<typeof match.$inferSelect>) {
  try {
    await ensureMatchOwned(id, clubId);
    const [updated] = await db.update(match)
      .set(data)
      .where(eq(match.id, id))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Error updating match:', error);
    return null;
  }
}

export async function createMatch(data: {
  competitionType: string;
  date: string;
  time: string;
  isHome: boolean;
  teamId: string;
  opponentName: string;
  teamGoals?: number | null;
  opponentGoals?: number | null;
  status: string;
  clubId: string;
}) {
  try {
    const [newMatch] = await db.insert(match).values({
      competitionType: data.competitionType,
      date: data.date,
      time: data.time,
      isHome: data.isHome,
      teamId: data.teamId,
      opponentName: data.opponentName,
      teamGoals: data.teamGoals,
      opponentGoals: data.opponentGoals,
      status: data.status,
      clubId: data.clubId,
    }).returning();
    
    return newMatch ?? null;
  } catch (error) {
    console.error('Error creating match:', error);
    return null;
  }
}

export async function deleteMatch(id: string, clubId: string) {
  try {
    await ensureMatchOwned(id, clubId);
    await db.delete(match).where(eq(match.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting match:', error);
    return false;
  }
}
