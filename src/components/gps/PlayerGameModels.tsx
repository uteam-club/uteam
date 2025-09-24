'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { gpsLogger } from '@/lib/logger';
import { formatTimeFromSeconds } from '@/lib/unit-converter';

interface ComparisonMetric {
  canonicalMetric: string;
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
  imageUrl?: string;
  gameModel: {
    id: string;
    playerId: string;
    calculatedAt: string;
    matchesCount: number;
    totalMinutes: number;
    metrics: Record<string, number>;
    matchIds: string[];
    version: number;
  } | null;
  matchData: Record<string, { value: number; unit: string }>;
  comparisonMetrics: ComparisonMetric[];
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
        console.log('🔍 === ДАННЫЕ ИГРОКОВ ===');
        if (data.players) {
          data.players.forEach((player: Player, index: number) => {
            console.log(`\n${index + 1}. ${player.firstName} ${player.lastName}:`);
            console.log(`   - Метрики для сравнения: ${player.comparisonMetrics.length}`);
            if (player.comparisonMetrics.length > 0) {
              console.log('   - Первые 3 метрики:');
              player.comparisonMetrics.slice(0, 3).forEach(metric => {
                console.log(`     * ${metric.canonicalMetric}: "${metric.displayName}" (${metric.displayUnit})`);
              });
            }
          });
        }
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

  const formatDuration = (minutes: number) => {
    if (timeUnit === 'seconds') {
      return formatTimeFromSeconds(minutes * 60, 'mm:ss');
    }
    return `${Math.round(minutes)} мин`;
  };

