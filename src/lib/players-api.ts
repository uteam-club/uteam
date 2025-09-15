import { Player } from '@/types/player';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function getPlayersByTeamId(teamId: string): Promise<Player[]> {
  const response = await fetch(`${API_BASE}/api/teams/${teamId}/players`);
  if (!response.ok) throw new Error('Failed to fetch players');
  return response.json();
}
