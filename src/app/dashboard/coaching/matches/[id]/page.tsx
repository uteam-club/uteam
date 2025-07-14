'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  Calendar, 
  MapPin, 
  Activity, 
  FileText, 
  Video, 
  Info, 
  BarChart2, 
  User,
  ChevronDown,
  Palette,
  Save,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Medal,
  ChevronLeftIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import FootballField from '@/components/matches/FootballField';
import { Player as FieldPlayer, type PlayerPosition as FieldPlayerPosition } from '@/components/matches/FootballField';
import { formationPositions } from '@/components/matches/FootballField';
import SquadSelectionModal from '@/components/matches/SquadSelectionModal';
import DeleteMatchModal from '@/components/matches/DeleteMatchModal';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { TeamSelect } from '@/components/ui/team-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
  imageUrl?: string;
}

interface PlayerStat {
  id: string;
  player: Player;
  isStarter: boolean;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

// Типы для позиций игроков
type PlayerPosition = FieldPlayerPosition;

interface MatchDetails {
  id: string;
  competitionType: 'FRIENDLY' | 'LEAGUE' | 'CUP';
  date: string;
  time: string;
  isHome: boolean;
  teamId: string;
  team: {
    id: string;
    name: string;
  };
  opponentName: string;
  teamGoals: number;
  opponentGoals: number;
  gameFormat?: string;
  formation?: string;
  markerColor?: string;
  notes?: string;
  playerPositions?: PlayerPosition[];
  playerStats: PlayerStat[];
  positionAssignments?: Record<string, number>;
  status?: string;
}

const competitionTypeLabels = {
  FRIENDLY: 'Товарищеский',
  LEAGUE: 'Лига',
  CUP: 'Кубок'
};

// Mapping of game formats to available formations
const formatFormations = {
  '7×7': ['1-3-3', '1-3-2-1', '1-2-3-1'],
  '8×8': ['1-4-3', '1-4-2-1', '1-3-3-1', '1-3-1-3', '1-3-1-2-1'],
  '9×9': ['1-4-3-1', '1-3-4-1', '1-3-3-2', '1-3-2-3', '1-3-1-3-1'],
  '10×10': ['1-4-4-1', '1-4-3-2', '1-4-2-3', '1-4-1-3-1', '1-3-4-2', '1-3-3-3', '1-3-2-3-1'],
  '11×11': ['1-5-2-3', '1-5-3-2', '1-4-5-1', '1-4-1-4-1', '1-4-4-2', '1-4-2-3-1', '1-4-3-3', '1-3-4-3', '1-3-4-1-2', '1-3-4-2-1']
};

// All available formats
const gameFormats = Object.keys(formatFormations);

// Available marker colors with actual color hex values
const markerColors = [
  { name: 'Красный', value: 'red-500', hex: '#ef4444' },
  { name: 'Синий', value: 'blue-500', hex: '#3b82f6' },
  { name: 'Зеленый', value: 'green-500', hex: '#22c55e' },
  { name: 'Желтый', value: 'yellow-500', hex: '#eab308' },
  { name: 'Оранжевый', value: 'orange-500', hex: '#f97316' },
  { name: 'Розовый', value: 'pink-500', hex: '#ec4899' },
  { name: 'Фиолетовый', value: 'purple-500', hex: '#a855f7' },
  { name: 'Голубой', value: 'sky-500', hex: '#0ea5e9' },
  { name: 'Бирюзовый', value: 'teal-500', hex: '#14b8a6' },
  { name: 'Лайм', value: 'lime-500', hex: '#84cc16' },
  { name: 'Коричневый', value: 'amber-800', hex: '#92400e' },
  { name: 'Серый', value: 'gray-500', hex: '#6b7280' },
  { name: 'Черный', value: 'black', hex: '#000000' },
  { name: 'Белый', value: 'white', hex: '#ffffff' }
];

// Function to get hex color from color value
const getColorHex = (colorValue: string) => {
  const color = markerColors.find(c => c.value === colorValue);
  return color ? color.hex : '#ef4444'; // Default to red if not found
};

// Enumerate player statuses for squad selection
enum PlayerSquadStatus {
  STARTER = 'STARTER',
  SUBSTITUTE = 'SUBSTITUTE',
  RESERVE = 'RESERVE'
}

// Add to your interfaces
interface TeamPlayer {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
  imageUrl?: string;
  teamId: string;
  squadStatus?: PlayerSquadStatus; // For tracking status in the modal
}

export default function MatchDetailsPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const params = useParams();
  const matchId = params.id as string;
  const router = useRouter();
  
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<string>('11×11');
  const [selectedFormation, setSelectedFormation] = useState<string>('1-4-4-2');
  const [selectedColor, setSelectedColor] = useState<string>('red-500');
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>([]);
  const [positionAssignments, setPositionAssignments] = useState<Record<string, number>>({});
  const [availableFormations, setAvailableFormations] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Squad selection state
  const [squadModalOpen, setSquadModalOpen] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [squadPlayers, setSquadPlayers] = useState<Record<string, PlayerSquadStatus>>({});
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [savingSquad, setSavingSquad] = useState(false);

