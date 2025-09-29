'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, Clock, Trophy, Dumbbell, Settings, Loader2, Users } from 'lucide-react';
import { TrainingDurationModal } from './TrainingDurationModal';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell, LabelList, ComposedChart, Line, ReferenceArea, ReferenceLine, ReferenceDot } from 'recharts';

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
  const [heatShowValues, setHeatShowValues] = useState(false);
  const [heatScaleMode, setHeatScaleMode] = useState<'relative' | 'absolute'>('relative');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState(false);
  const [isACWRModalOpen, setIsACWRModalOpen] = useState(false);
  const [isWeeklyLoadModalOpen, setIsWeeklyLoadModalOpen] = useState(false);
  const [isMainTableModalOpen, setIsMainTableModalOpen] = useState(false);
  const [isWeekDailyModalOpen, setIsWeekDailyModalOpen] = useState(false);
  const [isStrainModalOpen, setIsStrainModalOpen] = useState(false);
  const [selectedHeatmapPlayer, setSelectedHeatmapPlayer] = useState<string>('team');
  const [selectedWeeklyLoadPlayer, setSelectedWeeklyLoadPlayer] = useState<string>('team');
  const [selectedWeekDailyPlayer, setSelectedWeekDailyPlayer] = useState<string>('team');
  const [selectedACWRPlayer, setSelectedACWRPlayer] = useState<string>('team');
  const [selectedStrainPlayer, setSelectedStrainPlayer] = useState<string>('team');

  // Текущий TZ команды
  const teamTimezone = useMemo(() => teams.find(t => t.id === selectedTeam)?.timezone || 'Europe/Moscow', [teams, selectedTeam]);
  // Единая ширина колонок - используем inline стили для точного контроля
  const colW = 'text-center whitespace-nowrap overflow-hidden';
  const playerColW = 'text-left';

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

  // Базовые стили для текста без фона и обводки
  const basePill = 'inline-flex items-center justify-center text-xs font-medium';
  const pillColors: Record<string, string> = {
    // Только цвета текста, без фона и обводки
    neutral: 'text-vista-light/80',
    good: 'text-vista-light/80',
    moderate: 'text-amber-200',
    high: 'text-orange-200',
    extreme: 'text-red-400', // Цвет текста для экстремальных значений (фон ячейки применяется через style)
    low: 'text-sky-200',
    blue: 'text-blue-200',
  };

  const MetricPill = ({ value, variant = 'neutral', width = 'min-w-[44px]' }: { value: string | number; variant?: keyof typeof pillColors; width?: string; }) => (
    <span className={`${basePill} ${pillColors[variant]} ${width}`}>{value}</span>
  );

  // Функция для получения стиля ячейки в зависимости от значения
  const getCellStyle = (value: number, variantFn: (v: number) => keyof typeof pillColors) => {
    const variant = variantFn(value);
    if (variant === 'extreme') {
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.15)', // Более тусклая заливка
        color: '#ef4444'
      };
    }
    return {};
  };

  // Стили для разных метрик (пороговые значения можно скорректировать под клуб)
  const variantDayLoad = (v: number): keyof typeof pillColors => {
    if (v < 300) return 'neutral';      // Зеленый (низкая/восстановительная)
    if (v <= 499) return 'moderate';    // Желтый (умеренная)
    if (v <= 799) return 'high';        // Оранжевый (высокая)
    return 'extreme';                   // Красный (очень высокая/экстремальная)
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

  // Функции сортировки
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? '↑' : '↓';
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

  // Количество сессий за день для каждого игрока (для индикаторов ×N в heatmap)
  type DailyCountMap = Record<string, number>; // key = YYYY-MM-DD (TZ команды), value = count
  const playerDailySessionsMap: Record<string, DailyCountMap> = useMemo(() => {
    const map: Record<string, DailyCountMap> = {};
    const list = Array.isArray(historyResponses) ? historyResponses : [];
    for (const r of list) {
      const duration = r.durationMinutes ?? null;
      if (!duration || !r.rpeScore) continue;
      const trainingDate = (r as any).trainingDate as string | undefined;
      const baseDay = trainingDate
        ? dayjs.tz(trainingDate, teamTimezone)
        : dayjs(r.createdAt).tz(teamTimezone);
      const dayKey = baseDay.format('YYYY-MM-DD');
      if (!map[r.playerId]) map[r.playerId] = {};
      map[r.playerId][dayKey] = (map[r.playerId][dayKey] || 0) + 1;
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

  // === Данные для графика динамики Weekly Load (за 8 недель) ===
  const weeklyTrendData = useMemo(() => {
    if (!trainingDay) return [] as { week: string; load: number }[];

    // Берем последние 8 недель, заканчивающиеся текущим выбранным днем тренировки
    const weeks: { week: string; load: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = trainingDay.subtract(i * 7, 'day');
      const start = end.subtract(6, 'day'); // Начало недели (7 дней назад от конца)

      let weeklyLoad = 0;
      if (selectedWeeklyLoadPlayer === 'team') {
        // Weekly load команды: сумма weekly load всех игроков
        for (const p of players) {
          weeklyLoad += weeklyLoad7d(p.id, end);
        }
      } else {
        // Weekly load конкретного игрока
        weeklyLoad = weeklyLoad7d(selectedWeeklyLoadPlayer, end);
      }

      weeks.push({
        week: `${start.format('DD.MM')} - ${end.format('DD.MM')}`,
        load: Math.round(weeklyLoad)
      });
    }

    return weeks;
  }, [players, trainingDay, playerDailyLoadMap, selectedWeeklyLoadPlayer]);

  // === Данные для графика ACWR по команде (среднее + мин/макс) за те же недели ===
  const acwrTrendData = useMemo(() => {
    if (!trainingDay) return [] as { week: string; avg: number; min: number; max: number }[];

    const weeks: { week: string; avg: number; min: number; max: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = trainingDay.subtract(i * 7, 'day');
      const start = end.subtract(6, 'day');

      if (selectedACWRPlayer === 'team') {
        // Командные данные: среднее + мин/макс
        const values: number[] = [];
        for (const p of players) {
          const v = acwr(p.id, end);
          if (v !== null && !Number.isNaN(v) && Number.isFinite(v)) {
            values.push(Number(v.toFixed(2)));
          }
        }

        if (values.length === 0) {
          weeks.push({ week: `${start.format('DD.MM')} - ${end.format('DD.MM')}`, avg: 0, min: 0, max: 0 });
        } else {
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);
          weeks.push({ week: `${start.format('DD.MM')} - ${end.format('DD.MM')}`, avg: Number(avg.toFixed(2)), min, max });
        }
      } else {
        // Данные конкретного игрока
        const playerACWR = acwr(selectedACWRPlayer, end);
        const acwrValue = playerACWR !== null && !Number.isNaN(playerACWR) && Number.isFinite(playerACWR) ? Number(playerACWR.toFixed(2)) : 0;
        weeks.push({ week: `${start.format('DD.MM')} - ${end.format('DD.MM')}`, avg: acwrValue, min: acwrValue, max: acwrValue });
      }
    }

    return weeks;
  }, [players, trainingDay, playerDailyLoadMap, selectedACWRPlayer]);

  // Динамический верхний предел оси Y и тики для графика ACWR (учитываем максимум усиков)
  const acwrAxisMax = useMemo(() => {
    const maxVal = acwrTrendData.length ? Math.max(...acwrTrendData.map(w => (w.max ?? 0))) : 3;
    // Верхняя граница оси равна максимальному усу (без дополнительного запаса)
    const exactTop = maxVal > 0 ? maxVal : 3;
    return Number(exactTop.toFixed(2));
  }, [acwrTrendData]);

  const acwrTicks = useMemo((): number[] => {
    const ticks: number[] = [];
    const topInt = Math.floor(acwrAxisMax);
    for (let i = 0; i <= topInt; i++) ticks.push(i);
    if (Math.abs(acwrAxisMax - topInt) > 1e-6) ticks.push(acwrAxisMax);
    return ticks;
  }, [acwrAxisMax]);

  // === Heatmap данных по дневным нагрузкам ===
  const heatmapDays = useMemo(() => {
    if (!trainingDay) return [] as string[];
    const days: string[] = [];
    for (let i = 27; i >= 0; i--) {
      days.push(getDayKey(trainingDay.subtract(i, 'day')));
    }
    return days;
  }, [trainingDay, teamTimezone]);

  const heatmapMaxLoad = useMemo(() => {
    if (players.length === 0 || heatmapDays.length === 0) return 0;
    let maxVal = 0;
    
    if (selectedHeatmapPlayer === 'team') {
      // Для команды берем максимум по всем игрокам
      for (const p of players) {
        const daily = playerDailyLoadMap[p.id] || {};
        for (const d of heatmapDays) {
          const v = daily[d] || 0;
          if (v > maxVal) maxVal = v;
        }
      }
    } else {
      // Для конкретного игрока берем максимум только по нему
      const daily = playerDailyLoadMap[selectedHeatmapPlayer] || {};
      for (const d of heatmapDays) {
        const v = daily[d] || 0;
        if (v > maxVal) maxVal = v;
      }
    }
    
    return maxVal;
  }, [players, playerDailyLoadMap, heatmapDays, selectedHeatmapPlayer]);

  const getHeatCellStyle = (value: number) => {
    if (!value || value <= 0) {
      return {
        backgroundColor: 'transparent',
        color: '#c7e3f5'
      };
    }
    
    // Используем те же пороги, что и в таблице для дневной нагрузки
    const variant = variantDayLoad(value);
    
    // Стили для всей ячейки, более насыщенные
    switch (variant) {
      case 'neutral':
        // Для нормы (<300) фон убираем полностью
        return {
          backgroundColor: 'transparent',
          color: '#7dd3fc'
        };
      case 'moderate':
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b'
        };
      case 'high':
        return {
          backgroundColor: 'rgba(251, 146, 60, 0.15)',
          color: '#fb923c'
        };
      case 'extreme':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444'
        };
      default:
        return {
          backgroundColor: 'transparent',
          color: '#c7e3f5'
        };
    }
  };

  // === Линия с фоном (дневная нагрузка по дням недели) ===
  const teamWeekDailyData = useMemo(() => {
    if (!trainingDay) return [] as { dow: string; load: number }[];
    const daysKeys = range7d(trainingDay);
    const ruDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    return daysKeys.map((key) => {
      let dayTotal = 0;
      
      if (selectedWeekDailyPlayer === 'team') {
        // Командные данные: сумма всех игроков
        for (const p of players) {
          const daily = playerDailyLoadMap[p.id] || {};
          dayTotal += daily[key] || 0;
        }
      } else {
        // Данные конкретного игрока
        const daily = playerDailyLoadMap[selectedWeekDailyPlayer] || {};
        dayTotal = daily[key] || 0;
      }
      
      const label = ruDays[dayjs.tz(key, teamTimezone).day()];
      return { dow: label, load: Math.round(dayTotal) };
    });
  }, [players, trainingDay, playerDailyLoadMap, teamTimezone, selectedWeekDailyPlayer]);

  const teamWeekDailyAxisMax = useMemo(() => {
    if (teamWeekDailyData.length === 0) return 1000;
    const maxVal = Math.max(...teamWeekDailyData.map((d) => d.load));
    return Math.max(100, Math.ceil(maxVal * 1.1));
  }, [teamWeekDailyData]);

  const teamWeekMonotony = useMemo(() => {
    if (teamWeekDailyData.length === 0) return null as number | null;
    const values = teamWeekDailyData.map((d) => d.load);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    const sd = Math.sqrt(variance);
    if (sd === 0) return 9.99; // ровная линия → очень высокая монотонность
    return mean / sd;
  }, [teamWeekDailyData]);

  const weekMonotonyFill = useMemo(() => {
    const v = teamWeekMonotony ?? 0;
    const variant = variantMonotony(v);
    switch (variant) {
      case 'low':
        return { color: '#22c55e', opacity: 0.08, label: 'Вариативно' };
      case 'neutral':
        return { color: '#22c55e', opacity: 0.08, label: 'Вариативно' };
      case 'moderate':
        return { color: '#f59e0b', opacity: 0.08, label: 'Средняя' };
      case 'extreme':
        return { color: '#ef4444', opacity: 0.10, label: 'Ровная линия' };
      default:
        return { color: '#22c55e', opacity: 0.08, label: 'Вариативно' };
    }
  }, [teamWeekMonotony]);

  // === Данные для блока Strain (за 8 недель) ===
  const strainTrendData = useMemo(() => {
    if (!trainingDay) return [] as { week: string; strain: number; load: number; mono: number }[];
    const weeks: { week: string; strain: number; load: number; mono: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = trainingDay.subtract(i * 7, 'day');
      const start = end.subtract(6, 'day');

      let weeklyLoad = 0;
      let dailyLoads: number[] = [];

      if (selectedStrainPlayer === 'team') {
        // Командные данные
        const dayKeys = range7d(end);
        for (let di = 0; di < dayKeys.length; di++) {
          let daySum = 0;
          const key = dayKeys[di];
          for (const p of players) {
            const daily = playerDailyLoadMap[p.id] || {};
            const dVal = daily[key] || 0;
            daySum += dVal;
          }
          dailyLoads.push(daySum);
          weeklyLoad += daySum;
        }
      } else {
        // Данные конкретного игрока
        const dayKeys = range7d(end);
        for (let di = 0; di < dayKeys.length; di++) {
          const key = dayKeys[di];
          const daily = playerDailyLoadMap[selectedStrainPlayer] || {};
          const dVal = daily[key] || 0;
          dailyLoads.push(dVal);
          weeklyLoad += dVal;
        }
      }

      const mean = dailyLoads.reduce((a, b) => a + b, 0) / dailyLoads.length;
      const variance = dailyLoads.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / dailyLoads.length;
      const sd = Math.sqrt(variance);
      const mono = sd === 0 ? 9.99 : mean / sd;
      const strain = Math.round(weeklyLoad * mono);

      weeks.push({ week: `${start.format('DD.MM')} - ${end.format('DD.MM')}`, strain, load: Math.round(weeklyLoad), mono: Number(mono.toFixed(2)) });
    }
    return weeks;
  }, [players, trainingDay, playerDailyLoadMap, selectedStrainPlayer]);

  const strainColor = (value: number) => {
    const v = variantStrain(value);
    if (v === 'extreme') return '#ef4444';
    if (v === 'high') return '#fb923c';
    if (v === 'moderate') return '#f59e0b';
    return '#22c55e';
  };

  const strainGradientColor = (value: number) => {
    const v = variantStrain(value);
    if (v === 'extreme') return '#ef4444';
    if (v === 'high') return '#fb923c';
    if (v === 'moderate') return '#f59e0b';
    return '#22c55e';
  };

  const currentStrainKPI = useMemo(() => {
    if (strainTrendData.length === 0) return null as null | { strain: number; load: number; mono: number; color: string };
    const last = strainTrendData[strainTrendData.length - 1];
    return { strain: last.strain, load: last.load, mono: last.mono, color: strainColor(last.strain) };
  }, [strainTrendData]);

  const strainAxisMax = useMemo(() => {
    if (strainTrendData.length === 0) return 1000;
    const maxVal = Math.max(...strainTrendData.map(d => d.strain));
    return Math.max(1000, Math.ceil(maxVal * 1.1));
  }, [strainTrendData]);

  // Рендер подписей над столбиком: AU, WL, M в три строки
  const StrainTopLabel = (props: any) => {
    const { x, y, width, height, index } = props;
    const item = strainTrendData[index];
    if (!item) return null;
    const topY = y - 50; // Выше столбика с запасом
    const textX = x + width / 2;
    // Не рисуем если обе величины равны нулю
    if (item.load === 0 && (item.mono === 0 || item.mono === 9.99)) return null;
    return (
      <g>
        <text x={textX} y={topY} textAnchor="middle" fill="#7dd3fc" fontSize={14} fontWeight={600}>
          {item.strain} AU
        </text>
        <text x={textX} y={topY + 18} textAnchor="middle" fill="#9fb8d1" fontSize={11}>
          WL: {item.load} AU
        </text>
        <text x={textX} y={topY + 32} textAnchor="middle" fill="#9fb8d1" fontSize={11}>
          M: {item.mono.toFixed(2)}
        </text>
      </g>
    );
  };


  return (
    <div className="space-y-6">




      {/* Заголовок и кнопки управления */}
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

      {/* Таблица результатов */}
      <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
        <CardHeader className="p-0 pb-4 mb-4">
          <CardTitle className="text-base text-vista-light flex items-center justify-between gap-2">
            Анализ RPE (Rate of Perceived Exertion)
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMainTableModalOpen(true)}
              className="h-8 px-3 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40 transition-colors"
            >
              Описание
            </Button>
          </CardTitle>
        </CardHeader>
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
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md table-fixed" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-vista-dark/70 text-xs">
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${playerColW}`} style={{ width: '180px' }}>
                      <button 
                        onClick={() => handleSort('player')}
                        className="flex items-center gap-1 hover:text-vista-primary transition-colors"
                      >
                        Игрок <span className="text-xs">{getSortIcon('player')}</span>
                      </button>
                    </th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ minWidth: '100px' }}>
                      <button 
                        onClick={() => handleSort('rpe')}
                        className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                      >
                        <div className="leading-tight">RPE<br/>(сессия)</div> <span className="text-xs">{getSortIcon('rpe')}</span>
                      </button>
                    </th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ minWidth: '100px' }}>
                      <button 
                        onClick={() => handleSort('duration')}
                        className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                      >
                        <div className="leading-tight">Длительность<br/>(мин)</div> <span className="text-xs">{getSortIcon('duration')}</span>
                      </button>
                    </th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ minWidth: '100px' }}>
                      <button 
                        onClick={() => handleSort('srpe')}
                        className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                      >
                        <div className="leading-tight">sRPE<br/>(AU)</div> <span className="text-xs">{getSortIcon('srpe')}</span>
                      </button>
                    </th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ minWidth: '100px' }}>
                      <button 
                        onClick={() => handleSort('daily')}
                        className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                      >
                        <div className="leading-tight">Дневная<br/>нагрузка (AU)</div> <span className="text-xs">{getSortIcon('daily')}</span>
                      </button>
                    </th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ minWidth: '100px' }}>
                      <button 
                        onClick={() => handleSort('weekly')}
                        className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                      >
                        <div className="leading-tight">Weekly Load<br/>7д (AU)</div> <span className="text-xs">{getSortIcon('weekly')}</span>
                      </button>
                    </th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ minWidth: '100px' }}>
                      <button 
                        onClick={() => handleSort('monotony')}
                        className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                      >
                        <div className="leading-tight">Monotony<br/>7д</div> <span className="text-xs">{getSortIcon('monotony')}</span>
                      </button>
                    </th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ minWidth: '100px' }}>
                      <button 
                        onClick={() => handleSort('strain')}
                        className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                      >
                        <div className="leading-tight">Strain 7д<br/>(AU)</div> <span className="text-xs">{getSortIcon('strain')}</span>
                      </button>
                    </th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ minWidth: '100px' }}>
                      <button 
                        onClick={() => handleSort('acwr')}
                        className="flex items-center justify-center gap-1 hover:text-vista-primary transition-colors w-full"
                      >
                        ACWR <span className="text-xs">{getSortIcon('acwr')}</span>
                      </button>
                    </th>
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 text-xs font-normal tracking-tight ${colW}`} style={{ minWidth: '100px' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {players
                    .sort((a, b) => {
                      // Если нет сортировки, используем дефолтную логику
                      if (!sortField) {
                        const aHasResponse = !!responseByPlayerId[a.id]?.completedAt;
                        const bHasResponse = !!responseByPlayerId[b.id]?.completedAt;
                        return (bHasResponse ? 1 : 0) - (aHasResponse ? 1 : 0);
                      }

                      const responseA = responseByPlayerId[a.id];
                      const responseB = responseByPlayerId[b.id];
                      const dayKey = trainingDay ? getDayKey(trainingDay) : null;
                      const dailyA = (dayKey && playerDailyLoadMap[a.id]) ? (playerDailyLoadMap[a.id][dayKey] || 0) : 0;
                      const dailyB = (dayKey && playerDailyLoadMap[b.id]) ? (playerDailyLoadMap[b.id][dayKey] || 0) : 0;
                      const wl7A = trainingDay ? weeklyLoad7d(a.id, trainingDay) : 0;
                      const wl7B = trainingDay ? weeklyLoad7d(b.id, trainingDay) : 0;
                      const mono7A = trainingDay ? monotony7d(a.id, trainingDay) : null;
                      const mono7B = trainingDay ? monotony7d(b.id, trainingDay) : null;
                      const strainA = trainingDay ? strain7d(a.id, trainingDay) : null;
                      const strainB = trainingDay ? strain7d(b.id, trainingDay) : null;
                      const ratioA = trainingDay ? acwr(a.id, trainingDay) : null;
                      const ratioB = trainingDay ? acwr(b.id, trainingDay) : null;
                      const workloadA = responseA ? getWorkload(responseA.rpeScore, responseA.durationMinutes) : null;
                      const workloadB = responseB ? getWorkload(responseB.rpeScore, responseB.durationMinutes) : null;

                      let valueA: number | string | null = null;
                      let valueB: number | string | null = null;

                      switch (sortField) {
                        case 'player':
                          valueA = `${a.lastName} ${a.firstName}`;
                          valueB = `${b.lastName} ${b.firstName}`;
                          break;
                        case 'rpe':
                          valueA = responseA?.rpeScore ?? -1;
                          valueB = responseB?.rpeScore ?? -1;
                          break;
                        case 'duration':
                          valueA = responseA?.durationMinutes ?? -1;
                          valueB = responseB?.durationMinutes ?? -1;
                          break;
                        case 'srpe':
                          valueA = workloadA ?? -1;
                          valueB = workloadB ?? -1;
                          break;
                        case 'daily':
                          valueA = dailyA;
                          valueB = dailyB;
                          break;
                        case 'weekly':
                          valueA = wl7A;
                          valueB = wl7B;
                          break;
                        case 'monotony':
                          valueA = mono7A ?? -1;
                          valueB = mono7B ?? -1;
                          break;
                        case 'strain':
                          valueA = strainA ?? -1;
                          valueB = strainB ?? -1;
                          break;
                        case 'acwr':
                          valueA = ratioA ?? -1;
                          valueB = ratioB ?? -1;
                          break;
                      }

                      if (valueA === null && valueB === null) return 0;
                      if (valueA === null) return 1;
                      if (valueB === null) return -1;

                      if (typeof valueA === 'string' && typeof valueB === 'string') {
                        return sortDirection === 'asc' 
                          ? valueA.localeCompare(valueB)
                          : valueB.localeCompare(valueA);
                      }

                      const numA = Number(valueA);
                      const numB = Number(valueB);
                      return sortDirection === 'asc' ? numA - numB : numB - numA;
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
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 text-xs text-vista-light min-h-[36px] ${playerColW}`} style={{ width: '180px' }}>
                          {player.lastName} {player.firstName}
                        </td>
                        
                        {/* RPE */}
                        <td 
                          className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[36px] ${colW}`} 
                          style={{ 
                            minWidth: '100px',
                            ...(response?.completedAt ? getCellStyle(response.rpeScore, variantRPE) : {})
                          }}
                        >
                          {response?.completedAt ? (
                            <MetricPill value={response.rpeScore} variant={variantRPE(response.rpeScore)} />
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>
                        
                        {/* Длительность */}
                        <td className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[36px] ${colW}`} style={{ minWidth: '100px' }}>
                          {response?.durationMinutes ? (
                            <MetricPill value={response.durationMinutes} variant="neutral" />
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>
                        
                        {/* sRPE */}
                        <td 
                          className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[36px] ${colW}`} 
                          style={{ 
                            minWidth: '100px',
                            ...(workload ? getCellStyle(Math.round(workload), variantDayLoad) : {})
                          }}
                        >
                          {workload ? (
                            <MetricPill value={Math.round(workload)} variant={variantDayLoad(Math.round(workload))} />
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>
                        {/* Дневная нагрузка */}
                        <td 
                          className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[36px] ${colW}`} 
                          style={{ 
                            minWidth: '100px',
                            ...(trainingDay ? getCellStyle(Math.round(daily), variantDayLoad) : {})
                          }}
                        >
                          {trainingDay ? (
                            <MetricPill value={Math.round(daily)} variant={variantDayLoad(Math.round(daily))} width="min-w-[56px]" />
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>

                        {/* Weekly 7d */}
                        <td 
                          className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[36px] ${colW}`} 
                          style={{ 
                            minWidth: '100px',
                            ...(trainingDay ? getCellStyle(Math.round(wl7), variantWeekly) : {})
                          }}
                        >
                          {trainingDay ? (
                            <MetricPill value={Math.round(wl7)} variant={variantWeekly(Math.round(wl7))} width="min-w-[64px]" />
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </td>

                        {/* Monotony 7d */}
                        <td 
                          className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[36px] ${colW}`} 
                          style={{ 
                            minWidth: '100px',
                            ...(mono7 !== null ? getCellStyle(mono7, variantMonotony) : {})
                          }}
                        >
                          {mono7 === null ? (
                            <span className="text-vista-light/50 text-sm">N/A</span>
                          ) : (
                            <MetricPill value={mono7.toFixed(2)} variant={variantMonotony(mono7)} />
                          )}
                        </td>

                        {/* Strain 7d */}
                        <td 
                          className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[36px] ${colW}`} 
                          style={{ 
                            minWidth: '100px',
                            ...(strain !== null ? getCellStyle(Math.round(strain), variantStrain) : {})
                          }}
                        >
                          {strain === null ? (
                            <span className="text-vista-light/50 text-sm">N/A</span>
                          ) : (
                            <MetricPill value={Math.round(strain)} variant={variantStrain(Math.round(strain))} width="min-w-[64px]" />
                          )}
                        </td>

                        {/* ACWR */}
                        <td 
                          className={`px-2 py-0.5 border-r border-vista-secondary/30 align-middle min-h-[36px] ${colW}`} 
                          style={{ 
                            minWidth: '100px',
                            ...(ratio !== null ? getCellStyle(ratio, variantACWR) : {})
                          }}
                        >
                          {ratio === null ? (
                            <span className="text-vista-light/50 text-sm">N/A</span>
                          ) : (
                            <MetricPill value={ratio.toFixed(2)} variant={variantACWR(ratio)} />
                          )}
                        </td>

                        {/* Actions: resend */}
                        <td className="px-2 py-0.5 align-middle text-center min-h-[36px]" style={{ minWidth: '100px' }}>
                          {!player.telegramId ? (
                            <span className="text-vista-light/40 text-xs inline-flex items-center justify-center h-6">-</span>
                          ) : (
                            <button
                              className="px-3 py-1 rounded-md border border-vista-secondary/30 bg-vista-dark/30 text-vista-light/50 hover:text-vista-light/80 hover:bg-vista-primary/20 hover:border-vista-primary/40 transition-colors text-xs disabled:opacity-50"
                              disabled={resending === player.id || !selectedTraining}
                              title="Отправить повторно"
                              onClick={() => handleResend(player.id)}
                            >
                              {resending === player.id ? 'Отправка…' : 'Отправить'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>


      {/* Heatmap нагрузок: ось Y = игроки, ось X = дни */}
      {players.length > 0 && trainingDay && (
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50 shadow-md">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-base text-vista-light flex items-center justify-between gap-2">
                <span>Heatmap нагрузок (последние 28 дней)</span>
                <div className="flex items-center gap-2">
                  <Select value={selectedHeatmapPlayer} onValueChange={setSelectedHeatmapPlayer}>
                    <SelectTrigger className="w-48 h-8 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-vista-dark border-vista-secondary/30">
                      <SelectItem value="team" className="text-vista-light/80 hover:text-vista-light hover:bg-vista-primary/20">Вся команда</SelectItem>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id} className="text-vista-light/80 hover:text-vista-light hover:bg-vista-primary/20">
                          {player.lastName} {player.firstName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsHeatmapModalOpen(true)}
                    className="h-8 px-3 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40 transition-colors"
                  >
                    Описание
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md table-fixed" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-vista-dark/70 text-xs">
                    <th className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs font-normal tracking-tight ${playerColW}`} style={{ width: '180px' }}>
                      Игрок
                    </th>
                      {heatmapDays.map((d) => (
                        <th key={d} className="px-1 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-[10px] font-normal tracking-tight text-center" style={{ minWidth: '30px' }}>
                          {dayjs(d).format('DD.MM')}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {(selectedHeatmapPlayer === 'team' ? players : players.filter(p => p.id === selectedHeatmapPlayer)).map((p) => (
                    <tr key={p.id}>
                      <td className={`px-2 py-2 border-b border-vista-secondary/30 border-r border-vista-secondary/30 text-xs text-vista-light/80 ${playerColW}`} style={{ width: '180px' }}>
                        {p.lastName} {p.firstName}
                      </td>
                      {heatmapDays.map((d) => {
                        const daily = playerDailyLoadMap[p.id]?.[d] || 0;
                        const sessionCount = playerDailySessionsMap[p.id]?.[d] || 0;
                        const cellStyle = getHeatCellStyle(daily);
                        return (
                          <td 
                            key={`${p.id}-${d}`} 
                            className="px-1 py-1 text-center h-7 border-b border-vista-secondary/30 border-r border-vista-secondary/30 align-middle"
                            style={{
                              ...cellStyle,
                              minWidth: '30px'
                            }}
                          >
                            {daily > 0 ? (
                              <div className="flex flex-col items-center justify-center leading-none gap-0.5">
                                <span className="text-[10px] font-medium">
                                  {Math.round(daily)}
                                </span>
                                {sessionCount > 1 ? (
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: Math.min(sessionCount, 3) }).map((_, idx) => (
                                      <span key={idx} className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: cellStyle.color }}></span>
                                    ))}
                                  </div>
                                ) : sessionCount === 1 ? (
                                  <span className="inline-block w-1 h-1 rounded-full" style={{ backgroundColor: cellStyle.color }}></span>
                                ) : null}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Модальное окно: Линия с фоном (дневная нагрузка по дням недели) */}
      <Dialog open={isWeekDailyModalOpen} onOpenChange={setIsWeekDailyModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-vista-dark border-vista-secondary/50 text-vista-light overflow-hidden mt-8 mb-8">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl text-vista-light">
              Линия с фоном (дневная нагрузка по дням недели)
            </DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Детальное описание профиля недельной вариативности нагрузки
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 text-sm text-vista-light/80 overflow-y-auto max-h-[calc(80vh-120px)] pr-2 custom-scrollbar scrollbar-thin scrollbar-track-transparent scrollbar-thumb-vista-primary/20 hover:scrollbar-thumb-vista-primary/40">
            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Что это?</h3>
              <p>
                График показывает суммарную дневную нагрузку команды (AU) по дням недели. Плоский профиль указывает на
                однообразные нагрузки и высокую монотонность, «пилообразный» — на вариативность и более низкую монотонность.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Как рассчитывается</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Дневная нагрузка = сумма sRPE всех сессий за день для всей команды.</li>
                <li>График строится за последние 7 дней относительно выбранной даты тренировки.</li>
                <li>Монотонность недели рассчитывается как отношение среднего к стандартному отклонению дневных нагрузок:
                  <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-3 my-2">
                    <code className="text-vista-primary font-mono">Monotony = mean(AU) / sd(AU)</code>
                  </div>
                  Чем выше значение, тем «ровнее» профиль недели.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Интерпретация фона</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-3"><span className="w-3 h-3 rounded-full bg-green-500/50 mt-1"></span><span>Зелёный — вариативно (низкая монотонность): профиль «пилит», дни отличаются по нагрузке.</span></li>
                <li className="flex items-start gap-3"><span className="w-3 h-3 rounded-full bg-amber-500/50 mt-1"></span><span>Жёлтый — средняя монотонность: умеренная вариативность.</span></li>
                <li className="flex items-start gap-3"><span className="w-3 h-3 rounded-full bg-red-500/50 mt-1"></span><span>Красный — ровная линия (высокая монотонность): дни очень похожи; возможен повышенный риск.</span></li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Численные ориентиры (практика)</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><span className="font-mono">M &lt; 1.0</span> — высокая вариативность (низкая монотонность), зелёная зона.</li>
                <li><span className="font-mono">1.0 ≤ M ≤ 1.5</span> — умеренная монотонность, жёлтая зона.</li>
                <li><span className="font-mono">M &gt; 1.5</span> — высокая монотонность (плоский профиль), красная зона.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Зачем это тренеру</h3>
              <p>
                Видно не только численное значение монотонности (например, 2.1), но и фактический профиль недели.
                Это помогает быстро оценить, достаточно ли разнообразна структура недели относительно интенсивности.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Динамика Weekly Load (за 8 недель) */}
      {selectedTrainingData && weeklyTrendData.length > 0 && (
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base text-vista-light flex items-center justify-between gap-2">
              <span>Динамика Weekly Load (за 8 недель)</span>
              <div className="flex items-center gap-2">
                <Select value={selectedWeeklyLoadPlayer} onValueChange={setSelectedWeeklyLoadPlayer}>
                  <SelectTrigger className="w-48 h-8 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/30">
                    <SelectItem value="team" className="text-vista-light/80 hover:text-vista-light hover:bg-vista-primary/20">Вся команда</SelectItem>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id} className="text-vista-light/80 hover:text-vista-light hover:bg-vista-primary/20">
                        {player.lastName} {player.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWeeklyLoadModalOpen(true)}
                  className="h-8 px-3 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40 transition-colors"
                >
                  Описание
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrendData} margin={{ top: 16, right: 24, left: 24, bottom: 32 }}>
                  <defs>
                    <linearGradient id="weeklyLoadGradient" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#5acce5" stopOpacity={0.8}/>
                      <stop offset="70%" stopColor="#4ab8d1" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#3a9bbd" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fill: '#7dd3fc', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickMargin={8}
                  />
                  <YAxis 
                    tick={{ fill: '#7dd3fc', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false}
                    width={50}
                    tickMargin={8}
                  />
                  <Bar 
                    dataKey="load" 
                    radius={[6, 6, 0, 0]}
                    fill="url(#weeklyLoadGradient)"
                    stroke="#5acce5"
                    strokeOpacity={0.6}
                    strokeWidth={1}
                    activeBar={{ fill: "url(#weeklyLoadGradient)", stroke: "#5acce5", strokeOpacity: 0.6, strokeWidth: 1 }}
                  >
                    <LabelList 
                      dataKey="load" 
                      position="top" 
                      style={{ fill: '#7dd3fc', fontSize: 12, fontWeight: 500 }}
                      formatter={(value: number) => value}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Линия с фоном (дневная нагрузка по дням недели) */}
      {selectedTrainingData && teamWeekDailyData.length > 0 && (
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base text-vista-light flex items-center justify-between gap-2">
              <span>
                Линия с фоном (дневная нагрузка по дням недели)
                {teamWeekMonotony !== null && (
                  <span className="ml-2 text-vista-light/70 text-sm">Монотонность: {teamWeekMonotony.toFixed(2)}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Select value={selectedWeekDailyPlayer} onValueChange={setSelectedWeekDailyPlayer}>
                  <SelectTrigger className="w-48 h-8 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/30">
                    <SelectItem value="team" className="text-vista-light/80 hover:text-vista-light hover:bg-vista-primary/20">Вся команда</SelectItem>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id} className="text-vista-light/80 hover:text-vista-light hover:bg-vista-primary/20">
                        {player.lastName} {player.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWeekDailyModalOpen(true)}
                  className="h-8 px-3 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40 transition-colors"
                >
                  Описание
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={teamWeekDailyData} margin={{ top: 24, right: 24, left: 24, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="dow" tick={{ fill: '#7dd3fc', fontSize: 12 }} axisLine={false} tickLine={false} tickMargin={6} />
                  <YAxis domain={[0, teamWeekDailyAxisMax]} tick={{ fill: '#7dd3fc', fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickMargin={8} />

                  {/* Цветной фон по уровню монотонности недели */}
                  <ReferenceArea x1={teamWeekDailyData[0]?.dow} x2={teamWeekDailyData[teamWeekDailyData.length - 1]?.dow} y1={0} y2={teamWeekDailyAxisMax} fill={weekMonotonyFill.color} fillOpacity={weekMonotonyFill.opacity} stroke={weekMonotonyFill.color} strokeOpacity={0.08} />

                  {/* Линия нагрузки по дням */}
                  <Line type="monotone" dataKey="load" stroke="#5acce5" strokeWidth={2.5} dot={{ r: 3, stroke: '#5acce5', fill: '#0b1622' }} activeDot={{ r: 4 }}>
                    <LabelList dataKey="load" position="top" style={{ fill: '#7dd3fc', fontSize: 11, fontWeight: 600 }} formatter={(v: number) => v} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strain (за 8 недель) */}
      {selectedTrainingData && strainTrendData.length > 0 && (
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base text-vista-light flex items-center justify-between gap-2">
              <span>Strain (за 8 недель)</span>
              <div className="flex items-center gap-2">
                <Select value={selectedStrainPlayer} onValueChange={setSelectedStrainPlayer}>
                  <SelectTrigger className="w-48 h-8 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/30">
                    <SelectItem value="team" className="text-vista-light/80 hover:text-vista-light hover:bg-vista-primary/20">Вся команда</SelectItem>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id} className="text-vista-light/80 hover:text-vista-light hover:bg-vista-primary/20">
                        {player.lastName} {player.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsStrainModalOpen(true)}
                  className="h-8 px-3 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40 transition-colors"
                >
                  Описание
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strainTrendData} margin={{ top: 80, right: 24, left: 32, bottom: 16 }}>
                  <defs>
                    {strainTrendData.map((entry, index) => (
                      <linearGradient key={`strainGradient-${index}`} id={`strainGradient-${index}`} x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor={strainGradientColor(entry.strain)} stopOpacity={0.8}/>
                        <stop offset="70%" stopColor={strainGradientColor(entry.strain)} stopOpacity={0.4}/>
                        <stop offset="100%" stopColor={strainGradientColor(entry.strain)} stopOpacity={0.2}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: '#7dd3fc', fontSize: 12 }} axisLine={false} tickLine={false} tickMargin={10} />
                  <YAxis domain={[0, strainAxisMax]} tick={{ fill: '#7dd3fc', fontSize: 12 }} axisLine={false} tickLine={false} width={56} tickMargin={10} />
                  <Bar dataKey="strain" radius={[6, 6, 0, 0]} strokeWidth={1}>
                    {strainTrendData.map((entry, index) => (
                      <Cell key={`strain-${index}`} fill={`url(#strainGradient-${index})`} stroke={strainColor(entry.strain)} strokeOpacity={0.6} />
                    ))}
                    <LabelList content={<StrainTopLabel />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACWR по команде (среднее + диапазон, 8 недель) */}
      {selectedTrainingData && acwrTrendData.length > 0 && (
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base text-vista-light flex items-center justify-between gap-2">
              <span>ACWR по команде (среднее + диапазон, 8 недель)</span>
              <div className="flex items-center gap-2">
                <Select value={selectedACWRPlayer} onValueChange={setSelectedACWRPlayer}>
                  <SelectTrigger className="w-48 h-8 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/30">
                    <SelectItem value="team" className="text-vista-light/80 hover:text-vista-light hover:bg-vista-primary/20">Вся команда</SelectItem>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id} className="text-vista-light/80 hover:text-vista-light hover:bg-vista-primary/20">
                        {player.lastName} {player.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsACWRModalOpen(true)}
                  className="h-8 px-3 text-xs border-vista-secondary/30 bg-vista-dark/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/40 transition-colors"
                >
                  Описание
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={acwrTrendData} margin={{ top: 36, right: 24, left: 24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fill: '#7dd3fc', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickMargin={4}
                  />
                      <YAxis
                        domain={[-0.5, acwrAxisMax]}
                        tick={{ fill: '#7dd3fc', fontSize: 11, fontWeight: 500 }}
                        axisLine={{ stroke: '#334155', strokeWidth: 1 }}
                        tickLine={false}
                        width={40}
                        tickMargin={8}
                        ticks={acwrTicks}
                        tickCount={acwrTicks.length}
                        tickFormatter={(value) => value.toFixed(1)}
                      />

                  {/* Базовая линия на уровне 0 */}
                  <ReferenceLine y={0} stroke="#334155" strokeWidth={1} strokeDasharray="2 2" />
                  
                  {/* Красная зона > 1.5 */}
                  <ReferenceArea y1={1.5} y2={acwrAxisMax} fill="#ef4444" fillOpacity={0.08} stroke="#ef4444" strokeOpacity={0.12} />

                  {/* Линия среднего ACWR */}
                  <Line 
                    type="monotone" 
                    dataKey="avg" 
                    stroke="#5acce5" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, stroke: '#5acce5', fill: '#0b1622' }} 
                    activeDot={{ r: 4 }}
                  >
                    <LabelList dataKey="avg" position="top" style={{ fill: '#7dd3fc', fontSize: 11, fontWeight: 600 }} formatter={(v: number) => v.toFixed(2)} />
                  </Line>

                  {/* Усики мин-макс поверх линии: вертикальная линия + точки и подписи (только если выбрана вся команда и среднее > 0) */}
                  {selectedACWRPlayer === 'team' && acwrTrendData.map((item, index) => (
                    item.avg > 0 ? (
                      <>
                        <ReferenceLine
                          key={`whisker-line-${index}`}
                          x={item.week}
                          y1={item.min}
                          y2={item.max}
                          stroke="#9fb8d1"
                          strokeOpacity={0.55}
                          strokeWidth={1.5}
                        />
                        <ReferenceDot
                          key={`whisker-min-${index}`}
                          x={item.week}
                          y={item.min}
                          r={3}
                          fill="#9fb8d1"
                          stroke="#0b1622"
                          strokeWidth={1}
                          label={{ value: item.min.toFixed(2), position: 'bottom', style: { fill: '#9fb8d1', fontSize: 10 } }}
                        />
                        <ReferenceDot
                          key={`whisker-max-${index}`}
                          x={item.week}
                          y={item.max}
                          r={3}
                          fill="#9fb8d1"
                          stroke="#0b1622"
                          strokeWidth={1}
                          label={{ value: item.max.toFixed(2), position: 'top', style: { fill: '#9fb8d1', fontSize: 10 } }}
                        />
                      </>
                    ) : null
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Модальное окно с описанием Heatmap */}
      <Dialog open={isHeatmapModalOpen} onOpenChange={setIsHeatmapModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-vista-dark border-vista-secondary/50 text-vista-light overflow-hidden mt-8 mb-8">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl text-vista-light">
              Heatmap нагрузок (последние 28 дней)
            </DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Детальное описание визуализации тренировочных нагрузок
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 text-sm text-vista-light/80 overflow-y-auto max-h-[calc(80vh-120px)] pr-2 custom-scrollbar scrollbar-thin scrollbar-track-transparent scrollbar-thumb-vista-primary/20 hover:scrollbar-thumb-vista-primary/40">
            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Что показывает Heatmap?</h3>
              <p className="mb-4">
                Heatmap нагрузок — это визуализация ежедневной тренировочной нагрузки (Daily Load) для каждого игрока за последние 28 дней. 
                Это позволяет быстро оценить динамику нагрузки и выявить периоды перегрузки или недогрузки.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Расчет дневной нагрузки (AU)</h3>
              <p className="mb-2">
                Дневная нагрузка рассчитывается как сумма произведений RPE (Rate of Perceived Exertion) и длительности каждой тренировочной сессии за день:
              </p>
              <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-3 mb-4">
                <code className="text-vista-primary font-mono">
                  Daily Load = Σ (RPE × Длительность в минутах)
                </code>
              </div>
              <p className="mb-2">
                <strong>Пример:</strong> Если у игрока было две тренировки:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Утром: RPE = 4, Длительность = 60 мин → 240 AU</li>
                <li>Вечером: RPE = 5, Длительность = 80 мин → 400 AU</li>
                <li><strong>Итого за день: 240 + 400 = 640 AU</strong></li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Цветовая индикация</h3>
              <p className="mb-3">Цвет фона каждой ячейки отражает уровень дневной нагрузки:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded border border-vista-light/30 bg-transparent"></div>
                  <div>
                    <div className="font-medium text-vista-light">Прозрачный фон</div>
                    <div className="text-xs text-vista-light/60">&lt; 300 AU (Низкая/Восстановительная)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded bg-amber-500/25 border border-amber-500/40"></div>
                  <div>
                    <div className="font-medium text-vista-light">Желтый фон</div>
                    <div className="text-xs text-vista-light/60">300–499 AU (Умеренная)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded bg-orange-500/30 border border-orange-500/50"></div>
                  <div>
                    <div className="font-medium text-vista-light">Оранжевый фон</div>
                    <div className="text-xs text-vista-light/60">500–799 AU (Высокая)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded bg-red-500/35 border border-red-500/60"></div>
                  <div>
                    <div className="font-medium text-vista-light">Красный фон</div>
                    <div className="text-xs text-vista-light/60">≥ 800 AU (Очень высокая/Экстремальная)</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Индикаторы сессий</h3>
              <p className="mb-3">
                Под числовым значением в ячейке отображаются маленькие кружки, указывающие на количество тренировочных сессий за день:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-vista-light/60"></div>
                  </div>
                  <span>Одна точка = 1 сессия</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-vista-light/60"></div>
                    <div className="w-2 h-2 rounded-full bg-vista-light/60"></div>
                  </div>
                  <span>Две точки = 2 сессии</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-vista-light/60"></div>
                    <div className="w-2 h-2 rounded-full bg-vista-light/60"></div>
                    <div className="w-2 h-2 rounded-full bg-vista-light/60"></div>
                  </div>
                  <span>Три точки = 3 и более сессий</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Как интерпретировать данные</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Яркие цвета</strong> (желтый, оранжевый, красный) указывают на дни с повышенной нагрузкой, требующие внимания тренера</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Прозрачный фон</strong> указывает на дни с низкой или восстановительной нагрузкой</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Индикаторы сессий</strong> помогают понять, была ли высокая нагрузка результатом одной интенсивной тренировки или нескольких сессий</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Паттерны нагрузки</strong> показывают, как игроки распределяют тренировки в течение месяца</span>
                </li>
              </ul>
            </div>

            <div className="bg-vista-primary/10 border border-vista-primary/30 rounded-md p-4">
              <h4 className="font-semibold text-vista-primary mb-2">💡 Совет</h4>
              <p className="text-sm">
                Используйте heatmap для выявления игроков с нерегулярными паттернами нагрузки, 
                которые могут указывать на риск травм или неоптимальное планирование тренировок.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно с описанием основной таблицы RPE */}
      <Dialog open={isMainTableModalOpen} onOpenChange={setIsMainTableModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-vista-dark border-vista-secondary/50 text-vista-light overflow-hidden mt-8 mb-8">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl text-vista-light">
              Анализ RPE (Rate of Perceived Exertion)
            </DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Детальное описание таблицы анализа субъективной оценки нагрузки
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 text-sm text-vista-light/80 overflow-y-auto max-h-[calc(80vh-120px)] pr-2 custom-scrollbar scrollbar-thin scrollbar-track-transparent scrollbar-thumb-vista-primary/20 hover:scrollbar-thumb-vista-primary/40">
            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Что такое RPE?</h3>
              <p className="mb-4">
                RPE (Rate of Perceived Exertion) — это субъективная оценка интенсивности тренировки по шкале от 1 до 10, 
                где 1 означает очень легкую нагрузку, а 10 — максимально возможную. Это простой и эффективный способ 
                мониторинга тренировочной нагрузки без использования сложного оборудования.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Колонки таблицы</h3>
              <div className="space-y-4">
                <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-4">
                  <h4 className="font-semibold text-vista-light mb-2">Игрок</h4>
                  <p className="text-sm text-vista-light/70">Фамилия и имя игрока. Поддерживает перенос строки для длинных имен.</p>
                </div>
                
                <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-4">
                  <h4 className="font-semibold text-vista-light mb-2">RPE (сессия)</h4>
                  <p className="text-sm text-vista-light/70 mb-2">Субъективная оценка интенсивности тренировки (1-10):</p>
                  <ul className="text-xs text-vista-light/60 space-y-1 ml-4">
                    <li>• 1-3: Очень легкая нагрузка (восстановительная)</li>
                    <li>• 4-5: Легкая-умеренная нагрузка</li>
                    <li>• 6-7: Умеренная-высокая нагрузка</li>
                    <li>• 8-10: Очень высокая-максимальная нагрузка</li>
                  </ul>
                </div>

                <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-4">
                  <h4 className="font-semibold text-vista-light mb-2">Длительность (мин)</h4>
                  <p className="text-sm text-vista-light/70">Продолжительность тренировки в минутах. Используется для расчета sRPE.</p>
                </div>

                <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-4">
                  <h4 className="font-semibold text-vista-light mb-2">sRPE (AU)</h4>
                  <p className="text-sm text-vista-light/70 mb-2">Session RPE — произведение RPE на длительность:</p>
                  <div className="bg-vista-dark/50 border border-vista-secondary/20 rounded p-2 text-xs font-mono text-vista-primary">
                    sRPE = RPE × Длительность (минуты)
                  </div>
                </div>

                <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-4">
                  <h4 className="font-semibold text-vista-light mb-2">Дневная нагрузка (AU)</h4>
                  <p className="text-sm text-vista-light/70">Сумма всех sRPE за день. Если у игрока было несколько тренировок, они суммируются.</p>
                </div>

                <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-4">
                  <h4 className="font-semibold text-vista-light mb-2">Weekly Load 7д (AU)</h4>
                  <p className="text-sm text-vista-light/70">Сумма дневных нагрузок за последние 7 дней. Показывает острую нагрузку.</p>
                </div>

                <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-4">
                  <h4 className="font-semibold text-vista-light mb-2">Monotony 7д</h4>
                  <p className="text-sm text-vista-light/70">Монотонность тренировок — стандартное отклонение дневных нагрузок за 7 дней, деленное на среднее значение. Высокие значения указывают на однообразие.</p>
                </div>

                <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-4">
                  <h4 className="font-semibold text-vista-light mb-2">Strain 7д (AU)</h4>
                  <p className="text-sm text-vista-light/70">Напряжение = Weekly Load × Monotony. Показывает общую нагрузку с учетом монотонности.</p>
                </div>

                <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-4">
                  <h4 className="font-semibold text-vista-light mb-2">ACWR</h4>
                  <p className="text-sm text-vista-light/70 mb-2">Acute:Chronic Workload Ratio — соотношение острой (7 дней) и хронической (28 дней) нагрузки:</p>
                  <div className="bg-vista-dark/50 border border-vista-secondary/20 rounded p-2 text-xs font-mono text-vista-primary">
                    ACWR = Острая нагрузка (7 дней) / Хроническая нагрузка (28 дней)
                  </div>
                  <p className="text-xs text-vista-light/60 mt-2">
                    • &lt; 0.8: Низкий риск • 0.8-1.3: Оптимально • 1.3-1.5: Умеренный риск • &gt; 1.5: Высокий риск
                  </p>
                </div>

                <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-4">
                  <h4 className="font-semibold text-vista-light mb-2">Действия</h4>
                  <p className="text-sm text-vista-light/70">Кнопка &quot;Отправить&quot; для повторной отправки опросника или &quot;-&quot; для игроков без привязанного Telegram.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Цветовая индикация</h3>
              <p className="mb-3">Значения в таблице окрашиваются в зависимости от уровня нагрузки:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded border border-vista-light/30 bg-transparent"></div>
                  <div>
                    <div className="font-medium text-vista-light">Прозрачный фон</div>
                    <div className="text-xs text-vista-light/60">Низкая нагрузка (&lt; 300 AU)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded bg-amber-500/25 border border-amber-500/40"></div>
                  <div>
                    <div className="font-medium text-vista-light">Желтый фон</div>
                    <div className="text-xs text-vista-light/60">Умеренная нагрузка (300-499 AU)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded bg-orange-500/30 border border-orange-500/50"></div>
                  <div>
                    <div className="font-medium text-vista-light">Оранжевый фон</div>
                    <div className="text-xs text-vista-light/60">Высокая нагрузка (500-799 AU)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded bg-red-500/35 border border-red-500/60"></div>
                  <div>
                    <div className="font-medium text-vista-light">Красный фон</div>
                    <div className="text-xs text-vista-light/60">Экстремальная нагрузка (≥ 800 AU)</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Сортировка</h3>
              <p className="mb-3">Таблица поддерживает сортировку по всем колонкам:</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5">Кликните на заголовок колонки для сортировки</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5">Повторный клик меняет направление сортировки (по возрастанию/убыванию)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5">Стрелка показывает текущее направление сортировки</span>
                </li>
              </ul>
            </div>

            <div className="bg-vista-primary/10 border border-vista-primary/30 rounded-md p-4">
              <h4 className="font-semibold text-vista-primary mb-2">💡 Совет</h4>
              <p className="text-sm">
                Регулярно анализируйте данные RPE для выявления игроков с высоким риском травм (высокий ACWR, Strain) 
                и корректируйте тренировочные планы для оптимизации нагрузки.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно с описанием Weekly Load */}
      <Dialog open={isWeeklyLoadModalOpen} onOpenChange={setIsWeeklyLoadModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-vista-dark border-vista-secondary/50 text-vista-light overflow-hidden mt-8 mb-8">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl text-vista-light">
              Динамика Weekly Load (за 8 недель)
            </DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Детальное описание анализа недельной нагрузки команды
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 text-sm text-vista-light/80 overflow-y-auto max-h-[calc(80vh-120px)] pr-2 custom-scrollbar scrollbar-thin scrollbar-track-transparent scrollbar-thumb-vista-primary/20 hover:scrollbar-thumb-vista-primary/40">
            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Что показывает график?</h3>
              <p className="mb-4">
                График «Динамика Weekly Load» отображает общую недельную тренировочную нагрузку команды за последние 4-6 недель. 
                Это позволяет отслеживать тренды нагрузки и выявлять периоды роста, стабилизации или снижения интенсивности тренировок.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Расчет Weekly Load</h3>
              <p className="mb-2">
                Weekly Load рассчитывается как сумма всех тренировочных нагрузок игроков команды за неделю:
              </p>
              <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-3 mb-4">
                <code className="text-vista-primary font-mono">
                  Weekly Load = Σ (RPE × Длительность) для всех игроков за неделю
                </code>
              </div>
              <p className="mb-2">
                <strong>Где:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>RPE</strong> — субъективная оценка интенсивности тренировки (1-10)</li>
                <li><strong>Длительность</strong> — продолжительность тренировки в минутах</li>
                <li><strong>Суммирование</strong> — складываются нагрузки всех игроков команды</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Элементы графика</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded bg-vista-primary/60 mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-vista-light">Столбцы с градиентом</div>
                    <div className="text-sm text-vista-light/70">Показывают общую недельную нагрузку команды. Градиент от насыщенного снизу к прозрачному сверху</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-vista-light/60 mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-vista-light">Числовые значения</div>
                    <div className="text-sm text-vista-light/70">Отображаются над каждым столбцом, показывая точное значение нагрузки в AU</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded bg-vista-light/30 mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-vista-light">Сетка</div>
                    <div className="text-sm text-vista-light/70">Горизонтальные линии помогают оценить масштаб значений</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded bg-vista-light/20 mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-vista-light">Диапазоны дат</div>
                    <div className="text-sm text-vista-light/70">На оси X отображаются недельные периоды в формате «ДД.ММ - ДД.ММ»</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Интерпретация трендов</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="text-vista-primary text-lg mt-0.5">📈</div>
                  <div>
                    <div className="font-medium text-vista-light">Рост нагрузки</div>
                    <div className="text-xs text-vista-light/60">Постепенное увеличение столбцов указывает на прогрессивное наращивание интенсивности</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="text-vista-primary text-lg mt-0.5">📉</div>
                  <div>
                    <div className="font-medium text-vista-light">Снижение нагрузки</div>
                    <div className="text-xs text-vista-light/60">Уменьшение высоты столбцов может указывать на восстановительный период</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="text-vista-primary text-lg mt-0.5">📊</div>
                  <div>
                    <div className="font-medium text-vista-light">Стабильность</div>
                    <div className="text-xs text-vista-light/60">Постоянная высота столбцов говорит о поддержании текущего уровня нагрузки</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="text-vista-primary text-lg mt-0.5">⚠️</div>
                  <div>
                    <div className="font-medium text-vista-light">Резкие скачки</div>
                    <div className="text-xs text-vista-light/60">Большие перепады могут указывать на неравномерное планирование</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Как использовать данные</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Планирование циклов</strong> — используйте тренды для планирования мезоциклов и микроциклов</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Контроль перегрузки</strong> — следите за резкими скачками, которые могут привести к перетренированности</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Периодизация</strong> — планируйте периоды наращивания и восстановления на основе данных</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Сравнение периодов</strong> — анализируйте эффективность разных тренировочных подходов</span>
                </li>
              </ul>
            </div>

            <div className="bg-vista-primary/10 border border-vista-primary/30 rounded-md p-4">
              <h4 className="font-semibold text-vista-primary mb-2">💡 Совет</h4>
              <p className="text-sm">
                Идеальная динамика нагрузки должна показывать постепенное наращивание с периодическими восстановительными неделями. 
                Избегайте резких скачков более чем на 20-30% от предыдущей недели.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно с описанием Strain */}
      <Dialog open={isStrainModalOpen} onOpenChange={setIsStrainModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-vista-dark border-vista-secondary/50 text-vista-light overflow-hidden mt-8 mb-8">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl text-vista-light">
              Strain (за 8 недель)
            </DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Детальное описание анализа тренировочного стресса команды
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 text-sm text-vista-light/80 overflow-y-auto max-h-[calc(80vh-120px)] pr-2 custom-scrollbar scrollbar-thin scrollbar-track-transparent scrollbar-thumb-vista-primary/20 hover:scrollbar-thumb-vista-primary/40">
            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Что такое Strain?</h3>
              <p className="mb-4">
                Strain (тренировочный стресс) — это показатель, который объединяет объём нагрузки (Weekly Load) 
                и её однообразие (Monotony). Он помогает оценить общую «напряжённость» тренировочного процесса команды.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Расчет Strain</h3>
              <p className="mb-2">
                Strain рассчитывается как произведение Weekly Load на Monotony:
              </p>
              <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-3 mb-4">
                <code className="text-vista-primary font-mono">
                  Strain = Weekly Load × Monotony
                </code>
              </div>
              <p className="mb-2">
                <strong>Где:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Weekly Load</strong> — суммарная недельная нагрузка команды (AU)</li>
                <li><strong>Monotony</strong> — показатель однообразия нагрузки (mean/sd дневных нагрузок)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Цветовая индикация</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-3"><span className="w-3 h-3 rounded-full bg-green-500/50 mt-1"></span><span>Зелёный — нормальный уровень Strain (≤ 800 AU)</span></li>
                <li className="flex items-start gap-3"><span className="w-3 h-3 rounded-full bg-yellow-500/50 mt-1"></span><span>Жёлтый — повышенный уровень (801-1500 AU)</span></li>
                <li className="flex items-start gap-3"><span className="w-3 h-3 rounded-full bg-orange-500/50 mt-1"></span><span>Оранжевый — высокий уровень (1501-2200 AU)</span></li>
                <li className="flex items-start gap-3"><span className="w-3 h-3 rounded-full bg-red-500/50 mt-1"></span><span>Красный — критический уровень (&gt; 2200 AU)</span></li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Интерпретация данных</h3>
              <p className="mb-4">
                График показывает, как изменялся тренировочный стресс команды за последние 8 недель. 
                Высокие значения Strain указывают на периоды интенсивной и/или однообразной нагрузки, 
                что может увеличивать риск переутомления и травм.
              </p>
              <p className="mb-2">
                <strong>Подписи над столбцами:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Strain AU</strong> — основное значение тренировочного стресса</li>
                <li><strong>WL: XXXX AU</strong> — недельная нагрузка, которая повлияла на Strain</li>
                <li><strong>M: X.XX</strong> — показатель монотонности (чем выше, тем однообразнее нагрузка)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Практические рекомендации</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Следите за трендами: резкие скачки Strain требуют внимания</li>
                <li>Высокий Strain + высокая Monotony = особенно рискованный период</li>
                <li>Планируйте восстановительные недели при критических значениях</li>
                <li>Используйте данные для корректировки тренировочных планов</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно с описанием ACWR */}
      <Dialog open={isACWRModalOpen} onOpenChange={setIsACWRModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-vista-dark border-vista-secondary/50 text-vista-light overflow-hidden mt-8 mb-8">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl text-vista-light">
              ACWR по команде (среднее + диапазон, 8 недель)
            </DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Детальное описание анализа ACWR команды
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 text-sm text-vista-light/80 overflow-y-auto max-h-[calc(80vh-120px)] pr-2 custom-scrollbar scrollbar-thin scrollbar-track-transparent scrollbar-thumb-vista-primary/20 hover:scrollbar-thumb-vista-primary/40">
            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Что такое ACWR?</h3>
              <p className="mb-4">
                ACWR (Acute:Chronic Workload Ratio) — это соотношение острой и хронической тренировочной нагрузки, 
                которое является ключевым показателем для мониторинга риска травм и оптимизации тренировочного процесса.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Расчет ACWR</h3>
              <p className="mb-2">
                ACWR рассчитывается как отношение острой нагрузки (7 дней) к хронической нагрузке (28 дней):
              </p>
              <div className="bg-vista-dark/70 border border-vista-secondary/30 rounded-md p-3 mb-4">
                <code className="text-vista-primary font-mono">
                  ACWR = Острая нагрузка (7 дней) / Хроническая нагрузка (28 дней)
                </code>
              </div>
              <p className="mb-2">
                <strong>Где:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Острая нагрузка</strong> = сумма тренировочных нагрузок за последние 7 дней</li>
                <li><strong>Хроническая нагрузка</strong> = средняя нагрузка за последние 28 дней</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Интерпретация значений ACWR</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded bg-sky-500/20 border border-sky-500/40"></div>
                  <div>
                    <div className="font-medium text-vista-light">ACWR &lt; 0.8</div>
                    <div className="text-xs text-vista-light/60">Низкий риск травм, возможна недогрузка</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded bg-vista-light/20 border border-vista-light/40"></div>
                  <div>
                    <div className="font-medium text-vista-light">0.8 ≤ ACWR ≤ 1.3</div>
                    <div className="text-xs text-vista-light/60">Оптимальная зона, низкий риск</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded bg-amber-500/25 border border-amber-500/40"></div>
                  <div>
                    <div className="font-medium text-vista-light">1.3 &lt; ACWR ≤ 1.5</div>
                    <div className="text-xs text-vista-light/60">Умеренный риск, требует внимания</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-vista-dark/70 border border-vista-secondary/30 rounded-md">
                  <div className="w-6 h-6 rounded bg-red-500/35 border border-red-500/60"></div>
                  <div>
                    <div className="font-medium text-vista-light">ACWR &gt; 1.5</div>
                    <div className="text-xs text-vista-light/60">Высокий риск травм, красная зона</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Элементы графика</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-vista-primary mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-vista-light">Синяя линия</div>
                    <div className="text-sm text-vista-light/70">Среднее значение ACWR по команде за каждую неделю</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-vista-light/60 mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-vista-light">Серые усики (вертикальные линии)</div>
                    <div className="text-sm text-vista-light/70">Показывают диапазон от минимального до максимального ACWR игроков команды</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500/35 mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-vista-light">Красная зона</div>
                    <div className="text-sm text-vista-light/70">Область ACWR &gt; 1.5, требующая особого внимания</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-vista-light/30 mt-1 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-vista-light">Пунктирная линия на уровне 0</div>
                    <div className="text-sm text-vista-light/70">Базовая линия для визуального ориентира</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-vista-light mb-3">Как использовать данные</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Мониторинг риска</strong> — следите за игроками, чьи значения попадают в красную зону</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Планирование нагрузки</strong> — используйте данные для корректировки тренировочных планов</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Индивидуальный подход</strong> — учитывайте разброс значений (усики) для персонализации</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-vista-primary text-sm leading-5 flex-shrink-0 mt-0.5">•</span>
                  <span className="leading-5"><strong>Трендовый анализ</strong> — отслеживайте изменения ACWR команды во времени</span>
                </li>
              </ul>
            </div>

            <div className="bg-vista-primary/10 border border-vista-primary/30 rounded-md p-4">
              <h4 className="font-semibold text-vista-primary mb-2">⚠️ Важно</h4>
              <p className="text-sm">
                ACWR — это инструмент мониторинга, а не диагноз. Всегда учитывайте индивидуальные особенности игроков 
                и консультируйтесь с медицинским персоналом при принятии решений о тренировочной нагрузке.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
