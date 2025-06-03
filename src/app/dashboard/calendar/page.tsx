'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ru } from 'date-fns/locale';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  getDay, 
  addDays,
  isToday,
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks
} from 'date-fns';
import { ChevronLeft, ChevronRight, Users, Clock, Trophy, CheckCircle2, AlertCircle, CalendarClock, Dumbbell, Medal, Handshake } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";

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
  // Добавляем поля для матчей
  competitionType?: 'FRIENDLY' | 'LEAGUE' | 'CUP';
  isHome?: boolean;
  opponentName?: string;
  teamGoals?: number;
  opponentGoals?: number;
}

// Объект для нормализации статусов из API
const STATUS_MAPPING: Record<string, string> = {
  // API статус : нормализованный статус для отображения
  // API возвращает статусы как ENUM (строки в верхнем регистре)
  'COMPLETED': 'completed',
  'CANCELED': 'canceled',
  'SCHEDULED': 'scheduled'
};

// Функция для отображения типа матча на русском
const competitionTypeLabels: Record<string, string> = {
  FRIENDLY: 'товарищеский',
  LEAGUE: 'лига',
  CUP: 'кубок',
};

export default function CalendarPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isAllTeamsSelected, setIsAllTeamsSelected] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isTeamSelectOpen, setIsTeamSelectOpen] = useState(false);
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [trainings, setTrainings] = useState<TrainingEvent[]>([]);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState(false);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());

  // Массив с днями недели на русском
  const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  // Загрузка списка команд при загрузке страницы
  useEffect(() => {
    if (session?.user) {
      fetchTeams();
    }
  }, [session]);

  // После загрузки команд — выбрать все команды по умолчанию
  useEffect(() => {
    if (teams.length > 0) {
      setSelectedTeams(teams.map(team => team.id));
      setIsAllTeamsSelected(true);
    }
  }, [teams]);

  // Генерация дней календаря при изменении месяца или недели
  useEffect(() => {
    if (calendarView === 'month') {
    generateCalendarDays();
    } else {
      generateWeekDays();
    }
  }, [currentMonth, calendarView, currentWeek]);

  // Загрузка тренировок при изменении выбранных команд или месяца
  useEffect(() => {
    if (selectedTeams.length > 0) {
      fetchTrainings();
    } else {
      setTrainings([]);
    }
  }, [selectedTeams, currentMonth]);

  // Функция для генерации массива дней для отображения в календаре
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Получаем все дни месяца
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Определяем день недели для первого дня месяца (0 - воскресенье, 1 - понедельник, ..., 6 - суббота)
    let startDayOfWeek = getDay(monthStart);
    
    // Преобразуем день недели в формат, где понедельник - 0, воскресенье - 6
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    // Добавляем дни предыдущего месяца для заполнения начала календаря
    const prevDays = Array.from({ length: startDayOfWeek }, (_, i) => 
      addDays(monthStart, -(startDayOfWeek - i))
    );
    
    // Определяем, сколько дней нужно добавить после последнего дня месяца
    // для заполнения календаря до конца недели
    const lastDayOfWeek = getDay(monthEnd);
    // Если последний день месяца - воскресенье (lastDayOfWeek = 0), не добавляем дополнительные дни
    // В противном случае, добавляем дни до конца недели
    const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    
    const nextDays = Array.from({ length: daysToAdd }, (_, i) => 
      addDays(monthEnd, i + 1)
    );
    
    // Объединяем все дни для отображения в календаре
    setCalendarDays([...prevDays, ...daysInMonth, ...nextDays]);
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

  // Функция для получения тренировок и матчей выбранных команд за выбранный месяц
  const fetchTrainings = async () => {
    if (selectedTeams.length === 0) return;

    try {
      setIsLoadingTrainings(true);
      
      // Получаем первый и последний день месяца для запроса
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      // Получаем тренировки и матчи для каждой выбранной команды
      const allEvents: TrainingEvent[] = [];
      
      await Promise.all(selectedTeams.map(async (teamId) => {
        const teamName = teams.find(team => team.id === teamId)?.name || '';
        
        try {
          // Загружаем тренировки
          const trainingsResponse = await fetch(`/api/trainings?teamId=${teamId}&fromDate=${monthStart}&toDate=${monthEnd}`);
          if (!trainingsResponse.ok) {
            throw new Error(`Не удалось загрузить тренировки для команды ${teamName}`);
          }
          
          const trainingsData = await trainingsResponse.json();
          
          // Загружаем матчи
          const matchesResponse = await fetch(`/api/matches?teamId=${teamId}&fromDate=${monthStart}&toDate=${monthEnd}`);
          if (!matchesResponse.ok) {
            throw new Error(`Не удалось загрузить матчи для команды ${teamName}`);
          }
          
          const matchesData = await matchesResponse.json();
          
          // Обработка тренировок
          const processedTrainings = await Promise.all(trainingsData.map(async (training: any) => {
            let type = training.type || 'TRAINING';
            let status = 'scheduled';
            
            if (training.status) {
              status = normalizeStatus(training.status);
            } else {
              try {
                const attendanceResponse = await fetch(`/api/trainings/${training.id}/attendance`);
                if (attendanceResponse.ok) {
                  const attendanceData = await attendanceResponse.json();
                  if (attendanceData && attendanceData.length > 0) {
                    const hasAttendance = attendanceData.some(
                      (player: any) => player.attendance && player.attendance.status === 'TRAINED'
                    );
                    if (hasAttendance) {
                      status = 'completed';
                    }
                  }
                }
              } catch (error) {
                console.error(`Ошибка при загрузке данных посещаемости для тренировки ${training.id}:`, error);
              }
            }
            
            return {
              ...training,
              teamName,
              type,
              status
            };
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
            status: 'scheduled',
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
      if (prev.includes(teamId)) {
        const filtered = prev.filter((id) => id !== teamId);
        setIsAllTeamsSelected(false);
        return filtered;
      } else {
        const newSelected = [...prev, teamId];
        setIsAllTeamsSelected(newSelected.length === teams.length);
        return newSelected;
      }
    });
  };

  // Обработчик выбора всех команд
  const handleSelectAllTeams = () => {
    if (isAllTeamsSelected) {
      setSelectedTeams([]);
      setIsAllTeamsSelected(false);
    } else {
      setSelectedTeams(teams.map((team) => team.id));
      setIsAllTeamsSelected(true);
    }
  };

  // Обработчики изменения месяца
  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  // Навигация по неделям
  const handlePreviousWeek = () => {
    setCurrentWeek((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek((prev) => addWeeks(prev, 1));
  };

  // Функция для форматирования названия месяца на русском языке
  const getFormattedMonth = (date: Date) => {
    return format(date, 'LLLL yyyy', { locale: ru }).charAt(0).toUpperCase() + format(date, 'LLLL yyyy', { locale: ru }).slice(1);
  };

  // Строка с выбранными командами для отображения
  const selectedTeamsText = () => {
    if (selectedTeams.length === 0) return 'Команды не выбраны';
    if (isAllTeamsSelected) return 'Все команды';
    
    const selectedTeamNames = teams
      .filter(team => selectedTeams.includes(team.id))
      .map(team => team.name);
    
    if (selectedTeamNames.length <= 2) {
      return selectedTeamNames.join(', ');
    } else {
      return `${selectedTeamNames.length} команд`;
    }
  };

  // Функция для получения тренировок на конкретный день
  const getTrainingsForDay = (day: Date) => {
    return trainings
      .filter(training => {
        // Преобразуем строку даты в объект Date
        const trainingDate = parseISO(training.date);
        return isSameDay(trainingDate, day);
      })
      .sort((a, b) => {
        // Сортируем по времени (строка 'HH:mm')
        if (!a.time || !b.time) return 0;
        return a.time.localeCompare(b.time);
      });
  };

  // Функция для нормализации статуса тренировки
  const normalizeStatus = (status: string): string => {
    // Приводим статус к верхнему регистру для надежного сопоставления
    const normalizedApiStatus = status.toUpperCase();
    console.log(`Нормализация статуса: исходный=${status}, в верхнем регистре=${normalizedApiStatus}, результат=${STATUS_MAPPING[normalizedApiStatus] || 'scheduled'}`);
    return STATUS_MAPPING[normalizedApiStatus] || 'scheduled';
  };

  // Функция для определения статуса тренировки
  const getTrainingStatus = (training: TrainingEvent) => {
    // Если у тренировки есть статус из API, используем его
    if (training.status) {
      console.log(`getTrainingStatus: тренировка ${training.id} имеет статус из API: ${training.status}`);
      // Убедимся, что статус приведен к верхнему регистру для сравнения
      const normalizedStatus = normalizeStatus(training.status);
      return normalizedStatus;
    }
    
    // По умолчанию считаем тренировку запланированной
    return 'scheduled';
  };

  // Функция для отображения иконки статуса тренировки
  const getStatusIcon = (status: string) => {
    console.log(`Отображение иконки для статуса: ${status}`);
    
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

  // Функция для обновления статуса тренировки
  const updateTrainingStatus = async (trainingId: string, newStatus: 'SCHEDULED' | 'COMPLETED' | 'CANCELED') => {
    try {
      setIsLoadingTrainings(true);
      
      console.log(`Отправка запроса на обновление статуса тренировки ${trainingId} на ${newStatus}`);
      
      // Обновляем статус на сервере
      const response = await fetch(`/api/trainings/${trainingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Ошибка при обновлении статуса тренировки:', errorData);
        toast({
          title: "Ошибка",
          description: "Не удалось обновить статус тренировки",
          variant: "destructive",
        });
        return;
      }
      
      // Обновляем данные в локальном состоянии
      const updatedTraining = await response.json();
      console.log('Ответ сервера на обновление статуса:', updatedTraining);
      
      setTrainings(prevTrainings => 
        prevTrainings.map(training => {
          if (training.id === trainingId) {
            console.log(`Обновление тренировки ${trainingId} в локальном состоянии: статус=${updatedTraining.status}`);
            return {...training, status: updatedTraining.status};
          }
          return training;
        })
      );
      
      toast({
        title: "Статус обновлен",
        description: "Статус тренировки успешно обновлен",
      });
    } catch (error) {
      console.error('Ошибка при обновлении статуса тренировки:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус тренировки",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTrainings(false);
    }
  };

  // Функция для перехода на страницу тренировки
  const navigateToEvent = (training: TrainingEvent) => {
    if (training.type === 'MATCH') {
      router.push(`/dashboard/coaching/matches/${training.id}`);
    } else {
      router.push(`/dashboard/coaching/trainings/${training.id}`);
    }
  };

  // Функция для определения названия типа тренировки
  const getTrainingTypeDisplay = (training: TrainingEvent) => {
    if (training.type === 'MATCH') {
      return 'Матч';
    }
    
    switch(training.type) {
      case 'GYM':
        return 'Тренажерный зал';
      case 'TRAINING':
      default:
        return 'Тренировка';
    }
  };

  // Функция для выбора иконки матча по competitionType
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

  // Функция для определения иконки типа тренировки
  const getTrainingTypeIcon = (training: TrainingEvent) => {
    if (training.type === 'MATCH') {
      return getMatchTypeIcon(training);
    }
    switch(training.type) {
      case 'GYM':
        return null;
      case 'TRAINING':
      default:
        return null;
    }
  };

  // Функция для определения стилей блока тренировки
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

  // Функция для определения результата матча и возврата соответствующего класса
  const getMatchResultClass = (training: TrainingEvent) => {
    if (typeof training.teamGoals !== 'number' || typeof training.opponentGoals !== 'number') {
      return 'bg-vista-dark/30'; // Default background if no score
    }
    const teamGoals = training.isHome ? training.teamGoals : training.opponentGoals;
    const opponentGoals = training.isHome ? training.opponentGoals : training.teamGoals;
    if (teamGoals > opponentGoals) {
      return 'bg-green-500/30'; // Победа
    } else if (teamGoals < opponentGoals) {
      return 'bg-red-500/30'; // Поражение
    } else {
      return 'bg-amber-500/30'; // Ничья
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-vista-secondary/50 bg-vista-dark/50 shadow-md">
        <CardHeader className="p-2 md:p-3 bg-vista-dark/50 border-b border-vista-secondary/40 flex flex-row justify-between items-center">
          {/* Выбор команд - слева */}
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
              className="w-full min-w-[240px] p-0 bg-vista-dark border-vista-secondary/50 shadow-xl" 
              align="start"
              sideOffset={8}
            >
              <div className="p-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="select-all" 
                    checked={isAllTeamsSelected} 
                    onCheckedChange={handleSelectAllTeams} 
                  />
                  <Label htmlFor="select-all" className="text-vista-light">Все команды</Label>
                </div>
                <div className="border-t border-vista-secondary/40 pt-2">
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

          {/* Переключатель и навигация по месяцам/неделям - справа */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={calendarView === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCalendarView('month')}
              className="text-xs"
            >
              Месяц
            </Button>
            <Button
              variant={calendarView === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCalendarView('week')}
              className="text-xs"
            >
              Неделя
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            {calendarView === 'month' ? (
              <>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePreviousMonth}
              className="border-vista-secondary/50 text-vista-light shadow-sm h-7 w-7"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="text-vista-light font-medium min-w-[140px] text-center text-sm">
              {getFormattedMonth(currentMonth)}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleNextMonth} 
              className="border-vista-secondary/50 text-vista-light shadow-sm h-7 w-7"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
              </>
            ) : (
              <>
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
              </>
            )}
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
                  className="p-2 text-center font-semibold text-vista-light/80 border-b border-vista-secondary/20"
                >
                  <div className="hidden md:block">{day}</div>
                  <div className="block md:hidden">{day.slice(0, 2)}</div>
                </div>
              ))}
            </div>
            
            {/* Дни календаря */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isToday(day);
                const dayTrainings = getTrainingsForDay(day);
                
                // Определяем высоту блока дня в зависимости от режима
                const dayBlockHeight = '';
                
                return (
                  <div 
                    key={index}
                    className={`
                      ${dayBlockHeight} border border-vista-secondary/50 rounded-md p-2
                      ${isCurrentMonth ? 'bg-vista-dark/70 shadow-sm' : 'bg-vista-dark/30 opacity-50'}
                      ${isTodayDate ? 'ring-1 ring-vista-primary shadow-md' : ''}
                    `}
                  >
                    <div className={`
                      text-xs font-medium mb-1 px-0.5 py-0.5 rounded w-fit
                      ${isTodayDate ? 'bg-vista-primary/20 text-vista-primary' : 'text-vista-light'}
                    `}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayTrainings.map((training) => {
                        const status = getTrainingStatus(training);
                        console.log(`Отображение тренировки ${training.id}: API статус=${training.status}, отображаемый статус=${status}`);
                        
                        // Определяем классы для отображения в зависимости от статуса
                        const statusClasses = {
                          completed: 'opacity-80',
                          canceled: 'opacity-60',
                          scheduled: ''
                        };
                        
                        if (training.type === 'MATCH') {
                          return (
                            <div
                              key={training.id}
                              className={`text-xs p-2 rounded-lg border flex flex-col relative cursor-pointer min-h-[110px] ${getTrainingStyles(training)} ${statusClasses[status as keyof typeof statusClasses]} hover:bg-vista-secondary/10 transition-colors hover:shadow-md`}
                              onClick={() => navigateToEvent(training)}
                              style={{ marginBottom: 2 }}
                            >
                              {/* Верхняя строка: "Матч" и иконка типа */}
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center font-medium text-xs text-vista-light">
                                  {getMatchTypeIcon(training)}
                                  <span className="ml-1">Матч</span>
                                  {training.type === 'MATCH' && training.competitionType && (
                                    <span className="ml-1 text-vista-light/50 text-[10px]">(
                                      {competitionTypeLabels[training.competitionType] || training.competitionType.toLowerCase()}
                                    )</span>
                                  )}
                                </div>
                              </div>
                              {/* Вторая строка: команды и счет */}
                              <div className="text-vista-light/90 text-xs font-medium mb-1">
                                <div className="flex items-center w-full">
                                  <span className="truncate flex-1">{training.isHome ? training.teamName : training.opponentName}</span>
                                  <span className={`ml-2 px-2 py-0.5 rounded font-semibold text-xs w-7 min-w-[28px] text-center flex items-center justify-center ${getMatchResultClass(training)}`}>{training.teamGoals ?? '-'}</span>
                                </div>
                                <div className="flex items-center w-full mt-0.5">
                                  <span className="truncate flex-1">{training.isHome ? training.opponentName : training.teamName}</span>
                                  <span className={`ml-2 px-2 py-0.5 rounded font-semibold text-xs w-7 min-w-[28px] text-center flex items-center justify-center ${getMatchResultClass(training)}`}>{training.opponentGoals ?? '-'}</span>
                                </div>
                              </div>
                              {/* Третья строка: дата и время */}
                              <div className="flex items-center justify-center text-vista-light/70 text-xs mt-1">
                                <Clock className="h-3 w-3 mr-1 opacity-70" />
                                <span>{training.date ? new Date(training.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Moscow' }) : ''}</span>
                                <span className="mx-1">·</span>
                                <span>{training.time}</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={training.id}
                            className={`text-xs p-1.5 rounded-md border flex flex-col relative cursor-pointer ${getTrainingStyles(training)} ${statusClasses[status as keyof typeof statusClasses]} hover:bg-vista-secondary/10 transition-colors hover:shadow-md`}
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
                                {training.date ? new Date(training.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }) : ''}
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