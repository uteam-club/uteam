import { Team } from '@/types/events';
import { Player } from '@/types/player';

const API_BASE = '/api';

// Teams API
export async function getTeamsByClubId(clubId: string): Promise<Team[]> {
  const response = await fetch(`${API_BASE}/teams?clubId=${clubId}`);
  if (!response.ok) throw new Error('Failed to fetch teams');
  return response.json();
}

// Players API
export async function getPlayersByTeamId(teamId: string): Promise<Player[]> {
  const response = await fetch(`${API_BASE}/teams/${teamId}/players`);
  if (!response.ok) throw new Error('Failed to fetch players');
  return response.json();
}
