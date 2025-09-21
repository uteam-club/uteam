'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GpsReportVisualization from './GpsReportVisualization';

interface Team {
  id: string;
  name: string;
}

interface Training {
  id: string;
  name: string;
  date: string;
  type: 'training' | 'match';
  // Поля для матчей
  isHome?: boolean;
  opponentName?: string;
  teamGoals?: number;
  opponentGoals?: number;
  teamName?: string;
  time?: string;
}

interface GpsProfile {
  id: string;
  name: string;
  description?: string;
  columnsCount: number;
  createdAt: string;
}

export function GpsAnalysisTab() {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [eventType, setEventType] = useState<'training' | 'match' | ''>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [profiles, setProfiles] = useState<GpsProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Загрузка данных
  useEffect(() => {
    loadTeams();
    loadProfiles();
  }, []);

  // Загрузка событий при выборе команды
  useEffect(() => {
    if (selectedTeam && eventType) {
      loadEvents();
    } else {
      setTrainings([]);
    }
  }, [selectedTeam, eventType]);

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/gps/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const response = await fetch('/api/gps/profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const endpoint = `/api/gps/events?teamId=${selectedTeam}&eventType=${eventType}&withReports=true`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setTrainings(data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId);
    // Сбрасываем все последующие выборы при смене команды
    setEventType('');
    setSelectedEvent('');
    setSelectedProfile('');
  };

  const handleEventTypeChange = (type: 'training' | 'match') => {
    setEventType(type);
    // Сбрасываем выбор события и профиля при смене типа события
    setSelectedEvent('');
    setSelectedProfile('');
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEvent(eventId);
    // Сбрасываем выбор профиля при смене события
    setSelectedProfile('');
  };

  return (
    <div className="space-y-6">


      {/* Селекторы для просмотра отчетов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select value={selectedTeam} onValueChange={handleTeamChange}>
            <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg transition-all duration-200 group">
              <SelectValue placeholder="Выберите команду" />
            </SelectTrigger>
            <SelectContent className="bg-vista-dark border-vista-light/20 text-vista-light shadow-2xl rounded-lg custom-scrollbar">
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id} className="text-vista-light hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary">
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={eventType} onValueChange={handleEventTypeChange} disabled={!selectedTeam}>
            <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg transition-all duration-200 group">
              <SelectValue placeholder="Выберите тип события" />
            </SelectTrigger>
            <SelectContent className="bg-vista-dark border-vista-light/20 text-vista-light shadow-2xl rounded-lg custom-scrollbar">
              <SelectItem value="training" className="text-vista-light hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary">Тренировка</SelectItem>
              <SelectItem value="match" className="text-vista-light hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary">Матч</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedEvent} onValueChange={handleEventChange} disabled={!selectedTeam || !eventType || loading}>
            <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg transition-all duration-200 group">
              <SelectValue placeholder="Выберите событие" />
            </SelectTrigger>
            <SelectContent className="bg-vista-dark border-vista-light/20 text-vista-light shadow-2xl rounded-lg custom-scrollbar">
              {trainings.map((training) => {
                // Для матчей формируем специальное отображение
                const getDisplayName = () => {
                  if (training.type === 'match' && training.isHome !== undefined) {
                    const homeTeam = training.isHome ? training.teamName : training.opponentName;
                    const awayTeam = training.isHome ? training.opponentName : training.teamName;
                    const homeGoals = training.isHome ? training.teamGoals : training.opponentGoals;
                    const awayGoals = training.isHome ? training.opponentGoals : training.teamGoals;
                    
                    return `${homeTeam} ${homeGoals ?? 0} - ${awayGoals ?? 0} ${awayTeam}`;
                  }
                  return training.name;
                };

                return (
                  <SelectItem key={training.id} value={training.id} className="text-vista-light hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary">
                    <span>
                      {getDisplayName()} <span className="text-vista-light/50 text-xs">({new Date(training.date).toLocaleDateString('ru-RU')})</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={selectedProfile} onValueChange={setSelectedProfile} disabled={!selectedTeam || !eventType || !selectedEvent}>
            <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg transition-all duration-200 group">
              <SelectValue placeholder="Выберите профиль" />
            </SelectTrigger>
            <SelectContent className="bg-vista-dark border-vista-light/20 text-vista-light shadow-2xl rounded-lg custom-scrollbar">
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id} className="text-vista-light hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary">
                  {profile.name} ({profile.columnsCount} метрик)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      {/* Визуализация отчета */}
      {selectedTeam && selectedEvent && selectedProfile && (
        <GpsReportVisualization
          teamId={selectedTeam}
          eventId={selectedEvent}
          eventType={eventType as 'training' | 'match'}
          profileId={selectedProfile}
        />
      )}
    </div>
  );
}

export default GpsAnalysisTab;