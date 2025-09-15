'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow as UITableRow,
} from "@/components/ui/table";
import { 
  CalendarIcon, 
  UsersIcon, 
  UserCheckIcon, 
  ListFilterIcon,
  ChevronDownIcon
} from 'lucide-react';
import { format, isValid, parseISO, subMonths, eachDayOfInterval, addDays, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { enUS } from 'date-fns/locale/en-US';
import { useTranslation } from 'react-i18next';
import type { SupportedLang } from '@/types/i18n';

interface Team {
  id: string;
  name: string;
}

interface Training {
  id: string;
  title: string;
  date: string;
  teamId: string;
  time: string;
  type: 'TRAINING' | 'GYM';
}

interface AttendanceData {
  id?: string;
  status: 'TRAINED' | 'REHAB' | 'SICK' | 'EDUCATION' | 'INJURY' | 'NATIONAL_TEAM' | 'OTHER_TEAM' | 'OTHER';
  comment?: string;
}

interface PlayerAttendance {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  attendance: AttendanceData;
}

interface PlayerWithAttendance {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  attendanceRecords: {
    [trainingId: string]: AttendanceData;
  };
  stats: {
    total: number;
    trained: number;
    rehab: number;
    sick: number;
    education: number;
    other: number;
    trainingPercentage: number;
  };
}

// Статусы посещаемости с цветами и названиями
const attendanceStatuses = {
  'TRAINED': { name: 'Тренировался', color: 'bg-green-500', textColor: 'text-green-300', badgeColor: 'bg-green-500/20 text-green-300 border-green-500/30' },
  'REHAB': { name: 'Реабилитация', color: 'bg-blue-500', textColor: 'text-blue-300', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  'SICK': { name: 'Болеет', color: 'bg-yellow-500', textColor: 'text-yellow-300', badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  'EDUCATION': { name: 'Учеба', color: 'bg-purple-500', textColor: 'text-purple-300', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  'INJURY': { name: 'Травма', color: 'bg-red-500', textColor: 'text-red-300', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30' },
  'NATIONAL_TEAM': { name: 'Национальная сборная', color: 'bg-indigo-500', textColor: 'text-indigo-300', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  'OTHER_TEAM': { name: 'Другая команда', color: 'bg-orange-500', textColor: 'text-orange-300', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  'OTHER': { name: 'Другое', color: 'bg-gray-500', textColor: 'text-gray-300', badgeColor: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
};

export default function AttendanceAnalyticsPage() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  
  // Состояние для хранения списка команд
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  
  // Состояние для диапазона дат
  const [startDate, setStartDate] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Состояние для хранения списка тренировок
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState(false);
  
  // Состояние для данных посещаемости
  const [playersWithAttendance, setPlayersWithAttendance] = useState<PlayerWithAttendance[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  
  // Состояние для быстрых фильтров
  const [quickFilter, setQuickFilter] = useState<'week' | 'month' | null>(null);
  
  // Состояние для статистики
  const [stats, setStats] = useState({
    totalTrainings: 0,
    playersCount: 0,
    totalAttendance: 0,
    averageAttendance: 0,
    gymCount: 0,
    matchesCount: 0,
  });
  

  
  // Загрузка списка команд при загрузке страницы
  useEffect(() => {
    if (session?.user) {
      fetchTeams();
    }
  }, [session]);
  
  // Загрузка списка тренировок при выборе команды и диапазона дат
  useEffect(() => {
    if (selectedTeamId && startDate && endDate) {
      fetchTrainings();
    }
  }, [selectedTeamId, startDate, endDate]);
  
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
      if (data.length > 0) {
        setSelectedTeamId(data[0].id);
      }
    } catch (error) {
      console.error('Ошибка при загрузке команд:', error);
    } finally {
      setIsLoadingTeams(false);
    }
  };
  
  // Функция для получения списка тренировок команды за выбранный период
  const fetchTrainings = async () => {
    try {
      setIsLoadingTrainings(true);
      setPlayersWithAttendance([]);
      
      // Форматируем даты для запроса
      const fromDate = startDate;
      const toDate = endDate;
      
      const response = await fetch(`/api/trainings?teamId=${selectedTeamId}&fromDate=${fromDate}&toDate=${toDate}`);
      if (!response.ok) {
        throw new Error('Не удалось загрузить список тренировок');
      }
      const data = await response.json();
      
      // Добавляем отладочную информацию
      console.log('📊 Данные тренировок от API:', data);
      console.log('🔍 Первая тренировка:', data[0]);
      
      // Сортируем тренировки по дате (от старых к новым)
      const sortedTrainings = data.sort((a: any, b: any) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // Преобразуем данные в правильный формат
      const formattedTrainings: Training[] = sortedTrainings.map((item: any) => {
        const trainingType = (item.type || 'TRAINING').toUpperCase();
        console.log(`🔍 Тренировка ${item.id}: type="${item.type}" -> "${trainingType}"`);
        
        return {
          id: item.id,
          title: item.name || item.title, // API возвращает 'name', но интерфейс ожидает 'title'
          date: item.date,
          teamId: item.teamId,
          time: item.time,
          type: trainingType
        };
      });
      
      console.log('🔧 Форматированные тренировки:', formattedTrainings);
      
      setTrainings(formattedTrainings);
      
      if (formattedTrainings.length > 0) {
        fetchAttendanceForAllTrainings(formattedTrainings);
      } else {
        setStats({
          totalTrainings: 0,
          playersCount: 0,
          totalAttendance: 0,
          averageAttendance: 0,
          gymCount: 0,
          matchesCount: 0,
        });
        setIsLoadingTrainings(false);
      }
    } catch (error) {
      console.error('Ошибка при загрузке тренировок:', error);
      setIsLoadingTrainings(false);
    }
  };
  
  // Функция для получения данных посещаемости для всех тренировок
  const fetchAttendanceForAllTrainings = async (trainings: Training[]) => {
    try {
      setIsLoadingAttendance(true);
      
      // Словарь для хранения данных посещаемости по игрокам
      const playersMap: Record<string, {
        id: string;
        firstName: string;
        lastName: string;
        imageUrl?: string | null;
        attendanceRecords: Record<string, AttendanceData>;
      }> = {};
      
      // Получаем данные посещаемости для каждой тренировки
      await Promise.all(trainings.map(async (training) => {
        try {
          const response = await fetch(`/api/trainings/${training.id}/attendance`);
          if (!response.ok) {
            console.error(`Ошибка при загрузке данных посещаемости для тренировки ${training.id}`);
            return;
          }
          
          const attendanceData = await response.json();
          
          // Обрабатываем данные для каждого игрока
          attendanceData.forEach((playerData: PlayerAttendance) => {
            if (!playersMap[playerData.id]) {
              // Если игрок встречается впервые, добавляем его в словарь
              playersMap[playerData.id] = {
                id: playerData.id,
                firstName: playerData.firstName,
                lastName: playerData.lastName,
                imageUrl: playerData.imageUrl,
                attendanceRecords: {},
              };
            }
            
            // Добавляем запись о посещаемости этой тренировки только если она существует
            if (playerData.attendance) {
              if (!playersMap[playerData.id].attendanceRecords) {
                playersMap[playerData.id].attendanceRecords = {};
              }
              playersMap[playerData.id].attendanceRecords[training.id] = playerData.attendance;
            }
          });
        } catch (error) {
          console.error(`Ошибка при загрузке данных посещаемости для тренировки ${training.id}:`, error);
        }
      }));
      
      // Преобразуем данные и считаем статистику
      const playersWithStats = Object.values(playersMap).map(player => {
        // Подсчет статистики для игрока (все активности: тренировки + зал + матчи)
        const regularTrainings = trainings.filter(t => t.type.toUpperCase() === 'TRAINING');
        const gymTrainings = trainings.filter(t => t.type.toUpperCase() === 'GYM');
        const totalActivities = regularTrainings.length + gymTrainings.length; // Пока без матчей
        
        const stats = {
          total: totalActivities, // Общее количество всех активностей
          trained: 0,
          rehab: 0,
          sick: 0,
          education: 0,
          other: 0,
          trainingPercentage: 0
        };
        
        console.log('🔍 Статистика для игрока:', { 
          playerId: player.id, 
          regularTrainingsCount: regularTrainings.length,
          gymTrainingsCount: gymTrainings.length,
          totalActivitiesCount: totalActivities
        });
        
        // Проходим по всем тренировкам и считаем статистику
        trainings.forEach(training => {
          const attendance = player.attendanceRecords?.[training.id];
          if (attendance && attendance.status) {
            switch (attendance.status) {
              case 'TRAINED':
                stats.trained++;
                break;
              case 'REHAB':
                stats.rehab++;
                break;
              case 'SICK':
                stats.sick++;
                break;
              case 'EDUCATION':
                stats.education++;
                break;
              case 'OTHER':
                stats.other++;
                break;
            }
          }
          // Если записи о посещаемости нет, игрок не учитывается в статистике
        });
        
        // Рассчитываем процент посещенных активностей (по всем активностям)
        stats.trainingPercentage = stats.total > 0 
          ? Math.round((stats.trained / stats.total) * 100) 
          : 0;
        
        return {
          ...player,
          stats
        };
      });
      
      // Сортируем игроков по фамилии и имени
      const sortedPlayers = playersWithStats.sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`;
        const nameB = `${b.lastName} ${b.firstName}`;
        return nameA.localeCompare(nameB);
      });
      
      setPlayersWithAttendance(sortedPlayers);
      
      // Обновляем общую статистику
      console.log('🔍 Тренировки для подсчета статистики:', trainings);
      console.log('🔍 Типы тренировок:', trainings.map(t => ({ id: t.id, type: t.type, title: t.title })));
      
      const totalTrainings = trainings.filter(t => t.type.toUpperCase() === 'TRAINING').length;
      const gymCount = trainings.filter(t => t.type.toUpperCase() === 'GYM').length;
      const totalActivities = totalTrainings + gymCount; // Общее количество всех активностей
      
      console.log('📊 Подсчет:', { totalTrainings, gymCount, totalActivities, total: trainings.length });
      
      const playersCount = sortedPlayers.length;
      const totalAttendance = sortedPlayers.reduce((total, player) => total + (player.stats?.trained || 0), 0);
      const averageAttendance = playersCount > 0 && totalActivities > 0
        ? Math.round((totalAttendance / (playersCount * totalActivities)) * 100) 
        : 0;
      
      setStats({
        totalTrainings,
        playersCount,
        totalAttendance,
        averageAttendance,
        gymCount,
        matchesCount: 0, // TODO: Добавить подсчет матчей
      });
      
    } catch (error) {
      console.error('Ошибка при загрузке данных посещаемости:', error);
    } finally {
      setIsLoadingTrainings(false);
      setIsLoadingAttendance(false);
    }
  };
  
  // Форматирование даты тренировки
  const formatTrainingDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) 
        ? format(date, 'd MMMM yyyy', { locale: ru }) 
        : 'Дата неизвестна';
    } catch (error) {
      return 'Ошибка даты';
    }
  };
  
  // Форматирование даты для отображения диапазона
  const formatDateRange = () => {
    if (!startDate || !endDate) {
      return t('attendancePage.select_dates');
    }
    const lang: SupportedLang = i18n.language === 'en' ? 'en' : 'ru';
    const locale = getDateFnsLocale(lang);
    const fromFormatted = format(parseISO(startDate), 'd MMMM yyyy', { locale });
    const toFormatted = format(parseISO(endDate), 'd MMMM yyyy', { locale });
    return t('attendancePage.date_range', { from: fromFormatted, to: toFormatted });
  };
  

  
  // Отображение значка статуса посещаемости
  const renderAttendanceStatus = (status: string | undefined) => {
    if (!status || !attendanceStatuses[status as keyof typeof attendanceStatuses]) {
      return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
    }
    
    const statusInfo = attendanceStatuses[status as keyof typeof attendanceStatuses];
    return (
      <div className="flex items-center">
        <div className={`w-3 h-3 ${statusInfo.color} rounded-full`}></div>
        <span className={`text-xs ml-1 ${statusInfo.textColor}`}>
          {statusInfo.name}
        </span>
      </div>
    );
  };
  
  // Функция для получения класса столбца тренировки (чтобы выделять выходные)
  const getTrainingColumnClass = (trainingDate: string) => {
    try {
      const date = parseISO(trainingDate);
      const dayOfWeek = date.getDay();
      // 0 - воскресенье, 6 - суббота
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return 'bg-vista-dark/40';
      }
      return '';
    } catch {
      return '';
    }
  };

  const getDateFnsLocale = (lang: SupportedLang) => lang === 'en' ? enUS : ru;

  return (
    <div className="space-y-6">
      {/* Отображение данных посещаемости */}
      {trainings.length > 0 && playersWithAttendance.length > 0 && !isLoadingAttendance && (
        <Card className="bg-vista-dark/50 border border-vista-secondary/30 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-vista-light">
              {t('attendancePage.stats_title', { team: teams.find(t => t.id === selectedTeamId)?.name || '' })}
            </CardTitle>
            <div className="w-[200px] h-9"></div> {/* Пустая кнопка для выравнивания */}
          </CardHeader>
          <CardContent>
            {/* Фильтры под заголовком */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Выбор команды */}
                <Select
                  value={selectedTeamId}
                  onValueChange={setSelectedTeamId}
                  disabled={isLoadingTeams}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal shadow-lg">
                    <SelectValue placeholder={t('attendancePage.select_team')} />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border border-vista-light/20 text-vista-light shadow-2xl rounded-lg">
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Быстрые фильтры по периодам */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const now = new Date();
                      const startOfWeek = new Date(now);
                      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Понедельник
                      startOfWeek.setHours(0, 0, 0, 0);
                      const endOfWeek = new Date(startOfWeek);
                      endOfWeek.setDate(startOfWeek.getDate() + 6); // Воскресенье
                      endOfWeek.setHours(23, 59, 59, 999);
                      
                      setStartDate(format(startOfWeek, 'yyyy-MM-dd'));
                      setEndDate(format(endOfWeek, 'yyyy-MM-dd'));
                      setQuickFilter('week');
                    }}
                    className={`h-9 px-3 text-sm font-normal bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 ${
                      quickFilter === 'week' ? 'bg-vista-primary/20 border-vista-primary/40 text-vista-primary' : ''
                    }`}
                  >
                    {t('attendancePage.current_week')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const now = new Date();
                      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      endOfMonth.setHours(23, 59, 59, 999);
                      
                      setStartDate(format(startOfMonth, 'yyyy-MM-dd'));
                      setEndDate(format(endOfMonth, 'yyyy-MM-dd'));
                      setQuickFilter('month');
                    }}
                    className={`h-9 px-3 text-sm font-normal bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 ${
                      quickFilter === 'month' ? 'bg-vista-primary/20 border-vista-primary/40 text-vista-primary' : ''
                    }`}
                  >
                    {t('attendancePage.current_month')}
                  </Button>
                </div>
                
                {/* Выбор периода дат */}
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-[150px]">
                    <div 
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50 cursor-pointer z-10"
                      onClick={() => {
                        const dateInput = document.getElementById('attendance-start-date') as HTMLInputElement;
                        if (dateInput) {
                          try {
                            dateInput.showPicker();
                          } catch (error) {
                            console.error('Failed to show date picker:', error);
                          }
                        }
                      }}
                    >
                      <CalendarIcon size={16} />
                    </div>
                    <Input
                      id="attendance-start-date"
                      type="date"
                      value={startDate}
                      onChange={e => {
                        setStartDate(e.target.value);
                        setQuickFilter(null); // Сбрасываем выделение быстрых фильтров
                      }}
                      className="pl-10 bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 font-normal shadow-lg cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                      placeholder="С"
                      onClick={(e) => {
                        try {
                          (e.target as HTMLInputElement).showPicker();
                        } catch (error) {
                          console.error('Failed to show date picker:', error);
                        }
                      }}
                    />
                  </div>
                  <span className="text-vista-light/70">—</span>
                  <div className="relative w-full sm:w-[150px]">
                    <div 
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50 cursor-pointer z-10"
                      onClick={() => {
                        const dateInput = document.getElementById('attendance-end-date') as HTMLInputElement;
                        if (dateInput) {
                          try {
                            dateInput.showPicker();
                          } catch (error) {
                            console.error('Failed to show date picker:', error);
                          }
                        }
                      }}
                    >
                      <CalendarIcon size={16} />
                    </div>
                    <Input
                      id="attendance-end-date"
                      type="date"
                      value={endDate}
                      onChange={e => {
                        setEndDate(e.target.value);
                        setQuickFilter(null); // Сбрасываем выделение быстрых фильтров
                      }}
                      className="pl-10 bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 font-normal shadow-lg cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                      placeholder="По"
                      onClick={(e) => {
                        try {
                          (e.target as HTMLInputElement).showPicker();
                        } catch (error) {
                          console.error('Failed to show date picker:', error);
                        }
                      }}
                    />
                  </div>
                </div>
                

              </div>
            </div>
            {/* Общая статистика в виде карточек */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
              <div className="bg-vista-dark-lighter rounded-md p-2.5 border border-vista-secondary/30 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-vista-light/70 text-xs">{t('attendancePage.players')}</span>
                  <span className="text-vista-light text-lg font-semibold">{stats.playersCount}</span>
                </div>
              </div>
              <div className="bg-vista-dark-lighter rounded-md p-2.5 border border-vista-secondary/30 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-vista-light/70 text-xs">{t('attendancePage.total_sessions')}</span>
                  <span className="text-vista-light text-lg font-semibold">{stats.totalTrainings + stats.gymCount + stats.matchesCount}</span>
                </div>
              </div>
              <div className="bg-vista-dark-lighter rounded-md p-2.5 border border-vista-secondary/30 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-vista-light/70 text-xs">{t('attendancePage.trainings')}</span>
                  <span className="text-vista-light text-lg font-semibold">{stats.totalTrainings}</span>
                </div>
              </div>
              <div className="bg-vista-dark-lighter rounded-md p-2.5 border border-vista-secondary/30 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-vista-light/70 text-xs">{t('attendancePage.gym')}</span>
                  <span className="text-vista-light text-lg font-semibold">{stats.gymCount || 0}</span>
                </div>
              </div>
              <div className="bg-vista-dark-lighter rounded-md p-2.5 border border-vista-secondary/30 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-vista-light/70 text-xs">{t('attendancePage.matches')}</span>
                  <span className="text-vista-light text-lg font-semibold">{stats.matchesCount || 0}</span>
                </div>
              </div>
              <div className="bg-vista-dark-lighter rounded-md p-2.5 border border-vista-secondary/30 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-vista-light/70 text-xs">{t('attendancePage.attendance')}</span>
                  <span className="text-vista-light text-lg font-semibold">{stats.averageAttendance}%</span>
                </div>
              </div>
            </div>
            
            {/* Таблица с данными */}
            <div className="mt-6">
                <div className="rounded-md border border-vista-secondary/30 overflow-hidden shadow-md">
                  <div className="overflow-x-auto w-full custom-scrollbar" style={{ minWidth: "100%" }}>
                    <Table className="relative w-auto">
                      <TableHeader>
                        <UITableRow className="bg-vista-dark-lighter hover:bg-vista-dark-lighter border-b border-vista-secondary/30 shadow-md">
                          <TableHead className="text-vista-light/80 font-medium w-[250px] min-w-[250px] sticky left-0 bg-vista-dark py-2.5 border-r border-vista-secondary/30">{t('attendancePage.player')}</TableHead>
                          <TableHead className="text-vista-light/80 font-medium text-center py-2.5 border-r border-vista-secondary/30 w-[120px] min-w-[120px]">{t('attendancePage.attendance')}</TableHead>
                          
                          {/* Генерируем заголовки для каждой тренировки */}
                          {trainings.map((training) => (
                            <TableHead 
                              key={training.id} 
                              className={`text-vista-light/80 font-medium text-center p-1.5 min-w-[80px] border-r border-vista-secondary/30 ${getTrainingColumnClass(training.date)}`}
                            >
                              <div className="flex flex-col items-center justify-center">
                                <span className={`text-[8px] mb-0.5 px-1 py-0.5 rounded w-full text-center flex items-center justify-center ${
                                  training.type.toUpperCase() === 'GYM' 
                                    ? 'bg-purple-500/20 text-purple-400' 
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {training.type.toUpperCase() === 'GYM' ? t('attendancePage.gym_short') : t('attendancePage.training')}
                                </span>
                                <span className="text-xs font-semibold mt-0.5">{format(parseISO(training.date), 'dd.MM.yy')}</span>
                                <span className="text-[10px] text-vista-light/50 mt-0.5">{training.time}</span>
                              </div>
                            </TableHead>
                          ))}
                        </UITableRow>
                      </TableHeader>
                      <TableBody>
                        {playersWithAttendance.map((player, index) => (
                          <UITableRow key={player.id} className="hover:bg-vista-dark/40 border-b border-vista-secondary/30 shadow-md">
                            {/* Информация об игроке */}
                            <TableCell className="sticky left-0 bg-vista-dark py-1.5 w-[250px] min-w-[250px] border-r border-vista-secondary/30">
                              <div className="flex items-center">
                                {/* Фото игрока */}
                                <div className="h-7 w-7 rounded-full overflow-hidden bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] mr-2 flex-shrink-0 shadow-sm">
                                  {player.imageUrl ? (
                                    <img 
                                      src={player.imageUrl}
                                      alt={`${player.lastName} ${player.firstName}`}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = `https://ui-avatars.com/api/?name=${player.firstName}+${player.lastName}&background=344054&color=fff&size=100`;
                                      }}
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <UsersIcon className="w-3 h-3 text-slate-300" />
                                    </div>
                                  )}
                                </div>
                                <span className="text-vista-light font-medium">
                                  {player.lastName} {player.firstName}
                                </span>
                              </div>
                            </TableCell>
                            
                            {/* Посещаемость (по всем активностям: тренировки + зал + матчи) */}
                            <TableCell className="text-center py-1.5 border-r border-vista-secondary/30 w-[120px] min-w-[120px]">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-vista-light text-sm">
                                  {player.stats?.trained || 0}/{player.stats?.total || 0}
                                </span>
                                <span 
                                  className={`text-xs 
                                    ${(player.stats?.trainingPercentage || 0) >= 80 
                                      ? 'text-green-300' 
                                      : (player.stats?.trainingPercentage || 0) >= 50 
                                        ? 'text-yellow-300' 
                                        : 'text-red-300'
                                  }`}
                                >
                                  ({(player.stats?.trainingPercentage || 0)}%)
                                </span>
                              </div>
                            </TableCell>
                            
                            {/* Статусы посещаемости по каждой тренировке */}
                            {trainings.map((training) => {
                              const attendance = player.attendanceRecords?.[training.id];
                              const status = attendance?.status;
                              
                              // Безопасно получаем информацию о статусе
                              const statusInfo = status && attendanceStatuses[status as keyof typeof attendanceStatuses] 
                                ? attendanceStatuses[status as keyof typeof attendanceStatuses] 
                                : null;
                              
                              return (
                                <TableCell 
                                  key={`${player.id}-${training.id}`} 
                                  className={`text-center p-1 border-r border-vista-secondary/30 ${getTrainingColumnClass(training.date)}`}
                                >
                                  <div 
                                    className={`w-5 h-5 rounded-full mx-auto 
                                    ${attendanceStatuses[status as keyof typeof attendanceStatuses]?.color || 'bg-vista-dark/40 border border-vista-secondary/30 shadow-md'}`}
                                    title={attendanceStatuses[status as keyof typeof attendanceStatuses]?.name || 'Нет данных'}
                                  ></div>
                                </TableCell>
                              );
                            })}
                          </UITableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                {/* Если нет данных */}
                {playersWithAttendance.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-vista-light/70">{t('attendancePage.no_players_found')}</p>
                  </div>
                )}
              </div>
            
            {/* Легенда статусов */}
            <div className="mt-4 bg-vista-dark/30 p-3 rounded-md border border-vista-secondary/30 shadow-sm">
              <h4 className="text-vista-light/80 text-sm font-medium mb-2">{t('attendancePage.legend')}</h4>
              <div className="flex flex-wrap gap-3">
                {(['TRAINED', 'REHAB', 'SICK', 'EDUCATION', 'INJURY', 'NATIONAL_TEAM', 'OTHER_TEAM', 'OTHER'] as (keyof typeof attendanceStatuses)[]).map((status) => (
                  <div key={status} className="flex items-center">
                    <div className={`w-4 h-4 rounded-full ${attendanceStatuses[status].color} mr-2`}></div>
                    <span className={`text-xs ${attendanceStatuses[status].textColor}`}>
                      {t(`attendancePage.status.${status}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Состояние загрузки */}
      {isLoadingTrainings && (
        <Card className="bg-vista-dark/50 border border-vista-secondary/30 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary"></div>
              <span className="ml-2 text-vista-light/80">{t('common.loading')}</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Пустое состояние */}
      {!isLoadingTrainings && trainings.length === 0 && selectedTeamId && (
        <Card className="bg-vista-dark/50 border border-vista-secondary/30 shadow-md">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="mb-4 text-vista-light/50">
                <CalendarIcon className="mx-auto h-12 w-12 opacity-50" />
              </div>
              <p className="text-vista-light/70">{t('attendancePage.no_trainings_in_period')}</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Начальное состояние */}
      {!selectedTeamId && (
        <Card className="bg-vista-dark/50 border border-vista-secondary/30 shadow-md">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="mb-4 text-vista-light/50">
                <ListFilterIcon className="mx-auto h-12 w-12 opacity-50" />
              </div>
              <p className="text-vista-light/70">{t('attendancePage.select_team_and_period')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 