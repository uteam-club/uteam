'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Clock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GpsProfile {
  id: string;
  name: string;
  gpsSystem: string;
  columnMapping: Array<{
    name: string;
    mappedColumn: string;
    displayName: string;
    dataType: string;
    isVisible: boolean;
  }>;
}

interface PlayerGameModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  teamId: string;
}

interface MatchData {
  id: string;
  date: string;
  minutesPlayed: number;
  metrics: Record<string, number>;
}

interface AverageMetrics {
  [key: string]: {
    average: number;
    matchesCount: number;
    totalMinutes: number;
  };
}

export default function PlayerGameModelModal({ 
  isOpen, 
  onClose, 
  playerId, 
  teamId 
}: PlayerGameModelModalProps) {
  const { t } = useTranslation();
  const [gpsProfiles, setGpsProfiles] = useState<GpsProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [averageMetrics, setAverageMetrics] = useState<AverageMetrics>({});
  const [matchesCount, setMatchesCount] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  // Загрузка GPS профилей
  useEffect(() => {
    const fetchGpsProfiles = async () => {
      try {
        const response = await fetch('/api/gps-profiles');
        if (response.ok) {
          const data = await response.json();
          setGpsProfiles(data);
        }
      } catch (error) {
        console.error('Ошибка при загрузке GPS профилей:', error);
      }
    };

    if (isOpen) {
      fetchGpsProfiles();
    }
  }, [isOpen]);

  // Загрузка данных игровой модели при выборе профиля
  useEffect(() => {
    if (!selectedProfile || !playerId || !teamId) {
      setAverageMetrics({});
      setMatchesCount(0);
      setTotalMinutes(0);
      return;
    }

                      const fetchPlayerGameModel = async () => {
                    setIsLoading(true);
                    try {
                      const response = await fetch(`/api/players/${playerId}/game-model?profileId=${selectedProfile}&teamId=${teamId}`);
                      if (response.ok) {
                        const data = await response.json();
                        setAverageMetrics(data.averageMetrics || {});
                        setMatchesCount(data.matchesCount || 0);
                        setTotalMinutes(data.totalMinutes || 0);
                      } else {
                        console.error('Ошибка API:', response.status, response.statusText);
                        if (response.status === 403) {
                          console.error('❌ Нет прав доступа к игровой модели');
                        }
                      }
                    } catch (error) {
                      console.error('Ошибка при загрузке игровой модели:', error);
                    } finally {
                      setIsLoading(false);
                    }
       
       // Отладочная информация
       console.log('🔍 Отладочная информация игровой модели:', {
         selectedProfile,
         playerId,
         teamId,
         averageMetrics,
         matchesCount,
         totalMinutes
       });
    };

    fetchPlayerGameModel();
  }, [selectedProfile, playerId, teamId]);

  const selectedProfileData = gpsProfiles.find(profile => profile.id === selectedProfile);

  // Проверяем, есть ли данные для анализа
  const hasData = matchesCount > 0 && Object.keys(averageMetrics).length > 0;

  const formatMetricValue = (value: number, metricName: string): string => {
    // Форматирование в зависимости от типа метрики
    if (metricName.toLowerCase().includes('distance') || metricName.toLowerCase().includes('total')) {
      return `${Math.round(value).toLocaleString()} м`;
    }
    if (metricName.toLowerCase().includes('speed')) {
      return `${value.toFixed(1)} км/ч`;
    }
    if (metricName.toLowerCase().includes('minutes') || metricName.toLowerCase().includes('time')) {
      return `${Math.round(value)} мин`;
    }
    if (metricName.toLowerCase().includes('percent') || metricName.toLowerCase().includes('ratio')) {
      return `${value.toFixed(1)}%`;
    }
    // Для остальных метрик - округляем до 1 знака после запятой
    return value.toFixed(1);
  };

  return (
          <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl bg-vista-dark border-vista-secondary/50 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl font-semibold">
              Игровая модель игрока
            </DialogTitle>
                         <DialogDescription className="text-vista-light/60">
               Анализ игровых показателей на основе GPS данных из матчей. Время на поле берется из GPS отчетов.
             </DialogDescription>
          </DialogHeader>

        <div className="space-y-6">
          {/* Выбор GPS профиля */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-vista-light/70">
              Выберите GPS профиль для анализа
            </label>
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger className="bg-vista-dark-lighter border-vista-secondary/50 text-vista-light">
                <SelectValue placeholder="Выберите профиль" />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light">
                {gpsProfiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name} ({profile.gpsSystem})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Состояние без выбранного профиля */}
          {!selectedProfile && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-10 h-10 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-vista-light mb-2">
                Выберите GPS профиль
              </h3>
              <p className="text-vista-light/60 max-w-md mx-auto">
                Для анализа игровой модели выберите один из доступных GPS профилей. 
                Система проанализирует последние матчи игрока и покажет средние показатели.
              </p>
            </div>
          )}



          {/* Метрики игровой модели */}
          {selectedProfile && selectedProfileData && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-vista-light">
                  Средние показатели (нормализованные на 90 минут)
                </h3>
              </div>

              {/* Состояние без данных */}
              {!isLoading && !hasData && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-vista-light mb-2">
                    Нет данных для анализа
                  </h3>
                  <p className="text-vista-light/60 max-w-md mx-auto">
                    Для выбранного профиля не найдено матчей с GPS данными, 
                    где игрок сыграл 60+ минут. Загрузите GPS отчеты для матчей игрока.
                  </p>
                </div>
              )}

                              {isLoading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="bg-vista-dark/50 border-vista-secondary/30">
                        <CardContent className="p-4">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-8 w-20" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : hasData ? (
                                   <div className="grid grid-cols-4 gap-4">
                   {selectedProfileData.columnMapping
                     .filter(column => column.isVisible && !['Player', 'Position', 'Time'].includes(column.name))
                     .map((column, index) => {
                       const metricData = averageMetrics[column.name];
                                               const colorClass = 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30';
                        const iconColor = 'text-cyan-300 bg-cyan-500/20';
                       
                       return (
                                                   <Card key={column.name} className={`bg-gradient-to-br ${colorClass} hover:scale-[1.02] transition-transform duration-200`}>
                            <CardContent className="p-4">
                              <div className="text-center">
                                <div className={`w-16 h-7 rounded-md flex items-center justify-center ${iconColor} mx-auto mb-2 px-1`}>
                                  <h4 className="text-[9px] font-semibold leading-tight">
                                    {column.name}
                                  </h4>
                                </div>
                                <p className="text-xl font-bold text-vista-light mb-1">
                                  {metricData ? formatMetricValue(metricData.average, column.name) : '—'}
                                </p>
                                <p className="text-[8px] text-vista-light/60">среднее</p>
                              </div>
                            </CardContent>
                          </Card>
                       );
                                          })}
                  </div>
                ) : null}
              </div>
            )}

          {/* Информация о методе расчета */}
          {/* Удалить блок "Методология расчета" */}
        </div>
      </DialogContent>
    </Dialog>
  );
} 