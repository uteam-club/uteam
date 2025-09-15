export interface Training {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  startDate?: string; // для совместимости
  location?: string | null;
  notes?: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  clubId: string;
  teamId: string;
  categoryId?: string | null;
  createdById: string;
  type?: string | null;
  time?: string | null;
}

export interface Match {
  id: string;
  competitionType: string;
  date: string;
  time?: string | null;
  isHome: boolean;
  teamId: string;
  opponentName: string;
  homeTeam?: string; // для совместимости
  awayTeam?: string; // для совместимости
  teamGoals: number;
  opponentGoals: number;
  createdAt: Date;
  updatedAt: Date;
  clubId: string;
  formation?: string | null;
  gameFormat?: string | null;
  markerColor?: string | null;
  notes?: string | null;
  playerPositions?: string | null;
  positionAssignments?: string | null;
  status: string;
}

export interface Team {
  id: string;
  name: string;
  clubId: string;
  // Добавьте другие поля по необходимости
}
