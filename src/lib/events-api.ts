import { Training, Match } from '@/types/events';

const API_BASE = '/api';

// Trainings API
export async function getTrainingsByTeamId(teamId: string): Promise<Training[]> {
  const response = await fetch(`${API_BASE}/trainings?teamId=${teamId}`);
  if (!response.ok) throw new Error('Failed to fetch trainings');
  return response.json();
}

// Matches API
export async function getMatchesByTeamId(teamId: string): Promise<Match[]> {
  const response = await fetch(`${API_BASE}/matches?teamId=${teamId}`);
  if (!response.ok) throw new Error('Failed to fetch matches');
  return response.json();
}