  // Add new state for statistics editing
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [editedStats, setEditedStats] = useState<Record<string, Record<string, number>>>({});
  const [savingStats, setSavingStats] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add new state for status
  const [selectedStatus, setSelectedStatus] = useState<string>('SCHEDULED');

  const statusColorClass = selectedStatus === 'FINISHED'
    ? 'bg-green-600 border-green-500 text-white'
    : 'bg-blue-600 border-blue-500 text-white';

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    competitionType: 'FRIENDLY',
    date: '',
    time: '',
    isHome: true,
    teamId: '',
    opponentName: '',
    teamGoals: 0,
    opponentGoals: 0,
    status: 'SCHEDULED',
  });
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const isSingleTeam = teams.length === 1;

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails();
    }
  }, [matchId]);

  useEffect(() => {
    // When match data is loaded, set the initial format, formation, and color
    if (match) {
      const format = match.gameFormat || '11×11';
      setSelectedFormat(format);
      // Set appropriate formations based on format
      const formations = formatFormations[format as keyof typeof formatFormations] || formatFormations['11×11'];
      setAvailableFormations(formations);
      // Определяем актуальную formation
      let actualFormation = formations[0];
      if (match.formation && formations.includes(match.formation)) {
        actualFormation = match.formation;
      }
      setSelectedFormation(actualFormation);
      // Set color if it exists in match data
      if (match.markerColor) {
        setSelectedColor(match.markerColor);
      }
      // Set player positions строго по formation
      if (match.playerPositions && match.playerPositions.length > 0) {
        const positions = typeof match.playerPositions === 'string'
          ? JSON.parse(match.playerPositions)
          : match.playerPositions;
        setPlayerPositions(positions);
      } else if (formationPositions[actualFormation]) {
        setPlayerPositions(formationPositions[actualFormation]);
      }
      // Загружаем привязки игроков к позициям, если они существуют
      if (match.positionAssignments) {
        const assignments = typeof match.positionAssignments === 'string'
          ? JSON.parse(match.positionAssignments)
          : match.positionAssignments;
        setPositionAssignments(assignments);
        if (match.playerPositions && match.playerPositions.length > 0 && match.playerStats && match.playerStats.length > 0) {
          const updatedPositions = [...(typeof match.playerPositions === 'string' ? JSON.parse(match.playerPositions) : match.playerPositions)];
          Object.entries(assignments).forEach(([playerId, positionIndex]) => {
            const player = match.playerStats.find(stat => stat.player.id === playerId)?.player;
            if (player && updatedPositions[positionIndex as number]) {
              updatedPositions[positionIndex as number] = {
                ...updatedPositions[positionIndex as number],
                playerId: player.id,
                playerNumber: player.number || 0,
                playerName: `${player.lastName} ${player.firstName.charAt(0)}.`
              };
            }
          });
          setPlayerPositions(updatedPositions);
        }
      }
      setSelectedStatus(match.status || 'SCHEDULED');
      setHasChanges(false);
    }
  }, [match]);

  // Update available formations when selected format changes
  useEffect(() => {
    const formations = formatFormations[selectedFormat as keyof typeof formatFormations] || [];
    setAvailableFormations(formations);
    
    // Reset selected formation if current one isn't valid for new format
    if (!formations.includes(selectedFormation)) {
      setSelectedFormation(formations[0]);
    }

    // Track changes
    if (match) {
      const hasFormatChanged = selectedFormat !== match.gameFormat;
      const hasFormationChanged = selectedFormation !== match.formation;
      const hasColorChanged = selectedColor !== match.markerColor;
      const hasPositionsChanged = JSON.stringify(playerPositions) !== JSON.stringify(match.playerPositions);
      setHasChanges(hasFormatChanged || hasFormationChanged || hasColorChanged || hasPositionsChanged);
    }
  }, [selectedFormat, selectedFormation, selectedColor, playerPositions, match]);

  // Add this useEffect to update squadPlayers when playerStats changes
  useEffect(() => {
    if (match?.playerStats) {
      const newSquadPlayers: Record<string, PlayerSquadStatus> = {};
      
      match.playerStats.forEach((stat) => {
        if (stat.isStarter) {
          newSquadPlayers[stat.player.id] = PlayerSquadStatus.STARTER;
        } else {
          newSquadPlayers[stat.player.id] = PlayerSquadStatus.SUBSTITUTE;
        }
      });
      
      setSquadPlayers(newSquadPlayers);
    }
  }, [match?.playerStats]);

  const fetchMatchDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/matches/${matchId}`);
      
      if (response.ok) {
        const data = await response.json();
        setMatch(data);
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить данные матча',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Ошибка при получении данных матча:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при загрузке данных',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = (value: string) => {
    setSelectedFormat(value);
  };

  const handleFormationChange = (value: string) => {
    setSelectedFormation(value);
    const defaultPositions = formationPositions[value] || [];
    setPlayerPositions(defaultPositions);

    // Автоматически распределяем игроков основы по новым позициям
    if (match && match.playerStats) {
      const starters = match.playerStats.filter(stat => stat.isStarter);
      const newAssignments: Record<string, number> = {};
      starters.forEach((stat, idx) => {
        if (idx < defaultPositions.length) {
          newAssignments[stat.player.id] = idx;
        }
      });
      setPositionAssignments(newAssignments);
    } else {
      setPositionAssignments({});
    }

    setHasChanges(true);
  };

  const handleColorChange = (value: string) => {
    setSelectedColor(value);
  };

  const handlePositionsChange = (positions: PlayerPosition[]) => {
    console.log('Обработчик позиций получил:', positions.length, 'позиций');
    // Сохраняем новые позиции игроков
    setPlayerPositions(positions);
    setHasChanges(true);
  };

  // Обработчик для привязки игрока к позиции
  const handlePlayerAssigned = (positionIndex: number, playerId?: string | null) => {
    if (typeof positionIndex !== 'number' || isNaN(positionIndex) || positionIndex === undefined) return;
    console.log(`Вызван обработчик привязки: позиция=${positionIndex}, игрок=${playerId || 'null'}`);
    setHasChanges(true);
    
    // Обновляем информацию о привязке игрока к позиции
    const updatedAssignments = { ...positionAssignments };
    
    // Если playerId равен null, значит игрока удаляют с позиции
    if (playerId === null) {
      // Находим ключ (ID игрока) для удаления
      const playerToRemove = Object.entries(updatedAssignments)
        .find(([id, pos]) => pos === positionIndex);
      if (playerToRemove) {
        console.log(`Удаление игрока ${playerToRemove[0]} с позиции ${positionIndex}`);
        delete updatedAssignments[playerToRemove[0]];
      }
    } else if (playerId !== undefined) {
      // Обновляем привязку только если playerId определён
      console.log(`Привязка игрока ${playerId} к позиции ${positionIndex}`);
      updatedAssignments[playerId] = positionIndex;
    }
    
    console.log('Новые привязки после обновления:', updatedAssignments);
    setPositionAssignments(updatedAssignments);
  };

  const saveChanges = async () => {
    if (!match) return;
    
    setIsSaving(true);
    try {
      console.log('Сохраняем данные матча...');
      console.log('Позиции игроков:', playerPositions.length, 'элементов');
      console.log('Привязки игроков:', Object.keys(positionAssignments).length, 'привязок');
      
      // Добавляю подробное логгирование
      console.log('Детальные данные позиций:', JSON.stringify(playerPositions));
      console.log('Детальные данные привязок:', JSON.stringify(positionAssignments));
      
      // Проверим, что все привязки соответствуют существующим позициям
      for (const [playerId, posIndex] of Object.entries(positionAssignments)) {
        if (posIndex < 0 || posIndex >= playerPositions.length) {
          console.error(`Некорректная привязка игрока ${playerId} к позиции ${posIndex}`);
          toast({
            title: 'Ошибка',
            description: 'Обнаружены некорректные привязки игроков',
            variant: 'destructive',
          });
          setIsSaving(false);
          return;
        }
      }
      
      // Обновим playerPositions - убедимся, что у всех привязанных позиций есть данные о игроке
      const updatedPositions = [...playerPositions];
      Object.entries(positionAssignments).forEach(([playerId, posIndex]) => {
        const player = match.playerStats.find(s => s.player.id === playerId)?.player;
        if (player && updatedPositions[posIndex as number]) {
          updatedPositions[posIndex as number] = {
            ...updatedPositions[posIndex as number],
            playerId: player.id,
            playerNumber: player.number || 0, 
            playerName: `${player.lastName} ${player.firstName.charAt(0)}.`
          };
        }
      });
      
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameFormat: selectedFormat,
          formation: selectedFormation,
          markerColor: selectedColor,
          playerPositions: updatedPositions,
          positionAssignments: positionAssignments,
          // Include other unchanged fields to preserve them
          date: match.date,
          time: match.time,
          competitionType: match.competitionType,
          isHome: match.isHome,
          teamGoals: match.teamGoals,
          opponentGoals: match.opponentGoals,
          opponentName: match.opponentName,
          status: match.status
        }),
      });

      if (response.ok) {
        await fetchMatchDetails();
        setHasChanges(false);
        toast({
          title: 'Сохранено',
          description: 'Изменения успешно сохранены',
        });
      } else {
        // Добавляем более подробный вывод ошибок от сервера
        try {
          const errorData = await response.json();
          console.error('Ошибка сервера:', errorData);
          toast({
            title: 'Ошибка',
            description: errorData.error || 'Не удалось сохранить изменения',
            variant: 'destructive',
          });
        } catch (parseError) {
          console.error('Не удалось прочитать ответ сервера:', parseError);
          toast({
            title: 'Ошибка',
            description: 'Не удалось сохранить изменения',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при сохранении данных',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd.MM.yyyy');
  };

  // Function to fetch all players from the team
  const fetchTeamPlayers = async () => {
    if (!match) return;
    
    try {
      setIsLoadingPlayers(true);
      const response = await fetch(`/api/teams/${match.teamId}/players`);
      
      if (response.ok) {
        const players = await response.json();
        setTeamPlayers(players);
        
        // Initialize player statuses
        const newSquadPlayers = { ...squadPlayers };
        players.forEach((player: TeamPlayer) => {
          if (!newSquadPlayers[player.id]) {
            newSquadPlayers[player.id] = PlayerSquadStatus.RESERVE;
          }
        });
        setSquadPlayers(newSquadPlayers);
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить список игроков',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Ошибка при получении игроков команды:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при загрузке игроков',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  // Handle opening squad selection modal
  const handleSquadModalOpen = () => {
    fetchTeamPlayers();
    setSquadModalOpen(true);
  };

  // Handle changing player squad status
  const handlePlayerStatusChange = (playerId: string, status: PlayerSquadStatus) => {
    // Check for starters limit (max 11)
    if (status === PlayerSquadStatus.STARTER) {
      const currentStartersCount = Object.values(squadPlayers).filter(
        (status) => status === PlayerSquadStatus.STARTER
      ).length;
      
      if (currentStartersCount >= 11 && squadPlayers[playerId] !== PlayerSquadStatus.STARTER) {
        toast({
          title: 'Ограничение',
          description: 'Нельзя добавить больше 11 игроков в основной состав',
          variant: 'destructive',
        });
        return;
      }
    }
    
    setSquadPlayers((prev) => ({
      ...prev,
      [playerId]: status,
    }));
  };

  // Function to save squad selection
  const saveSquadSelection = async () => {
    if (!match) return;
    
    try {
      setSavingSquad(true);
      
      // Process each player to save their status
      const promises = Object.entries(squadPlayers).map(async ([playerId, status]) => {
        if (status === PlayerSquadStatus.RESERVE) {
          // For reserve players, remove them from the match if they exist
          const existingStat = match.playerStats.find(stat => stat.player.id === playerId);
          if (existingStat) {
            return fetch(`/api/matches/${matchId}/players?playerId=${playerId}`, {
              method: 'DELETE',
            });
          }
          return Promise.resolve();
        } else {
          // For starters and substitutes, add or update them
          return fetch(`/api/matches/${matchId}/players`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerId,
              isStarter: status === PlayerSquadStatus.STARTER,
              minutesPlayed: 0,
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
            }),
          });
        }
      });
      
      await Promise.all(promises);
      
      // Refresh match data to get updated playerStats
      await fetchMatchDetails();
      
      toast({
        title: 'Успешно',
        description: 'Состав на матч сохранен',
      });
      
      setSquadModalOpen(false);
    } catch (error) {
      console.error('Ошибка при сохранении состава:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить состав матча',
        variant: 'destructive',
      });
    } finally {
      setSavingSquad(false);
    }
  };

  // Add this function to handle stats editing
  const handleStatsEdit = () => {
    if (!match) return;
    
    if (isEditingStats) {
      // Save edits
      savePlayerStats();
    } else {
      // Initialize edited stats
      const initialStats: Record<string, Record<string, number>> = {};
      match.playerStats.forEach(stat => {
        initialStats[stat.id] = {
          minutesPlayed: stat.minutesPlayed,
          goals: stat.goals,
          assists: stat.assists,
          yellowCards: stat.yellowCards,
          redCards: stat.redCards
        };
      });
      setEditedStats(initialStats);
      setIsEditingStats(true);
    }
  };

  // Add this function to handle stat value change
  const handleStatChange = (statId: string, field: string, value: number) => {
    setEditedStats(prev => ({
      ...prev,
      [statId]: {
        ...prev[statId],
        [field]: value
      }
    }));
  };

  // Add this function to save player stats
  const savePlayerStats = async () => {
    if (!match) return;
    
    try {
      setSavingStats(true);
      
      // Create an array of promises for each stat update
      const promises = Object.entries(editedStats).map(([statId, fields]) => {
        const stat = match.playerStats.find(s => s.id === statId);
        if (!stat) return Promise.resolve();
        
        return fetch(`/api/matches/${matchId}/players`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playerId: stat.player.id,
            isStarter: stat.isStarter,
            minutesPlayed: fields.minutesPlayed,
            goals: fields.goals,
            assists: fields.assists,
            yellowCards: fields.yellowCards,
            redCards: fields.redCards
          }),
        });
      });
      
      await Promise.all(promises);
      
      // Refresh match data
      await fetchMatchDetails();
      
      toast({
        title: 'Успешно',
        description: 'Статистика игроков сохранена',
      });
      
      setIsEditingStats(false);
    } catch (error) {
      console.error('Ошибка при сохранении статистики:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить статистику игроков',
        variant: 'destructive',
      });
    } finally {
      setSavingStats(false);
    }
  };

  // Преобразуем список игроков в формат, необходимый для FootballField
  const getStarterPlayersForField = () => {
    if (!match || !match.playerStats?.length) {
      console.log('Нет данных об игроках основы');
      return [];
    }
    
    // Фильтруем список игроков, оставляя только стартеров
    const starters = match.playerStats
      .filter(stat => stat.isStarter)
      .map(stat => ({
        id: stat.player.id,
        firstName: stat.player.firstName,
        lastName: stat.player.lastName,
        number: stat.player.number || 0,
        isStarter: true
      })) as FieldPlayer[];
    
    console.log(`Найдено ${starters.length} игроков основы:`, starters.map(p => `${p.lastName} (${p.id})`));
    return starters;
  };

  useEffect(() => {
    if (teamPlayers.length && match) {
      // Для отладки: выводим teamId каждого игрока и teamId матча
      console.log('match.teamId:', match.teamId);
      console.log('teamPlayers (full):', teamPlayers);
      console.log('teamPlayers (id/teamId):', teamPlayers.map(p => ({ id: p.id, teamId: p.teamId })));
    }
  }, [teamPlayers, match]);

  const handleDeleteMatch = async () => {
    if (!match) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/matches/${match.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: 'Матч удалён', description: 'Матч и все связанные данные успешно удалены.' });
        router.push('/dashboard/coaching/matches');
      } else {
        const errorData = await response.json();
        toast({ title: 'Ошибка', description: errorData.error || 'Не удалось удалить матч', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Произошла ошибка при удалении матча', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Function to handle status change
  const handleStatusChange = async (value: string) => {
    setSelectedStatus(value);
    if (!match) return;
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: value })
      });
      if (response.ok) {
        const updated = await response.json();
        setMatch((prev) => prev ? { ...prev, status: updated.status } : prev);
        toast({ title: 'Статус обновлен', description: value === 'SCHEDULED' ? 'Матч запланирован' : 'Матч завершен' });
      } else {
        toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Ошибка при обновлении статуса', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (match) {
      setEditForm({
        competitionType: match.competitionType,
        date: match.date ? match.date.slice(0, 10) : '',
        time: match.time || '',
        isHome: match.isHome,
        teamId: match.teamId,
        opponentName: match.opponentName,
        teamGoals: match.teamGoals ?? 0,
        opponentGoals: match.opponentGoals ?? 0,
        status: match.status || 'SCHEDULED',
      });
    }
  }, [match]);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch {}
  };

  useEffect(() => { if (editModalOpen) fetchTeams(); }, [editModalOpen]);

  const handleEditFormChange = (field: string, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        await fetchMatchDetails();
        setEditModalOpen(false);
        toast({ title: 'Данные матча обновлены' });
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error || 'Не удалось обновить данные', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Ошибка', description: 'Ошибка при обновлении данных', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-vista-light/60">Загрузка данных матча...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-vista-light/60">Матч не найден</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Шапка страницы с кнопкой возврата */}
      <div className="flex items-center space-x-4 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/coaching/matches')}
          className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Назад к матчам
        </Button>
        <Button
          size="sm"
          className="bg-vista-primary/90 hover:bg-vista-primary text-vista-dark h-8"
          onClick={() => setEditModalOpen(true)}
        >
          Редактировать данные
        </Button>
        {hasChanges && (
          <Button 
            size="sm" 
            className="bg-vista-primary/90 hover:bg-vista-primary h-8"
            onClick={saveChanges}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левая колонка */}
        <div className="space-y-6">
          {/* Верхние информационные блоки */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-vista-dark/50 border-vista-secondary/50">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <div className="text-vista-light/60 text-sm flex items-center mb-2">
                    <Calendar className="w-4 h-4 mr-1" />
                    Дата и время
                  </div>
                  <div className="text-vista-light font-semibold flex items-center space-x-2">
                    <span>{formatMatchDate(match.date)}</span>
                    <span>·</span>
                    <span>{match.time}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-vista-dark/50 border-vista-secondary/50">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <div className="text-vista-light/60 text-sm flex items-center mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    Место проведения
                  </div>
                  <div className="text-vista-light font-semibold">
                    {match.isHome ? 'Домашний матч' : 'Выездной матч'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-vista-dark/50 border-vista-secondary/50">
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <div className="text-vista-light/60 text-sm flex items-center mb-2">
                    <Medal className="w-4 h-4 mr-1" />
                    Тип матча
                  </div>
                  <div className="text-vista-light font-semibold">
                    {competitionTypeLabels[match.competitionType]}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Блок счета */}
          <Card className="bg-vista-dark/50 border-vista-secondary/50">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <div className="text-xl font-semibold text-vista-light mb-2">
                    {match.isHome ? (match.team?.name || 'Команда') : match.opponentName}
                  </div>
                  <div className="text-sm text-vista-light/70">
                    {match.isHome ? 'Наша команда' : 'Соперник'}
                  </div>
                </div>
                
                <div className="flex items-center px-8 py-4 rounded-lg bg-vista-dark-lighter mx-4">
                  {match.status === 'FINISHED' ? (
                    <>
                      <span className="text-3xl font-bold text-vista-light">{match.isHome ? match.teamGoals : match.opponentGoals}</span>
                      <span className="text-vista-light/30 mx-2">:</span>
                      <span className="text-3xl font-bold text-vista-light">{match.isHome ? match.opponentGoals : match.teamGoals}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-vista-light">-<span className="text-vista-light/30 mx-2">:</span>-</span>
                  )}
                </div>
                
                <div className="text-center flex-1">
                  <div className="text-xl font-semibold text-vista-light mb-2">
                    {match.isHome ? match.opponentName : (match.team?.name || 'Команда')}
                  </div>
                  <div className="text-sm text-vista-light/70">
                    {match.isHome ? 'Соперник' : 'Наша команда'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Кнопки действий */}
          <div className="space-y-1">
            <Button 
              variant="outline" 
              className="w-full h-[52px] bg-vista-dark/50 border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm flex items-center justify-center"
            >
              <Activity className="w-4 h-4 mr-2 text-vista-primary" />
              GPS отчет
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-[52px] bg-vista-dark/50 border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm flex items-center justify-center"
            >
              <FileText className="w-4 h-4 mr-2 text-vista-primary" />
              План на игру
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-[52px] bg-vista-dark/50 border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm flex items-center justify-center"
            >
              <Video className="w-4 h-4 mr-2 text-vista-primary" />
              Запись игры
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-[52px] bg-vista-dark/50 border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm flex items-center justify-center"
            >
              <Info className="w-4 h-4 mr-2 text-vista-primary" />
              Детали матча
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-[52px] bg-vista-dark/50 border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm flex items-center justify-center"
            >
              <BarChart2 className="w-4 h-4 mr-2 text-vista-primary" />
              Анализ матча
            </Button>
          </div>
        </div>

        {/* Правая колонка (поле и детали) */}
        <div>
          <Card className="bg-vista-dark/50 border-vista-secondary/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Футбольное поле - увеличиваем еще больше (2/3 ширины) */}
                <div className="lg:col-span-2 relative flex items-center justify-center">
                  <FootballField 
                    formation={selectedFormation}
                    colorValue={getColorHex(selectedColor)}
                    onPositionsChange={handlePositionsChange}
                    savedPositions={playerPositions.length > 0 ? playerPositions : undefined}
                    players={getStarterPlayersForField()}
                    onPlayerAssigned={handlePlayerAssigned}
                    matchId={matchId}
                  />
                </div>

                {/* Детали (1/3 ширины) */}
                <div className="space-y-4">
                  {/* Формат игры - выпадающий список */}
                  <div>
                    <div className="text-vista-light/60 text-sm mb-1">Формат игры</div>
                    <Select
                      value={selectedFormat}
                      onValueChange={handleFormatChange}
                    >
                      <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30 text-vista-light">
                        <SelectValue placeholder="Выберите формат" />
                      </SelectTrigger>
                      <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                        {gameFormats.map((format) => (
                          <SelectItem key={format} value={format}>
                            {format}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Схема расстановки - выпадающий список */}
                  <div>
                    <div className="text-vista-light/60 text-sm mb-1">Схема расстановки</div>
                    <Select
                      value={selectedFormation}
                      onValueChange={handleFormationChange}
                    >
                      <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30 text-vista-light">
                        <SelectValue placeholder="Выберите схему" />
                      </SelectTrigger>
                      <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                        {availableFormations.map((formation) => (
                          <SelectItem key={formation} value={formation}>
                            {formation}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Цвет фишек - заменяем на Popover для выбора цвета */}
                  <div>
                    <div className="text-vista-light/60 text-sm mb-1">Цвет фишек</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full bg-vista-dark-lighter border-vista-secondary/30 text-vista-light h-10 flex justify-between"
                        >
                          <div className="flex items-center">
                            <div 
                              className="w-5 h-5 rounded-full mr-2 flex-shrink-0" 
                              style={{ backgroundColor: getColorHex(selectedColor) }}
                            ></div>
                            <span>{markerColors.find(c => c.value === selectedColor)?.name || 'Выберите цвет'}</span>
                          </div>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="p-1 bg-vista-dark border-vista-secondary/30 w-[var(--radix-popover-trigger-width)]"
                        align="start"
                        sideOffset={4}
                      >
                        <div className="max-h-[300px] overflow-y-auto py-1">
                          {markerColors.map((color) => (
                            <button
                              key={color.value}
                              className={`w-full text-left px-2 py-2 flex items-center hover:bg-vista-dark-lighter rounded ${
                                selectedColor === color.value ? 'bg-vista-dark-lighter' : ''
                              }`}
                              onClick={() => handleColorChange(color.value)}
                            >
                              <div 
                                className="w-5 h-5 rounded-full mr-3 flex-shrink-0" 
                                style={{ backgroundColor: color.hex }}
                              ></div>
                              <span className="text-vista-light">{color.name}</span>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Кнопки одна под другой */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="text-vista-light/60 text-sm mb-1">Состав на матч</div>
                      <Button 
                        className="w-full h-[33px] bg-vista-primary/90 hover:bg-vista-primary text-vista-dark flex items-center justify-center"
                        onClick={handleSquadModalOpen}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Редактировать
                      </Button>
                    </div>

                    <div>
                      <div className="text-vista-light/60 text-sm mb-1">Статистика</div>
                      <Button 
                        className="w-full h-[33px] bg-vista-primary/90 hover:bg-vista-primary text-vista-dark flex items-center justify-center"
                        onClick={handleStatsEdit}
                        disabled={savingStats}
                      >
                        <BarChart2 className="w-4 h-4 mr-2" />
                        {isEditingStats ? 'Сохранить' : 'Редактировать'}
                      </Button>
                      <Button 
                        className="w-full h-[33px] bg-red-400/80 hover:bg-red-500/60 text-white flex items-center justify-center mt-2 transition-colors"
                        onClick={() => setIsDeleteDialogOpen(true)}
                      >
                        Удалить матч
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Нижний блок: Состав и статистика игроков */}
      <Card className="bg-vista-dark/50 border-vista-secondary/50">
        <CardContent className="p-4">
          <h3 className="text-xl font-semibold text-vista-light mb-4">
            Состав на матч
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-vista-light/70 border-b border-vista-secondary/30">
                  <th className="py-3 px-4">Игрок</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4">Минуты</th>
                  <th className="py-3 px-4">Голы</th>
                  <th className="py-3 px-4">Ассисты</th>
                  <th className="py-3 px-4">ЖК</th>
                  <th className="py-3 px-4">КК</th>
                </tr>
              </thead>
              <tbody>
                {match.playerStats && match.playerStats.length > 0 ? (
                  match.playerStats.map((stat) => (
                    <tr key={stat.id} className="border-b border-vista-secondary/20 hover:bg-vista-dark-lighter/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            {stat.player.imageUrl ? (
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                                <img
                                  src={stat.player.imageUrl}
                                  alt={`${stat.player.firstName} ${stat.player.lastName}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-vista-light flex items-center">
                              {stat.player.number && (
                                <span className="text-xs px-1.5 py-0.5 bg-vista-primary/20 text-vista-primary rounded mr-2">
                                  #{stat.player.number}
                                </span>
                              )}
                              {stat.player.firstName} {stat.player.lastName}
                            </div>
                            {stat.player.position && (
                              <div className="text-xs text-vista-light/60">
                                {stat.player.position}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded ${stat.isStarter ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {stat.isStarter ? 'Основной' : 'Запасной'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-vista-light">
                        {isEditingStats ? (
                          <input
                            type="number"
                            min="0"
                            className="w-16 bg-vista-dark-lighter border border-vista-secondary/30 rounded px-2 py-1 text-vista-light text-center"
                            value={editedStats[stat.id]?.minutesPlayed || 0}
                            onChange={(e) => handleStatChange(stat.id, 'minutesPlayed', parseInt(e.target.value) || 0)}
                            onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                          />
                        ) : (
                          stat.minutesPlayed
                        )}
                      </td>
                      <td className="py-3 px-4 text-vista-light">
                        {isEditingStats ? (
                          <input
                            type="number"
                            min="0"
                            className="w-16 bg-vista-dark-lighter border border-vista-secondary/30 rounded px-2 py-1 text-vista-light text-center"
                            value={editedStats[stat.id]?.goals || 0}
                            onChange={(e) => handleStatChange(stat.id, 'goals', parseInt(e.target.value) || 0)}
                            onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                          />
                        ) : (
                          stat.goals
                        )}
                      </td>
                      <td className="py-3 px-4 text-vista-light">
                        {isEditingStats ? (
                          <input
                            type="number"
                            min="0"
                            className="w-16 bg-vista-dark-lighter border border-vista-secondary/30 rounded px-2 py-1 text-vista-light text-center"
                            value={editedStats[stat.id]?.assists || 0}
                            onChange={(e) => handleStatChange(stat.id, 'assists', parseInt(e.target.value) || 0)}
                            onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                          />
                        ) : (
                          stat.assists
                        )}
                      </td>
                      <td className="py-3 px-4 text-vista-light">
                        {isEditingStats ? (
                          <input
                            type="number"
                            min="0"
                            className="w-16 bg-vista-dark-lighter border border-vista-secondary/30 rounded px-2 py-1 text-vista-light text-center"
                            value={editedStats[stat.id]?.yellowCards || 0}
                            onChange={(e) => handleStatChange(stat.id, 'yellowCards', parseInt(e.target.value) || 0)}
                            onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                          />
                        ) : (
                          stat.yellowCards
                        )}
                      </td>
                      <td className="py-3 px-4 text-vista-light">
                        {isEditingStats ? (
                          <input
                            type="number"
                            min="0"
                            className="w-16 bg-vista-dark-lighter border border-vista-secondary/30 rounded px-2 py-1 text-vista-light text-center"
                            value={editedStats[stat.id]?.redCards || 0}
                            onChange={(e) => handleStatChange(stat.id, 'redCards', parseInt(e.target.value) || 0)}
                            onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                          />
                        ) : (
                          stat.redCards
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-vista-light/60">
                      Нет данных по составу на матч
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Squad Selection Modal */}
      <SquadSelectionModal
        open={squadModalOpen}
        onOpenChange={setSquadModalOpen}
        teamPlayers={teamPlayers}
        squadPlayers={squadPlayers}
        isLoadingPlayers={isLoadingPlayers}
        handlePlayerStatusChange={handlePlayerStatusChange}
        savingSquad={savingSquad}
        onSave={saveSquadSelection}
        onCancel={() => setSquadModalOpen(false)}
      />

      {/* Кнопка удаления матча и диалог подтверждения */}
      <DeleteMatchModal
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        isDeleting={isDeleting}
        onDelete={handleDeleteMatch}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {/* Модалка редактирования данных матча */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-hidden backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl">Редактировать данные матча</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEditSave(); }} className="space-y-4">
            {/* Тип соревнований */}
            <div className="space-y-2">
              <Label htmlFor="competitionType" className="text-vista-light/40 font-normal">Тип соревнований</Label>
              <Select value={editForm.competitionType} onValueChange={v => handleEditFormChange('competitionType', v)}>
                <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                  <SelectValue placeholder="Выберите тип соревнований" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30">
                  <SelectItem value="FRIENDLY" className="text-vista-light">Товарищеский</SelectItem>
                  <SelectItem value="LEAGUE" className="text-vista-light">Лига</SelectItem>
                  <SelectItem value="CUP" className="text-vista-light">Кубок</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Дата и время матча */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matchDate" className="text-vista-light/40 font-normal">Дата матча</Label>
                <Input
                  id="matchDate"
                  type="date"
                  value={editForm.date}
                  onChange={e => handleEditFormChange('date', e.target.value)}
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matchTime" className="text-vista-light/40 font-normal">Время матча</Label>
                <Input
                  id="matchTime"
                  type="time"
                  value={editForm.time}
                  onChange={e => handleEditFormChange('time', e.target.value)}
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
                />
              </div>
            </div>
            {/* Статус матча */}
            <div className="space-y-2">
              <Label htmlFor="matchStatus" className="text-vista-light/40 font-normal">Статус матча</Label>
              <Select
                value={editForm.status || (selectedStatus as string) || 'SCHEDULED'}
                onValueChange={v => { handleEditFormChange('status', v); setSelectedStatus(v); }}
              >
                <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                  <SelectValue placeholder="Выберите статус матча" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30">
                  <SelectItem value="SCHEDULED" className="text-vista-light">Запланирован</SelectItem>
                  <SelectItem value="FINISHED" className="text-vista-light">Завершён</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Тип матча (домашний/выездной) */}
            <div className="space-y-2">
              <Label htmlFor="isHome" className="text-vista-light/40 font-normal">Тип матча</Label>
              <Select
                value={editForm.isHome ? 'HOME' : 'AWAY'}
                onValueChange={v => handleEditFormChange('isHome', v === 'HOME')}
              >
                <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                  <SelectValue placeholder="Выберите тип матча" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30">
                  <SelectItem value="HOME" className="text-vista-light">Домашний</SelectItem>
                  <SelectItem value="AWAY" className="text-vista-light">Выездной</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Наша команда и голы */}
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col space-y-2">
                <Label htmlFor="teamId" className="text-vista-light/40 font-normal mb-2">Наша команда</Label>
                {isSingleTeam
                  ? <div className="px-3 py-2 rounded bg-vista-dark-lighter border border-vista-secondary/30 text-vista-light min-h-[40px] flex items-center">{teams[0]?.name}</div>
                  : <TeamSelect teams={teams} value={editForm.teamId} onChange={v => handleEditFormChange('teamId', v)} />
                }
              </div>
              <div className="w-20 flex flex-col space-y-2">
                <Label htmlFor="teamGoals" className="text-vista-light/40 font-normal mb-2">Голы</Label>
                <Input
                  id="teamGoals"
                  type="number"
                  min="0"
                  value={editForm.teamGoals}
                  onChange={e => handleEditFormChange('teamGoals', Number(e.target.value))}
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
                  disabled={editForm.status !== 'FINISHED' && selectedStatus !== 'FINISHED'}
                  onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                />
              </div>
            </div>
            {/* Команда соперника и голы */}
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col space-y-2">
                <Label htmlFor="opponentName" className="text-vista-light/40 font-normal mb-2">Команда соперника</Label>
                <Input
                  id="opponentName"
                  value={editForm.opponentName}
                  onChange={e => handleEditFormChange('opponentName', e.target.value)}
                  placeholder="Введите название команды соперника"
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
                />
              </div>
              <div className="w-20 flex flex-col space-y-2">
                <Label htmlFor="opponentGoals" className="text-vista-light/40 font-normal mb-2">Голы</Label>
                <Input
                  id="opponentGoals"
                  type="number"
                  min="0"
                  value={editForm.opponentGoals}
                  onChange={e => handleEditFormChange('opponentGoals', Number(e.target.value))}
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
                  disabled={editForm.status !== 'FINISHED' && selectedStatus !== 'FINISHED'}
                  onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)} className="border-vista-secondary/30">
                Отмена
              </Button>
              <Button type="submit" disabled={savingEdit} className="bg-vista-primary hover:bg-vista-primary/90">
                {savingEdit ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 