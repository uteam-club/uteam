'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamSelect } from '@/components/ui/team-select';

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, Clock, Trophy, Dumbbell, Settings, Loader2 } from 'lucide-react';
import { TrainingDurationModal } from './TrainingDurationModal';

interface Team {
  id: string;
  name: string;
  clubId: string;
}

interface Training {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  category?: string;
  teamName?: string;
  hasRPEResponses?: boolean;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  pinCode: string;
  telegramId?: number;
}

interface RPEResponse {
  id: string;
  playerId: string;
  playerFirstName: string;
  playerLastName: string;
  rpeScore: number;
  durationMinutes?: number;
  createdAt: string;
  completedAt?: string;
  trainingId: string;
}

export function RPESurveyAnalysis() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [responses, setResponses] = useState<RPEResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [resending, setResending] = useState<string | null>(null);
  const [showDurationModal, setShowDurationModal] = useState(false);

  // Загрузка команд
  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch('/api/teams');
        const data = await res.json();
        setTeams(data);
        if (data.length > 0) {
          setSelectedTeam(data[0].id);
        }
      } catch (e) {
        console.error('Ошибка загрузки команд:', e);
      }
    }
    fetchTeams();
  }, []);

  // Загрузка игроков выбранной команды
  useEffect(() => {
    if (!selectedTeam) return;
    fetch(`/api/teams/${selectedTeam}/players`)
      .then(res => res.json())
      .then(setPlayers);
  }, [selectedTeam]);

  // Загрузка тренировок с RPE ответами
  useEffect(() => {
    if (!selectedTeam) return;
    setLoadingTrainings(true);
    setSelectedTraining('');
    setResponses([]);
    
    // Загружаем тренировки за последние 30 дней
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const fromDate = format(startDate, 'yyyy-MM-dd');
    const toDate = format(endDate, 'yyyy-MM-dd');
    
    fetch(`/api/teams/${selectedTeam}/trainings?fromDate=${fromDate}&toDate=${toDate}`)
      .then(res => res.json())
      .then(async (trainingsData) => {
        // Проверяем, для каких тренировок есть RPE ответы
        const trainingsWithRPE = await Promise.all(
          trainingsData.map(async (training: Training) => {
            try {
              const rpeResponse = await fetch(`/api/trainings/${training.id}/rpe-survey`);
              if (rpeResponse.ok) {
                const rpeData = await rpeResponse.json();
                

                
                return {
                  ...training,
                  hasRPEResponses: rpeData.totalResponses > 0
                };
              }
            } catch (error) {
              console.error(`Ошибка проверки RPE для тренировки ${training.id}:`, error);
            }
            return {
              ...training,
              hasRPEResponses: false
            };
          })
        );
        
        // Оставляем только тренировки с RPE ответами
        const filteredTrainings = trainingsWithRPE.filter(t => t.hasRPEResponses);
        
        setTrainings(filteredTrainings);
        
        // Автоматически выбираем первую тренировку
        if (filteredTrainings.length > 0) {
          setSelectedTraining(filteredTrainings[0].id);
        }
      })
      .catch(e => {
        console.error('Ошибка загрузки тренировок:', e);
        setError(`Ошибка загрузки тренировок: ${e.message}`);
      })
      .finally(() => setLoadingTrainings(false));
  }, [selectedTeam]);

  // Загрузка ответов для выбранной тренировки
  useEffect(() => {
    if (!selectedTraining) {
      setResponses([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    fetch(`/api/trainings/${selectedTraining}/rpe-survey`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Ошибка загрузки данных');
        }
        return res.json();
      })
      .then(data => {
        setResponses(data.responses || []);
      })
      .catch(e => {
        setError(e.message || 'Ошибка при загрузке ответов');
        setResponses([]);
      })
      .finally(() => setLoading(false));
  }, [selectedTraining]);

  const handleResend = async (playerId: string) => {
    if (!selectedTraining) return;
    
    setResending(playerId);
    try {
      // Здесь можно добавить API для повторной отправки RPE опроса
      const response = await fetch('/api/surveys/rpe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId, 
          teamId: selectedTeam, 
          trainingId: selectedTraining 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при отправке');
      }
      
      toast({
        title: "Успешно",
        description: "Опросник отправлен игроку",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить опросник",
        variant: "destructive",
      });
    } finally {
      setResending(null);
    }
  };

  const handleDurationUpdate = () => {
    // Перезагружаем ответы после обновления длительности
    if (selectedTraining) {
      fetch(`/api/trainings/${selectedTraining}/rpe-survey`)
        .then(res => res.json())
        .then(data => {
          setResponses(data.responses || []);
        })
        .catch(console.error);
    }
  };

  const getRPEBadgeColor = (score: number) => {
    if (score <= 3) return 'bg-gradient-to-br from-emerald-500 to-green-600';
    if (score <= 5) return 'bg-gradient-to-br from-lime-500 to-lime-600';
    if (score <= 7) return 'bg-gradient-to-br from-amber-500 to-orange-500';
    if (score <= 9) return 'bg-gradient-to-br from-orange-500 to-red-500';
    return 'bg-gradient-to-br from-red-500 to-red-600';
  };

  const getRPEStatus = (score: number) => {
    if (score <= 3) return 'Легко';
    if (score <= 5) return 'Умеренно';
    if (score <= 7) return 'Тяжело';
    if (score <= 9) return 'Очень тяжело';
    return 'Максимально';
  };

  const getWorkload = (rpe: number, duration: number | null | undefined) => {
    return duration ? rpe * duration : null;
  };

  const getWorkloadColor = (workload: number | null) => {
    if (!workload) return 'bg-gradient-to-br from-gray-500 to-gray-600';
    if (workload <= 200) return 'bg-gradient-to-br from-emerald-500 to-green-600';
    if (workload <= 400) return 'bg-gradient-to-br from-amber-500 to-yellow-500';
    if (workload <= 600) return 'bg-gradient-to-br from-orange-500 to-orange-600';
    return 'bg-gradient-to-br from-red-500 to-red-600';
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd.MM.yyyy', { locale: ru });
  };

  const formatTime = (timeStr: string) => {
    return timeStr;
  };

  const getTrainingTypeIcon = (type: string) => {
    switch (type) {
      case 'GYM':
        return <Dumbbell className="h-4 w-4 text-vista-primary" />;
      case 'MATCH':
        return <Trophy className="h-4 w-4 text-vista-primary" />;
      default:
        return <Calendar className="h-4 w-4 text-vista-primary" />;
    }
  };

  const getTrainingTypeText = (type: string) => {
    switch (type) {
      case 'GYM': return 'Зал';
      case 'MATCH': return 'Матч';
      default: return 'Тренировка';
    }
  };

  // Сопоставление: playerId -> response
  const responseByPlayerId = Object.fromEntries(responses.map(r => [r.playerId, r]));

  const selectedTrainingData = trainings.find(t => t.id === selectedTraining);

  return (
    <div className="space-y-6">




      {/* Таблица результатов */}
      <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
        <div className="flex flex-wrap gap-4 mb-4 items-end">
          <div className="min-w-[220px]">
            <TeamSelect teams={teams} value={selectedTeam} onChange={setSelectedTeam} />
          </div>

          <div className="min-w-[280px]">
            <Select value={selectedTraining} onValueChange={setSelectedTraining} disabled={loadingTrainings}>
              <SelectTrigger className="px-3 py-2 bg-vista-dark/40 border border-vista-secondary/50 text-vista-light text-sm rounded-md">
                <SelectValue placeholder={loadingTrainings ? "Загрузка..." : "Выберите тренировку"} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary">
                {trainings.map((training) => (
                  <SelectItem key={training.id} value={training.id} className="text-vista-light hover:bg-vista-secondary">
                    <div className="flex items-center gap-2">
                      {getTrainingTypeIcon(training.type)}
                      <span>{getTrainingTypeText(training.type)}</span>
                      <span className="text-vista-light/70">
                        {formatDate(training.date)} в {formatTime(training.time)}
                      </span>
                      {training.title && (
                        <span className="text-vista-light/50">- {training.title}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Кнопка управления длительностью */}
          <button
            onClick={() => setShowDurationModal(true)}
            disabled={!selectedTraining}
            className={`px-3 py-2 rounded-md transition-colors flex items-center gap-2 h-10 ${
              selectedTraining 
                ? 'bg-vista-secondary text-vista-light hover:bg-vista-secondary/80 cursor-pointer' 
                : 'bg-vista-secondary/10 text-vista-light/30 cursor-not-allowed'
            }`}
                          title={selectedTraining ? "Управление длительностью события" : "Сначала выберите тренировку"}
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm">Длительность</span>
          </button>
        </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-vista-light" />
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-4">{error}</div>
          ) : !selectedTraining ? (
            <div className="text-vista-light/70 text-center py-8">
              Выберите тренировку для просмотра результатов
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md">
                <thead>
                  <tr className="bg-vista-dark/70 text-xs">
                    <th className="px-3 py-2 border-b border-vista-secondary/30 text-left whitespace-nowrap text-xs font-normal tracking-tight">Игрок</th>
                    <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">Оценка RPE</th>
                    <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">Длительность (мин)</th>
                    <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">Нагрузка (RPE×Время)</th>
                    <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">Статус</th>
                    <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">Время</th>
                    <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {players
                    .sort((a, b) => {
                      const aHasResponse = !!responseByPlayerId[a.id]?.completedAt;
                      const bHasResponse = !!responseByPlayerId[b.id]?.completedAt;
                      // Сначала те, кто прошёл опросник (true), потом те, кто не прошёл (false)
                      return (bHasResponse ? 1 : 0) - (aHasResponse ? 1 : 0);
                    })
                    .map((player) => {
                    const response = responseByPlayerId[player.id];
                    const workload = response ? getWorkload(response.rpeScore, response.durationMinutes) : null;
                    
                    return (
                      <tr key={player.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10 min-h-[36px]">
                        <td className="px-3 py-0.5 whitespace-nowrap text-xs text-vista-light min-h-[36px] flex items-center">
                          {player.lastName} {player.firstName}
                        </td>
                        
                        {/* RPE Оценка - большая цветная плитка */}
                        <td className="px-2 py-0.5 text-center align-middle">
                          {response?.completedAt ? (
                            <span className={`rounded-lg border-0 text-sm font-bold w-14 h-6 flex items-center justify-center transition-all duration-200 ${getRPEBadgeColor(response.rpeScore)} text-white mx-auto`}>
                              {response.rpeScore}
                            </span>
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>
                        
                        {/* Длительность */}
                        <td className="px-2 py-0.5 text-center align-middle">
                          {response?.durationMinutes ? (
                            <span className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold w-14 h-6 flex items-center justify-center mx-auto">
                              {response.durationMinutes}
                            </span>
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>
                        
                        {/* Нагрузка */}
                        <td className="px-2 py-0.5 text-center align-middle">
                          {workload ? (
                            <span className={`rounded-lg border-0 text-sm font-bold w-14 h-6 flex items-center justify-center transition-all duration-200 ${getWorkloadColor(workload)} text-white mx-auto`}>
                              {workload}
                            </span>
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>
                        
                        {/* Статус рассылки */}
                        <td className="px-2 py-0.5 text-center align-middle text-xs">
                          {response?.completedAt ? (
                            <div className="flex justify-center">
                              <div className="w-5 h-5 rounded-full border border-emerald-400 flex items-center justify-center">
                                <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <div className="w-5 h-5 rounded-full border border-red-400 flex items-center justify-center">
                                <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </td>
                        
                        {/* Время */}
                        <td className="px-2 py-0.5 text-center align-middle text-xs text-vista-light/70">
                          {response?.completedAt ? 
                            format(new Date(response.completedAt), 'HH:mm', { locale: ru }) : 
                            <span className="text-vista-light/50 text-sm">-</span>
                          }
                        </td>
                        
                        {/* Действия */}
                        <td className="px-2 py-0.5 text-center align-middle">
                          <button
                            className="px-3 py-0.5 rounded bg-vista-secondary/10 text-vista-light/40 hover:bg-vista-accent hover:text-white disabled:opacity-60 border border-vista-secondary/20 text-xs transition-colors opacity-70 hover:opacity-100"
                            disabled={!player.telegramId || resending === player.id}
                            onClick={() => handleResend(player.id)}
                          >
                            {resending === player.id ? 'Отправка...' : 'Отправить повторно'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Средние значения */}
                  <tr className="bg-vista-dark/80 font-bold">
                    <td className="px-3 py-2 text-center text-xs">Среднее</td>
                    
                    {/* Среднее RPE */}
                    <td className="px-2 py-2 text-center align-middle text-xs">
                      {(() => {
                        const completedResponses = responses.filter(r => r.completedAt);
                        if (completedResponses.length === 0) return '';
                        const avgRPE = completedResponses.reduce((sum, r) => sum + r.rpeScore, 0) / completedResponses.length;
                        return avgRPE.toFixed(2);
                      })()}
                    </td>
                    
                    {/* Средняя длительность */}
                    <td className="px-2 py-0.5 text-center align-middle text-xs">
                      {(() => {
                        const responsesWithDuration = responses.filter(r => r.completedAt && r.durationMinutes);
                        if (responsesWithDuration.length === 0) return '';
                        const avgDuration = responsesWithDuration.reduce((sum, r) => sum + (r.durationMinutes || 0), 0) / responsesWithDuration.length;
                        return avgDuration.toFixed(2);
                      })()}
                    </td>
                    
                    {/* Средняя нагрузка */}
                    <td className="px-2 py-2 text-center align-middle text-xs">
                      {(() => {
                        const responsesWithWorkload = responses.filter(r => r.completedAt && r.durationMinutes);
                        if (responsesWithWorkload.length === 0) return '';
                        const avgWorkload = responsesWithWorkload.reduce((sum, r) => sum + (r.rpeScore * (r.durationMinutes || 0)), 0) / responsesWithWorkload.length;
                        return avgWorkload.toFixed(2);
                      })()}
                    </td>
                    
                    <td className="px-2 py-2"></td>
                    <td className="px-2 py-2"></td>
                    <td className="px-2 py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Модальное окно для управления длительностью */}
      {selectedTrainingData && (
        <TrainingDurationModal
          open={showDurationModal}
          onOpenChange={setShowDurationModal}
          trainingId={selectedTraining}
          players={players}
          onDurationUpdate={handleDurationUpdate}
        />
      )}
    </div>
  );
}
