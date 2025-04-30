'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import PlayerAvatar from '@/components/ui/PlayerAvatar';

// Типы для данных
type Team = {
  id: string;
  name: string;
};

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
  photoUrl?: string | null;
  image?: string | null;
};

// Тип статуса посещаемости - соответствует значениям из базы данных
type AttendanceStatus = 'TRAINED' | 'REHABILITATION' | 'SICK' | 'STUDY' | 'OTHER';

type AttendanceRecord = {
  id: string;
  playerId: string;
  trainingId: string;
  date: string;
  time: string;
  status: AttendanceStatus | null;
};

export default function AttendancePage() {
  const t = useTranslations('analytics.attendance');
  const tNav = useTranslations('navigation');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { locale } = useParams();
  
  // Состояния
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [loading, setLoading] = useState<boolean>(false);
  const [daysInRange, setDaysInRange] = useState<Date[]>([]);

  // Загрузка списка команд при монтировании
  useEffect(() => {
    fetchTeams();
  }, []);

  // Обновление дней в выбранном диапазоне
  useEffect(() => {
    if (startDate && endDate) {
      const days = eachDayOfInterval({
        start: startDate,
        end: endDate
      });
      setDaysInRange(days);
    }
  }, [startDate, endDate]);

  // Загрузка игроков при выборе команды
  useEffect(() => {
    if (selectedTeam) {
      fetchPlayers(selectedTeam);
    }
  }, [selectedTeam]);

  // Загрузка данных о посещаемости при изменении команды или дат
  useEffect(() => {
    if (selectedTeam && startDate && endDate) {
      fetchAttendance(selectedTeam, startDate, endDate);
    }
  }, [selectedTeam, startDate, endDate]);

  // Загрузка списка команд
  const fetchTeams = async () => {
    try {
      setLoading(true);
      console.log('Загружаем команды...');
      const response = await fetch('/api/coaching/teams');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Получены команды:', data);
        setTeams(data);
        
        // Если есть команды, выбираем первую по умолчанию
        if (data.length > 0) {
          setSelectedTeam(data[0].id);
        }
      } else {
        console.error('Ошибка загрузки команд:', response.status, response.statusText);
        
        // Если 401 Unauthorized, значит пользователь не авторизован
        if (response.status === 401) {
          console.error('Пользователь не авторизован. Перенаправление на страницу входа...');
          // Можно перенаправить на страницу входа или показать сообщение
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке команд:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка списка игроков
  const fetchPlayers = async (teamId: string) => {
    try {
      setLoading(true);
      console.log(`Загружаем игроков для команды ${teamId}...`);
      const response = await fetch(`/api/coaching/teams/${teamId}/players`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Получены игроки:', data);
        
        if (data.length === 0) {
          console.log('Список игроков пуст. Загружаем тестовые данные...');
          // Загрузим тестовые данные для демонстрации
          const testPlayers: Player[] = [
            { id: 'p1', firstName: 'Иван', lastName: 'Иванов', number: 1, photoUrl: 'https://randomuser.me/api/portraits/men/1.jpg' },
            { id: 'p2', firstName: 'Петр', lastName: 'Петров', number: 2, photoUrl: 'https://randomuser.me/api/portraits/men/2.jpg' },
            { id: 'p3', firstName: 'Алексей', lastName: 'Сидоров', number: 3, photoUrl: 'https://randomuser.me/api/portraits/men/3.jpg' },
            { id: 'p4', firstName: 'Михаил', lastName: 'Смирнов', number: 4, photoUrl: 'https://randomuser.me/api/portraits/men/4.jpg' },
            { id: 'p5', firstName: 'Сергей', lastName: 'Кузнецов', number: 5, photoUrl: 'https://randomuser.me/api/portraits/men/5.jpg' },
          ];
          setPlayers(testPlayers);
        } else {
          setPlayers(data);
        }
      } else {
        console.error('Ошибка загрузки игроков:', response.status, response.statusText);
        
        // Если API недоступен, используем тестовые данные
        console.log('Загружаем тестовые данные игроков...');
        const testPlayers: Player[] = [
          { id: 'p1', firstName: 'Иван', lastName: 'Иванов', number: 1, photoUrl: 'https://randomuser.me/api/portraits/men/1.jpg' },
          { id: 'p2', firstName: 'Петр', lastName: 'Петров', number: 2, photoUrl: 'https://randomuser.me/api/portraits/men/2.jpg' },
          { id: 'p3', firstName: 'Алексей', lastName: 'Сидоров', number: 3, photoUrl: 'https://randomuser.me/api/portraits/men/3.jpg' },
          { id: 'p4', firstName: 'Михаил', lastName: 'Смирнов', number: 4, photoUrl: 'https://randomuser.me/api/portraits/men/4.jpg' },
          { id: 'p5', firstName: 'Сергей', lastName: 'Кузнецов', number: 5, photoUrl: 'https://randomuser.me/api/portraits/men/5.jpg' },
        ];
        setPlayers(testPlayers);
      }
    } catch (error) {
      console.error('Ошибка при загрузке игроков:', error);
      
      // В случае ошибки также загружаем тестовые данные
      const testPlayers: Player[] = [
        { id: 'p1', firstName: 'Иван', lastName: 'Иванов', number: 1, photoUrl: 'https://randomuser.me/api/portraits/men/1.jpg' },
        { id: 'p2', firstName: 'Петр', lastName: 'Петров', number: 2, photoUrl: 'https://randomuser.me/api/portraits/men/2.jpg' },
        { id: 'p3', firstName: 'Алексей', lastName: 'Сидоров', number: 3, photoUrl: 'https://randomuser.me/api/portraits/men/3.jpg' },
        { id: 'p4', firstName: 'Михаил', lastName: 'Смирнов', number: 4, photoUrl: 'https://randomuser.me/api/portraits/men/4.jpg' },
        { id: 'p5', firstName: 'Сергей', lastName: 'Кузнецов', number: 5, photoUrl: 'https://randomuser.me/api/portraits/men/5.jpg' },
      ];
      setPlayers(testPlayers);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка данных о посещаемости
  const fetchAttendance = async (teamId: string, start: Date, end: Date) => {
    try {
      setLoading(true);
      
      // Форматируем даты для API
      const formattedStart = format(start, 'yyyy-MM-dd');
      const formattedEnd = format(end, 'yyyy-MM-dd');
      
      console.log(`Загружаем посещаемость для команды ${teamId} с ${formattedStart} по ${formattedEnd}...`);
      const response = await fetch(
        `/api/trainings/attendance?teamId=${teamId}&startDate=${formattedStart}&endDate=${formattedEnd}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Получены данные о посещаемости:', data);
        
        // Устанавливаем полученные данные посещаемости
        setAttendance(data);
      } else {
        console.error('Ошибка загрузки посещаемости:', response.status, response.statusText);
        
        // Не генерируем тестовые данные автоматически при ошибке
        setAttendance([]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных посещаемости:', error);
      
      // Не генерируем тестовые данные при ошибке
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  // Получение статуса посещаемости для конкретного игрока и тренировки
  const getAttendanceStatus = (playerId: string, trainingId: string): AttendanceStatus | null => {
    const record = attendance.find(
      a => a.playerId === playerId && a.trainingId === trainingId
    );
    
    return record ? record.status : null;
  };

  // Обновление статуса посещаемости для конкретного игрока и тренировки
  const updateAttendanceStatus = async (playerId: string, trainingId: string, newStatus: AttendanceStatus | null) => {
    try {
      setLoading(true);
      
      // Находим существующую запись
      const recordIndex = attendance.findIndex(
        a => a.playerId === playerId && a.trainingId === trainingId
      );
      
      if (recordIndex === -1) {
        console.error('Запись не найдена для обновления');
        return;
      }
      
      const record = attendance[recordIndex];
      
      // Создаем обновленную запись
      const updatedRecord = {
        ...record,
        status: newStatus
      };
      
      console.log(`Обновление статуса для игрока ${playerId} на тренировке ${trainingId}: ${newStatus}`);
      
      // Отправляем запрос на сервер
      const response = await fetch('/api/trainings/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [updatedRecord]
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Статус успешно обновлен:', result);
        
        // Обновляем состояние локально
        const newAttendance = [...attendance];
        newAttendance[recordIndex] = updatedRecord;
        setAttendance(newAttendance);
      } else {
        console.error('Ошибка при обновлении статуса:', response.status);
        alert(t('errors.updateFailed'));
      }
    } catch (error) {
      console.error('Ошибка при обновлении статуса посещаемости:', error);
      alert(t('errors.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Обработчик клика по индикатору статуса
  const handleStatusClick = (playerId: string, trainingId: string) => {
    // Получаем текущий статус
    const currentStatus = getAttendanceStatus(playerId, trainingId);
    
    // Циклически меняем статус
    let newStatus: AttendanceStatus | null;
    
    switch (currentStatus) {
      case null:
        newStatus = 'TRAINED';
        break;
      case 'TRAINED':
        newStatus = 'SICK';
        break;
      case 'SICK':
        newStatus = 'REHABILITATION';
        break;
      case 'REHABILITATION':
        newStatus = 'STUDY';
        break;
      case 'STUDY':
        newStatus = 'OTHER';
        break;
      case 'OTHER':
        newStatus = null;
        break;
      default:
        newStatus = 'TRAINED';
    }
    
    // Обновляем статус
    updateAttendanceStatus(playerId, trainingId, newStatus);
  };

  // Подсчет количества тренировок, на которых игрок участвовал
  const getAttendanceStats = (playerId: string): { present: number, total: number } => {
    // Используем Map для группировки по тренировкам
    const attendanceByTraining = new Map<string, AttendanceStatus | null>();
    
    // Группируем записи по тренировкам
    attendance
      .filter(record => record.playerId === playerId)
      .forEach(record => {
        attendanceByTraining.set(record.trainingId, record.status);
      });
    
    // Подсчитываем только уникальные тренировки со статусом TRAINED
    const presentCount = Array.from(attendanceByTraining.values())
      .filter(status => status === 'TRAINED')
      .length;
    
    return {
      present: presentCount,
      total: uniqueTrainings.length
    };
  };

  // Получение цвета для статуса посещаемости
  const getStatusColor = (status: AttendanceStatus | null): string => {
    switch (status) {
      case 'TRAINED':
        return 'bg-green-500';
      case 'SICK':
        return 'bg-red-500';
      case 'REHABILITATION':
        return 'bg-yellow-500';
      case 'STUDY':
        return 'bg-blue-500';
      case 'OTHER':
        return 'bg-gray-400';
      default:
        return 'bg-gray-700';
    }
  };

  // Получение текста для статуса посещаемости
  const getStatusText = (status: AttendanceStatus | null): string => {
    switch (status) {
      case 'TRAINED':
        return t('statuses.trained');
      case 'SICK':
        return t('statuses.sick');
      case 'REHABILITATION':
        return t('statuses.rehab');
      case 'STUDY':
        return t('statuses.study');
      case 'OTHER':
        return t('statuses.other');
      default:
        return t('statuses.none');
    }
  };

  // Перейти к предыдущему месяцу
  const goToPreviousMonth = () => {
    const newStartDate = new Date(startDate);
    newStartDate.setMonth(newStartDate.getMonth() - 1);
    setStartDate(startOfMonth(newStartDate));
    setEndDate(endOfMonth(newStartDate));
  };

  // Перейти к следующему месяцу
  const goToNextMonth = () => {
    const newStartDate = new Date(startDate);
    newStartDate.setMonth(newStartDate.getMonth() + 1);
    setStartDate(startOfMonth(newStartDate));
    setEndDate(endOfMonth(newStartDate));
  };

  // Обработчик изменения начальной даты
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setStartDate(new Date(e.target.value));
    }
  };

  // Обработчик изменения конечной даты
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setEndDate(new Date(e.target.value));
    }
  };

  // Получение уникальных тренировок
  const uniqueTrainings = Array.from(
    new Set(attendance.map(record => record.trainingId))
  ).map(trainingId => {
    const record = attendance.find(r => r.trainingId === trainingId);
    return {
      id: trainingId,
      date: record?.date || '',
      time: record?.time || ''
    };
  }).sort((a, b) => {
    // Сначала сортируем по дате
    const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    
    // Если даты совпадают, сортируем по времени
    return a.time.localeCompare(b.time);
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.back()}
          className="border-[#2c3c42] text-vista-light hover:bg-[#2c3c42] hover:text-[#5acce5]"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          {tCommon('back')}
        </Button>
        
        <h1 className="text-3xl font-bold text-[#5acce5]">{tNav('attendance')}</h1>
        
        <div className="w-20"></div> {/* Пустой div для центрирования заголовка */}
      </div>
      
      {/* Фильтры */}
      <Card className="bg-[#1a2228] border-[#2c3c42] shadow-md p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Фильтр по команде */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#5acce5] mb-2">{t('team')}</label>
            <Select
              value={selectedTeam}
              onValueChange={setSelectedTeam}
            >
              <SelectTrigger className="bg-[#1a2228] border-[#2c3c42] text-vista-light hover:border-[#5acce5] focus:border-[#5acce5] transition-colors">
                <SelectValue>
                  {selectedTeam 
                    ? teams.find(team => team.id === selectedTeam)?.name || t('selectTeam')
                    : t('selectTeam')
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a2228] border-[#2c3c42]">
                {teams.map((team) => (
                  <SelectItem 
                    key={team.id} 
                    value={team.id} 
                    className="text-vista-light hover:bg-[#2c3c42] focus:bg-[#2c3c42] focus:text-[#5acce5]"
                  >
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Диапазон дат */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#5acce5] mb-2">{t('dateRange')}</label>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 border-[#2c3c42] text-vista-light hover:bg-[#2c3c42] hover:text-[#5acce5] transition-colors"
                onClick={goToPreviousMonth}
                title={t('previousMonth')}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              
              <div className="flex flex-1 gap-2">
                <Input
                  type="date"
                  value={format(startDate, 'yyyy-MM-dd')}
                  onChange={handleStartDateChange}
                  className="bg-[#1a2228] border-[#2c3c42] text-vista-light focus:border-[#5acce5] transition-colors"
                />
                <span className="text-vista-light self-center">—</span>
                <Input
                  type="date"
                  value={format(endDate, 'yyyy-MM-dd')}
                  onChange={handleEndDateChange}
                  className="bg-[#1a2228] border-[#2c3c42] text-vista-light focus:border-[#5acce5] transition-colors"
                />
              </div>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 border-[#2c3c42] text-vista-light hover:bg-[#2c3c42] hover:text-[#5acce5] transition-colors"
                onClick={goToNextMonth}
                title={t('nextMonth')}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Таблица посещаемости */}
      {loading ? (
        <div className="flex justify-center items-center h-64 bg-[#1a2228] border border-[#2c3c42] rounded-md shadow-md">
          <p className="text-vista-light">{tCommon('loading')}</p>
        </div>
      ) : uniqueTrainings.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 bg-[#1a2228] border border-[#2c3c42] rounded-md shadow-md">
          <p className="text-vista-light mb-2">{t('noTrainings')}</p>
          <p className="text-vista-light text-sm text-center max-w-md">
            {t('noTrainingsHint')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[#1a2228] border border-[#2c3c42] rounded-md shadow-md p-2">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-[#2c3c42] bg-[#16191d] p-3 text-left text-[#5acce5] sticky left-0 z-10 rounded-tl-md">
                  {t('player')}
                </th>
                
                {uniqueTrainings.map((training, index) => (
                  <th 
                    key={training.id} 
                    className={`border border-[#2c3c42] bg-[#16191d] p-3 text-center text-[#5acce5] min-w-[60px]`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{format(new Date(training.date), 'EEE', { locale: ru })}</span>
                      <span className="text-base">{format(new Date(training.date), 'd')}</span>
                      <span className="text-xs mt-1">{training.time}</span>
                    </div>
                  </th>
                ))}
                
                {/* Статичный столбец с количеством тренировок */}
                <th className="border border-[#2c3c42] bg-[#16191d] p-3 text-center text-[#5acce5] min-w-[100px] sticky right-0 z-10 rounded-tr-md">
                  <div className="whitespace-nowrap">
                    {t('attendanceRate')}
                  </div>
                </th>
              </tr>
            </thead>
            
            <tbody>
              {players.map((player, playerIndex) => (
                <tr key={player.id} className={playerIndex % 2 === 0 ? 'bg-[#1a2228]' : 'bg-[#1c242a]'}>
                  <td className={`border border-[#2c3c42] p-3 text-vista-light sticky left-0 z-10 ${playerIndex % 2 === 0 ? 'bg-[#1a2228]' : 'bg-[#1c242a]'} hover:bg-[#2c3c42] transition-colors`}>
                    <div className="flex items-center">
                      <div className="mr-2">
                        <PlayerAvatar 
                          photoUrl={player.photoUrl || player.image}
                          name={`${player.firstName} ${player.lastName}`}
                          size="sm"
                        />
                      </div>
                      <div>
                        {player.number && (
                          <span className="bg-[#5acce5] text-[#16191d] rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs font-medium inline-block float-left mt-0.5">
                            {player.number}
                          </span>
                        )}
                        <span className="font-medium text-sm">{player.lastName} {player.firstName}</span>
                      </div>
                    </div>
                  </td>
                  
                  {uniqueTrainings.map((training) => {
                    const status = getAttendanceStatus(player.id, training.id);
                    return (
                      <td 
                        key={`${player.id}-${training.id}`} 
                        className="border border-[#2c3c42] p-1 text-center"
                      >
                        <div 
                          className={`w-6 h-6 rounded-full mx-auto ${getStatusColor(status)} cursor-pointer hover:scale-110 transition-transform`}
                          title={getStatusText(status)}
                          onClick={() => handleStatusClick(player.id, training.id)}
                        />
                      </td>
                    );
                  })}
                  
                  {/* Статичный столбец с количеством тренировок */}
                  {(() => {
                    const stats = getAttendanceStats(player.id);
                    const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                    return (
                      <td className={`border border-[#2c3c42] p-2 text-center text-white font-medium sticky right-0 z-10 ${playerIndex % 2 === 0 ? 'bg-[#1a2228]' : 'bg-[#1c242a]'}`}>
                        <div className="flex items-center justify-center">
                          <span className="text-green-500">{stats.present}</span>
                          <span className="mx-1">/</span>
                          <span>{stats.total}</span>
                          <span className="ml-2 text-xs text-gray-400">({percentage}%)</span>
                        </div>
                      </td>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Легенда статусов */}
      <div className="mt-6 bg-[#1a2228] border border-[#2c3c42] rounded-md p-4 shadow-md">
        <h3 className="text-[#5acce5] text-sm font-medium mb-3">{t('status')}</h3>
        <div className="flex flex-wrap gap-6">
          {['TRAINED', 'SICK', 'REHABILITATION', 'STUDY', 'OTHER', null].map((status) => (
            <div key={status || 'none'} className="flex items-center">
              <div className={`w-5 h-5 rounded-full ${getStatusColor(status as AttendanceStatus | null)} mr-3`} />
              <span className="text-vista-light text-sm">{getStatusText(status as AttendanceStatus | null)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 