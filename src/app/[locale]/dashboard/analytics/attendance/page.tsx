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
};

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'READY';

type AttendanceRecord = {
  id: string;
  playerId: string;
  date: string;
  status: AttendanceStatus;
};

export default function AttendancePage() {
  const t = useTranslations('navigation');
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
            { id: 'p1', firstName: 'Иван', lastName: 'Иванов', number: 1 },
            { id: 'p2', firstName: 'Петр', lastName: 'Петров', number: 2 },
            { id: 'p3', firstName: 'Алексей', lastName: 'Сидоров', number: 3 },
            { id: 'p4', firstName: 'Михаил', lastName: 'Смирнов', number: 4 },
            { id: 'p5', firstName: 'Сергей', lastName: 'Кузнецов', number: 5 },
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
          { id: 'p1', firstName: 'Иван', lastName: 'Иванов', number: 1 },
          { id: 'p2', firstName: 'Петр', lastName: 'Петров', number: 2 },
          { id: 'p3', firstName: 'Алексей', lastName: 'Сидоров', number: 3 },
          { id: 'p4', firstName: 'Михаил', lastName: 'Смирнов', number: 4 },
          { id: 'p5', firstName: 'Сергей', lastName: 'Кузнецов', number: 5 },
        ];
        setPlayers(testPlayers);
      }
    } catch (error) {
      console.error('Ошибка при загрузке игроков:', error);
      
      // В случае ошибки также загружаем тестовые данные
      const testPlayers: Player[] = [
        { id: 'p1', firstName: 'Иван', lastName: 'Иванов', number: 1 },
        { id: 'p2', firstName: 'Петр', lastName: 'Петров', number: 2 },
        { id: 'p3', firstName: 'Алексей', lastName: 'Сидоров', number: 3 },
        { id: 'p4', firstName: 'Михаил', lastName: 'Смирнов', number: 4 },
        { id: 'p5', firstName: 'Сергей', lastName: 'Кузнецов', number: 5 },
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

  // Получение статуса посещаемости для конкретного игрока и даты
  const getAttendanceStatus = (playerId: string, date: Date): AttendanceStatus | null => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const record = attendance.find(
      a => a.playerId === playerId && a.date === formattedDate
    );
    
    return record ? record.status : null;
  };

  // Подсчет количества тренировок, на которых игрок участвовал
  const getAttendanceStats = (playerId: string): { present: number, total: number } => {
    const playerRecords = attendance.filter(record => record.playerId === playerId);
    const presentCount = playerRecords.filter(record => record.status === 'PRESENT').length;
    return {
      present: presentCount,
      total: trainingDates.length
    };
  };

  // Получение цвета для статуса посещаемости
  const getStatusColor = (status: AttendanceStatus | null): string => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-500';
      case 'ABSENT':
        return 'bg-red-500';
      case 'LATE':
        return 'bg-yellow-500';
      case 'EXCUSED':
        return 'bg-blue-500';
      case 'READY':
        return 'bg-gray-400';
      default:
        return 'bg-gray-700';
    }
  };

  // Получение текста для статуса посещаемости
  const getStatusText = (status: AttendanceStatus | null): string => {
    switch (status) {
      case 'PRESENT':
        return 'Участвовал';
      case 'ABSENT':
        return 'Болеет';
      case 'LATE':
        return 'Реабилитация';
      case 'EXCUSED':
        return 'Учеба';
      case 'READY':
        return 'Другое';
      default:
        return 'Нет данных';
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

  // Получение уникальных дат, для которых есть записи посещаемости
  const trainingDates = Array.from(new Set(attendance.map(record => record.date)))
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => a.getTime() - b.getTime()); // Сортировка дат по возрастанию (от старых к новым)

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
          Назад
        </Button>
        
        <h1 className="text-3xl font-bold text-[#5acce5]">{t('attendance')}</h1>
        
        <div className="w-20"></div> {/* Пустой div для центрирования заголовка */}
      </div>
      
      {/* Фильтры */}
      <Card className="bg-[#1a2228] border-[#2c3c42] shadow-md p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Фильтр по команде */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#5acce5] mb-2">Команда</label>
            <Select
              value={selectedTeam}
              onValueChange={setSelectedTeam}
            >
              <SelectTrigger className="bg-[#1a2228] border-[#2c3c42] text-vista-light hover:border-[#5acce5] focus:border-[#5acce5] transition-colors">
                <SelectValue placeholder="Выберите команду" />
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
            <label className="block text-sm font-medium text-[#5acce5] mb-2">Диапазон дат</label>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 border-[#2c3c42] text-vista-light hover:bg-[#2c3c42] hover:text-[#5acce5] transition-colors"
                onClick={goToPreviousMonth}
                title="Предыдущий месяц"
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
                title="Следующий месяц"
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
          <p className="text-vista-light">Загрузка данных...</p>
        </div>
      ) : trainingDates.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 bg-[#1a2228] border border-[#2c3c42] rounded-md shadow-md">
          <p className="text-vista-light mb-2">В выбранный период тренировок не было</p>
          <p className="text-vista-light text-sm text-center max-w-md">
            Выберите другой период или создайте тренировки для этой команды
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[#1a2228] border border-[#2c3c42] rounded-md shadow-md p-2">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-[#2c3c42] bg-[#16191d] p-3 text-left text-[#5acce5] sticky left-0 z-10 rounded-tl-md">
                  Игрок
                </th>
                
                {trainingDates.map((day, index) => (
                  <th 
                    key={format(day, 'yyyy-MM-dd')} 
                    className={`border border-[#2c3c42] bg-[#16191d] p-3 text-center text-[#5acce5] min-w-[60px]`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{format(day, 'EEE', { locale: ru })}</span>
                      <span className="text-base">{format(day, 'd')}</span>
                    </div>
                  </th>
                ))}
                
                {/* Статичный столбец с количеством тренировок */}
                <th className="border border-[#2c3c42] bg-[#16191d] p-3 text-center text-[#5acce5] min-w-[100px] sticky right-0 z-10 rounded-tr-md">
                  <div className="whitespace-nowrap">
                    Посещаемость
                  </div>
                </th>
              </tr>
            </thead>
            
            <tbody>
              {players.map((player, playerIndex) => (
                <tr key={player.id} className={playerIndex % 2 === 0 ? 'bg-[#1a2228]' : 'bg-[#1c242a]'}>
                  <td className="border border-[#2c3c42] p-3 text-vista-light sticky left-0 z-10 bg-[#1a2228] hover:bg-[#2c3c42] transition-colors">
                    <div className="flex items-center">
                      {player.number && (
                        <span className="bg-[#5acce5] text-[#16191d] rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs font-medium">
                          {player.number}
                        </span>
                      )}
                      <span className="font-medium text-sm">{player.lastName} {player.firstName}</span>
                    </div>
                  </td>
                  
                  {trainingDates.map((day) => {
                    const status = getAttendanceStatus(player.id, day);
                    return (
                      <td 
                        key={`${player.id}-${format(day, 'yyyy-MM-dd')}`} 
                        className="border border-[#2c3c42] p-1 text-center"
                      >
                        <div 
                          className={`w-6 h-6 rounded-full mx-auto ${getStatusColor(status)} cursor-pointer hover:scale-110 transition-transform`}
                          title={getStatusText(status)}
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
        <h3 className="text-[#5acce5] text-sm font-medium mb-3">Статус:</h3>
        <div className="flex flex-wrap gap-6">
          {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'READY', null].map((status) => (
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