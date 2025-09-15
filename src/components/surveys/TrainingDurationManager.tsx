'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Edit2, Save, X, Clock, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainingDurationManagerProps {
  teamId: string;
  date: string;
  responses: any[];
  onDurationUpdate: () => void;
}

interface DurationSettings {
  globalDuration: number | null;
  individualDurations: Record<string, number>;
}

export function TrainingDurationManager({ 
  teamId, 
  date, 
  responses, 
  onDurationUpdate 
}: TrainingDurationManagerProps) {
  const { toast } = useToast();
  const [durationSettings, setDurationSettings] = useState<DurationSettings>({
    globalDuration: null,
    individualDurations: {}
  });
  const [editingMode, setEditingMode] = useState<'global' | 'individual' | null>(null);
  const [tempDuration, setTempDuration] = useState<number>(0);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Обеспечиваем, что responses всегда является массивом
  const safeResponses = Array.isArray(responses) ? responses : [];

  // Отладочное логирование
  useEffect(() => {
    console.log('TrainingDurationManager - responses:', responses);
    console.log('TrainingDurationManager - safeResponses:', safeResponses);
    console.log('TrainingDurationManager - responses type:', typeof responses);
    console.log('TrainingDurationManager - Array.isArray(responses):', Array.isArray(responses));
  }, [responses, safeResponses]);

  // Загружаем настройки длительности при изменении команды или даты
  useEffect(() => {
    if (teamId && date) {
      loadDurationSettings();
    }
  }, [teamId, date]);

  const loadDurationSettings = useCallback(async () => {
    try {
      const response = await fetch(`/api/surveys/rpe/duration?teamId=${teamId}&date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setDurationSettings(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек длительности:', error);
    }
  }, [teamId, date]);

  const saveGlobalDuration = async () => {
    if (tempDuration <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Длительность должна быть больше 0',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/surveys/rpe/duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          date,
          globalDuration: tempDuration
        })
      });

      if (response.ok) {
        await loadDurationSettings();
        setEditingMode(null);
        setTempDuration(0);
        onDurationUpdate();
        toast({
          title: 'Успешно',
          description: 'Общая длительность тренировки сохранена'
        });
      } else {
        throw new Error('Ошибка сохранения');
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить длительность',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveIndividualDuration = async (playerId: string) => {
    if (tempDuration <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Длительность должна быть больше 0',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/surveys/rpe/duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          date,
          playerId,
          individualDuration: tempDuration
        })
      });

      if (response.ok) {
        await loadDurationSettings();
        setEditingMode(null);
        setTempDuration(0);
        onDurationUpdate();
        toast({
          title: 'Успешно',
          description: 'Индивидуальная длительность сохранена'
        });
      } else {
        throw new Error('Ошибка сохранения');
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить длительность',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (mode: 'global' | 'individual', currentDuration?: number, playerId?: string) => {
    setEditingMode(mode);
    setTempDuration(currentDuration || 0);
    if (mode === 'individual' && playerId) {
      setEditingPlayerId(playerId);
    } else {
      setEditingPlayerId(null);
    }
  };

  const cancelEditing = () => {
    setEditingMode(null);
    setTempDuration(0);
    setEditingPlayerId(null);
  };

  const getPlayerDuration = (playerId: string) => {
    return durationSettings.individualDurations[playerId] || durationSettings.globalDuration;
  };

  // Проверяем, есть ли данные для отображения
  const hasData = safeResponses.length > 0 && safeResponses.some(response => response && response.player);

  // Проверяем, что у нас есть необходимые данные
  if (!teamId || !date) {
    return (
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md mb-6">
        <CardContent className="p-4">
          <div className="text-center text-vista-light/50 text-sm">
            Выберите команду и дату для управления длительностью тренировки
          </div>
        </CardContent>
      </Card>
    );
  }

  const calculateRPEWorkload = (rpeScore: number, duration: number | null) => {
    if (!duration || !rpeScore) return null;
    return rpeScore * duration;
  };

  const getWorkloadColor = (workload: number) => {
    if (workload <= 20) return 'bg-green-500';
    if (workload <= 40) return 'bg-yellow-500';
    if (workload <= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md mb-6">
      <CardHeader>

      </CardHeader>
      <CardContent className="space-y-3">
        {/* Общая длительность для команды */}
        <div className="flex items-center justify-between p-3 bg-vista-dark/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Label className="text-vista-light font-medium">Общая длительность команды:</Label>
            {editingMode === 'global' ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={tempDuration}
                  onChange={e => setTempDuration(Number(e.target.value))}
                  className="w-20 bg-vista-dark border-vista-secondary/50 text-vista-light"
                  placeholder="мин"
                />
                <span className="text-vista-light/70 text-sm">минут</span>
                <Button
                  size="sm"
                  onClick={saveGlobalDuration}
                  disabled={loading}
                  className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEditing}
                  className="border-vista-secondary/50 text-vista-light"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-vista-primary/20 text-vista-primary text-lg px-3 py-1">
                  {durationSettings.globalDuration ? `${durationSettings.globalDuration} мин` : 'Не задано'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEditing('global', durationSettings.globalDuration || undefined)}
                  className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Информация о нагрузке */}
        {durationSettings.globalDuration && (
          <div className="p-3 bg-vista-dark/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-vista-primary" />
              <span className="text-vista-light font-medium">Расчет нагрузки (RPE × Время):</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rpe => {
                const workload = calculateRPEWorkload(rpe, durationSettings.globalDuration);
                return (
                  <div key={rpe} className="flex items-center justify-between p-2 bg-vista-dark/50 rounded">
                    <span className="text-vista-light/70">RPE {rpe}:</span>
                    <Badge className={cn(getWorkloadColor(workload || 0), 'text-white')}>
                      {workload || '-'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Индивидуальные настройки */}
        <div className="space-y-2">
          <Label className="text-vista-light font-medium">Индивидуальные настройки:</Label>
          <div className="text-vista-light/70 text-sm">
            Укажите индивидуальную длительность для игроков, если она отличается от общей
          </div>
          
          {/* Таблица игроков с возможностью редактирования длительности */}
          <div className="mt-4 overflow-x-auto custom-scrollbar">
            <table className="min-w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md">
              <thead>
                <tr className="bg-vista-dark/70 text-xs">
                  <th className="px-3 py-0 border-b border-vista-secondary/30 text-left">Игрок</th>
                  <th className="px-3 py-0 border-b border-vista-secondary/30 text-center">Длительность</th>
                  <th className="px-3 py-0 border-b border-vista-secondary/30 text-center">Действия</th>
                </tr>
              </thead>
              <tbody>
                {hasData ? (
                  safeResponses.map((response: any) => {
                    const player = response.player;
                    if (!player) return null; // Пропускаем записи без игрока
                    
                    const currentDuration = durationSettings.individualDurations[player.id] || durationSettings.globalDuration;
                    const isEditing = editingMode === 'individual' && editingPlayerId === player.id;
                    
                    return (
                      <tr key={player.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                        <td className="px-3 py-0 whitespace-nowrap text-xs">
                          {player.lastName} {player.firstName}
                        </td>
                        <td className="px-3 py-0 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                value={tempDuration}
                                onChange={e => setTempDuration(Number(e.target.value))}
                                className="w-20 bg-vista-dark border-vista-secondary/50 text-vista-light text-center"
                                placeholder="мин"
                              />
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-1 rounded bg-vista-primary/20 text-vista-primary text-xs">
                              {currentDuration ? `${currentDuration} мин` : 'Не задано'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-0 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => saveIndividualDuration(player.id)}
                                disabled={loading}
                                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                className="border-vista-secondary/50 text-vista-light"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing('individual', currentDuration || undefined, player.id)}
                              className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 py-0.5 text-center text-vista-light/50 text-xs">
                      {safeResponses.length === 0 
                        ? 'Нет ответов RPE для отображения' 
                        : 'Нет данных об игроках для отображения'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
