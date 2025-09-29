'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, Clock, Trophy, Dumbbell, Settings, Loader2, Users } from 'lucide-react';
import { TrainingDurationModal } from './TrainingDurationModal';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface Team {
  id: string;
  name: string;
  clubId: string;
  timezone?: string;
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
  const [historyResponses, setHistoryResponses] = useState<RPEResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [resending, setResending] = useState<string | null>(null);
  const [showDurationModal, setShowDurationModal] = useState(false);

  // Текущий TZ команды
  const teamTimezone = useMemo(() => teams.find(t => t.id === selectedTeam)?.timezone || 'Europe/Moscow', [teams, selectedTeam]);
  // Единая ширина колонок - используем inline стили для точного контроля
  const colW = 'text-center whitespace-nowrap overflow-hidden';
  const playerColW = 'text-left whitespace-nowrap overflow-hidden';

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
      setHistoryResponses([]);
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
      .then(async data => {
        setResponses(data.responses || []);

        // История 42 дня для расчётов rolling (D-41 .. D) в TZ команды
        const training = trainings.find(t => t.id === selectedTraining);
        if (training) {
          const end = dayjs.tz(training.date, teamTimezone).endOf('day');
          const start = end.subtract(41, 'day').startOf('day');
          const url = `/api/surveys/rpe?teamId=${selectedTeam}&startDate=${start.toDate().toISOString()}&endDate=${end.toDate().toISOString()}`;
          try {
            const histRes = await fetch(url);
            if (histRes.ok) {
              const hist = await histRes.json();
              setHistoryResponses(hist || []);
            } else {
              setHistoryResponses([]);
            }
          } catch {
            setHistoryResponses([]);
          }
        } else {
          setHistoryResponses([]);
        }
      })
      .catch(e => {
        setError(e.message || 'Ошибка при загрузке ответов');
        setResponses([]);
        setHistoryResponses([]);
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

  // Минималистичные "pill"-бейджи: спокойный фон + тонкая цветная обводка
  const basePill = 'inline-flex items-center justify-center h-6 min-w-[44px] rounded-md px-2 text-xs font-medium border';
  const pillColors: Record<string, string> = {
    // Все значения без фона, только цветной текст
    neutral: 'bg-transparent border-transparent text-vista-light/80',
    good: 'bg-transparent border-transparent text-vista-light/80',
    moderate: 'bg-transparent border-transparent text-amber-200',
    high: 'bg-transparent border-transparent text-orange-200',
    extreme: 'bg-transparent border-transparent text-red-200',
    low: 'bg-transparent border-transparent text-sky-200',
    blue: 'bg-transparent border-transparent text-blue-200',
  };

  const MetricPill = ({ value, variant = 'neutral', width = 'min-w-[44px]' }: { value: string | number; variant?: keyof typeof pillColors; width?: string; }) => (
    <span className={`${basePill} ${pillColors[variant]} ${width}`}>{value}</span>
  );

  // Стили для разных метрик (пороговые значения можно скорректировать под клуб)
  const variantDayLoad = (v: number): keyof typeof pillColors => {
    if (v <= 200) return 'neutral';
    if (v <= 400) return 'moderate';
    if (v <= 600) return 'high';
    return 'extreme';
  };
  const variantWeekly = (v: number): keyof typeof pillColors => {
    if (v <= 600) return 'neutral';
    if (v <= 1000) return 'moderate';
    if (v <= 1500) return 'high';
    return 'extreme';
  };
  const variantMonotony = (v: number): keyof typeof pillColors => {
    if (v < 0.8) return 'low';
    if (v <= 1.3) return 'neutral';
    if (v <= 1.8) return 'moderate';
    return 'extreme';
  };
  const variantStrain = (v: number): keyof typeof pillColors => {
    if (v <= 800) return 'neutral';
    if (v <= 1500) return 'moderate';
    if (v <= 2200) return 'high';
    return 'extreme';
  };
  const variantACWR = (v: number): keyof typeof pillColors => {
    if (v < 0.8) return 'low';
    if (v <= 1.3) return 'neutral';
    if (v <= 1.5) return 'moderate';
    return 'extreme';
  };
  const variantRPE = (v: number): keyof typeof pillColors => {
    if (v <= 3) return 'neutral';
    if (v <= 5) return 'moderate';
    if (v <= 7) return 'high';
    return 'extreme';
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

  // === Расчёты метрик ===
  const trainingDay = selectedTrainingData ? dayjs.tz(selectedTrainingData.date, teamTimezone).startOf('day') : null;

  // Сессии -> sRPE и агрегации по дням для каждого игрока
  type DailyMap = Record<string, number>; // key = YYYY-MM-DD (TZ команды), value = дневная нагрузка AU
  const playerDailyLoadMap: Record<string, DailyMap> = useMemo(() => {
    const map: Record<string, DailyMap> = {};
    const list = Array.isArray(historyResponses) ? historyResponses : [];
    for (const r of list) {
      // Учитываем только ответы с длительностью
      const duration = r.durationMinutes ?? null;
      if (!duration || !r.rpeScore) continue;
      const sRPE = r.rpeScore * duration;
      // Приоритет: дата тренировки, если есть; иначе по времени ответа
      const trainingDate = (r as any).trainingDate as string | undefined;
      const baseDay = trainingDate
        ? dayjs.tz(trainingDate, teamTimezone)
        : dayjs(r.createdAt).tz(teamTimezone);
      const dayKey = baseDay.format('YYYY-MM-DD');
      if (!map[r.playerId]) map[r.playerId] = {};
      map[r.playerId][dayKey] = (map[r.playerId][dayKey] || 0) + sRPE;
    }
    return map;
  }, [historyResponses, teamTimezone]);

  const getDayKey = (d: dayjs.Dayjs) => d.tz(teamTimezone).format('YYYY-MM-DD');

  const range7d = (endDay: dayjs.Dayjs) => {
    const arr: string[] = [];
    for (let i = 6; i >= 0; i--) {
      arr.push(getDayKey(endDay.subtract(i, 'day')));
    }
    return arr;
  };

  const weeklyLoad7d = (playerId: string, endDay: dayjs.Dayjs) => {
    const days = range7d(endDay);
    const daily = playerDailyLoadMap[playerId] || {};
    return days.reduce((sum, key) => sum + (daily[key] || 0), 0);
  };

  const monotony7d = (playerId: string, endDay: dayjs.Dayjs) => {
    const days = range7d(endDay);
    const daily = playerDailyLoadMap[playerId] || {};
    const values = days.map(k => daily[k] || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    const sd = Math.sqrt(variance);
    if (sd === 0) return null; // N/A
    return mean / sd;
  };

  const strain7d = (playerId: string, endDay: dayjs.Dayjs) => {
    const wl = weeklyLoad7d(playerId, endDay);
    const mono = monotony7d(playerId, endDay);
    if (mono === null) return null;
    return wl * mono;
  };

  const acwr = (playerId: string, endDay: dayjs.Dayjs) => {
    // Acute = Weekly 7д за D-6..D
    const acute = weeklyLoad7d(playerId, endDay);
    // Chronic = среднее Weekly окон, заканчивающихся на D-7, D-14, D-21, D-28
    const ends = [7, 14, 21, 28].map(x => endDay.subtract(x, 'day'));
    const weeklyValues = ends.map(e => weeklyLoad7d(playerId, e));
    // Нужны минимум 3 недели истории
    const valid = weeklyValues; // значения всегда числовые (с нулями)
    const haveEnough = ends.every(e => true) && valid.length >= 3;
    const chronic = valid.reduce((a, b) => a + b, 0) / valid.length;
    if (!haveEnough || chronic === 0) return null;
    return acute / chronic;
  };

  return (
    <div className="space-y-6">




      {/* Таблица результатов */}
      <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="w-[220px]">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg">
                <SelectValue placeholder="Выберите команду" />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border border-vista-light/20 text-vista-light shadow-2xl rounded-lg max-h-72 overflow-y-auto custom-scrollbar">
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id} className="text-vista-light hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-vista-primary" />
                      <span>{team.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[280px]">
            <Select value={selectedTraining} onValueChange={setSelectedTraining} disabled={loadingTrainings}>
              <SelectTrigger className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg">
                <SelectValue placeholder={loadingTrainings ? "Загрузка..." : "Выберите тренировку"} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border border-vista-light/20 text-vista-light shadow-2xl rounded-lg max-h-72 overflow-y-auto custom-scrollbar">
                {trainings.map((training) => (
                  <SelectItem key={training.id} value={training.id} className="text-vista-light hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary">
                    <div className="flex items-center gap-2">
                      {getTrainingTypeIcon(training.type)}
                      <span>{getTrainingTypeText(training.type)} {formatDate(training.date)} | {formatTime(training.time)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Кнопка управления длительностью */}
          <div className="w-[200px]">
            <Button
              variant="outline"
              onClick={() => setShowDurationModal(true)}
              disabled={!selectedTraining}
              className={`w-full h-9 bg-transparent border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 px-3 font-normal text-sm ${
                !selectedTraining ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={selectedTraining ? "Управление длительностью события" : "Сначала выберите тренировку"}
            >
              <Clock className="mr-1.5 h-4 w-4" />
              Длительность
            </Button>
          </div>
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
              <table className="w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md table-fixed" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-vista-dark/70 text-xs">
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${playerColW}`} style={{ width: '140px' }}>Игрок</th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ width: '90px' }}>RPE (сессия)</th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ width: '90px' }}>Длительность (мин)</th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ width: '90px' }}>sRPE (AU)</th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ width: '90px' }}>Дневная нагрузка (AU)</th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ width: '90px' }}>Weekly Load 7д (AU)</th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ width: '90px' }}>Monotony 7д</th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ width: '90px' }}>Strain 7д (AU)</th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ width: '90px' }}>ACWR</th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ width: '90px' }}>Действия</th>
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
                    const dayKey = trainingDay ? getDayKey(trainingDay) : null;
                    const daily = (dayKey && playerDailyLoadMap[player.id]) ? (playerDailyLoadMap[player.id][dayKey] || 0) : 0;
                    const wl7 = trainingDay ? weeklyLoad7d(player.id, trainingDay) : 0;
                    const mono7 = trainingDay ? monotony7d(player.id, trainingDay) : null;
                    const strain = trainingDay ? strain7d(player.id, trainingDay) : null;
                    const ratio = trainingDay ? acwr(player.id, trainingDay) : null;
                    
                    return (
                      <tr key={player.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10 min-h-[36px]">
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 text-xs text-vista-light min-h-[36px] ${playerColW}`} style={{ width: '140px' }}>
                          {player.lastName} {player.firstName}
                        </td>
                        
                        {/* RPE */}
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle ${colW}`} style={{ width: '90px' }}>
                          {response?.completedAt ? (
                            <MetricPill value={response.rpeScore} variant={variantRPE(response.rpeScore)} />
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>
                        
                        {/* Длительность */}
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle ${colW}`} style={{ width: '90px' }}>
                          {response?.durationMinutes ? (
                            <MetricPill value={response.durationMinutes} variant="neutral" />
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>
                        
                        {/* sRPE */}
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle ${colW}`} style={{ width: '90px' }}>
                          {workload ? (
                            <MetricPill value={Math.round(workload)} variant={variantDayLoad(Math.round(workload))} />
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>
                        {/* Дневная нагрузка */}
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle ${colW}`} style={{ width: '90px' }}>
                          {trainingDay ? (
                            <MetricPill value={Math.round(daily)} variant={variantDayLoad(Math.round(daily))} width="min-w-[56px]" />
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>

                        {/* Weekly 7d */}
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle ${colW}`} style={{ width: '90px' }}>
                          {trainingDay ? (
                            <MetricPill value={Math.round(wl7)} variant={variantWeekly(Math.round(wl7))} width="min-w-[64px]" />
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>

                        {/* Monotony 7d */}
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle ${colW}`} style={{ width: '90px' }}>
                          {mono7 === null ? (
                            <span className="text-vista-light/50 text-sm">N/A</span>
                          ) : (
                            <MetricPill value={mono7.toFixed(2)} variant={variantMonotony(mono7)} />
                          )}
                        </td>

                        {/* Strain 7d */}
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle ${colW}`} style={{ width: '90px' }}>
                          {strain === null ? (
                            <span className="text-vista-light/50 text-sm">N/A</span>
                          ) : (
                            <MetricPill value={Math.round(strain)} variant={variantStrain(Math.round(strain))} width="min-w-[64px]" />
                          )}
                        </td>

                        {/* ACWR */}
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle ${colW}`} style={{ width: '90px' }}>
                          {ratio === null ? (
                            <span className="text-vista-light/50 text-sm">N/A</span>
                          ) : (
                            <MetricPill value={ratio.toFixed(2)} variant={variantACWR(ratio)} />
                          )}
                        </td>

                        {/* Actions: resend */}
                        <td className="px-2 py-0.5 align-middle" style={{ width: '90px' }}>
                          <button
                            className="px-3 py-1 rounded-md border border-vista-secondary/30 bg-vista-dark/30 text-vista-light/80 hover:text-white hover:bg-vista-primary/20 hover:border-vista-primary/40 transition-colors text-xs disabled:opacity-50"
                            disabled={!player.telegramId || resending === player.id || !selectedTraining}
                            title={!player.telegramId ? 'Нет Telegram ID' : 'Отправить повторно'}
                            onClick={() => handleResend(player.id)}
                          >
                            {resending === player.id ? 'Отправка…' : 'Отправить'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