  if (loading || isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary mx-auto mb-4"></div>
          <p className="text-vista-light/60">Загрузка игровых моделей...</p>
        </div>
      </div>
    );
  }

  // Сортируем игроков: сначала с метриками, потом без модели, потом "менее 60 минут"
  const playersWithModels = players
    .filter(player => player.gameModel !== null)
    .sort((a, b) => {
      // Игроки с метриками для сравнения (играли 60+ минут) - в начале
      const aHasMetrics = a.comparisonMetrics.length > 0;
      const bHasMetrics = b.comparisonMetrics.length > 0;
      
      if (aHasMetrics && !bHasMetrics) return -1;
      if (!aHasMetrics && bHasMetrics) return 1;
      
      // Если у обоих нет метрик, проверяем причину
      if (!aHasMetrics && !bHasMetrics) {
        const aPlayedLess60 = a.matchData.duration && (a.matchData.duration.value / 60) < 60;
        const bPlayedLess60 = b.matchData.duration && (b.matchData.duration.value / 60) < 60;
        
        // Игроки "менее 60 минут" - в конце
        if (aPlayedLess60 && !bPlayedLess60) return 1;
        if (!aPlayedLess60 && bPlayedLess60) return -1;
      }
      
      // Если все одинаково, сортируем по имени
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });

  if (playersWithModels.length === 0) {
    return (
      <div className="text-center text-vista-light/60 py-8">
        Нет данных об игроках в этом отчете
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {playersWithModels.map((player) => (
        <Card key={player.id} className="bg-vista-dark/30 border-vista-secondary/30 hover:shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden relative">
                {player.imageUrl ? (
                  <img 
                    src={player.imageUrl}
                    alt={`${player.firstName} ${player.lastName}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // В случае ошибки загрузки используем аватар по умолчанию
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={`absolute inset-0 bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] z-0 ${player.imageUrl ? 'hidden' : ''}`}
                  style={{ display: player.imageUrl ? 'none' : 'block' }}
                />
                <div 
                  className={`absolute inset-0 flex items-center justify-center z-10 ${player.imageUrl ? 'hidden' : ''}`}
                  style={{ display: player.imageUrl ? 'none' : 'flex' }}
                >
                  <User className="h-8 w-8 text-vista-light/80" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-normal text-vista-light">
                  {player.firstName} {player.lastName}
                </CardTitle>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="outline" className="text-sm border-vista-secondary/50 text-vista-light/70 px-3 py-1">
                    {player.position}
                  </Badge>
                </div>
              </div>
              
              {/* Информация о игровой модели */}
              <div className="text-right">
                {player.gameModel && (
                  <div className="text-sm text-vista-light/60">
                    <div>Модель: {player.gameModel.matchesCount} матчей</div>
                    {player.matchData.duration && (
                      <div className="text-xs text-vista-light/50">
                        В матче: {Math.round(player.matchData.duration.value / 60)}
                      </div>
                    )}
                    {player.comparisonMetrics.length === 0 && player.matchData.duration && (player.matchData.duration.value / 60) < 60 && (
                      <div className="text-xs text-red-400 mt-1">
                        Играл менее 60 мин
                      </div>
                    )}
                    {player.comparisonMetrics.length === 0 && player.matchData.duration && (player.matchData.duration.value / 60) >= 60 && (
                      <div className="text-xs text-yellow-400 mt-1">
                        Нет модели
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {!player.gameModel ? (
              <div className="text-center py-4">
                <User className="h-8 w-8 mx-auto mb-2 text-vista-light/50" />
                <p className="text-sm text-vista-light/60">
                  Игровая модель не рассчитана
                </p>
              </div>
            ) : player.comparisonMetrics.length === 0 && player.matchData.duration ? (
              <div className="text-center py-4">
                <Clock className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <p className="text-sm text-red-400">
                  Игрок играл менее 60 минут
                </p>
                <p className="text-xs text-vista-light/60 mt-1">
                  Сравнение недоступно
                </p>
              </div>
            ) : player.comparisonMetrics.length === 0 ? (
              <div className="text-center py-4">
                <User className="h-8 w-8 mx-auto mb-2 text-vista-light/50" />
                <p className="text-sm text-vista-light/60">
                  {player.matchData.duration && (player.matchData.duration.value / 60) >= 60
                    ? 'Нет игровой модели для сравнения'
                    : 'Нет данных для сравнения'
                  }
                </p>
                {player.matchData.duration && (
                  <p className="text-xs text-vista-light/50 mt-1">
                    Время в матче: {Math.round(player.matchData.duration.value / 60)} мин
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Показываем метрики для сравнения */}
                <div className="grid grid-cols-5 gap-2">
                  {player.comparisonMetrics.slice(0, 10).map((metric) => {
                    const isPositive = metric.percentageDiff > 0.1;
                    const isNegative = metric.percentageDiff < -0.1;
                    const isNeutral = Math.abs(metric.percentageDiff) <= 0.1;
                    
                    return (
                      <div 
                        key={metric.canonicalMetric} 
                        className={`
                          p-2 rounded-md border
                          ${isPositive ? 'bg-green-500/10 border-green-500/30' : ''}
                          ${isNegative ? 'bg-red-500/10 border-red-500/30' : ''}
                          ${isNeutral ? 'bg-gray-500/10 border-gray-500/30' : ''}
                        `}
                      >
                        {/* Название метрики с единицами */}
                        <div className="text-xs font-medium text-vista-light/80 truncate mb-1 text-center">
                          {metric.displayName} ({metric.displayUnit})
                        </div>
                        
                        {/* Текущее и модельное значение */}
                        <div className="text-center mb-1">
                          <div className="flex items-center justify-center gap-2">
                            <div className={`text-sm font-bold ${isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-vista-light'}`}>
                              {metric.currentValue.toFixed(1)}
                            </div>
                            <div className="w-px h-4 bg-vista-light/20"></div>
                            <div className="text-sm font-bold text-vista-light/60">
                              {metric.modelValue.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Процентное изменение */}
                        <div className="flex items-center justify-center gap-1">
                          {isPositive ? <TrendingUp className="h-3 w-3 text-green-500" /> : 
                           isNegative ? <TrendingDown className="h-3 w-3 text-red-500" /> : 
                           <Minus className="h-3 w-3 text-gray-500" />}
                          <span className={`text-xs font-medium ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-gray-500'}`}>
                            {metric.percentageDiff > 0 ? '+' : ''}{metric.percentageDiff.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                    })}
                </div>
                {player.comparisonMetrics.length > 10 && (
                  <div className="text-xs text-vista-light/60 text-center">
                    И еще {player.comparisonMetrics.length - 10} метрик...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default PlayerGameModels;