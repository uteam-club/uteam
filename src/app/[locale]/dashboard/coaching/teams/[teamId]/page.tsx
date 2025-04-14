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
  QuestionMarkCircleIcon
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

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  number?: number | null;
  position?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  status?: string;
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
  const [players, setPlayers] = useState<Player[]>([]);
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
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

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
  const handleChangeStatus = async (playerId: string, status: string) => {
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
  
  // Функция для получения иконки статуса
  const getStatusIcon = (status?: string) => {
    switch(status) {
      case 'READY':
        return <CheckCircleIcon className="h-4 w-4 text-green-400" />;
      case 'REHABILITATION':
        return <HeartIcon className="h-4 w-4 text-yellow-400" />;
      case 'SICK':
        return <ExclamationCircleIcon className="h-4 w-4 text-red-400" />;
      case 'STUDY':
        return <AcademicCapIcon className="h-4 w-4 text-blue-400" />;
      case 'OTHER':
        return <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400" />;
      default:
        return <CheckCircleIcon className="h-4 w-4 text-green-400" />;
    }
  };
  
  // Функция для получения текста статуса
  const getStatusText = (status?: string) => {
    switch(status) {
      case 'READY':
        return 'Готов';
      case 'REHABILITATION':
        return 'Реабилитация';
      case 'SICK':
        return 'Болеет';
      case 'STUDY':
        return 'Учеба';
      case 'OTHER':
        return 'Другое';
      default:
        return 'Готов';
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
                <span>Состав</span>
              </TabsTrigger>
              <TabsTrigger value="coaches" className="flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5" />
                <span>Тренерский штаб</span>
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'squad' ? (
              <div className="flex items-center">
                <div className="flex flex-wrap gap-2 mr-4">
                  <button 
                    onClick={() => {
                      setSelectedStatus('READY');
                      setShowStatusPlayersDialog(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-vista-secondary/40 hover:bg-vista-secondary/70 transition-colors cursor-pointer"
                  >
                    <CheckCircleIcon className="h-4 w-4 text-green-400" />
                    <span className="text-xs">Готов: {players.filter(p => !p.status || p.status === 'READY').length}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedStatus('REHABILITATION');
                      setShowStatusPlayersDialog(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-vista-secondary/40 hover:bg-vista-secondary/70 transition-colors cursor-pointer"
                  >
                    <HeartIcon className="h-4 w-4 text-yellow-400" />
                    <span className="text-xs">Реабилитация: {players.filter(p => p.status === 'REHABILITATION').length}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedStatus('SICK');
                      setShowStatusPlayersDialog(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-vista-secondary/40 hover:bg-vista-secondary/70 transition-colors cursor-pointer"
                  >
                    <ExclamationCircleIcon className="h-4 w-4 text-red-400" />
                    <span className="text-xs">Болеет: {players.filter(p => p.status === 'SICK').length}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedStatus('STUDY');
                      setShowStatusPlayersDialog(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-vista-secondary/40 hover:bg-vista-secondary/70 transition-colors cursor-pointer"
                  >
                    <AcademicCapIcon className="h-4 w-4 text-blue-400" />
                    <span className="text-xs">Учеба: {players.filter(p => p.status === 'STUDY').length}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedStatus('OTHER');
                      setShowStatusPlayersDialog(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-vista-secondary/40 hover:bg-vista-secondary/70 transition-colors cursor-pointer"
                  >
                    <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs">Другое: {players.filter(p => p.status === 'OTHER').length}</span>
                  </button>
                </div>
                <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="mr-2 bg-vista-primary text-vista-dark hover:bg-vista-primary/90 text-xs px-3 py-0.5 h-7">
                      <PlusIcon className="h-3 w-3 mr-1" /> Добавить игрока
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-vista-dark border border-vista-secondary/70">
                    <DialogHeader>
                      <DialogTitle>Добавить игрока</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="firstName" className="text-right">
                          Имя
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
                          Фамилия
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
                        Отмена
                      </Button>
                      <Button onClick={handleAddPlayer}>Добавить</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showDeletePlayerDialog} onOpenChange={setShowDeletePlayerDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="text-xs px-3 py-0.5 h-7">
                      <TrashIcon className="h-3 w-3 mr-1" /> Удалить игрока
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-vista-dark border border-vista-secondary/70">
                    <DialogHeader>
                      <DialogTitle>Удалить игрока</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="mb-4">Выберите игрока для удаления:</p>
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
                          <p className="text-vista-light/60 text-center py-4">Нет игроков в команде</p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDeletePlayerDialog(false)}>
                        Отмена
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeletePlayer}
                        disabled={!playerToDelete}
                      >
                        Удалить
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
                      <PlusIcon className="h-3 w-3 mr-1" /> Добавить тренера
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
                        
                        {player.photoUrl ? (
                          <img 
                            src={player.photoUrl} 
                            alt={`${player.firstName} ${player.lastName}`} 
                            className="w-full h-full object-cover absolute inset-0 z-0"
                          />
                        ) : (
                          <UserCircleIcon className="w-1/2 h-1/2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-vista-primary z-0" />
                        )}
                        
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
                            <div className="absolute bottom-full mb-1 right-0 bg-vista-dark border border-vista-secondary rounded-md shadow-md z-30 w-32 py-1">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  handleChangeStatus(player.id, 'READY');
                                }}
                                className="flex items-center w-full px-2 py-1 text-[10px] text-left hover:bg-vista-secondary/30"
                              >
                                <CheckCircleIcon className="h-3 w-3 text-green-400 mr-1" />
                                <span>Готов</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  handleChangeStatus(player.id, 'REHABILITATION');
                                }}
                                className="flex items-center w-full px-2 py-1 text-[10px] text-left hover:bg-vista-secondary/30"
                              >
                                <HeartIcon className="h-3 w-3 text-yellow-400 mr-1" />
                                <span>Реабилитация</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  handleChangeStatus(player.id, 'SICK');
                                }}
                                className="flex items-center w-full px-2 py-1 text-[10px] text-left hover:bg-vista-secondary/30"
                              >
                                <ExclamationCircleIcon className="h-3 w-3 text-red-400 mr-1" />
                                <span>Болеет</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  handleChangeStatus(player.id, 'STUDY');
                                }}
                                className="flex items-center w-full px-2 py-1 text-[10px] text-left hover:bg-vista-secondary/30"
                              >
                                <AcademicCapIcon className="h-3 w-3 text-blue-400 mr-1" />
                                <span>Учеба</span>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  handleChangeStatus(player.id, 'OTHER');
                                }}
                                className="flex items-center w-full px-2 py-1 text-[10px] text-left hover:bg-vista-secondary/30"
                              >
                                <QuestionMarkCircleIcon className="h-3 w-3 text-gray-400 mr-1" />
                                <span>Другое</span>
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
                  <p className="text-vista-light/60 text-center py-12">В команде нет игроков</p>
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
                    {coach.image ? (
                      <img 
                        src={coach.image} 
                        alt={coach.name} 
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-vista-dark flex items-center justify-center text-vista-primary">
                        <UserCircleIcon className="h-16 w-16" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-center text-vista-light">{coach.name}</h3>
                  <p className="text-sm text-center text-vista-light/70 mt-1">{coach.email}</p>
                </div>
              ))}
              {coaches.length === 0 && (
                <div className="col-span-full">
                  <p className="text-vista-light/60 text-center py-12">В команде нет тренеров</p>
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
                {selectedStatus === 'READY' && <CheckCircleIcon className="h-5 w-5 text-green-400" />}
                {selectedStatus === 'REHABILITATION' && <HeartIcon className="h-5 w-5 text-yellow-400" />}
                {selectedStatus === 'SICK' && <ExclamationCircleIcon className="h-5 w-5 text-red-400" />}
                {selectedStatus === 'STUDY' && <AcademicCapIcon className="h-5 w-5 text-blue-400" />}
                {selectedStatus === 'OTHER' && <QuestionMarkCircleIcon className="h-5 w-5 text-gray-400" />}
                {selectedStatus === 'READY' && 'Игроки - Готовы'}
                {selectedStatus === 'REHABILITATION' && 'Игроки - Реабилитация'}
                {selectedStatus === 'SICK' && 'Игроки - Болеют'}
                {selectedStatus === 'STUDY' && 'Игроки - Учеба'}
                {selectedStatus === 'OTHER' && 'Игроки - Другое'}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-80 overflow-y-auto space-y-2">
              {players
                .filter(player => 
                  selectedStatus === 'READY' 
                    ? (!player.status || player.status === 'READY')
                    : player.status === selectedStatus
                )
                .map(player => (
                  <Link 
                    key={player.id} 
                    href={`/${locale}/dashboard/coaching/players/${player.id}`}
                    className="p-3 rounded-md cursor-pointer flex items-center hover:bg-vista-secondary/50"
                  >
                    <div className="h-10 w-10 flex-shrink-0 mr-3 rounded-full overflow-hidden bg-gradient-to-b from-vista-light/90 to-vista-dark/10">
                      {player.photoUrl ? (
                        <img 
                          src={player.photoUrl} 
                          alt={`${player.firstName} ${player.lastName}`} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircleIcon className="h-full w-full text-vista-primary" />
                      )}
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
                selectedStatus === 'READY' 
                  ? (!player.status || player.status === 'READY')
                  : player.status === selectedStatus
              ).length === 0 && (
                <p className="text-vista-light/60 text-center py-4">Нет игроков с данным статусом</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusPlayersDialog(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 