'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  UserGroupIcon, 
  UserCircleIcon, 
  PlusIcon, 
  TrashIcon,
  CheckCircleIcon,
  HeartIcon,
  ExclamationCircleIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import PlayerAvatar from '@/components/ui/PlayerAvatar';
import StaffAvatar from '@/components/ui/StaffAvatar';
import { prisma } from '@/lib/prisma';
import { PlayerStatus, AttendanceStatus } from '@prisma/client';

type PlayerForTeamDetails = {
  id: string;
  firstName: string;
  lastName: string;
  number?: number | null;
  position?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  status?: PlayerStatus | null;
};

type Coach = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type Team = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
};

export default function TeamPage() {
  const { teamId, locale } = useParams() as { teamId: string; locale: string };
  const t = useTranslations('team');
  const common = useTranslations('common');
  
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<PlayerForTeamDetails[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('squad');
  
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [showDeletePlayerDialog, setShowDeletePlayerDialog] = useState(false);
  const [showAddCoachDialog, setShowAddCoachDialog] = useState(false);
  const [showDeleteCoachDialog, setShowDeleteCoachDialog] = useState(false);
  const [showStatusPlayersDialog, setShowStatusPlayersDialog] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [playerToDelete, setPlayerToDelete] = useState<string | null>(null);
  const [coachToDelete, setCoachToDelete] = useState<string | null>(null);
  const [allCoaches, setAllCoaches] = useState<Coach[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<PlayerStatus | null>(null);

  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);

  // Загрузка данных о команде
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teams/${teamId}`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки данных команды');
        }
        
        const teamData = await response.json();
        setTeam(teamData);
      } catch (error) {
        console.error('Ошибка загрузки команды:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [teamId]);

  // Загрузка игроков
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teams/${teamId}/players`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки игроков');
        }
        
        const playersData = await response.json();
        setPlayers(playersData);
      } catch (error) {
        console.error('Ошибка загрузки игроков:', error);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchPlayers();
    }
  }, [teamId]);

  // Загрузка тренеров
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teams/${teamId}/coaches`);
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки тренеров');
        }
        
        const coachesData = await response.json();
        setCoaches(coachesData);
      } catch (error) {
        console.error('Ошибка загрузки тренеров:', error);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchCoaches();
    }
  }, [teamId]);

  // Обработчик добавления игрока
  const handleAddPlayer = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Пожалуйста, заполните имя и фамилию игрока');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при добавлении игрока');
      }

      const newPlayer = await response.json();
      setPlayers([...players, newPlayer]);
      setFirstName('');
      setLastName('');
      setShowAddPlayerDialog(false);
    } catch (error) {
      console.error('Ошибка добавления игрока:', error);
      alert('Не удалось добавить игрока');
    }
  };

  // Обработчик удаления игрока
  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/players/${playerToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка при удалении игрока');
      }

      setPlayers(players.filter(player => player.id !== playerToDelete));
      setPlayerToDelete(null);
      setShowDeletePlayerDialog(false);
    } catch (error) {
      console.error('Ошибка удаления игрока:', error);
      alert('Не удалось удалить игрока');
    }
  };

  // Обработчик загрузки всех тренеров
  const handleLoadCoaches = async () => {
    try {
      const response = await fetch('/api/coaches');
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки тренеров');
      }
      
      const coachesData = await response.json();
      setAllCoaches(coachesData);
    } catch (error) {
      console.error('Ошибка загрузки тренеров:', error);
      alert('Не удалось загрузить список тренеров');
    }
  };

  // Обработчик добавления тренера в команду
  const handleAddCoach = async () => {
    if (!selectedCoach) {
      alert('Пожалуйста, выберите тренера');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/coaches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedCoach,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при добавлении тренера');
      }

      const newCoach = await response.json();
      setCoaches([...coaches, newCoach]);
      setSelectedCoach(null);
      setShowAddCoachDialog(false);
    } catch (error) {
      console.error('Ошибка добавления тренера:', error);
      alert('Не удалось добавить тренера');
    }
  };

  // Обработчик удаления тренера из команды
  const handleDeleteCoach = async () => {
    if (!coachToDelete) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/coaches/${coachToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка при удалении тренера из команды');
      }

      setCoaches(coaches.filter(coach => coach.id !== coachToDelete));
      setCoachToDelete(null);
      setShowDeleteCoachDialog(false);
    } catch (error) {
      console.error('Ошибка удаления тренера:', error);
      alert('Не удалось удалить тренера из команды');
    }
  };

  // Обработчик изменения статуса игрока
  const handleChangeStatus = async (playerId: string, status: PlayerStatus) => {
    try {
      const response = await fetch(`/api/players/${playerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при изменении статуса игрока');
      }

      setPlayers(players.map(player => 
        player.id === playerId ? { ...player, status } : player
      ));
      setStatusMenuOpen(null);
    } catch (error) {
      console.error('Ошибка обновления статуса игрока:', error);
      alert('Не удалось обновить статус игрока');
    }
  };
  
  const changeStatus = (player: PlayerForTeamDetails, status: PlayerStatus) => {
    handleChangeStatus(player.id, status).catch(error => {
      console.error('Ошибка при изменении статуса игрока:', error);
    });
  };

  // Получаем иконку в зависимости от статуса
  const getStatusIcon = (status: PlayerStatus | null | undefined) => {
    if (status === undefined || status === null) return null;
    
    switch (status) {
      case PlayerStatus.READY:
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case PlayerStatus.SICK:
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case PlayerStatus.REHABILITATION:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case PlayerStatus.STUDY:
        return <AcademicCapIcon className="h-5 w-5 text-blue-500" />;
      case PlayerStatus.OTHER:
        return <ExclamationCircleIcon className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  // Получаем текст статуса
  const getStatusText = (status: PlayerStatus | null | undefined) => {
    if (status === undefined || status === null) return '';
    
    switch (status) {
      case PlayerStatus.READY:
        return t('status.trained');
      case PlayerStatus.SICK:
        return t('status.sick');
      case PlayerStatus.REHABILITATION:
        return t('status.rehab');
      case PlayerStatus.STUDY:
        return t('status.study');
      case PlayerStatus.OTHER:
        return t('status.other');
      default:
        return '';
    }
  };

  if (loading && !team) {
    return (
      <div className="container-app py-6">
        <div className="flex items-center justify-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <div className="grid grid-cols-1 gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="squad" className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5" />
                <span>{t('squad')}</span>
              </TabsTrigger>
              <TabsTrigger value="coaches" className="flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5" />
                <span>{t('coaches')}</span>
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'squad' ? (
              <div className="flex items-center">
                <div className="flex flex-wrap gap-2 mr-4">
                  <button 
                    onClick={() => {
                      setSelectedStatus(PlayerStatus.READY);
                      setShowStatusPlayersDialog(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-vista-secondary/40 hover:bg-vista-secondary/70 transition-colors cursor-pointer"
                  >
                    <CheckCircleIcon className="h-4 w-4 text-green-400" />
                    <span className="text-xs">{t('status.trained')}: {players.filter(p => !p.status || p.status === PlayerStatus.READY).length}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedStatus(PlayerStatus.SICK);
                      setShowStatusPlayersDialog(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-vista-secondary/40 hover:bg-vista-secondary/70 transition-colors cursor-pointer"
                  >
                    <XCircleIcon className="h-4 w-4 text-red-400" />
                    <span className="text-xs">{t('status.sick')}: {players.filter(p => p.status === PlayerStatus.SICK).length}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedStatus(PlayerStatus.REHABILITATION);
                      setShowStatusPlayersDialog(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-vista-secondary/40 hover:bg-vista-secondary/70 transition-colors cursor-pointer"
                  >
                    <ClockIcon className="h-4 w-4 text-yellow-400" />
                    <span className="text-xs">{t('status.rehab')}: {players.filter(p => p.status === PlayerStatus.REHABILITATION).length}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedStatus(PlayerStatus.STUDY);
                      setShowStatusPlayersDialog(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-vista-secondary/40 hover:bg-vista-secondary/70 transition-colors cursor-pointer"
                  >
                    <AcademicCapIcon className="h-4 w-4 text-blue-400" />
                    <span className="text-xs">{t('status.study')}: {players.filter(p => p.status === PlayerStatus.STUDY).length}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedStatus(PlayerStatus.OTHER);
                      setShowStatusPlayersDialog(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-vista-secondary/40 hover:bg-vista-secondary/70 transition-colors cursor-pointer"
                  >
                    <ExclamationCircleIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs">{t('status.other')}: {players.filter(p => p.status === PlayerStatus.OTHER).length}</span>
                  </button>
                </div>
                <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="mr-2 bg-vista-primary text-vista-dark hover:bg-vista-primary/90 text-xs px-3 py-0.5 h-7">
                      <PlusIcon className="h-3 w-3 mr-1" /> {t('addPlayer')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-vista-dark border border-vista-secondary/70">
                    <DialogHeader>
                      <DialogTitle>{t('addPlayer')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="firstName" className="text-right">
                          {t('firstName')}
                        </Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="lastName" className="text-right">
                          {t('lastName')}
                        </Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddPlayerDialog(false)}>
                        {common('cancel')}
                      </Button>
                      <Button onClick={handleAddPlayer}>{t('add')}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showDeletePlayerDialog} onOpenChange={setShowDeletePlayerDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="text-xs px-3 py-0.5 h-7">
                      <TrashIcon className="h-3 w-3 mr-1" /> {t('deletePlayer')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-vista-dark border border-vista-secondary/70">
                    <DialogHeader>
                      <DialogTitle>{t('deletePlayer')}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="mb-4">{t('selectPlayerToDelete')}</p>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {players.map(player => (
                          <div 
                            key={player.id} 
                            className={`p-3 rounded-md cursor-pointer flex justify-between items-center ${playerToDelete === player.id ? 'bg-vista-secondary' : 'hover:bg-vista-secondary/50'}`}
                            onClick={() => setPlayerToDelete(player.id)}
                          >
                            <span>{player.firstName} {player.lastName}</span>
                            {playerToDelete === player.id && <TrashIcon className="h-4 w-4 text-vista-error" />}
                          </div>
                        ))}
                        {players.length === 0 && (
                          <p className="text-vista-light/60 text-center py-4">{t('noPlayersInTeam')}</p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDeletePlayerDialog(false)}>
                        {common('cancel')}
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeletePlayer}
                        disabled={!playerToDelete}
                      >
                        {t('delete')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="flex">
                <Dialog 
                  open={showAddCoachDialog} 
                  onOpenChange={(open) => {
                    setShowAddCoachDialog(open);
                    if (open) handleLoadCoaches();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="default" className="mr-2 bg-vista-primary text-vista-dark hover:bg-vista-primary/90 text-xs px-3 py-0.5 h-7">
                      <PlusIcon className="h-3 w-3 mr-1" /> {t('addCoach')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-vista-dark border border-vista-secondary/70">
                    <DialogHeader>
                      <DialogTitle>Добавить тренера</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="mb-4">Выберите тренера для добавления в команду:</p>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {allCoaches.map(coach => (
                          <div 
                            key={coach.id} 
                            className={`p-3 rounded-md cursor-pointer flex justify-between items-center ${selectedCoach === coach.id ? 'bg-vista-secondary' : 'hover:bg-vista-secondary/50'}`}
                            onClick={() => setSelectedCoach(coach.id)}
                          >
                            <div>
                              <span className="block">{coach.name}</span>
                              <span className="text-sm text-vista-light/60">{coach.email}</span>
                            </div>
                            {selectedCoach === coach.id && <PlusIcon className="h-4 w-4 text-vista-primary" />}
                          </div>
                        ))}
                        {allCoaches.length === 0 && (
                          <p className="text-vista-light/60 text-center py-4">Нет доступных тренеров</p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddCoachDialog(false)}>
                        Отмена
                      </Button>
                      <Button 
                        onClick={handleAddCoach}
                        disabled={!selectedCoach}
                      >
                        Добавить
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showDeleteCoachDialog} onOpenChange={setShowDeleteCoachDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="text-xs px-3 py-0.5 h-7">
                      <TrashIcon className="h-3 w-3 mr-1" /> Удалить тренера
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-vista-dark border border-vista-secondary/70">
                    <DialogHeader>
                      <DialogTitle>Удалить тренера из команды</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="mb-4">Выберите тренера для удаления из команды:</p>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {coaches.map(coach => (
                          <div 
                            key={coach.id} 
                            className={`p-3 rounded-md cursor-pointer flex justify-between items-center ${coachToDelete === coach.id ? 'bg-vista-secondary' : 'hover:bg-vista-secondary/50'}`}
                            onClick={() => setCoachToDelete(coach.id)}
                          >
                            <div>
                              <span className="block">{coach.name}</span>
                              <span className="text-sm text-vista-light/60">{coach.email}</span>
                            </div>
                            {coachToDelete === coach.id && <TrashIcon className="h-4 w-4 text-vista-error" />}
                          </div>
                        ))}
                        {coaches.length === 0 && (
                          <p className="text-vista-light/60 text-center py-4">Нет тренеров в команде</p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDeleteCoachDialog(false)}>
                        Отмена
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteCoach}
                        disabled={!coachToDelete}
                      >
                        Удалить
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          <div className="border-t-2 border-vista-secondary/70 mt-4"></div>
          
          <TabsContent value="squad" className="mt-2">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {players.map(player => (
                <Link 
                  key={player.id} 
                  href={`/${locale}/dashboard/coaching/players/${player.id}`}
                  className="bg-vista-secondary/50 rounded-lg overflow-hidden hover:bg-vista-secondary/70 transition-colors relative shadow-md shadow-vista-dark/60 hover:shadow-vista-primary/40 transition-all duration-300"
                  style={{ maxWidth: '150px' }}
                >
                  <div className="flex flex-col">
                    <div className="relative">
                      <div className="aspect-square w-full relative overflow-hidden bg-gradient-to-b from-vista-light/90 to-vista-dark/10">
                        <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.15)] z-10"></div>
                        
                        <PlayerAvatar 
                          photoUrl={player.photoUrl}
                          name={`${player.firstName} ${player.lastName}`}
                          size="xl"
                          className="absolute inset-0"
                        />
                        
                        {player.number !== null && player.number !== undefined && player.number !== 0 && (
                          <div className="absolute top-0 right-0 bg-vista-secondary/50 text-vista-light font-bold text-sm px-1.5 py-0.5 rounded-bl-md min-w-6 text-center z-20">
                            {player.number}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-vista-light/70 truncate text-center">{player.lastName}</p>
                      <h3 className="text-sm font-medium text-vista-light truncate text-center">{player.firstName}</h3>
                      <div className="flex justify-between items-center mt-1">
                        <div className="w-1/2 pr-1">
                          {player.position && (
                            <p className="text-[10px] text-vista-light/50 truncate">{player.position}</p>
                          )}
                          {!player.position && (
                            <p className="text-[10px] text-vista-light/50 truncate">-</p>
                          )}
                        </div>
                        
                        <div className="relative w-1/2 pl-1">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setStatusMenuOpen(statusMenuOpen === player.id ? null : player.id);
                            }}
                            className="flex items-center text-[10px] text-vista-light/70 hover:text-vista-light w-full"
                          >
                            <span className="flex-shrink-0 mr-1">{getStatusIcon(player.status)}</span>
                            <span className="truncate">{getStatusText(player.status)}</span>
                          </button>
                          
                          {statusMenuOpen === player.id && (
                            <div className="absolute bottom-full mb-1 right-0 bg-vista-dark border border-vista-secondary rounded-md shadow-md z-50 w-32 py-1">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  changeStatus(player, PlayerStatus.READY);
                                }}
                                className="flex items-center w-full px-2 py-1 text-[10px] text-left hover:bg-vista-secondary/30"
                              >
                                <CheckCircleIcon className="h-3 w-3 text-green-400 mr-1" />
                                <span>{t('status.trained')}</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  changeStatus(player, PlayerStatus.SICK);
                                }}
                                className="flex items-center w-full px-2 py-1 text-[10px] text-left hover:bg-vista-secondary/30"
                              >
                                <XCircleIcon className="h-3 w-3 text-red-400 mr-1" />
                                <span>{t('status.sick')}</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  changeStatus(player, PlayerStatus.REHABILITATION);
                                }}
                                className="flex items-center w-full px-2 py-1 text-[10px] text-left hover:bg-vista-secondary/30"
                              >
                                <ClockIcon className="h-3 w-3 text-yellow-400 mr-1" />
                                <span>{t('status.rehab')}</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  changeStatus(player, PlayerStatus.STUDY);
                                }}
                                className="flex items-center w-full px-2 py-1 text-[10px] text-left hover:bg-vista-secondary/30"
                              >
                                <AcademicCapIcon className="h-3 w-3 text-blue-400 mr-1" />
                                <span>{t('status.study')}</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  changeStatus(player, PlayerStatus.OTHER);
                                }}
                                className="flex items-center w-full px-2 py-1 text-[10px] text-left hover:bg-vista-secondary/30"
                              >
                                <ExclamationCircleIcon className="h-3 w-3 text-gray-400 mr-1" />
                                <span>{t('status.other')}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {players.length === 0 && (
                <div className="col-span-full">
                  <p className="text-vista-light/60 text-center py-12">{t('noPlayersInTeam')}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="coaches" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {coaches.map(coach => (
                <div 
                  key={coach.id} 
                  className="bg-vista-secondary/50 rounded-lg p-4 hover:bg-vista-secondary/70 transition-colors"
                >
                  <div className="flex items-center justify-center mb-4">
                    <StaffAvatar 
                      photoUrl={coach.image}
                      name={coach.name}
                      size="xl"
                    />
                  </div>
                  <h3 className="text-lg font-medium text-center text-vista-light">{coach.name}</h3>
                  <p className="text-sm text-center text-vista-light/70 mt-1">{coach.email}</p>
                </div>
              ))}
              {coaches.length === 0 && (
                <div className="col-span-full">
                  <p className="text-vista-light/60 text-center py-12">{t('noCoachesInTeam')}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Диалоговое окно со списком игроков по статусу */}
      <Dialog open={showStatusPlayersDialog} onOpenChange={setShowStatusPlayersDialog}>
        <DialogContent className="bg-vista-dark border border-vista-secondary/70">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                {selectedStatus === PlayerStatus.READY && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                {selectedStatus === PlayerStatus.SICK && <XCircleIcon className="h-5 w-5 text-red-500" />}
                {selectedStatus === PlayerStatus.REHABILITATION && <ClockIcon className="h-5 w-5 text-yellow-500" />}
                {selectedStatus === PlayerStatus.STUDY && <AcademicCapIcon className="h-5 w-5 text-blue-500" />}
                {selectedStatus === PlayerStatus.OTHER && <ExclamationCircleIcon className="h-5 w-5 text-gray-500" />}
                {selectedStatus === PlayerStatus.READY && t('playersWithStatus.trained')}
                {selectedStatus === PlayerStatus.SICK && t('playersWithStatus.sick')}
                {selectedStatus === PlayerStatus.REHABILITATION && t('playersWithStatus.rehab')}
                {selectedStatus === PlayerStatus.STUDY && t('playersWithStatus.study')}
                {selectedStatus === PlayerStatus.OTHER && t('playersWithStatus.other')}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-80 overflow-y-auto space-y-2">
              {players
                .filter(player => 
                  selectedStatus === PlayerStatus.READY 
                    ? (!player.status || player.status === PlayerStatus.READY)
                    : player.status === selectedStatus
                )
                .map(player => (
                  <Link 
                    key={player.id} 
                    href={`/${locale}/dashboard/coaching/players/${player.id}`}
                    className="p-3 rounded-md cursor-pointer flex items-center hover:bg-vista-secondary/50"
                  >
                    <div className="h-10 w-10 flex-shrink-0 mr-3 rounded-full overflow-hidden bg-gradient-to-b from-vista-light/90 to-vista-dark/10">
                      <PlayerAvatar 
                        photoUrl={player.photoUrl}
                        name={`${player.firstName} ${player.lastName}`}
                        size="md"
                      />
                    </div>
                    <div>
                      <span className="block text-vista-light">{player.firstName} {player.lastName}</span>
                      <span className="text-sm text-vista-light/60">
                        {player.number && `#${player.number}`} {player.position || ''}
                      </span>
                    </div>
                  </Link>
                ))}
              {players.filter(player => 
                selectedStatus === PlayerStatus.READY 
                  ? (!player.status || player.status === PlayerStatus.READY)
                  : player.status === selectedStatus
              ).length === 0 && (
                <p className="text-vista-light/60 text-center py-4">{t('noPlayersWithStatus')}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusPlayersDialog(false)}>
              {common('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 