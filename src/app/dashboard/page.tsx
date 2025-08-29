'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Users, Clock, Trophy, CheckCircle2, AlertCircle, CalendarClock, Dumbbell, Medal, Handshake, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, addWeeks, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
}

interface TrainingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  teamId: string;
  teamName: string;
  type: 'TRAINING' | 'MATCH' | 'GYM';
  status: string;
  competitionType?: 'FRIENDLY' | 'LEAGUE' | 'CUP';
  isHome?: boolean;
  opponentName?: string;
  teamGoals?: number;
  opponentGoals?: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isAllTeamsSelected, setIsAllTeamsSelected] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [isTeamSelectOpen, setIsTeamSelectOpen] = useState(false);
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [trainings, setTrainings] = useState<TrainingEvent[]>([]);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState(false);

  // Массив с днями недели
  const weekDays = [
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
    'Воскресенье',
  ];

  // Загрузка списка команд при загрузке страницы
  useEffect(() => {
    if (session?.user) {
      fetchTeams();
    }
  }, [session]);

  // После загрузки команд — загружаем сохраненный выбор пользователя
  useEffect(() => {
    if (teams.length > 0) {
      loadUserTeamSelection();
    }
  }, [teams]);

  // Генерация дней недели
  useEffect(() => {
    generateWeekDays();
  }, [currentWeek]);

  // Загрузка тренировок при изменении выбранных команд
  useEffect(() => {
    if (selectedTeams.length > 0) {
      fetchTrainings();
    } else {
      setTrainings([]);
    }
  }, [selectedTeams, currentWeek]);

  // Загрузка сохраненного выбора команд пользователя
  const loadUserTeamSelection = () => {
    try {
      const savedSelection = localStorage.getItem('dashboard-team-selection');
      if (savedSelection) {
        const parsed = JSON.parse(savedSelection);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Проверяем, что все сохраненные ID команд существуют
          const validTeams = parsed.filter(teamId => 
            teams.some(team => team.id === teamId)
          );
          if (validTeams.length > 0) {
            setSelectedTeams(validTeams);
            setIsAllTeamsSelected(validTeams.length === teams.length);
            return;
          }
        }
      }
      // Если нет сохраненного выбора или он невалиден, выбираем все команды
      setSelectedTeams(teams.map(team => team.id));
      setIsAllTeamsSelected(true);
    } catch (error) {
      console.error('Ошибка при загрузке сохраненного выбора команд:', error);
      // В случае ошибки выбираем все команды
      setSelectedTeams(teams.map(team => team.id));
      setIsAllTeamsSelected(true);
    }
  };

  // Сохранение выбора команд пользователя
  const saveUserTeamSelection = (teamIds: string[]) => {
    try {
      localStorage.setItem('dashboard-team-selection', JSON.stringify(teamIds));
    } catch (error) {
      console.error('Ошибка при сохранении выбора команд:', error);
    }
  };

  const generateWeekDays = () => {
    // Неделя с понедельника
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
    setCalendarDays(daysInWeek);
  };

  // Функция для получения списка команд
  const fetchTeams = async () => {
    try {
      setIsLoadingTeams(true);
      const response = await fetch('/api/teams');
      if (!response.ok) {
        throw new Error('Не удалось загрузить список команд');
      }
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Ошибка при загрузке команд:', error);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  // Функция для получения тренировок и матчей выбранных команд за выбранную неделю
  const fetchTrainings = async () => {
    if (selectedTeams.length === 0) return;

    try {
      setIsLoadingTrainings(true);
      
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
      const fromDate = format(weekStart, 'yyyy-MM-dd');
      const toDate = format(weekEnd, 'yyyy-MM-dd');

      // Получаем тренировки и матчи для каждой выбранной команды
      const allEvents: TrainingEvent[] = [];
      
      await Promise.all(selectedTeams.map(async (teamId) => {
        const teamName = teams.find(team => team.id === teamId)?.name || '';
        
        try {
          // Загружаем тренировки
          const trainingsResponse = await fetch(`/api/trainings?teamId=${teamId}&fromDate=${fromDate}&toDate=${toDate}`);
          if (!trainingsResponse.ok) {
            throw new Error(`Не удалось загрузить тренировки для команды ${teamName}`);
          }
          
          const trainingsData = await trainingsResponse.json();
          
          // Загружаем матчи
          const matchesResponse = await fetch(`/api/matches?teamId=${teamId}&fromDate=${fromDate}&toDate=${toDate}`);
          if (!matchesResponse.ok) {
            throw new Error(`Не удалось загрузить матчи для команды ${teamName}`);
          }
          
          const matchesData = await matchesResponse.json();
          
          // Обработка тренировок
          const processedTrainings = trainingsData.map((training: any) => ({
            ...training,
            teamName,
            type: training.type || 'TRAINING',
            status: training.status || 'scheduled'
          }));
          
          // Обработка матчей
          const processedMatches = matchesData.map((match: any) => ({
            id: match.id,
            title: 'Матч',
            date: match.date,
            time: match.time,
            teamId: match.teamId,
            teamName: match.teamName || '',
            type: 'MATCH',
            status: match.status || 'scheduled',
            competitionType: match.competitionType,
            isHome: match.isHome,
            opponentName: match.opponentName,
            teamGoals: match.teamGoals,
            opponentGoals: match.opponentGoals
          }));
          
          allEvents.push(...processedTrainings, ...processedMatches);
        } catch (error) {
          console.error(`Ошибка при загрузке данных для команды ${teamName}:`, error);
        }
      }));
      
      // Сортируем все события по дате и времени
      allEvents.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
      
      setTrainings(allEvents);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    } finally {
      setIsLoadingTrainings(false);
    }
  };

  // Обработчик изменения выбора команды
  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams((prev) => {
      let newSelection: string[];
      if (prev.includes(teamId)) {
        newSelection = prev.filter((id) => id !== teamId);
        setIsAllTeamsSelected(false);
      } else {
        newSelection = [...prev, teamId];
        setIsAllTeamsSelected(newSelection.length === teams.length);
      }
      // Сохраняем новый выбор
      saveUserTeamSelection(newSelection);
      return newSelection;
    });
  };

  // Обработчик выбора всех команд
  const handleSelectAllTeams = () => {
    if (isAllTeamsSelected) {
      setSelectedTeams([]);
      setIsAllTeamsSelected(false);
      saveUserTeamSelection([]);
    } else {
      const allTeamIds = teams.map((team) => team.id);
      setSelectedTeams(allTeamIds);
      setIsAllTeamsSelected(true);
      saveUserTeamSelection(allTeamIds);
    }
  };

  // Навигация по неделям
  const handlePreviousWeek = () => {
    setCurrentWeek((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek((prev) => addWeeks(prev, 1));
  };

  // Строка с выбранными командами для отображения
  const selectedTeamsText = () => {
    if (selectedTeams.length === 0) return 'Не выбрано команд';
    if (isAllTeamsSelected) return 'Все команды';
    
    const selectedTeamNames = teams
      .filter(team => selectedTeams.includes(team.id))
      .map(team => team.name);
    
    if (selectedTeamNames.length <= 2) {
      return selectedTeamNames.join(', ');
    } else {
      return `${selectedTeamNames[0]}, ${selectedTeamNames[1]} +${selectedTeamNames.length - 2}`;
    }
  };

  // Функция для получения тренировок для конкретного дня
  const getTrainingsForDay = (day: Date) => {
    return trainings.filter(training => {
      const trainingDate = new Date(training.date);
      return trainingDate.toDateString() === day.toDateString();
    });
  };

  // Функция для определения стилей тренировки
  const getTrainingStyles = (training: TrainingEvent) => {
    if (training.type === 'MATCH') {
      return 'bg-amber-500/20 border-amber-500/50 shadow-sm';
    }
    
    switch(training.type) {
      case 'GYM':
        return 'bg-purple-500/20 border-purple-500/50 shadow-sm';
      case 'TRAINING':
      default:
        return 'bg-blue-500/20 border-blue-500/50 shadow-sm';
    }
  };

  // Функция для определения названия типа тренировки
  const getTrainingTypeDisplay = (training: TrainingEvent) => {
    switch(training.type) {
      case 'GYM':
        return 'Тренажерный зал';
      case 'TRAINING':
      default:
        return 'Тренировка';
    }
  };

  // Функция для определения иконки типа тренировки
  const getTrainingTypeIcon = (training: TrainingEvent) => {
    switch(training.type) {
      case 'GYM':
        return <Dumbbell className="h-3 w-3 mr-1 text-purple-400" />;
      case 'TRAINING':
      default:
        return null; // Убираем иконку часов для тренировок
    }
  };

  // Функция для определения иконки матча по competitionType
  const getMatchTypeIcon = (training: TrainingEvent) => {
    if (training.type !== 'MATCH') return null;
    switch (training.competitionType) {
      case 'CUP':
        return <Trophy className="h-3 w-3 mr-1 text-amber-400" />;
      case 'FRIENDLY':
        return <Handshake className="h-3 w-3 mr-1 text-amber-400" />;
      case 'LEAGUE':
        return <Medal className="h-3 w-3 mr-1 text-amber-400" />;
      default:
        return <Trophy className="h-3 w-3 mr-1 text-amber-400" />;
    }
  };

  // Функция для отображения иконки статуса тренировки
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed':
        return <div className="rounded-full bg-green-400/20 p-0.5 w-5 h-5 flex items-center justify-center">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
        </div>;
      case 'canceled':
        return <div className="rounded-full bg-red-400/20 p-0.5 w-5 h-5 flex items-center justify-center">
          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
        </div>;
      default: // scheduled
        return <div className="rounded-full bg-amber-400/20 p-0.5 w-5 h-5 flex items-center justify-center">
          <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
        </div>;
    }
  };

  // Функция для определения статуса тренировки
  const getTrainingStatus = (training: TrainingEvent) => {
    if (training.status) {
      return training.status.toLowerCase();
    }
    return 'scheduled';
  };

  // Функция для перехода на страницу события
  const navigateToEvent = (training: TrainingEvent) => {
    if (training.type === 'MATCH') {
      window.open(`/dashboard/coaching/matches/${training.id}`, '_blank');
    } else {
      window.open(`/dashboard/coaching/trainings/${training.id}`, '_blank');
    }
  };

  return (
    <div className="space-y-0">
      {/* Недельный календарь */}
      <Card className="overflow-hidden border-vista-secondary/50 bg-vista-dark/50 shadow-md">
        <CardHeader className="!p-0 bg-vista-dark/50 border-b border-vista-secondary/40 flex flex-row justify-between items-center">
          {/* Левая часть: кнопка перехода в календарь и выбор команд */}
          <div className="flex items-center gap-3 px-3 py-2">
            <Link href="/dashboard/calendar">
              <Button 
                variant="outline" 
                size="sm"
                className="border-vista-secondary/50 text-vista-light shadow-sm h-8 py-1"
              >
                <Calendar className="mr-2 h-3.5 w-3.5" />
                Перейти в календарь
              </Button>
            </Link>
            
            <Popover open={isTeamSelectOpen} onOpenChange={setIsTeamSelectOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-auto justify-start border-vista-secondary/50 text-vista-light shadow-sm h-8 py-1"
                >
                  <Users className="mr-2 h-3.5 w-3.5" />
                  <span className="text-sm">{selectedTeamsText()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="!p-0 w-full min-w-[240px] bg-vista-dark border-vista-secondary/50 shadow-xl" 
                align="start"
                sideOffset={0}
              >
                <div className="p-0 space-y-0">
                  <div className="flex items-center space-x-2 p-3">
                    <Checkbox 
                      id="select-all" 
                      checked={isAllTeamsSelected} 
                      onCheckedChange={handleSelectAllTeams} 
                    />
                    <Label htmlFor="select-all" className="text-vista-light">Все команды</Label>
                  </div>
                  <div className="border-t border-vista-secondary/40 p-3">
                    {isLoadingTeams ? (
                      <p className="text-vista-light/70 text-sm p-2">Загрузка команд...</p>
                    ) : (
                      <div className="space-y-2">
                        {teams.map((team) => (
                          <div key={team.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`team-${team.id}`} 
                              checked={selectedTeams.includes(team.id)} 
                              onCheckedChange={() => handleTeamToggle(team.id)} 
                            />
                            <Label htmlFor={`team-${team.id}`} className="text-vista-light">{team.name}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Навигация по неделям - справа */}
          <div className="flex items-center space-x-2 px-3 py-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePreviousWeek}
              className="border-vista-secondary/50 text-vista-light shadow-sm h-7 w-7"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="text-vista-light font-medium min-w-[140px] text-center text-sm">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'd MMM', { locale: ru })} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: ru })}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleNextWeek} 
              className="border-vista-secondary/50 text-vista-light shadow-sm h-7 w-7"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Сетка календаря */}
          <div className="w-full">
            {/* Заголовки дней недели */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, index) => (
                <div 
                  key={index} 
                  className="p-1 text-center text-xs font-medium text-vista-light/80 border-b border-vista-secondary/20"
                >
                  <div className="hidden md:block">{day}</div>
                  <div className="block md:hidden">{day.slice(0, 2)}</div>
                </div>
              ))}
            </div>
            
            {/* Дни календаря */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const isTodayDate = isToday(day);
                const dayTrainings = getTrainingsForDay(day);
                
                return (
                  <div key={index} className={`relative border border-vista-secondary/50 rounded-md p-2 bg-vista-dark/70 shadow-sm ${isTodayDate ? 'ring-1 ring-vista-primary shadow-md' : ''}`}> 

                    <div className={`text-xs font-medium mb-1 px-0.5 py-0.5 rounded w-fit ${isTodayDate ? 'bg-vista-primary/20 text-vista-primary' : 'text-vista-light'}`}>{format(day, 'd')}</div>
                    <div className="space-y-1">
                      {dayTrainings.map((training) => {
                        const status = getTrainingStatus(training);
                        
                        if (training.type === 'MATCH') {
                          return (
                            <div
                              key={training.id}
                              className={`text-xs p-2 rounded-lg border flex flex-col relative cursor-pointer min-h-[110px] ${getTrainingStyles(training)} hover:bg-vista-secondary/10 transition-colors hover:shadow-md`}
                              onClick={() => navigateToEvent(training)}
                              style={{ marginBottom: 2 }}
                            >
                              {/* Верхняя строка: "Матч" и иконка типа */}
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center font-medium text-xs text-vista-light">
                                  {getMatchTypeIcon(training)}
                                  <span className="ml-1">Матч</span>
                                  {training.type === 'MATCH' && training.competitionType && (
                                    <span className="ml-1 text-vista-light/50 text-[10px]">({training.competitionType === 'FRIENDLY' ? 'Товарищеский' : 
                                      training.competitionType === 'LEAGUE' ? 'Лига' : 'Кубок'})</span>
                                  )}
                                </div>
                              </div>
                              {/* Вторая строка: команды и счет */}
                              <div className="text-vista-light/90 text-xs font-medium mb-1">
                                <div className="flex items-center w-full">
                                  <span className="truncate flex-1">{training.isHome ? training.teamName : training.opponentName}</span>
                                  <span className={`ml-2 px-2 py-0.5 rounded font-semibold text-xs w-7 min-w-[28px] text-center flex items-center justify-center ${training.status === 'FINISHED' ? 'bg-gray-500/30' : 'bg-gray-500/30'}`}>-</span>
                                </div>
                                <div className="flex items-center w-full mt-0.5">
                                  <span className="truncate flex-1">{training.isHome ? training.opponentName : training.teamName}</span>
                                  <span className={`ml-2 px-2 py-0.5 rounded font-semibold text-xs w-7 min-w-[28px] text-center flex items-center justify-center ${training.status === 'FINISHED' ? 'bg-gray-500/30' : 'bg-gray-500/30'}`}>-</span>
                                </div>
                              </div>
                              {/* Третья строка: дата и время */}
                              <div className="flex items-center justify-center text-vista-light/70 text-xs mt-1">
                                <Clock className="h-3 w-3 mr-1 opacity-70" />
                                <div className="flex items-center text-vista-light/90">
                                  <span>{training.time}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={training.id}
                            className={`text-xs p-1.5 rounded-md border flex flex-col relative cursor-pointer ${getTrainingStyles(training)} hover:bg-vista-secondary/10 transition-colors hover:shadow-md`}
                            onClick={() => navigateToEvent(training)}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="font-medium">
                                <div className="flex items-center">
                                  {getTrainingTypeIcon(training)}
                                  <span>{getTrainingTypeDisplay(training)}</span>
                                </div>
                              </div>
                              <div className="flex-shrink-0">{getStatusIcon(status)}</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-vista-light/80 truncate max-w-[60%]">{training.teamName}</div>
                              <div className="flex items-center text-vista-light/90">
                                <Clock className="h-3 w-3 mr-1 opacity-70" />
                                <span>{training.time}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
} 