'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsersIcon, ChevronLeftIcon, PlusIcon, TrashIcon, UserIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { AddPlayerModal } from '@/components/teams/AddPlayerModal';
import { DeletePlayersModal } from '@/components/teams/DeletePlayersModal';
import { PlayerStatusModal } from '@/components/teams/PlayerStatusModal';
import { PlayersByStatusModal } from '@/components/teams/PlayersByStatusModal';
import AddCoachModal from '@/components/teams/AddCoachModal';
import DeleteCoachesModal from '@/components/teams/DeleteCoachesModal';
import { useTranslation } from 'react-i18next';

interface Team {
  id: string;
  name: string;
  description?: string;
  clubId: string;
  createdAt: string;
  updatedAt: string;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
  imageUrl?: string;
  teamId: string;
  status?: 'ready' | 'rehabilitation' | 'sick' | 'study' | 'other';
}

interface Coach {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string;
    role: string;
  };
  role?: string;
  teamId: string;
  userId: string;
}

interface CoachCandidate {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  role: string;
}

export default function TeamPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(true);
  const [error, setError] = useState('');
  
  // Состояние для отслеживания активной вкладки
  const [activeTab, setActiveTab] = useState('squad');
  
  // Состояние для модального окна добавления игрока
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    firstName: '',
    lastName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Состояние для модального окна удаления игроков
  const [isDeletePlayersDialogOpen, setIsDeletePlayersDialogOpen] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  // Состояние для модального окна выбора статуса
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Состояние для модального окна со списком игроков по статусу
  const [isStatusPlayersDialogOpen, setIsStatusPlayersDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Player['status'] | null>(null);
  const [statusTitle, setStatusTitle] = useState('');

  // Состояние для модального окна добавления тренера
  const [isAddCoachDialogOpen, setIsAddCoachDialogOpen] = useState(false);
  const [availableCoaches, setAvailableCoaches] = useState<CoachCandidate[]>([]);
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>([]);
  const [isAddingCoaches, setIsAddingCoaches] = useState(false);
  const [addCoachError, setAddCoachError] = useState('');

  // Состояние для модального окна удаления тренера
  const [isDeleteCoachesDialogOpen, setIsDeleteCoachesDialogOpen] = useState(false);
  const [selectedCoachIdsToDelete, setSelectedCoachIdsToDelete] = useState<string[]>([]);
  const [isDeletingCoaches, setIsDeletingCoaches] = useState(false);
  const [deleteCoachError, setDeleteCoachError] = useState('');

  useEffect(() => {
    async function fetchTeamData() {
      try {
        setIsLoading(true);
        setError('');
        
        const response = await fetch(`/api/teams/${teamId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError(t('teamPage.error_team_not_found'));
          } else {
            const data = await response.json();
            setError(data.error || t('teamPage.error_loading_team_data'));
          }
          return;
        }
        
        const data = await response.json();
        setTeam(data);
      } catch (error) {
        console.error('Ошибка при загрузке данных команды:', error);
        setError(t('teamPage.error_loading_team_data'));
      } finally {
        setIsLoading(false);
      }
    }
    
    async function fetchPlayersData() {
      try {
        setIsLoadingPlayers(true);
        const response = await fetch(`/api/teams/${teamId}/players`);
        if (!response.ok) {
          console.error('Ошибка при загрузке списка игроков:', response.status);
          return;
        }
        let data = await response.json();
        // Фильтруем только валидные объекты Player
        data = Array.isArray(data) ? data.filter(p => p && typeof p === 'object' && p.id && p.firstName && p.lastName) : [];
        setPlayers(data);
      } catch (error) {
        console.error('Ошибка при загрузке списка игроков:', error);
      } finally {
        setIsLoadingPlayers(false);
      }
    }
    
    async function fetchCoachesData() {
      try {
        setIsLoadingCoaches(true);
        
        const response = await fetch(`/api/teams/${teamId}/coaches`);
        
        if (!response.ok) {
          console.error('Ошибка при загрузке списка тренеров:', response.status);
          return;
        }
        
        const data = await response.json();
        setCoaches(data);
      } catch (error) {
        console.error('Ошибка при загрузке списка тренеров:', error);
      } finally {
        setIsLoadingCoaches(false);
      }
    }
    
    if (session?.user && teamId) {
      fetchTeamData();
      fetchPlayersData();
      fetchCoachesData();
    }
  }, [session, teamId, t]);

  // Защита от автоперезагрузки при возврате на вкладку (visibilitychange)
  useEffect(() => {
    // На всякий случай удаляем все обработчики visibilitychange, если они были добавлены где-то глобально
    const listeners = [] as EventListener[];
    // @ts-ignore
    if (window && window.__vite_plugin_react_preamble_installed) return; // для Vite/Next.js dev mode
    const clone = document.createElement('div');
    for (const key in window) {
      if (key.startsWith('onvisibilitychange')) {
        // @ts-ignore
        window[key] = null;
      }
    }
    document.removeEventListener('visibilitychange', () => {});
    return () => {
      listeners.forEach((l) => document.removeEventListener('visibilitychange', l));
    };
  }, []);

  // Обработчик возврата к списку команд
  const handleBackToList = () => {
    router.push('/dashboard/teams');
  };
  
  // Обработчик изменения полей формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPlayer(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Обработчик отправки формы
  const handleSubmitPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка валидации
    if (!newPlayer.firstName.trim() || !newPlayer.lastName.trim()) {
      setFormError(t('teamPage.fill_required'));
      return;
    }
    
    try {
      setIsSubmitting(true);
      setFormError('');
      
      // Отправляем запрос на создание игрока
      const response = await fetch(`/api/teams/${teamId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPlayer),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('teamPage.error_creating_player'));
      }
      
      const createdPlayer = await response.json();
      
      // Добавляем созданного игрока в список
      safeSetPlayers(prev => [...prev, createdPlayer.player]);
      
      // Закрываем модальное окно и сбрасываем форму
      setIsAddPlayerDialogOpen(false);
      setNewPlayer({
        firstName: '',
        lastName: ''
      });
      
      // Редирект на страницу профиля нового игрока
      router.push(`/dashboard/teams/${teamId}/players/${createdPlayer.player.id}`);
      
    } catch (error: any) {
      console.error('Ошибка при создании игрока:', error);
      setFormError(error.message || t('teamPage.error_creating_player'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Открытие модального окна добавления игрока
  const handleOpenAddPlayerDialog = () => {
    setNewPlayer({
      firstName: '',
      lastName: ''
    });
    setFormError('');
    setIsAddPlayerDialogOpen(true);
  };

  // Открытие модального окна удаления игроков
  const handleOpenDeletePlayersDialog = () => {
    setSelectedPlayerIds([]);
    setDeleteError('');
    setIsDeletePlayersDialogOpen(true);
  };

  // Обработчик выбора игрока для удаления
  const handlePlayerSelectionChange = (playerId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPlayerIds(prev => [...prev, playerId]);
    } else {
      setSelectedPlayerIds(prev => prev.filter(id => id !== playerId));
    }
  };

  // Обработчик удаления выбранных игроков
  const handleDeletePlayers = async () => {
    if (selectedPlayerIds.length === 0) {
      setDeleteError(t('teamPage.select_player_to_delete'));
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');

      // Отправляем запрос на удаление игроков
      const response = await fetch(`/api/teams/${teamId}/players`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerIds: selectedPlayerIds }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('teamPage.error_deleting_players'));
      }

      // Обновляем список игроков
      safeSetPlayers(prev => prev.filter(player => !selectedPlayerIds.includes(player.id)));

      // Закрываем модальное окно
      setIsDeletePlayersDialogOpen(false);
      setSelectedPlayerIds([]);
    } catch (error: any) {
      console.error('Ошибка при удалении игроков:', error);
      setDeleteError(error.message || t('teamPage.error_deleting_players'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Обработчик изменения статуса игрока
  const handleUpdatePlayerStatus = async (status: Player['status']) => {
    if (!selectedPlayer) return;
    
    try {
      setIsUpdatingStatus(true);
      setStatusError('');
      
      console.log(`Sending PATCH request to update player ${selectedPlayer.id} status to ${status}`);
      
      // Отправляем запрос на обновление статуса игрока
      const response = await fetch(`/api/teams/${teamId}/players/${selectedPlayer.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Error response data:', data);
        throw new Error(data.error || data.details || t('teamPage.error_updating_player_status'));
      }
      
      const result = await response.json();
      console.log('Update successful:', result);
      
      // Обновляем список игроков
      safeSetPlayers(prev => prev.map(player => 
        player.id === selectedPlayer.id ? { ...player, status } : player
      ));
      
      // Закрываем модальное окно
      setIsStatusDialogOpen(false);
      setSelectedPlayer(null);
      
    } catch (error: any) {
      console.error('Ошибка при обновлении статуса игрока:', error);
      setStatusError(error.message || t('teamPage.error_updating_player_status'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Обработчик открытия модального окна со статусом
  const handleOpenStatusPlayersDialog = (status: Player['status'] | null, title: string) => {
    setSelectedStatus(status);
    setStatusTitle(title);
    setIsStatusPlayersDialogOpen(true);
  };

  // Обработчик открытия модального окна добавления тренера
  const handleOpenAddCoachDialog = async () => {
    try {
      setAddCoachError('');
      setSelectedCoachIds([]);
      
      // Загружаем доступных тренеров, которые еще не в команде
      const response = await fetch(`/api/users/coaches?teamId=${teamId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('teamPage.error_loading_coaches'));
      }
      
      const coaches = await response.json();
      setAvailableCoaches(coaches);
      
      // Открываем диалог
      setIsAddCoachDialogOpen(true);
    } catch (error: any) {
      console.error('Ошибка при получении списка доступных тренеров:', error);
      setAddCoachError(error.message || t('teamPage.error_loading_coaches'));
    }
  };

  // Обработчик выбора тренера для добавления
  const handleCoachSelectionChange = (coachId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedCoachIds(prev => [...prev, coachId]);
    } else {
      setSelectedCoachIds(prev => prev.filter(id => id !== coachId));
    }
  };

  // Обработчик добавления выбранных тренеров
  const handleAddCoaches = async () => {
    if (selectedCoachIds.length === 0) {
      setAddCoachError(t('teamPage.select_coach_to_add'));
      return;
    }

    try {
      setIsAddingCoaches(true);
      setAddCoachError('');

      // Отправляем запрос на добавление тренеров
      const response = await fetch(`/api/teams/${teamId}/coaches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coachIds: selectedCoachIds }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('teamPage.error_adding_coaches'));
      }

      // Обновляем список тренеров
      const coachesResponse = await fetch(`/api/teams/${teamId}/coaches`);
      if (coachesResponse.ok) {
        const data = await coachesResponse.json();
        setCoaches(data);
      }

      // Закрываем модальное окно
      setIsAddCoachDialogOpen(false);
      setSelectedCoachIds([]);
    } catch (error: any) {
      console.error('Ошибка при добавлении тренеров:', error);
      setAddCoachError(error.message || t('teamPage.error_adding_coaches'));
    } finally {
      setIsAddingCoaches(false);
    }
  };

  // Обработчик открытия модального окна удаления тренеров
  const handleOpenDeleteCoachesDialog = () => {
    setSelectedCoachIdsToDelete([]);
    setDeleteCoachError('');
    setIsDeleteCoachesDialogOpen(true);
  };

  // Обработчик выбора тренера для удаления
  const handleCoachSelectionToDeleteChange = (userId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedCoachIdsToDelete(prev => [...prev, userId]);
    } else {
      setSelectedCoachIdsToDelete(prev => prev.filter(id => id !== userId));
    }
  };

  // Обработчик удаления выбранных тренеров
  const handleDeleteCoaches = async () => {
    if (selectedCoachIdsToDelete.length === 0) {
      setDeleteCoachError(t('teamPage.select_coach_to_delete'));
      return;
    }

    try {
      setIsDeletingCoaches(true);
      setDeleteCoachError('');

      // Отправляем запрос на удаление тренеров
      const response = await fetch(`/api/teams/${teamId}/coaches`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coachIds: selectedCoachIdsToDelete }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('teamPage.error_deleting_coaches'));
      }

      // Обновляем список тренеров
      setCoaches(prev => prev.filter(coach => !selectedCoachIdsToDelete.includes(coach.userId)));

      // Закрываем модальное окно
      setIsDeleteCoachesDialogOpen(false);
      setSelectedCoachIdsToDelete([]);
    } catch (error: any) {
      console.error('Ошибка при удалении тренеров:', error);
      setDeleteCoachError(error.message || t('teamPage.error_deleting_coaches'));
    } finally {
      setIsDeletingCoaches(false);
    }
  };

  // Все setPlayers([...prev, ...]) и setPlayers(prev => ...) — фильтруем undefined/null
  const safeSetPlayers = (updater: (prev: Player[]) => Player[]) => {
    setPlayers(prev => {
      const next = updater(prev);
      return next.filter(p => p && typeof p === 'object' && p.id && p.firstName && p.lastName);
    });
  };

  // Перед рендером списка игроков:
  const sortedPlayers = [...players].sort((a, b) => a.lastName.localeCompare(b.lastName, 'ru'));

  return (
    <div className="space-y-6">
      {/* Шапка страницы с кнопкой возврата и названием команды */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-vista-dark/70 border border-vista-secondary/30 py-1 px-3 rounded-md text-vista-light h-9 flex items-center">
            <div>
              <h1 className="text-sm font-medium">
                {isLoading ? t('teamPage.loading') : team?.name || t('teamPage.team_name')}
              </h1>
              {team?.description && (
                <p className="text-xs text-vista-light/70">{team.description}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark border-none"
            onClick={activeTab === 'squad' ? handleOpenAddPlayerDialog : handleOpenAddCoachDialog}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            {activeTab === 'squad' ? t('teamPage.add_player') : t('teamPage.add_coach')}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-red-500/80 hover:bg-red-500 text-white border-none"
            onClick={activeTab === 'squad' ? handleOpenDeletePlayersDialog : handleOpenDeleteCoachesDialog}
            disabled={activeTab === 'squad' ? players.length === 0 : coaches.length === 0}
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            {activeTab === 'squad' ? t('teamPage.delete_player') : t('teamPage.delete_coach')}
          </Button>
        </div>
      </div>

      {/* Основное содержимое */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
        </div>
      ) : error ? (
        <Card className="bg-vista-dark/50 border-vista-secondary/30">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="mb-4 text-vista-light/50">
                <UsersIcon className="mx-auto h-12 w-12" />
              </div>
              <p className="text-vista-light/70">{error}</p>
              <Button 
                className="mt-4 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                onClick={handleBackToList}
              >
                {t('teamPage.back_to_teams_list')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : team ? (
        <div className="space-y-6">
          {/* Табы для разделов */}
          <Tabs defaultValue="squad" className="w-full" onValueChange={(value) => setActiveTab(value)}>
            <div className="flex items-center justify-between bg-vista-dark/50 border-b border-vista-secondary/30">
              <TabsList className="bg-transparent border-0 rounded-none justify-start z-50">
                <TabsTrigger value="squad" className="data-[state=active]:bg-vista-primary/20 data-[state=active]:text-vista-primary">
                  {t('teamPage.squad')}
                </TabsTrigger>
                <TabsTrigger value="staff" className="data-[state=active]:bg-vista-primary/20 data-[state=active]:text-vista-primary">
                  {t('teamPage.staff')}
                </TabsTrigger>
              </TabsList>
              
              {activeTab === 'squad' && (
                <div className="flex items-center space-x-2 px-2">
                  <div 
                    className="flex items-center rounded-md bg-green-500/20 px-2 py-1 cursor-pointer hover:bg-green-500/30"
                    onClick={() => handleOpenStatusPlayersDialog('ready', t('teamPage.ready'))}
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-300 text-xs whitespace-nowrap">
                      {t('teamPage.ready')}: {(players || []).filter(p => p && (p.status === 'ready' || !p.status)).length}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center rounded-md bg-blue-500/20 px-2 py-1 cursor-pointer hover:bg-blue-500/30"
                    onClick={() => handleOpenStatusPlayersDialog('rehabilitation', t('teamPage.rehabilitation'))}
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-blue-300 text-xs whitespace-nowrap">
                      {t('teamPage.rehabilitation')}: {(players || []).filter(p => p && p.status === 'rehabilitation').length}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center rounded-md bg-yellow-500/20 px-2 py-1 cursor-pointer hover:bg-yellow-500/30"
                    onClick={() => handleOpenStatusPlayersDialog('sick', t('teamPage.sick'))}
                  >
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-yellow-300 text-xs whitespace-nowrap">
                      {t('teamPage.sick')}: {(players || []).filter(p => p && p.status === 'sick').length}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center rounded-md bg-purple-500/20 px-2 py-1 cursor-pointer hover:bg-purple-500/30"
                    onClick={() => handleOpenStatusPlayersDialog('study', t('teamPage.study'))}
                  >
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    <span className="text-purple-300 text-xs whitespace-nowrap">
                      {t('teamPage.study')}: {(players || []).filter(p => p && p.status === 'study').length}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center rounded-md bg-gray-500/20 px-2 py-1 cursor-pointer hover:bg-gray-500/30"
                    onClick={() => handleOpenStatusPlayersDialog('other', t('teamPage.other'))}
                  >
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                    <span className="text-gray-300 text-xs whitespace-nowrap">
                      {t('teamPage.other')}: {(players || []).filter(p => p && p.status === 'other').length}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <TabsContent value="squad">
              <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-vista-light">{t('teamPage.squad_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingPlayers ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary"></div>
                    </div>
                  ) : players.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                      {sortedPlayers.map(player => (
                        <div 
                          key={player.id} 
                          className="bg-gray-50/30 rounded-md overflow-hidden cursor-pointer group relative transition-all duration-200 hover:ring-1 hover:ring-vista-primary hover:ring-offset-0 hover:ring-offset-gray-800/20 shadow-md"
                          onClick={() => router.push(`/dashboard/teams/${teamId}/players/${player.id}`)}
                        >
                          {/* Номер игрока в верхнем правом углу */}
                          {player.number && (
                            <div className="absolute top-[2px] right-[2px] bg-gray-800/85 text-vista-primary rounded-md px-1 py-0.5 text-sm font-medium z-50 shadow-md">
                              {player.number}
                            </div>
                          )}
                          
                          {/* Фото игрока */}
                          <div className="w-full aspect-square relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] z-0" />
                            {player.imageUrl ? (
                              <img 
                                src={player.imageUrl}
                                alt={`${player.firstName} ${player.lastName}`}
                                className="w-full h-full object-cover z-10 relative"
                                style={{ background: 'transparent' }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center z-10 relative">
                                <UserIcon className="w-12 h-12 text-slate-300" />
                              </div>
                            )}
                          </div>
                          
                          {/* Информация об игроке */}
                          <div className="p-2 bg-gray-800/90">
                            <div className="text-center">
                              {player.firstName && (
                                <p className="text-vista-light/70 text-xs">{player.firstName}</p>
                              )}
                              {player.lastName && (
                                <p className="text-vista-light font-medium">{player.lastName}</p>
                              )}
                              <div className="flex justify-between items-center mt-1">
                                {player.position && (
                                  <p className="text-[10px] text-vista-light/70 uppercase truncate max-w-[40%]">{player.position}</p>
                                )}
                                <div 
                                  className={`text-[10px] px-1.5 py-0.5 rounded-sm cursor-pointer truncate max-w-[55%] text-center ml-auto ${
                                    player.status === 'rehabilitation' ? 'bg-blue-500/20 text-blue-300' :
                                    player.status === 'sick' ? 'bg-yellow-500/20 text-yellow-300' :
                                    player.status === 'study' ? 'bg-purple-500/20 text-purple-300' :
                                    player.status === 'other' ? 'bg-gray-500/20 text-gray-300' :
                                    'bg-green-500/20 text-green-300'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsStatusDialogOpen(true);
                                    setSelectedPlayer(player);
                                  }}
                                >
                                  {player.status === 'rehabilitation' ? t('teamPage.rehabilitation') :
                                    player.status === 'sick' ? t('teamPage.sick') :
                                    player.status === 'study' ? t('teamPage.study') :
                                    player.status === 'other' ? t('teamPage.other') :
                                    t('teamPage.ready')
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mb-4 text-vista-light/50">
                        <UsersIcon className="mx-auto h-12 w-12" />
                      </div>
                      <p className="text-vista-light/70">{t('teamPage.no_players_in_team')}</p>
                      <Button 
                        onClick={handleOpenAddPlayerDialog}
                        className="mt-4 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        {t('teamPage.add_first_player')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="staff">
              <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-vista-light">{t('teamPage.staff_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCoaches ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary"></div>
                    </div>
                  ) : coaches.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {coaches.map(coach => (
                        <div 
                          key={coach.id} 
                          className="bg-vista-dark/70 rounded-md overflow-hidden shadow-md border border-vista-secondary/30"
                        >
                          <div className="p-4 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full overflow-hidden relative bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] mb-3">
                              {coach.user.imageUrl ? (
                                <img 
                                  src={coach.user.imageUrl} 
                                  alt={coach.user.name || t('teamPage.coach')} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <UserIcon className="w-8 h-8 text-slate-300" />
                                </div>
                              )}
                            </div>
                            
                            <h3 className="font-medium text-vista-light">{coach.user.name || t('teamPage.coach_not_specified')}</h3>
                            <p className="text-sm text-vista-light/70 mt-1">{coach.user.email}</p>
                            
                            {coach.role && (
                              <div className="mt-2 px-2 py-1 bg-vista-primary/20 rounded text-xs text-vista-primary">
                                {coach.role}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mb-4 text-vista-light/50">
                        <UsersIcon className="mx-auto h-12 w-12" />
                      </div>
                      <p className="text-vista-light/70">{t('teamPage.no_coaches_in_team')}</p>
                      <Button 
                        onClick={handleOpenAddCoachDialog}
                        className="mt-4 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        {t('teamPage.add_first_coach')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
      
      {/* Модальное окно добавления игрока */}
      <AddPlayerModal
        open={isAddPlayerDialogOpen}
        onOpenChange={setIsAddPlayerDialogOpen}
        firstName={newPlayer.firstName}
        lastName={newPlayer.lastName}
        isSubmitting={isSubmitting}
        formError={formError}
        onChange={handleInputChange}
        onSubmit={handleSubmitPlayer}
      />

      {/* Модальное окно удаления игроков */}
      <DeletePlayersModal
        open={isDeletePlayersDialogOpen}
        onOpenChange={setIsDeletePlayersDialogOpen}
        players={players}
        selectedPlayerIds={selectedPlayerIds}
        isDeleting={isDeleting}
        deleteError={deleteError}
        onPlayerSelect={handlePlayerSelectionChange}
        onDelete={handleDeletePlayers}
      />

      {/* Модальное окно выбора статуса игрока */}
      <PlayerStatusModal
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        playerName={selectedPlayer ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}` : t('teamPage.player')}
        statusError={statusError}
        onStatusSelect={handleUpdatePlayerStatus}
      />

      {/* Модальное окно со списком игроков по статусу */}
      <PlayersByStatusModal
        open={isStatusPlayersDialogOpen}
        onOpenChange={setIsStatusPlayersDialogOpen}
        players={players}
        statusTitle={statusTitle}
        selectedStatus={selectedStatus ?? null}
      />

      {/* Модальное окно добавления тренера */}
      <AddCoachModal
        open={isAddCoachDialogOpen}
        onOpenChange={setIsAddCoachDialogOpen}
        availableCoaches={availableCoaches}
        selectedCoachIds={selectedCoachIds}
        onCoachSelect={handleCoachSelectionChange}
        onAdd={handleAddCoaches}
        isAdding={isAddingCoaches}
        addCoachError={addCoachError}
      />

      {/* Модальное окно удаления тренеров */}
      <DeleteCoachesModal
        open={isDeleteCoachesDialogOpen}
        onOpenChange={setIsDeleteCoachesDialogOpen}
        coaches={coaches}
        selectedCoachIdsToDelete={selectedCoachIdsToDelete}
        onCoachSelect={handleCoachSelectionToDeleteChange}
        onDelete={handleDeleteCoaches}
        isDeleting={isDeletingCoaches}
        deleteCoachError={deleteCoachError}
      />
    </div>
  );
} 