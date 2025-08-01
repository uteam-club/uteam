'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
}

interface AttendanceData {
  id?: string;
  status: 'TRAINED' | 'REHAB' | 'SICK' | 'EDUCATION' | 'OTHER';
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
  
  // Состояние для статистики
  const [stats, setStats] = useState({
    totalTrainings: 0,
    playersCount: 0,
    totalAttendance: 0,
    averageAttendance: 0,
  });
  
  // Состояние для текущей вкладки
  const [currentTab, setCurrentTab] = useState<string>('all');
  
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
      
      // Сортируем тренировки по дате (от старых к новым)
      const sortedTrainings = data.sort((a: Training, b: Training) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      setTrainings(sortedTrainings);
      
      if (sortedTrainings.length > 0) {
        fetchAttendanceForAllTrainings(sortedTrainings);
      } else {
        setStats({
          totalTrainings: 0,
          playersCount: 0,
          totalAttendance: 0,
          averageAttendance: 0,
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
            
            // Добавляем запись о посещаемости этой тренировки
            playersMap[playerData.id].attendanceRecords[training.id] = playerData.attendance;
          });
        } catch (error) {
          console.error(`Ошибка при загрузке данных посещаемости для тренировки ${training.id}:`, error);
        }
      }));
      
      // Преобразуем данные и считаем статистику
      const playersWithStats = Object.values(playersMap).map(player => {
        // Подсчет статистики для игрока
        const stats = {
          total: trainings.length,
          trained: 0,
          rehab: 0,
          sick: 0,
          education: 0,
          other: 0,
          trainingPercentage: 0
        };
        
        // Проходим по всем тренировкам и считаем статистику
        trainings.forEach(training => {
          const attendance = player.attendanceRecords[training.id];
          if (attendance) {
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
        });
        
        // Рассчитываем процент посещенных тренировок
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
      const totalTrainings = trainings.length;
      const playersCount = sortedPlayers.length;
      const totalAttendance = sortedPlayers.reduce((total, player) => total + player.stats.trained, 0);
      const averageAttendance = playersCount > 0 
        ? Math.round((totalAttendance / (playersCount * totalTrainings)) * 100) 
        : 0;
      
      setStats({
        totalTrainings,
        playersCount,
        totalAttendance,
        averageAttendance,
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
  
  // Получение отфильтрованных игроков в зависимости от выбранной вкладки
  const getFilteredPlayers = () => {
    if (currentTab === 'all') {
      return playersWithAttendance;
    }
    
    // Для других вкладок фильтруем игроков по проценту посещаемости
    switch (currentTab) {
      case 'high':
        return playersWithAttendance.filter(p => p.stats.trainingPercentage >= 80);
      case 'medium':
        return playersWithAttendance.filter(p => p.stats.trainingPercentage >= 50 && p.stats.trainingPercentage < 80);
      case 'low':
        return playersWithAttendance.filter(p => p.stats.trainingPercentage < 50);
      default:
        return playersWithAttendance;
    }
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
      {/* Фильтры и кнопка сверху */}
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light">{t('attendancePage.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Выбор команды */}
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm text-vista-light/80 font-medium mb-2 block">{t('attendancePage.team')}</label>
              <Select 
                value={selectedTeamId}
                onValueChange={setSelectedTeamId}
                disabled={isLoadingTeams}
              >
                <SelectTrigger className="bg-vista-dark/70 border-vista-secondary/50 text-vista-light h-10 shadow-sm">
                  <SelectValue placeholder={t('attendancePage.select_team')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Выбор периода дат */}
            <div className="flex gap-2 flex-1 min-w-[250px]">
              <div className="flex-1">
                <label className="text-sm text-vista-light/80 font-medium mb-2 block">{t('attendancePage.from_date')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 rounded-md bg-vista-dark/70 border border-vista-secondary/50 text-vista-light h-10 focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-vista-light/80 font-medium mb-2 block">{t('attendancePage.to_date')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 rounded-md bg-vista-dark/70 border border-vista-secondary/50 text-vista-light h-10 focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
                />
              </div>
            </div>
            
            <Button 
              onClick={fetchTrainings} 
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark h-10 shadow-sm"
              disabled={isLoadingTrainings || !selectedTeamId}
            >
              {isLoadingTrainings ? t('attendancePage.loading') : t('attendancePage.show_report')}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Отображение данных посещаемости */}
      {trainings.length > 0 && playersWithAttendance.length > 0 && (
        <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-vista-light flex items-center justify-between">
              <span>
                {t('attendancePage.stats_title', { team: teams.find(t => t.id === selectedTeamId)?.name || '' })}
              </span>
              <span className="text-sm text-vista-light/80">
                {formatDateRange()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Общая статистика в виде карточек */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-vista-dark/70 rounded-md p-3 border border-vista-secondary/50 shadow-sm">
                <div className="text-vista-light/70 text-sm mb-1">{t('attendancePage.total_trainings')}</div>
                <div className="text-vista-light text-xl font-bold">{stats.totalTrainings}</div>
              </div>
              <div className="bg-vista-dark/70 rounded-md p-3 border border-vista-secondary/50 shadow-sm">
                <div className="text-vista-light/70 text-sm mb-1">{t('attendancePage.players_count')}</div>
                <div className="text-vista-light text-xl font-bold">{stats.playersCount}</div>
              </div>
              <div className="bg-vista-dark/70 rounded-md p-3 border border-vista-secondary/50 shadow-sm">
                <div className="text-vista-light/70 text-sm mb-1">{t('attendancePage.total_attendance')}</div>
                <div className="text-vista-light text-xl font-bold">{stats.totalAttendance}</div>
              </div>
              <div className="bg-vista-dark/70 rounded-md p-3 border border-vista-secondary/50 shadow-sm">
                <div className="text-vista-light/70 text-sm mb-1">{t('attendancePage.average_attendance')}</div>
                <div className="text-vista-light text-xl font-bold">{stats.averageAttendance}%</div>
              </div>
            </div>
            
            {/* Вкладки для фильтрации */}
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-6">
              <TabsList className="bg-vista-dark/30 border border-vista-secondary/50 mb-4">
                <TabsTrigger value="all" className="data-[state=active]:bg-vista-primary data-[state=active]:text-vista-dark">
                  {t('attendancePage.all_players')}
                </TabsTrigger>
                <TabsTrigger value="high" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                  {t('attendancePage.high_attendance')}
                </TabsTrigger>
                <TabsTrigger value="medium" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
                  {t('attendancePage.medium_attendance')}
                </TabsTrigger>
                <TabsTrigger value="low" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                  {t('attendancePage.low_attendance')}
                </TabsTrigger>
              </TabsList>
              
              {/* Содержимое вкладок - таблица с данными */}
              <TabsContent value={currentTab} className="mt-0">
                <div className="rounded-md border border-vista-secondary/50 overflow-hidden shadow-md">
                  <div className="overflow-x-auto w-full" style={{ minWidth: "100%" }}>
                    <Table className="relative w-auto">
                      <TableHeader>
                        <UITableRow className="bg-vista-dark/70 hover:bg-vista-dark/70 border-b border-vista-secondary/50 shadow-md">
                          <TableHead className="text-vista-light/80 font-medium w-[250px] min-w-[250px] sticky left-0 bg-vista-dark py-2.5">{t('attendancePage.player')}</TableHead>
                          <TableHead className="text-vista-light/80 font-medium text-center py-2.5">{t('attendancePage.attendance')}</TableHead>
                          
                          {/* Генерируем заголовки для каждой тренировки */}
                          {trainings.map((training) => (
                            <TableHead 
                              key={training.id} 
                              className={`text-vista-light/80 font-medium text-center p-1.5 min-w-[80px] ${getTrainingColumnClass(training.date)}`}
                            >
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-xs font-semibold">{format(parseISO(training.date), 'dd.MM.yyyy')}</span>
                                <span className="text-[10px] text-vista-light/50 mt-0.5">{training.time}</span>
                              </div>
                            </TableHead>
                          ))}
                        </UITableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredPlayers().map((player, index) => (
                          <UITableRow key={player.id} className="hover:bg-vista-dark/40 border-b border-vista-secondary/50 shadow-md">
                            {/* Информация об игроке */}
                            <TableCell className="sticky left-0 bg-vista-dark py-1.5 w-[250px] min-w-[250px]">
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
                            
                            {/* Посещаемость */}
                            <TableCell className="text-center py-1.5">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-vista-light font-medium">
                                  {player.stats.trained}/{player.stats.total}
                                </span>
                                <span 
                                  className={`text-sm font-medium 
                                    ${player.stats.trainingPercentage >= 80 
                                      ? 'text-green-300' 
                                      : player.stats.trainingPercentage >= 50 
                                        ? 'text-yellow-300' 
                                        : 'text-red-300'
                                  }`}
                                >
                                  ({player.stats.trainingPercentage}%)
                                </span>
                              </div>
                            </TableCell>
                            
                            {/* Статусы посещаемости по каждой тренировке */}
                            {trainings.map((training) => {
                              const attendance = player.attendanceRecords[training.id];
                              const status = attendance?.status;
                              const statusInfo = status 
                                ? attendanceStatuses[status as keyof typeof attendanceStatuses] 
                                : { color: 'bg-gray-600', textColor: 'text-gray-300' };
                              
                              return (
                                <TableCell 
                                  key={`${player.id}-${training.id}`} 
                                  className={`text-center p-1 ${getTrainingColumnClass(training.date)}`}
                                >
                                  <div 
                                    className={`w-5 h-5 rounded-full mx-auto 
                                    ${status === 'TRAINED' 
                                      ? 'bg-green-500' 
                                      : status === 'REHAB' 
                                        ? 'bg-blue-500' 
                                        : status === 'SICK' 
                                          ? 'bg-yellow-500' 
                                          : status === 'EDUCATION' 
                                            ? 'bg-purple-500' 
                                            : status === 'OTHER' 
                                              ? 'bg-gray-500' 
                                              : 'bg-vista-dark/40 border border-vista-secondary/50 shadow-md'
                                    }`}
                                    title={status ? attendanceStatuses[status as keyof typeof attendanceStatuses].name : 'Нет данных'}
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
                
                {/* Если нет данных на выбранной вкладке */}
                {getFilteredPlayers().length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-vista-light/70">{t('attendancePage.no_players_found')}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            {/* Легенда статусов */}
            <div className="mt-4 bg-vista-dark/30 p-3 rounded-md border border-vista-secondary/50 shadow-sm">
              <h4 className="text-vista-light/80 text-sm font-medium mb-2">{t('attendancePage.legend')}</h4>
              <div className="flex flex-wrap gap-3">
                {(['TRAINED', 'REHAB', 'SICK', 'EDUCATION', 'OTHER'] as (keyof typeof attendanceStatuses)[]).map((status) => (
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
        <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary"></div>
              <span className="ml-2 text-vista-light/80">Загрузка данных...</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Пустое состояние */}
      {!isLoadingTrainings && trainings.length === 0 && selectedTeamId && (
        <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="mb-4 text-vista-light/50">
                <CalendarIcon className="mx-auto h-12 w-12" />
              </div>
              <p className="text-vista-light/70">{t('attendancePage.no_trainings_in_period')}</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Начальное состояние */}
      {!selectedTeamId && (
        <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="mb-4 text-vista-light/50">
                <ListFilterIcon className="mx-auto h-12 w-12" />
              </div>
              <p className="text-vista-light/70">{t('attendancePage.select_team_and_period')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 