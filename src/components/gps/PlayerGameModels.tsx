'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatTimeFromSeconds } from '@/lib/unit-converter';

import { gpsLogger } from '@/lib/logger';
interface PlayerMetric {
  canonicalMetricCode: string;
  displayName: string;
  displayUnit: string;
  currentValue: number;
  modelValue: number;
  percentageDiff: number;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  jerseyNumber: number;
  photo: string | null;
  actualDuration: number;
  hasGameModel: boolean;
  gameModelInfo: {
    calculatedAt: string;
    matchesCount: number;
    totalMinutes: number;
  } | null;
  metrics: PlayerMetric[];
}

interface PlayerGameModelsProps {
  reportId: string;
  profileId: string;
  isLoading?: boolean;
  timeUnit?: string; // Единица времени из профиля визуализации
}

export function PlayerGameModels({ reportId, profileId, isLoading = false, timeUnit = 'minutes' }: PlayerGameModelsProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reportId && profileId) {
      loadPlayerModels();
    }
  }, [reportId, profileId]);

  const loadPlayerModels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gps/reports/${reportId}/player-models?profileId=${profileId}`);
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      } else {
        gpsLogger.error('Component', 'Failed to load player models:', response.status, response.statusText);
        setPlayers([]);
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error loading player models:', error);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (percentageDiff: number) => {
    if (percentageDiff > 0) {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    } else if (percentageDiff < 0) {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    } else {
      return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const getMetricColor = (percentageDiff: number) => {
    if (percentageDiff > 0) {
      return 'text-green-500';
    } else if (percentageDiff < 0) {
      return 'text-red-500';
    } else {
      return 'text-gray-500';
    }
  };

  const formatDuration = (minutes: number) => {
    // actualDuration уже приходит в минутах, не нужно умножать на 60
    const totalMinutes = Math.floor(minutes);
    const remainingSeconds = Math.round((minutes - totalMinutes) * 60);
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    
    if (timeUnit === 'hh:mm:ss') {
      return `${pad(hours)}:${pad(mins)}:${pad(remainingSeconds)}`;
    } else if (timeUnit === 'hh:mm') {
      return `${pad(hours)}:${pad(mins)}`;
    } else if (timeUnit === 'mm:ss') {
      // Если минуты больше 59, показываем как часы:минуты
      if (totalMinutes >= 60) {
        return `${pad(hours)}:${pad(mins)}`;
      }
      return `${pad(totalMinutes)}:${pad(remainingSeconds)}`;
    } else if (timeUnit === 'ss') {
      return `${Math.round(minutes * 60)} сек`;
    } else if (timeUnit === 'minutes') {
      // Формат минут как в таблице - просто число
      return `${Math.round(minutes)}`;
    } else {
      // По умолчанию hh:mm
      return `${pad(hours)}:${pad(mins)}`;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="bg-vista-dark/50 border border-vista-secondary/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-vista-light/90 mb-4">
          Игровые модели игроков
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-vista-secondary/20 rounded-lg h-64"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="bg-vista-dark/50 border border-vista-secondary/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-vista-light/90 mb-4">
          Игровые модели игроков
        </h3>
        <div className="text-center text-vista-light/60 py-8">
          Нет данных об игроках в этом отчете
        </div>
      </div>
    );
  }

  return (
    <div className="bg-vista-dark/50 border border-vista-secondary/30 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-vista-light/90">
          Игровые модели игроков
        </h3>
        <p className="text-sm text-vista-light/70 mt-1">
          Сравнение текущих показателей с индивидуальной игровой моделью каждого игрока
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {players.map((player) => (
          <Card key={player.id} className="bg-vista-dark/30 border-vista-secondary/30 hover:shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] z-0" />
                  {player.photo ? (
                    <img 
                      src={player.photo}
                      alt={`${player.firstName} ${player.lastName}`}
                      className="w-full h-full object-cover z-10 relative"
                      style={{ background: 'transparent' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center z-10 relative bg-vista-primary/20">
                      <span className="text-vista-light text-lg font-medium">
                        {player.firstName?.[0]}{player.lastName?.[0]}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-normal text-vista-light">
                    {player.firstName} {player.lastName}
                  </CardTitle>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="outline" className="text-sm border-vista-secondary/50 text-vista-light/70 px-3 py-1">
                      {player.position}
                    </Badge>
                    <Badge variant="outline" className="text-sm border-vista-secondary/50 text-vista-light/70 px-3 py-1">
                      #{player.jerseyNumber}
                    </Badge>
                  </div>
                </div>
                
                {/* Информация о времени игры и игровой модели */}
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm text-vista-light/70 mb-2">
                    <Clock className="h-4 w-4" />
                    <span>Играл: {formatDuration(player.actualDuration)}</span>
                  </div>
                  {player.hasGameModel && player.gameModelInfo && (
                    <div className="text-sm text-vista-light/60">
                      <div>Модель: {player.gameModelInfo.matchesCount} матчей</div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {!player.hasGameModel ? (
                <div className="text-center py-4">
                  <User className="h-8 w-8 mx-auto mb-2 text-vista-light/50" />
                  <p className="text-sm text-vista-light/60">
                    Игровая модель не рассчитана
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Показываем метрики по 6 в ряду */}
                  {Array.from({ length: Math.ceil(player.metrics.length / 6) }).map((_, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-6 gap-1.5">
                      {player.metrics.slice(rowIndex * 6, (rowIndex + 1) * 6).map((metric) => {
                        const isPositive = metric.percentageDiff > 0;
                        const isNegative = metric.percentageDiff < 0;
                        const isNeutral = metric.percentageDiff === 0;
                        
                        return (
                          <div 
                            key={metric.canonicalMetricCode} 
                            className={`
                              p-2 rounded-md border
                              ${isPositive ? 'bg-green-500/10 border-green-500/30' : ''}
                              ${isNegative ? 'bg-red-500/10 border-red-500/30' : ''}
                              ${isNeutral ? 'bg-gray-500/10 border-gray-500/30' : ''}
                            `}
                          >
                            {/* Название метрики с единицами */}
                            <div className="text-center mb-1">
                              <div className="text-xs font-medium text-vista-light/80 truncate" title={`${metric.displayName} (${metric.displayUnit})`}>
                                {metric.displayName} ({metric.displayUnit})
                              </div>
                            </div>
                            
                            {/* Текущее и модельное значение */}
                            <div className="text-center mb-1">
                              <div className="flex items-center justify-center gap-2">
                                <div className={`text-sm font-bold ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-vista-light'}`}>
                                  {metric.currentValue.toFixed(0)}
                                </div>
                                <div className="w-px h-4 bg-vista-light/20"></div>
                                <div className="text-sm font-bold text-vista-light/60">
                                  {metric.modelValue.toFixed(0)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Процентная разница */}
                            <div className="text-center">
                              <div className={`
                                inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium
                                ${isPositive ? 'bg-green-500/20 text-green-400' : ''}
                                ${isNegative ? 'bg-red-500/20 text-red-400' : ''}
                                ${isNeutral ? 'bg-gray-500/20 text-gray-400' : ''}
                              `}>
                                {getMetricIcon(metric.percentageDiff)}
                                {metric.percentageDiff > 0 ? '+' : ''}{metric.percentageDiff.toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default PlayerGameModels;
