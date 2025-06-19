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
            setError('Команда не найдена');
          } else {
            const data = await response.json();
            setError(data.error || 'Ошибка при загрузке данных команды');
          }
          return;
        }
        
        const data = await response.json();
        setTeam(data);
      } catch (error) {
        console.error('Ошибка при загрузке данных команды:', error);
        setError('Не удалось загрузить данные команды');
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
  }, [session, teamId]);

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
      setFormError('Заполните все обязательные поля');
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
        throw new Error(data.error || 'Ошибка при создании игрока');
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
      setFormError(error.message || 'Не удалось создать игрока');
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
      setDeleteError('Выберите хотя бы одного игрока для удаления');
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
        throw new Error(data.error || 'Ошибка при удалении игроков');
      }

      // Обновляем список игроков
      safeSetPlayers(prev => prev.filter(player => !selectedPlayerIds.includes(player.id)));

      // Закрываем модальное окно
      setIsDeletePlayersDialogOpen(false);
      setSelectedPlayerIds([]);
    } catch (error: any) {
      console.error('Ошибка при удалении игроков:', error);
      setDeleteError(error.message || 'Не удалось удалить игроков');
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
        throw new Error(data.error || data.details || 'Ошибка при обновлении статуса игрока');
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
      setStatusError(error.message || 'Не удалось обновить статус игрока');
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
        throw new Error(data.error || 'Ошибка при загрузке списка тренеров');
      }
      
      const coaches = await response.json();
      setAvailableCoaches(coaches);
      
      // Открываем диалог
      setIsAddCoachDialogOpen(true);
    } catch (error: any) {
      console.error('Ошибка при получении списка доступных тренеров:', error);
      setAddCoachError(error.message || 'Не удалось загрузить список тренеров');
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
      setAddCoachError('Выберите хотя бы одного тренера для добавления');
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
        throw new Error(data.error || 'Ошибка при добавлении тренеров');
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
      setAddCoachError(error.message || 'Не удалось добавить тренеров');
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
      setDeleteCoachError('Выберите хотя бы одного тренера для удаления');
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
        throw new Error(data.error || 'Ошибка при удалении тренеров');
      }

      // Обновляем список тренеров
      setCoaches(prev => prev.filter(coach => !selectedCoachIdsToDelete.includes(coach.userId)));

      // Закрываем модальное окно
      setIsDeleteCoachesDialogOpen(false);
      setSelectedCoachIdsToDelete([]);
    } catch (error: any) {
      console.error('Ошибка при удалении тренеров:', error);
      setDeleteCoachError(error.message || 'Не удалось удалить тренеров');
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToList}
            className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-2" />
            Назад к списку
          </Button>
          
          <div className="bg-vista-dark/70 border border-vista-secondary/30 py-1 px-3 rounded-md text-vista-light h-9 flex items-center">
            <div>
              <h1 className="text-sm font-medium">
                {isLoading ? 'Загрузка...' : team?.name || 'Команда'}
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
            {activeTab === 'squad' ? 'Добавить игрока' : 'Добавить тренера'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-red-500/80 hover:bg-red-500 text-white border-none"
            onClick={activeTab === 'squad' ? handleOpenDeletePlayersDialog : handleOpenDeleteCoachesDialog}
            disabled={activeTab === 'squad' ? players.length === 0 : coaches.length === 0}
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            {activeTab === 'squad' ? 'Удалить игрока' : 'Удалить тренера'}
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
                Вернуться к списку команд
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
                  Состав
                </TabsTrigger>
                <TabsTrigger value="staff" className="data-[state=active]:bg-vista-primary/20 data-[state=active]:text-vista-primary">
                  Тренерский штаб
                </TabsTrigger>
              </TabsList>
              
              {activeTab === 'squad' && (
                <div className="flex items-center space-x-2 px-2">
                  <div 
                    className="flex items-center rounded-md bg-green-500/20 px-2 py-1 cursor-pointer hover:bg-green-500/30"
                    onClick={() => handleOpenStatusPlayersDialog('ready', 'Готов')}
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-300 text-xs whitespace-nowrap">
                      Готов: {(players || []).filter(p => p && (p.status === 'ready' || !p.status)).length}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center rounded-md bg-blue-500/20 px-2 py-1 cursor-pointer hover:bg-blue-500/30"
                    onClick={() => handleOpenStatusPlayersDialog('rehabilitation', 'Реабилитация')}
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-blue-300 text-xs whitespace-nowrap">
                      Реабилитация: {(players || []).filter(p => p && p.status === 'rehabilitation').length}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center rounded-md bg-yellow-500/20 px-2 py-1 cursor-pointer hover:bg-yellow-500/30"
                    onClick={() => handleOpenStatusPlayersDialog('sick', 'Болеет')}
                  >
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-yellow-300 text-xs whitespace-nowrap">
                      Болеет: {(players || []).filter(p => p && p.status === 'sick').length}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center rounded-md bg-purple-500/20 px-2 py-1 cursor-pointer hover:bg-purple-500/30"
                    onClick={() => handleOpenStatusPlayersDialog('study', 'Учеба')}
                  >
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    <span className="text-purple-300 text-xs whitespace-nowrap">
                      Учеба: {(players || []).filter(p => p && p.status === 'study').length}
                    </span>
                  </div>
                  
                  <div 
                    className="flex items-center rounded-md bg-gray-500/20 px-2 py-1 cursor-pointer hover:bg-gray-500/30"
                    onClick={() => handleOpenStatusPlayersDialog('other', 'Другое')}
                  >
                    <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                    <span className="text-gray-300 text-xs whitespace-nowrap">
                      Другое: {(players || []).filter(p => p && p.status === 'other').length}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <TabsContent value="squad">
              <Card className="bg-vista-dark/50 border-vista-secondary/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-vista-light">Состав команды</CardTitle>
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
                                  {player.status === 'rehabilitation' ? 'Реабилитация' :
                                    player.status === 'sick' ? 'Болеет' :
                                    player.status === 'study' ? 'Учеба' :
                                    player.status === 'other' ? 'Другое' :
                                    'Готов'
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
                      <p className="text-vista-light/70">В команде пока нет игроков</p>
                      <Button 
                        onClick={handleOpenAddPlayerDialog}
                        className="mt-4 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Добавить первого игрока
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="staff">
              <Card className="bg-vista-dark/50 border-vista-secondary/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-vista-light">Тренерский штаб</CardTitle>
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
                                  alt={coach.user.name || 'Тренер'} 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <UserIcon className="w-8 h-8 text-slate-300" />
                                </div>
                              )}
                            </div>
                            
                            <h3 className="font-medium text-vista-light">{coach.user.name || 'Не указано'}</h3>
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
                      <p className="text-vista-light/70">В команде пока нет тренеров</p>
                      <Button 
                        onClick={handleOpenAddCoachDialog}
                        className="mt-4 bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Добавить первого тренера
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
      <Dialog open={isAddPlayerDialogOpen} onOpenChange={setIsAddPlayerDialogOpen}>
        <DialogContent className="bg-vista-dark/95 border-vista-secondary/30 text-vista-light max-w-md">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl">Добавление игрока</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPlayer}>
            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
                {formError}
              </div>
            )}
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-vista-light">
                  Имя <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={newPlayer.firstName}
                  onChange={handleInputChange}
                  className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                  placeholder="Введите имя игрока"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-vista-light">
                  Фамилия <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={newPlayer.lastName}
                  onChange={handleInputChange}
                  className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                  placeholder="Введите фамилию игрока"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddPlayerDialogOpen(false)}
                disabled={isSubmitting}
                className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-vista-dark border-t-transparent rounded-full"></div>
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Модальное окно удаления игроков */}
      <Dialog open={isDeletePlayersDialogOpen} onOpenChange={setIsDeletePlayersDialogOpen}>
        <DialogContent className="bg-vista-dark/95 border-vista-secondary/30 text-vista-light max-w-md">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl">Удаление игроков</DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Выберите игроков, которых нужно удалить из команды
            </DialogDescription>
          </DialogHeader>
          
          {deleteError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
              {deleteError}
            </div>
          )}

          <div className="py-4 max-h-[300px] overflow-y-auto">
            {players.length > 0 ? (
              <div className="space-y-2">
                {players.map(player => (
                  <div key={player.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-vista-dark/70">
                    <Checkbox 
                      id={`player-${player.id}`} 
                      checked={selectedPlayerIds.includes(player.id)}
                      onCheckedChange={(checked) => handlePlayerSelectionChange(player.id, checked === true)}
                      className="border-vista-secondary/50"
                    />
                    <Label htmlFor={`player-${player.id}`} className="cursor-pointer flex-1 flex items-center">
                      <div className="flex items-center w-full">
                        {player.imageUrl ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                            <img 
                              src={player.imageUrl} 
                              alt={`${player.firstName} ${player.lastName}`} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full mr-3 flex items-center justify-center bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                            <UserIcon className="w-5 h-5 text-slate-300" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-vista-light font-medium">{player.lastName} {player.firstName}</p>
                          {player.position && <p className="text-xs text-vista-light/70">{player.position}</p>}
                        </div>
                        {player.number && (
                          <div className="ml-auto bg-vista-primary/20 rounded-full w-6 h-6 flex items-center justify-center">
                            <span className="text-xs font-medium text-vista-primary">{player.number}</span>
                          </div>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-vista-light/70">В команде нет игроков</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeletePlayersDialogOpen(false)}
              disabled={isDeleting}
              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleDeletePlayers}
              disabled={isDeleting || selectedPlayerIds.length === 0}
              className="bg-red-500/80 hover:bg-red-500 text-white"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Удаление...
                </>
              ) : (
                `Удалить ${selectedPlayerIds.length ? `(${selectedPlayerIds.length})` : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно выбора статуса игрока */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="bg-vista-dark/95 border-vista-secondary/30 text-vista-light max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl">Изменение статуса</DialogTitle>
            <DialogDescription className="text-vista-light/70">
              {selectedPlayer ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}` : 'Игрок'}
            </DialogDescription>
          </DialogHeader>
          
          {statusError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
              {statusError}
            </div>
          )}

          <div className="py-4">
            <div className="space-y-2">
              <div 
                className="flex items-center p-2 rounded-md bg-green-500/20 hover:bg-green-500/30 cursor-pointer"
                onClick={() => handleUpdatePlayerStatus('ready')}
              >
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-green-300">Готов</span>
              </div>
              
              <div 
                className="flex items-center p-2 rounded-md bg-blue-500/20 hover:bg-blue-500/30 cursor-pointer"
                onClick={() => handleUpdatePlayerStatus('rehabilitation')}
              >
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-blue-300">Реабилитация</span>
              </div>
              
              <div 
                className="flex items-center p-2 rounded-md bg-yellow-500/20 hover:bg-yellow-500/30 cursor-pointer"
                onClick={() => handleUpdatePlayerStatus('sick')}
              >
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-yellow-300">Болеет</span>
              </div>
              
              <div 
                className="flex items-center p-2 rounded-md bg-purple-500/20 hover:bg-purple-500/30 cursor-pointer"
                onClick={() => handleUpdatePlayerStatus('study')}
              >
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-purple-300">Учеба</span>
              </div>
              
              <div 
                className="flex items-center p-2 rounded-md bg-gray-500/20 hover:bg-gray-500/30 cursor-pointer"
                onClick={() => handleUpdatePlayerStatus('other')}
              >
                <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                <span className="text-gray-300">Другое</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
              disabled={isUpdatingStatus}
              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
            >
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно со списком игроков по статусу */}
      <Dialog open={isStatusPlayersDialogOpen} onOpenChange={setIsStatusPlayersDialogOpen}>
        <DialogContent className="bg-vista-dark/95 border-vista-secondary/30 text-vista-light max-w-md">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl">
              Игроки со статусом "{statusTitle}"
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 max-h-[350px] overflow-y-auto">
            {players.filter(p => 
              selectedStatus === 'ready' 
                ? p && (p.status === 'ready' || !p.status) 
                : p && p.status === selectedStatus
            ).length > 0 ? (
              <div className="space-y-2">
                {(players || []).filter(p => 
                  selectedStatus === 'ready' 
                    ? p && (p.status === 'ready' || !p.status) 
                    : p && p.status === selectedStatus
                ).map(player => (
                  <div 
                    key={player.id} 
                    className="flex items-center p-2 rounded-md hover:bg-vista-dark/70 cursor-pointer"
                    onClick={() => router.push(`/dashboard/teams/${teamId}/players/${player.id}`)}
                  >
                    <div className="flex items-center w-full">
                      {player.imageUrl ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                          <img 
                            src={player.imageUrl} 
                            alt={`${player.firstName} ${player.lastName}`} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full mr-3 flex items-center justify-center bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                          <UserIcon className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-vista-light font-medium">{player.lastName} {player.firstName}</p>
                        {player.position && <p className="text-xs text-vista-light/70">{player.position}</p>}
                      </div>
                      {player.number && (
                        <div className="ml-auto bg-vista-primary/20 rounded-full w-7 h-7 flex items-center justify-center">
                          <span className="text-xs font-medium text-vista-primary">{player.number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-vista-light/70">Нет игроков с таким статусом</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStatusPlayersDialogOpen(false)}
              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно добавления тренера */}
      <Dialog open={isAddCoachDialogOpen} onOpenChange={setIsAddCoachDialogOpen}>
        <DialogContent className="bg-vista-dark/95 border-vista-secondary/30 text-vista-light max-w-md">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl">Добавление тренера</DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Выберите тренеров, которых хотите добавить в команду
            </DialogDescription>
          </DialogHeader>
          
          {addCoachError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
              {addCoachError}
            </div>
          )}

          <div className="py-4 max-h-[300px] overflow-y-auto">
            {availableCoaches.length > 0 ? (
              <div className="space-y-2">
                {availableCoaches.map(coach => (
                  <div key={coach.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-vista-dark/70">
                    <Checkbox 
                      id={`coach-${coach.id}`} 
                      checked={selectedCoachIds.includes(coach.id)}
                      onCheckedChange={(checked) => handleCoachSelectionChange(coach.id, checked === true)}
                      className="border-vista-secondary/50"
                    />
                    <Label htmlFor={`coach-${coach.id}`} className="cursor-pointer flex-1 flex items-center">
                      <div className="flex items-center w-full">
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                          {coach.imageUrl ? (
                            <img 
                              src={coach.imageUrl} 
                              alt={coach.name || 'Тренер'} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full mr-3 flex items-center justify-center bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                              <UserIcon className="w-5 h-5 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-vista-light font-medium">{coach.name || 'Не указано'}</p>
                          <p className="text-xs text-vista-light/70">{coach.email}</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-vista-light/70">Нет доступных тренеров для добавления</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddCoachDialogOpen(false)}
              disabled={isAddingCoaches}
              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleAddCoaches}
              disabled={isAddingCoaches || selectedCoachIds.length === 0}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
            >
              {isAddingCoaches ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-vista-dark border-t-transparent rounded-full"></div>
                  Добавление...
                </>
              ) : (
                `Добавить ${selectedCoachIds.length ? `(${selectedCoachIds.length})` : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно удаления тренеров */}
      <Dialog open={isDeleteCoachesDialogOpen} onOpenChange={setIsDeleteCoachesDialogOpen}>
        <DialogContent className="bg-vista-dark/95 border-vista-secondary/30 text-vista-light max-w-md">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl">Удаление тренеров</DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Выберите тренеров, которых нужно удалить из команды
            </DialogDescription>
          </DialogHeader>
          
          {deleteCoachError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
              {deleteCoachError}
            </div>
          )}

          <div className="py-4 max-h-[300px] overflow-y-auto">
            {coaches.length > 0 ? (
              <div className="space-y-2">
                {coaches.map(coach => (
                  <div key={coach.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-vista-dark/70">
                    <Checkbox 
                      id={`coach-delete-${coach.userId}`} 
                      checked={selectedCoachIdsToDelete.includes(coach.userId)}
                      onCheckedChange={(checked) => handleCoachSelectionToDeleteChange(coach.userId, checked === true)}
                      className="border-vista-secondary/50"
                    />
                    <Label htmlFor={`coach-delete-${coach.userId}`} className="cursor-pointer flex-1 flex items-center">
                      <div className="flex items-center w-full">
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                          {coach.user.imageUrl ? (
                            <img 
                              src={coach.user.imageUrl} 
                              alt={coach.user.name || 'Тренер'} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full mr-3 flex items-center justify-center bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                              <UserIcon className="w-5 h-5 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-vista-light font-medium">{coach.user.name || 'Не указано'}</p>
                          <p className="text-xs text-vista-light/70">{coach.user.email}</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-vista-light/70">Нет тренеров для удаления</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteCoachesDialogOpen(false)}
              disabled={isDeletingCoaches}
              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleDeleteCoaches}
              disabled={isDeletingCoaches || selectedCoachIdsToDelete.length === 0}
              className="bg-red-500/80 hover:bg-red-500 text-white"
            >
              {isDeletingCoaches ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Удаление...
                </>
              ) : (
                `Удалить ${selectedCoachIdsToDelete.length ? `(${selectedCoachIdsToDelete.length})` : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 