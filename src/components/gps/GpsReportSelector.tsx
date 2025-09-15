'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useClub } from '@/providers/club-provider';
import { getTeamsByClubId } from '@/lib/teams-api';
import { getTrainingsByTeamId, getMatchesByTeamId } from '@/lib/events-api';
import { getGpsReportsByEventId, getGpsReportsByTeamId } from '@/lib/gps-api';
import { Team, Training, Match } from '@/types/events';
import { GpsReport } from '@/types/gps';

interface GpsReportSelectorProps {
  onReportSelected: (report: GpsReport) => void;
}

export default function GpsReportSelector({ onReportSelected }: GpsReportSelectorProps) {
  const { toast } = useToast();
  const { club } = useClub();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [eventType, setEventType] = useState<'training' | 'match' | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Training | Match | null>(null);
  const [selectedReport, setSelectedReport] = useState<GpsReport | null>(null);

  // Загрузка команд при монтировании
  useEffect(() => {
    if (club?.id) {
      loadTeams();
    }
  }, [club?.id]);

  // Загрузка событий с GPS отчетами при выборе команды и типа события
  useEffect(() => {
    if (selectedTeam && eventType) {
      loadEventsWithReports();
    }
  }, [selectedTeam, eventType]);

  const loadTeams = async () => {
    if (!club?.id) return;
    
    setLoading(true);
    try {
      const teamsData = await getTeamsByClubId(club.id);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить команды',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!selectedTeam) return;
    
    setLoading(true);
    try {
      const [trainingsData, matchesData] = await Promise.all([
        getTrainingsByTeamId(selectedTeam.id),
        getMatchesByTeamId(selectedTeam.id)
      ]);
      
      setTrainings(trainingsData);
      setMatches(matchesData);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить события',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEventsWithReports = async () => {
    if (!selectedTeam || !eventType) return;
    
    setLoading(true);
    try {
      // Загружаем все GPS отчеты команды и типа события
      const allReports = await getGpsReportsByTeamId(selectedTeam.id, eventType);
      
      // Извлекаем уникальные события из отчетов
      const eventIds = [...new Set(allReports.map(report => report.eventId))];
      
      if (eventType === 'training') {
        // Загружаем только те тренировки, у которых есть GPS отчеты
        const allTrainings = await getTrainingsByTeamId(selectedTeam.id);
        const trainingsWithReports = allTrainings.filter(training => 
          eventIds.includes(training.id)
        );
        setTrainings(trainingsWithReports);
      } else {
        // Загружаем только те матчи, у которых есть GPS отчеты
        const allMatches = await getMatchesByTeamId(selectedTeam.id);
        const matchesWithReports = allMatches.filter(match => 
          eventIds.includes(match.id)
        );
        setMatches(matchesWithReports);
      }
    } catch (error) {
      console.error('Error loading events with reports:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить события с GPS отчетами',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    setSelectedTeam(team || null);
    setEventType(null);
    setSelectedEvent(null);
    setSelectedReport(null);
  };

  const handleEventTypeChange = (type: 'training' | 'match') => {
    setEventType(type);
    setSelectedEvent(null);
    setSelectedReport(null);
    setTrainings([]);
    setMatches([]);
  };

  const handleEventChange = async (eventId: string) => {
    const events = eventType === 'training' ? trainings : matches;
    const event = events.find(e => e.id === eventId);
    setSelectedEvent(event || null);
    setSelectedReport(null);
    
    // Загружаем GPS отчет для выбранного события
    if (event) {
      try {
        const reports = await getGpsReportsByEventId(eventId, eventType!);
        if (reports.length > 0) {
          const report = reports[0]; // Берем первый (и единственный) отчет
          setSelectedReport(report);
          onReportSelected(report);
        }
      } catch (error) {
        console.error('Error loading GPS report for event:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить GPS отчет для события',
          variant: 'destructive',
        });
      }
    }
  };

  const getEventDisplayName = (event: Training | Match) => {
    if ('title' in event) {
      const date = event.startDate || event.date;
      const formattedDate = new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
      return `${event.title} (${formattedDate})`;
    }
    // Для матчей показываем счет вместо "vs"
    const homeTeam = event.homeTeam || 'Наша команда';
    const awayTeam = event.awayTeam || event.opponentName;
    const score = `${event.teamGoals}:${event.opponentGoals}`;
    const formattedDate = new Date(event.date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
    return `${homeTeam} ${score} ${awayTeam} (${formattedDate})`;
  };

  return (
    <div className="space-y-4">
      {/* Все поля выбора на одном уровне */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Выбор команды */}
        <div>
          <Select onValueChange={handleTeamChange} disabled={loading}>
            <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg">
              <SelectValue placeholder="Выберите команду" />
            </SelectTrigger>
            <SelectContent className="bg-vista-dark border border-vista-light/20 text-vista-light shadow-2xl rounded-lg">
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id} className="text-vista-light hover:bg-vista-light/10">
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Выбор типа события */}
        <div>
          <Select onValueChange={handleEventTypeChange} disabled={loading || !selectedTeam}>
            <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg">
              <SelectValue placeholder="Выберите тип события" />
            </SelectTrigger>
            <SelectContent className="bg-vista-dark border border-vista-light/20 text-vista-light shadow-2xl rounded-lg">
              <SelectItem value="training" className="text-vista-light hover:bg-vista-light/10">Тренировка</SelectItem>
              <SelectItem value="match" className="text-vista-light hover:bg-vista-light/10">Матч</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Выбор конкретного события */}
        <div>
          <Select onValueChange={handleEventChange} disabled={loading || !eventType}>
            <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg">
              <SelectValue placeholder={`Выберите ${eventType === 'training' ? 'тренировку' : 'матч'}`} />
            </SelectTrigger>
            <SelectContent className="bg-vista-dark border border-vista-light/20 text-vista-light shadow-2xl rounded-lg">
              {(eventType === 'training' ? trainings : matches).map((event) => (
                <SelectItem key={event.id} value={event.id} className="text-vista-light hover:bg-vista-light/10">
                  {getEventDisplayName(event)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Сообщение если нет GPS отчетов */}
      {selectedEvent && !selectedReport && !loading && (
        <div className="text-center text-vista-light/60 py-2">
          <p className="text-sm">Для выбранного события нет GPS отчета</p>
        </div>
      )}

      {/* Индикатор загрузки */}
      {loading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-vista-primary"></div>
          <span className="ml-2 text-vista-light text-sm">Загрузка...</span>
        </div>
      )}
    </div>
  );
}
