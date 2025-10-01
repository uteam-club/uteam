import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Calendar, 
  Clock, 
  Target, 
  CheckCircle,
  AlertCircle,
  XCircle,
  CalendarDays,
  Settings,
  Save
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Training {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  category: string;
  status: string;
}

interface RPESchedule {
  id?: string;
  trainingId: string;
  scheduledTime: string;
  status: 'scheduled' | 'sent' | 'cancelled';
  sentAt?: string;
}

interface Team {
  id: string;
  name: string;
}

interface RPESchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onScheduleUpdated: () => void;
}

export function RPESchedulingModal({
  open,
  onOpenChange,
  team,
  onScheduleUpdated
}: RPESchedulingModalProps) {
  const { toast } = useToast();
  
  // Состояния
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [schedules, setSchedules] = useState<Record<string, RPESchedule>>({});
  const [tempTimes, setTempTimes] = useState<Record<string, string>>({});
  // Матчи и их расписания
  const [matches, setMatches] = useState<Array<{ id: string; date: string; time: string; opponentName: string; status: string }>>([]);
  const [matchSchedules, setMatchSchedules] = useState<Record<string, { id?: string; matchId: string; scheduledTime: string; status: 'scheduled'|'sent'|'cancelled'; sentAt?: string }>>({});
  
  // Фильтры дат
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 6); // +7 дней по умолчанию
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (open && team) {
      loadTrainingsAndSchedules();
      loadMatchesAndSchedules();
    }
  }, [open, team, startDate, endDate]);

  const loadTrainingsAndSchedules = async () => {
    if (!team) return;

    setLoading(true);
    try {
      // Загружаем тренировки и расписания параллельно
      const [trainingsResponse, schedulesResponse] = await Promise.all([
        fetch(`/api/teams/${team.id}/trainings?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/teams/${team.id}/rpe-schedules?startDate=${startDate}&endDate=${endDate}`)
      ]);

      if (!trainingsResponse.ok || !schedulesResponse.ok) {
        throw new Error('Failed to load data');
      }

      const trainingsData = await trainingsResponse.json();
      const schedulesData = await schedulesResponse.json();

      setTrainings(trainingsData);
      
      // Преобразуем массив расписаний в объект по trainingId
      const schedulesMap = schedulesData.reduce((acc: Record<string, RPESchedule>, schedule: RPESchedule) => {
        acc[schedule.trainingId] = schedule;
        return acc;
      }, {});
      
      setSchedules(schedulesMap);
      
      // Заполняем временные времена из существующих расписаний
      const initialTimes = schedulesData.reduce((acc: Record<string, string>, schedule: RPESchedule) => {
        acc[schedule.trainingId] = schedule.scheduledTime;
        return acc;
      }, {});
      
      setTempTimes(initialTimes);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMatchesAndSchedules = async () => {
    if (!team) return;

    try {
      const [matchesRes, schedulesRes] = await Promise.all([
        fetch(`/api/teams/${team.id}/matches?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/teams/${team.id}/rpe-schedules-matches?startDate=${startDate}&endDate=${endDate}`)
      ]);
      if (!matchesRes.ok || !schedulesRes.ok) throw new Error('Failed to load matches');
      const matchesData = await matchesRes.json();
      const schedulesData = await schedulesRes.json();
      setMatches(matchesData);
      const map: Record<string, any> = {};
      const times: Record<string, string> = { ...tempTimes };
      schedulesData.forEach((s: any) => {
        map[s.matchId] = { id: s.id, matchId: s.matchId, scheduledTime: s.scheduledTime, status: s.status, sentAt: s.sentAt };
        if (!times[s.matchId]) times[s.matchId] = s.scheduledTime;
      });
      setMatchSchedules(map);
      setTempTimes(times);
    } catch (e) {
      console.error('Error loading matches:', e);
    }
  };

  const handleTimeChange = (trainingId: string, time: string) => {
    setTempTimes(prev => ({
      ...prev,
      [trainingId]: time
    }));
  };

  const handleMatchTimeChange = (matchId: string, time: string) => {
    setTempTimes(prev => ({ ...prev, [matchId]: time }));
  };

  const handleSaveSchedule = async (trainingId: string) => {
    const time = tempTimes[trainingId];
    if (!time || !team) return;

    setSaving(true);
    try {
      const response = await fetch('/api/rpe-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainingId,
          teamId: team.id,
          scheduledTime: time,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save schedule');
      }

      toast({
        title: 'Успешно!',
        description: 'Расписание сохранено',
      });

      // Перезагружаем данные
      await loadTrainingsAndSchedules();

    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить расписание',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMatchSchedule = async (matchId: string) => {
    const time = tempTimes[matchId];
    if (!time || !team) return;
    setSaving(true);
    try {
      const res = await fetch('/api/rpe-schedules-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, teamId: team.id, scheduledTime: time })
      });
      if (!res.ok) throw new Error('Failed to save match schedule');
      toast({ title: 'Успешно!', description: 'Расписание для матча сохранено' });
      await loadMatchesAndSchedules();
    } catch (e) {
      console.error(e);
      toast({ title: 'Ошибка', description: 'Не удалось сохранить расписание', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMatchSchedule = async (matchId: string) => {
    const schedule = matchSchedules[matchId];
    if (!schedule?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/rpe-schedules-matches/${schedule.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      toast({ title: 'Успешно!', description: 'Расписание для матча удалено' });
      await loadMatchesAndSchedules();
    } catch (e) {
      console.error(e);
      toast({ title: 'Ошибка', description: 'Не удалось удалить расписание', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSchedule = async (trainingId: string) => {
    const schedule = schedules[trainingId];
    if (!schedule) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/rpe-schedules/${schedule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove schedule');
      }

      toast({
        title: 'Успешно!',
        description: 'Расписание удалено',
      });

      // Перезагружаем данные
      await loadTrainingsAndSchedules();

    } catch (error) {
      console.error('Error removing schedule:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить расписание',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (trainingId: string) => {
    const schedule = schedules[trainingId];
    if (!schedule) {
      return <XCircle className="h-4 w-4 text-gray-400" />;
    }

    switch (schedule.status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'scheduled':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (trainingId: string) => {
    const schedule = schedules[trainingId];
    if (!schedule) return 'Не настроен';

    switch (schedule.status) {
      case 'sent':
        return `Отправлен ${schedule.sentAt ? new Date(schedule.sentAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}`;
      case 'scheduled':
        return `Запланирован на ${schedule.scheduledTime}`;
      case 'cancelled':
        return 'Отменен';
      default:
        return 'Не настроен';
    }
  };

  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'TRAINING': return 'Тренировка';
      case 'GYM': return 'Тренажерный зал';
      case 'MATCH': return 'Матч';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TRAINING': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'GYM': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'MATCH': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      weekday: 'short'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-vista-dark border-vista-secondary/30 text-vista-light overflow-hidden flex flex-col my-8 mx-auto">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
            <Settings className="h-5 w-5 text-vista-primary" />
            Планирование RPE опросов для команды &quot;{team?.name}&quot;
          </DialogTitle>
          <DialogDescription className="text-vista-light/70 text-sm">
            Настройте автоматическую отправку RPE опросов для конкретных тренировок
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col min-h-0 flex-1 overflow-hidden p-1">
          <Tabs defaultValue="trainings" className="w-full">
            <TabsList className="bg-vista-dark/50 border border-vista-secondary/30 mb-4">
              <TabsTrigger value="trainings" className="data-[state=active]:bg-vista-secondary/50 data-[state=active]:text-vista-light text-vista-light/70">Тренировки</TabsTrigger>
              <TabsTrigger value="matches" className="data-[state=active]:bg-vista-secondary/50 data-[state=active]:text-vista-light text-vista-light/70">Матчи</TabsTrigger>
            </TabsList>

            <TabsContent value="trainings">
          {/* Фильтр дат */}
          <div className="grid grid-cols-4 gap-4 items-center mb-4">
            {/* Кнопки быстрого выбора */}
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Понедельник
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6); // Воскресенье
                
                setStartDate(startOfWeek.toISOString().split('T')[0]);
                setEndDate(endOfWeek.toISOString().split('T')[0]);
                loadTrainingsAndSchedules();
              }}
              className="h-9 px-3 text-sm font-normal bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30"
            >
              Неделя
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                
                setStartDate(startOfMonth.toISOString().split('T')[0]);
                setEndDate(endOfMonth.toISOString().split('T')[0]);
                loadTrainingsAndSchedules();
              }}
              className="h-9 px-3 text-sm font-normal bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30"
            >
              Месяц
            </Button>
            
            {/* Поля ввода дат */}
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                loadTrainingsAndSchedules();
              }}
              className="h-9 px-3 text-sm font-normal bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                loadTrainingsAndSchedules();
              }}
              className="h-9 px-3 text-sm font-normal bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          {/* Список тренировок */}
          <Card className="bg-vista-dark/30 border-vista-secondary/30 flex-1 min-h-0 flex flex-col">
            <CardContent className="pt-4 flex flex-col min-h-0 flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-vista-light" />
                </div>
              ) : trainings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-vista-light/60">
                    Нет тренировок в выбранном диапазоне
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {trainings.map((training) => {
                    const schedule = schedules[training.id];
                    const tempTime = tempTimes[training.id] || '';
                    const hasChanges = tempTime !== (schedule?.scheduledTime || '');

                    return (
                      <div
                        key={training.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-vista-secondary/20 bg-vista-dark/50 min-h-[80px]"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Статус */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {getStatusIcon(training.id)}
                          </div>

                          {/* Информация о тренировке */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-medium text-vista-light truncate">
                                {training.title}
                              </h4>
                              <Badge className={`${getTypeColor(training.type)} border text-xs flex-shrink-0`}>
                                {getTypeDisplay(training.type)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-vista-light/70 flex-wrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{formatDate(training.date)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{training.time}</span>
                              </div>
                            </div>
                            <div className="text-xs text-vista-light/50 mt-1 truncate">
                              {getStatusText(training.id)}
                            </div>
                          </div>
                        </div>

                        {/* Управление расписанием */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {schedule?.status === 'sent' ? (
                            <Badge className="bg-green-500/20 text-green-400 whitespace-nowrap">
                              Отправлен
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={tempTime}
                                onChange={e => handleTimeChange(training.id, e.target.value)}
                                className="w-24 text-sm bg-vista-dark border-vista-secondary/50 text-vista-light flex-shrink-0"
                                placeholder="--:--"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveSchedule(training.id)}
                                disabled={!tempTime || saving}
                                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark flex-shrink-0"
                              >
                                {saving ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                              </Button>
                              {schedule && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemoveSchedule(training.id)}
                                  disabled={saving}
                                  className="border-red-500/50 text-red-400 hover:bg-red-500/20 flex-shrink-0"
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            <TabsContent value="matches">
              {/* Фильтр дат (тот же) */}
              <div className="grid grid-cols-4 gap-4 items-center mb-4">
                <Input id="start-date-m" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); loadMatchesAndSchedules(); }} className="h-9 px-3 text-sm font-normal bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
                <Input id="end-date-m" type="date" value={endDate} onChange={e => { setEndDate(e.target.value); loadMatchesAndSchedules(); }} className="h-9 px-3 text-sm font-normal bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
              </div>

              <Card className="bg-vista-dark/30 border-vista-secondary/30 flex-1 min-h-0 flex flex-col">
                <CardContent className="pt-4 flex flex-col min-h-0 flex-1 overflow-hidden">
                  {loading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-vista-light" /></div>
                  ) : matches.length === 0 ? (
                    <div className="text-center py-8"><div className="text-vista-light/60">Нет матчей в выбранном диапазоне</div></div>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                      {matches.map((m) => {
                        const schedule = matchSchedules[m.id];
                        const tempTime = tempTimes[m.id] || '';
                        return (
                          <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border border-vista-secondary/20 bg-vista-dark/50 min-h-[80px]">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-medium text-vista-light truncate">Матч vs {m.opponentName}</h4>
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs flex-shrink-0">Матч</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-vista-light/70 flex-wrap">
                                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /><span>{formatDate(m.date)}</span></div>
                                  <div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>{m.time}</span></div>
                                </div>
                                <div className="text-xs text-vista-light/50 mt-1 truncate">
                                  {schedule ? (schedule.status === 'sent' ? 'Отправлен' : `Запланирован на ${schedule.scheduledTime}`) : 'Не настроен'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {schedule?.status === 'sent' ? (
                                <Badge className="bg-green-500/20 text-green-400 whitespace-nowrap">Отправлен</Badge>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Input type="time" value={tempTime} onChange={e => handleMatchTimeChange(m.id, e.target.value)} className="w-24 text-sm bg-vista-dark border-vista-secondary/50 text-vista-light flex-shrink-0" placeholder="--:--" />
                                  <Button size="sm" onClick={() => handleSaveMatchSchedule(m.id)} disabled={!tempTime || saving} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark flex-shrink-0">
                                    {saving ? (<Loader2 className="h-3 w-3 animate-spin" />) : (<Save className="h-3 w-3" />)}
                                  </Button>
                                  {schedule && (
                                    <Button size="sm" variant="outline" onClick={() => handleRemoveMatchSchedule(m.id)} disabled={saving} className="border-red-500/50 text-red-400 hover:bg-red-500/20 flex-shrink-0">
                                      <XCircle className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Кнопка закрытия */}
            <div className="flex justify-end pt-4 pb-2 border-t border-vista-secondary/20 flex-shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20">Закрыть</Button>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
