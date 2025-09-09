'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CANON } from '@/canon/metrics.registry';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  imageUrl?: string;
  number?: number;
}

interface PlayerMetric {
  average: number;
  matchesCount: number;
  totalMinutes: number;
}

interface PlayerGameModel {
  averageMetrics: Record<string, PlayerMetric>;
  matchesCount: number;
  totalMinutes: number;
}

interface GpsDataPoint {
  name: string;
  [key: string]: any;
}

interface PlayerTilesProps {
  gpsData: GpsDataPoint[];
  teamId: string;
  profileId: string;
  currentMatchMinutes: Record<string, number>; // Время игроков в текущем матче
  profile: any; // GPS профиль для получения метрик
  isPublic?: boolean; // Флаг для публичной страницы
}

export default function PlayerTiles({ gpsData, teamId, profileId, currentMatchMinutes, profile, isPublic = false }: PlayerTilesProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerGameModels, setPlayerGameModels] = useState<Record<string, PlayerGameModel>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Canonical блок
  const canonicalBlock = gpsData?.[0]?.processedData?.canonical;
  const isCanonical = Boolean(canonicalBlock?.rows?.length);
  
  // Множество скрытых ключей
  const hiddenSet = new Set<string>(profile?.visualizationConfig?.hiddenCanonicalKeys ?? []);
  const canonicalRows: Array<Record<string, any>> = isCanonical ? canonicalBlock.rows : [];

  // Форматирование значений для HSR%
  const formatValue = (key: string, value: any) => {
    const meta = CANON.metrics.find(m => m.key === key);
    if (!meta) return value;
    // ratio выводим как проценты (0.085 -> 8.5%)
    if (meta.dimension === 'ratio') {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (!Number.isFinite(num)) return value;
      return Math.round(num * 1000) / 10;
    }
    return value;
  };

  // Определение уровня сходства на основе confidence score
  const getSimilarityLevel = (confidenceScore: number) => {
    if (confidenceScore >= 0.8) return 'high';
    if (confidenceScore >= 0.5) return 'medium';
    if (confidenceScore >= 0.3) return 'low';
    return 'none';
  };

  // Получение стилей для разных уровней сходства
  const getSimilarityStyles = (level: string) => {
    switch (level) {
      case 'high':
        return {
          cardClass: 'bg-vista-dark/30 border-vista-secondary/30',
          opacity: 'opacity-100',
          badgeClass: 'bg-green-500/20 text-green-300 border-green-500/30',
          badgeText: 'Высокое сходство'
        };
      case 'medium':
        return {
          cardClass: 'bg-vista-dark/30 border-vista-secondary/30',
          opacity: 'opacity-100',
          badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
          badgeText: 'Среднее сходство'
        };
      case 'low':
        return {
          cardClass: 'bg-vista-dark/30 border-vista-secondary/30',
          opacity: 'opacity-100',
          badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
          badgeText: 'Низкое сходство'
        };
      case 'none':
        return {
          cardClass: 'bg-vista-dark/20 border-vista-secondary/20',
          opacity: 'opacity-50',
          badgeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
          badgeText: 'Без привязки'
        };
      default:
        return {
          cardClass: 'bg-vista-dark/30 border-vista-secondary/30',
          opacity: 'opacity-100',
          badgeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
          badgeText: 'Неизвестно'
        };
    }
  };

  // Загружаем игроков команды
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const apiUrl = isPublic ? `/api/public/teams/${teamId}/players` : `/api/teams/${teamId}/players`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          const playersData = await response.json();
          setPlayers(playersData);
        }
      } catch (error) {
        console.error('Ошибка при загрузке игроков:', error);
      }
    };

    if (teamId) {
      fetchPlayers();
    }
  }, [teamId]);

  // Загружаем игровые модели для каждого игрока
  useEffect(() => {
    const fetchPlayerGameModels = async () => {
      setIsLoading(true);
      const models: Record<string, PlayerGameModel> = {};

      // Получаем уникальные имена игроков из GPS данных
      const playerNames = [...new Set(gpsData.map(player => player.name))];

      for (const playerName of playerNames) {
        // Находим игрока по имени в списке игроков команды
        const player = players.find(p => 
          `${p.firstName} ${p.lastName}`.toLowerCase() === playerName.toLowerCase() ||
          `${p.lastName} ${p.firstName}`.toLowerCase() === playerName.toLowerCase()
        );

        if (player) {
          try {
            const apiUrl = isPublic 
              ? `/api/public/players/${player.id}/game-model?profileId=${profileId}&teamId=${teamId}`
              : `/api/players/${player.id}/game-model?profileId=${profileId}&teamId=${teamId}`;
            const response = await fetch(apiUrl);
            if (response.ok) {
              const gameModel = await response.json();
              models[player.id] = gameModel;
            }
          } catch (error) {
            console.error(`Ошибка при загрузке игровой модели для ${playerName}:`, error);
          }
        }
      }

      setPlayerGameModels(models);
      setIsLoading(false);
    };

    if (players.length > 0 && profileId && teamId) {
      fetchPlayerGameModels();
    }
  }, [players, profileId, teamId, gpsData]);

  // Функция для получения цвета и иконки сравнения
  const getComparisonIndicator = (currentValue: number, averageValue: number) => {
    const percentage = averageValue > 0 ? ((currentValue - averageValue) / averageValue) * 100 : 0;
    
    if (Math.abs(percentage) < 5) {
      return {
        icon: <Minus className="w-4 h-4" />,
        color: 'text-yellow-500',
        percentage: percentage.toFixed(1)
      };
    } else if (percentage > 0) {
      return {
        icon: <TrendingUp className="w-4 h-4" />,
        color: 'text-green-500',
        percentage: `+${percentage.toFixed(1)}`
      };
    } else {
      return {
        icon: <TrendingDown className="w-4 h-4" />,
        color: 'text-red-500',
        percentage: percentage.toFixed(1)
      };
    }
  };

  // Функция для получения цвета фона плитки метрики
  const getMetricCardBackground = (currentValue: number, averageValue: number) => {
    const percentage = averageValue > 0 ? ((currentValue - averageValue) / averageValue) * 100 : 0;
    
    if (Math.abs(percentage) < 5) {
      return 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30';
    } else if (percentage > 0) {
      return 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30';
    } else {
      return 'bg-gradient-to-br from-red-500/20 to-rose-500/10 border-red-500/30';
    }
  };

  // Функция для получения единиц измерения
  const getMetricUnit = (metricName: string) => {
    // Ищем метрику в профиле для получения единиц измерения
    const column = profile?.columnMapping?.find((col: any) => 
      (col.name || col.internalField) === metricName
    );
    
    // Если есть единицы измерения в профиле, используем их
    if (column?.unit) {
      return column.unit;
    }
    
    // Иначе используем стандартные единицы
    const units: Record<string, string> = {
      'Total distance': 'м',
      'Zone 3': 'м',
      'Zone 4': 'м',
      'Zone 5': 'м',
      'HSR': 'м',
      'HSR%': '%',
      'Sprints': '',
      'm/min': 'м/мин',
              'Acc': '',
        'Dec': '',
        'Max speed': 'км/ч'
      };
    return units[metricName] || '';
  };

  // Функция для получения цвета метрики
  const getMetricColor = (metricName: string) => {
    // Ищем метрику в профиле для получения цвета
    const column = profile?.columnMapping?.find((col: any) => 
      (col.name || col.internalField) === metricName
    );
    
    // Если есть цвет в профиле, используем его
    if (column?.color) {
      return column.color;
    }
    
    // Иначе используем стандартные цвета
    const colors: Record<string, string> = {
      'Total distance': 'bg-blue-500',
      'Zone 3': 'bg-orange-500',
      'Zone 4': 'bg-orange-500',
      'Zone 5': 'bg-orange-500',
      'HSR': 'bg-purple-500',
      'HSR%': 'bg-purple-500',
      'Sprints': 'bg-green-500',
      'm/min': 'bg-green-500',
              'Acc': 'bg-green-500',
        'Dec': 'bg-green-500',
        'Max speed': 'bg-red-500'
      };
    return colors[metricName] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardContent className="p-6">
          <div className="text-center text-vista-light/50">
            Загрузка плиток игроков...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Группируем игроков по уровню сходства
  const groupedPlayers = gpsData.reduce((groups, gpsPlayer) => {
    // Находим игрока по имени
    const player = players.find(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase() === gpsPlayer.name.toLowerCase() ||
      `${p.lastName} ${p.firstName}`.toLowerCase() === gpsPlayer.name.toLowerCase()
    );

    if (!player) return groups;

    const gameModel = playerGameModels[player.id];
    if (!gameModel) return groups;

    // Получаем confidence score из GPS данных
    const confidenceScore = gpsPlayer.confidenceScore || 0;
    const similarityLevel = getSimilarityLevel(confidenceScore);

    if (!groups[similarityLevel]) {
      groups[similarityLevel] = [];
    }

    groups[similarityLevel].push({
      gpsPlayer,
      player,
      gameModel,
      confidenceScore,
      similarityLevel
    });

    return groups;
  }, {} as Record<string, any[]>);

  // Порядок отображения групп
  const groupOrder = ['high', 'medium', 'low', 'none'];
  const groupTitles = {
    high: 'Высокое сходство (80-100%)',
    medium: 'Среднее сходство (50-79%)',
    low: 'Низкое сходство (30-49%)',
    none: 'Игроки без привязки (0-29%)'
  };

  // Стили для разделителей групп
  const getSeparatorStyles = (groupKey: string) => {
    switch (groupKey) {
      case 'high':
        return {
          lineClass: 'bg-gradient-to-r from-green-500 to-green-400',
          iconClass: 'text-green-400',
          bgClass: 'bg-green-500/10'
        };
      case 'medium':
        return {
          lineClass: 'bg-gradient-to-r from-yellow-500 to-yellow-400',
          iconClass: 'text-yellow-400',
          bgClass: 'bg-yellow-500/10'
        };
      case 'low':
        return {
          lineClass: 'bg-gradient-to-r from-orange-500 to-orange-400',
          iconClass: 'text-orange-400',
          bgClass: 'bg-orange-500/10'
        };
      case 'none':
        return {
          lineClass: 'bg-gradient-to-r from-gray-500 to-gray-400',
          iconClass: 'text-gray-400',
          bgClass: 'bg-gray-500/10'
        };
      default:
        return {
          lineClass: 'bg-gradient-to-r from-gray-500 to-gray-400',
          iconClass: 'text-gray-400',
          bgClass: 'bg-gray-500/10'
        };
    }
  };

  return (
    <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
      <CardContent className="p-3 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-vista-light mb-4 sm:mb-6">Плитки игроков</h3>
        
        <div className="space-y-8">
          {groupOrder.map(groupKey => {
            const groupPlayers = groupedPlayers[groupKey] || [];
            if (groupPlayers.length === 0) return null;

            const groupTitle = groupTitles[groupKey as keyof typeof groupTitles];
            const groupStyles = getSimilarityStyles(groupKey);
            const separatorStyles = getSeparatorStyles(groupKey);

            return (
              <div key={groupKey} className="space-y-4">
                {/* Визуальный разделитель с полоской */}
                <div className={`relative ${separatorStyles.bgClass} rounded-lg p-4 border border-vista-secondary/20`}>
                  <div className="flex items-center gap-4">
                    {/* Иконка */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${separatorStyles.bgClass} flex items-center justify-center`}>
                      {groupKey === 'high' && (
                        <svg className={`w-5 h-5 ${separatorStyles.iconClass}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {groupKey === 'medium' && (
                        <svg className={`w-5 h-5 ${separatorStyles.iconClass}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      )}
                      {groupKey === 'low' && (
                        <svg className={`w-5 h-5 ${separatorStyles.iconClass}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                      {groupKey === 'none' && (
                        <svg className={`w-5 h-5 ${separatorStyles.iconClass}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Заголовок группы */}
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-vista-light">{groupTitle}</h4>
                      <p className="text-sm text-vista-light/60">
                        {groupPlayers.length} игрок{groupPlayers.length === 1 ? '' : groupPlayers.length < 5 ? 'а' : 'ов'}
                      </p>
                    </div>
                    
                    {/* Счетчик */}
                    <Badge className={`${groupStyles.badgeClass} text-sm px-3 py-1`}>
                      {groupPlayers.length}
                    </Badge>
                  </div>
                  
                  {/* Декоративная полоска */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${separatorStyles.lineClass} rounded-b-lg`}></div>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {groupPlayers.map(({ gpsPlayer, player, gameModel, confidenceScore, similarityLevel }) => {
                    const currentMinutes = currentMatchMinutes[gpsPlayer.name] || 0;
                    const styles = getSimilarityStyles(similarityLevel);

                    // Получаем метрики из GPS данных текущего матча
                    const currentMetrics: Record<string, number> = {};
                    
                    if (isCanonical) {
                      // Canonical режим - используем canonicalKey
                      profile?.columnMapping?.forEach((col: any) => {
                        if (col?.type !== 'formula' && col?.canonicalKey && col?.name && !hiddenSet.has(col.canonicalKey)) {
                          const value = parseFloat(gpsPlayer[col.canonicalKey]) || 0;
                          const formattedValue = formatValue(col.canonicalKey, value);
                          currentMetrics[col.name] = formattedValue;
                        }
                      });
                    } else {
                      // Legacy режим - используем columnMapping
                      profile?.columnMapping?.forEach((col: any) => {
                        const columnName = col.name || col.internalField || '';
                        if (columnName && col.isVisible && columnName !== 'Player' && columnName !== 'Position' && columnName !== 'Time') {
                          const dataKey = col.mappedColumn || columnName;
                          const value = parseFloat(gpsPlayer[dataKey]) || 0;
                          currentMetrics[columnName] = value;
                        }
                      });
                    }

                    // Отладочная информация
                    console.log('🔍 PlayerTiles Debug:', {
                      player: `${player.firstName} ${player.lastName}`,
                      confidenceScore,
                      similarityLevel,
                      availableMetrics: Object.keys(currentMetrics),
                      gameModelMetrics: Object.keys(gameModel?.averageMetrics || {}),
                      matchesCount: gameModel?.matchesCount,
                      currentMetricsCount: Object.keys(currentMetrics).length
                    });

                    return (
                      <Card key={player.id} className={`${styles.cardClass} ${styles.opacity}`}>
                <CardContent className="p-3 sm:p-4">
                  {/* Заголовок игрока */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-vista-secondary/20 flex items-center justify-center">
                        {player.imageUrl ? (
                          <img 
                            src={player.imageUrl} 
                            alt={`${player.firstName} ${player.lastName}`}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-vista-light font-semibold text-sm sm:text-base">
                            {player.firstName?.[0]}{player.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-vista-light font-semibold text-sm sm:text-base">
                          {player.firstName} {player.lastName}
                        </h4>
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          {player.position && (
                            <Badge className="text-[10px] sm:text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                              {player.position}
                            </Badge>
                          )}
                          {player.number && (
                            <Badge className="text-[10px] sm:text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                              #{player.number}
                            </Badge>
                          )}
                          <Badge className={`text-[10px] sm:text-xs ${styles.badgeClass}`}>
                            {Math.round(confidenceScore * 100)}% {styles.badgeText}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Информация о времени на поле */}
                    <div className="text-right">
                      <div className="text-[10px] sm:text-xs text-vista-light/50">
                        Время на поле: {currentMinutes} мин
                      </div>
                      <div className="text-[10px] sm:text-xs text-vista-light/50">
                        Проанализировано матчей: {gameModel.matchesCount}
                      </div>
                    </div>
                  </div>

                  {/* Метрики */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 gap-1 sm:gap-2 md:gap-3">
                    {Object.entries(currentMetrics).map(([metricName, currentValue]) => {
                      const averageMetric = gameModel.averageMetrics[metricName];
                      if (!averageMetric) {
                        console.log('❌ No average metric found for:', metricName, 'in gameModel for', player.firstName, player.lastName);
                        return null;
                      }

                      // Если метрика процент/скорость — сравниваем без масштабирования по минутам
                      const isRateOrPercent = metricName === 'HSR%' || metricName === 'm/min' || metricName.toLowerCase().includes('/min');
                      const normalizedAverage = isRateOrPercent
                        ? averageMetric.average
                        : (currentMinutes > 0 ? (averageMetric.average / 90) * currentMinutes : averageMetric.average);

                      const comparison = getComparisonIndicator(currentValue, normalizedAverage);
                      const cardBackground = getMetricCardBackground(currentValue, normalizedAverage);

                                             return (
                         <Card key={metricName} className={`${cardBackground} hover:scale-[1.02] transition-transform duration-200`}>
                           <CardContent className="p-1 sm:p-1.5 md:p-2">
                             <div className="text-center">
                               <div className="w-8 sm:w-10 md:w-12 h-4 sm:h-5 md:h-6 rounded-md flex items-center justify-center text-cyan-300 bg-cyan-500/20 mx-auto mb-1 px-1">
                                 <h4 className="text-[6px] sm:text-[7px] md:text-[8px] font-semibold leading-tight">
                                   {metricName}
                                 </h4>
                               </div>
                               <div className="flex items-center justify-center gap-0.5 mb-1">
                                 <div className={`flex items-center gap-0.5 ${comparison.color}`}>
                                   <div className="w-3 h-3 sm:w-4 sm:h-4">
                                     {comparison.icon}
                                   </div>
                                   <span className="text-[8px] sm:text-[9px] md:text-[10px] font-medium">{comparison.percentage}%</span>
                                 </div>
                               </div>
                               <p className="text-xs sm:text-sm md:text-base font-bold text-vista-light mb-1">
                                 {normalizedAverage.toFixed(1)}
                                 <span className="text-[8px] sm:text-[9px] md:text-[10px] text-vista-light/50 ml-1">
                                   {getMetricUnit(metricName)}
                                 </span>
                               </p>
                               <p className="text-[6px] sm:text-[7px] md:text-[8px] text-vista-light/60">текущий: {currentValue.toFixed(1)}</p>
                             </div>
                           </CardContent>
                         </Card>
                       );
                    })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      );
    })}
    </div>
  </CardContent>
</Card>
);
} 