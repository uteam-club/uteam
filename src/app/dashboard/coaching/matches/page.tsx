'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, CalendarIcon, X, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddMatchModal } from '@/components/matches/AddMatchModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

interface Match {
  id: string;
  competitionType: 'FRIENDLY' | 'LEAGUE' | 'CUP';
  date: string;
  time: string;
  isHome: boolean;
  teamId: string;
  opponentName: string;
  teamGoals: number;
  opponentGoals: number;
  team: {
    id: string;
    name: string;
  };
  status: string;
}

interface Team {
  id: string;
  name: string;
}

export default function MatchesPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Состояния для фильтров
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const isSingleTeam = teams.length === 1;

  const competitionTypeLabels = useMemo(() => ({
    FRIENDLY: t('matchesPage.friendly'),
    LEAGUE: t('matchesPage.league'),
    CUP: t('matchesPage.cup')
  }), [t]);

  useEffect(() => {
    fetchMatches();
    fetchTeams();
  }, []);

  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/matches');
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      }
    } catch (error) {
      console.error('Ошибка при получении матчей:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      setIsLoadingTeams(true);
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Ошибка при получении команд:', error);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const filteredMatches = useMemo(() => {
    const filtered = matches.filter(match => {
      // Фильтр по поисковому запросу
      if (searchValue && 
          !match.team.name.toLowerCase().includes(searchValue.toLowerCase()) && 
          !match.opponentName.toLowerCase().includes(searchValue.toLowerCase())) {
        return false;
      }
      
      // Фильтр по команде
      if (selectedTeam && selectedTeam !== "all" && match.teamId !== selectedTeam) {
        return false;
      }
      
      // Фильтр по дате начала
      if (startDate) {
        const matchDate = new Date(match.date);
        const filterStartDate = new Date(startDate);
        if (matchDate < filterStartDate) {
          return false;
        }
      }
      
      // Фильтр по дате окончания
      if (endDate) {
        const matchDate = new Date(match.date);
        const filterEndDate = new Date(endDate);
        // Добавляем один день к дате окончания, чтобы включить весь день
        filterEndDate.setDate(filterEndDate.getDate() + 1);
        if (matchDate >= filterEndDate) {
          return false;
        }
      }
      
      return true;
    });
    // Сортировка по дате (новые в начале)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [matches, searchValue, selectedTeam, startDate, endDate]);

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'd MMMM yyyy', { locale: ru });
  };

  const handleMatchClick = (matchId: string) => {
    router.push(`/dashboard/coaching/matches/${matchId}`);
  };

  // Проверка наличия активных фильтров
  const hasActiveFilters = selectedTeam || startDate || endDate;

  const resetFilters = () => {
    setSelectedTeam(null);
    setStartDate('');
    setEndDate('');
  };

  // Функция для определения результата матча и возврата соответствующего класса
  const getMatchResultClass = (match: Match) => {
    const left = match.isHome ? match.teamGoals : match.opponentGoals;
    const right = match.isHome ? match.opponentGoals : match.teamGoals;
    if (match.isHome) {
      if (left > right) return "bg-green-500/30"; // Победа дома
      if (left < right) return "bg-red-500/30";   // Поражение дома
    } else {
      if (right > left) return "bg-green-500/30"; // Победа в гостях
      if (right < left) return "bg-red-500/30";   // Поражение в гостях
    }
    return "bg-amber-500/30"; // Ничья
  };

  return (
    <div className="space-y-6">
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-vista-light">{t('matchesPage.title')}</CardTitle>
            
            <Button 
              className="bg-vista-primary hover:bg-vista-primary/90"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('matchesPage.add_match')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Строка с поиском и фильтрами в один ряд */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
            {/* Строка поиска */}
            <div className="relative flex-1 md:max-w-[250px]">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vista-light/50" />
              <Input 
                className="pl-8 bg-vista-dark-lighter border-vista-secondary/30 text-vista-light w-full" 
                placeholder={t('matchesPage.search_placeholder')} 
                value={searchValue}
                onChange={handleSearchChange}
              />
            </div>
            
            {/* Фильтр по команде */}
            {!isSingleTeam && (
              <div className="flex-1 md:max-w-[250px]">
                <Select value={selectedTeam || "all"} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light h-10">
                    <SelectValue placeholder={t('matchesPage.all_teams')} />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                    <SelectItem value="all">{t('matchesPage.all_teams')}</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Фильтр по дате от */}
            <div className="flex-1 md:max-w-[180px]">
              <div className="relative">
                <div 
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-primary cursor-pointer z-10"
                  onClick={() => {
                    const dateInput = document.getElementById('filter-start-date') as HTMLInputElement;
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
                  id="filter-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10 bg-vista-dark-lighter border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                  placeholder={t('matchesPage.date_placeholder')}
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
            
            {/* Фильтр по дате до */}
            <div className="flex-1 md:max-w-[180px]">
              <div className="relative">
                <div 
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-primary cursor-pointer z-10"
                  onClick={() => {
                    const dateInput = document.getElementById('filter-end-date') as HTMLInputElement;
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
                  id="filter-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10 bg-vista-dark-lighter border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                  placeholder={t('matchesPage.date_placeholder')}
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
            
            {/* Кнопка сброса фильтров */}
            {hasActiveFilters && (
              <div className="flex-none">
                <Button 
                  variant="ghost" 
                  className="w-full md:w-auto h-10 flex items-center text-vista-light/70 hover:text-vista-light"
                  onClick={resetFilters}
                >
                  <X className="mr-2 h-4 w-4" />
                  {t('matchesPage.reset_filters')}
                </Button>
              </div>
            )}
          </div>
          
          {/* Отображение выбранных фильтров */}
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap gap-2">
              {!isSingleTeam && selectedTeam && selectedTeam !== "all" && (
                <Badge className="bg-vista-primary/20 text-vista-light flex items-center gap-1 pl-2">
                  <Users size={12} />
                  {teams.find(t => t.id === selectedTeam)?.name || 'Команда'}
                  <Button 
                    variant="ghost" 
                    className="h-5 w-5 p-0 ml-1 hover:bg-vista-primary/30" 
                    onClick={() => setSelectedTeam("all")}
                  >
                    <X size={10} />
                  </Button>
                </Badge>
              )}
              
              {startDate && (
                <Badge className="bg-vista-primary/20 text-vista-light flex items-center gap-1 pl-2">
                  <CalendarIcon size={12} />
                  {t('matchesPage.date_from')}: {startDate}
                  <Button 
                    variant="ghost" 
                    className="h-5 w-5 p-0 ml-1 hover:bg-vista-primary/30" 
                    onClick={() => setStartDate('')}
                  >
                    <X size={10} />
                  </Button>
                </Badge>
              )}
              
              {endDate && (
                <Badge className="bg-vista-primary/20 text-vista-light flex items-center gap-1 pl-2">
                  <CalendarIcon size={12} />
                  {t('matchesPage.date_to')}: {endDate}
                  <Button 
                    variant="ghost" 
                    className="h-5 w-5 p-0 ml-1 hover:bg-vista-primary/30" 
                    onClick={() => setEndDate('')}
                  >
                    <X size={10} />
                  </Button>
                </Badge>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-10">
              <p className="text-vista-light/60">{t('matchesPage.loading_matches')}</p>
            </div>
          ) : filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatches.map(match => (
                <div 
                  key={match.id} 
                  className="p-4 border border-vista-secondary/30 rounded-lg bg-vista-dark-lighter/50 cursor-pointer hover:bg-vista-dark-lighter transition-colors shadow-sm"
                  onClick={() => handleMatchClick(match.id)}
                >
                  <div className="flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <div className="flex space-x-2 mb-2">
                          <span className="text-xs px-2 py-1 rounded bg-vista-primary/20 text-vista-primary">
                            {competitionTypeLabels[match.competitionType]}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-vista-dark text-vista-light/70">
                            {match.isHome ? t('matchesPage.home_match') : t('matchesPage.away_match')}
                          </span>
                        </div>
                        <span className="text-sm text-vista-light/80">
                          <span>{dayjs(match.date).format('DD.MM.YYYY')}</span> • {match.time}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 bg-vista-dark/30 p-3 rounded">
                      <div className="w-5/12 text-left">
                        <p className="font-semibold text-vista-light">{
                          match.isHome
                            ? (match.team?.name || teams.find(t => t.id === match.teamId)?.name || 'Неизвестно')
                            : match.opponentName
                        }</p>
                      </div>
                      
                      <div className={`w-2/12 flex justify-center items-center rounded-md py-1 px-3 ${match.status === 'FINISHED' ? getMatchResultClass(match) : 'bg-gray-500/30'}`}>
                        {match.status === 'FINISHED' ? (
                          <>
                            <span className="text-xl font-bold text-vista-light">{match.isHome ? match.teamGoals : match.opponentGoals}</span>
                            <span className="text-vista-light/30 mx-1">:</span>
                            <span className="text-xl font-bold text-vista-light">{match.isHome ? match.opponentGoals : match.teamGoals}</span>
                          </>
                        ) : (
                          <span className="text-xl font-bold text-vista-light">-<span className="text-vista-light/30 mx-1">:</span>-</span>
                        )}
                      </div>
                      
                      <div className="w-5/12 text-right">
                        <p className="font-semibold text-vista-light">{
                          match.isHome
                            ? match.opponentName
                            : (match.team?.name || teams.find(t => t.id === match.teamId)?.name || 'Неизвестно')
                        }</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <p className="text-vista-light/60">{t('matchesPage.no_matches_found')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно для добавления матча */}
      <AddMatchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onMatchAdded={fetchMatches}
      />
    </div>
  );
} 