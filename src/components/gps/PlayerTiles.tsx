'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

  return (
    <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-vista-light mb-6">Плитки игроков</h3>
        
        <div className="grid grid-cols-1 gap-6">
          {gpsData.map((gpsPlayer, index) => {
            // Находим игрока по имени
            const player = players.find(p => 
              `${p.firstName} ${p.lastName}`.toLowerCase() === gpsPlayer.name.toLowerCase() ||
              `${p.lastName} ${p.firstName}`.toLowerCase() === gpsPlayer.name.toLowerCase()
            );

            if (!player) return null;

            const gameModel = playerGameModels[player.id];
            const currentMinutes = currentMatchMinutes[gpsPlayer.name] || 0;

            if (!gameModel) return null;

            // Получаем метрики из GPS данных текущего матча
            const currentMetrics: Record<string, number> = {};
            
            // Используем метрики из профиля
            profile?.columnMapping?.forEach((col: any) => {
              const columnName = col.name || col.internalField || '';
              if (columnName && col.isVisible && columnName !== 'Player' && columnName !== 'Position' && columnName !== 'Time') {
                const dataKey = col.mappedColumn || columnName;
                const value = parseFloat(gpsPlayer[dataKey]) || 0;
                currentMetrics[columnName] = value;
              }
            });

            return (
              <Card key={player.id} className="bg-vista-dark/30 border-vista-secondary/30">
                <CardContent className="p-4">
                  {/* Заголовок игрока */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-vista-secondary/20 flex items-center justify-center">
                        {player.imageUrl ? (
                          <img 
                            src={player.imageUrl} 
                            alt={`${player.firstName} ${player.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-vista-light font-semibold">
                            {player.firstName?.[0]}{player.lastName?.[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-vista-light font-semibold">
                          {player.firstName} {player.lastName}
                        </h4>
                        <div className="flex items-center gap-2">
                          {player.position && (
                            <Badge className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                              {player.position}
                            </Badge>
                          )}
                          {player.number && (
                            <Badge className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                              #{player.number}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Информация о времени на поле */}
                    <div className="text-right">
                      <div className="text-xs text-vista-light/50">
                        Время на поле: {currentMinutes} мин
                      </div>
                      <div className="text-xs text-vista-light/50">
                        Проанализировано матчей: {gameModel.matchesCount}
                      </div>
                    </div>
                  </div>

                  {/* Метрики */}
                  <div className="grid grid-cols-6 gap-4">
                    {Object.entries(currentMetrics).map(([metricName, currentValue]) => {
                      const averageMetric = gameModel.averageMetrics[metricName];
                      if (!averageMetric) return null;

                      // Динамическая нормализация: если игрок сыграл 70 минут, 
                      // то сравниваем с его средними показателями за 70 минут
                      const normalizedAverage = currentMinutes > 0 
                        ? (averageMetric.average / 90) * currentMinutes 
                        : averageMetric.average;

                      const comparison = getComparisonIndicator(currentValue, normalizedAverage);
                      const cardBackground = getMetricCardBackground(currentValue, normalizedAverage);

                                             return (
                         <Card key={metricName} className={`${cardBackground} hover:scale-[1.02] transition-transform duration-200`}>
                           <CardContent className="p-4">
                             <div className="text-center">
                               <div className="w-16 h-7 rounded-md flex items-center justify-center text-cyan-300 bg-cyan-500/20 mx-auto mb-2 px-1">
                                 <h4 className="text-[9px] font-semibold leading-tight">
                                   {metricName}
                                 </h4>
                               </div>
                               <div className="flex items-center justify-center gap-1 mb-1">
                                 <div className={`flex items-center gap-1 ${comparison.color}`}>
                                   {comparison.icon}
                                   <span className="text-xs font-medium">{comparison.percentage}%</span>
                                 </div>
                               </div>
                               <p className="text-xl font-bold text-vista-light mb-1">
                                 {normalizedAverage.toFixed(1)}
                                 <span className="text-sm text-vista-light/50 ml-1">
                                   {getMetricUnit(metricName)}
                                 </span>
                               </p>
                               <p className="text-[8px] text-vista-light/60">текущий: {currentValue.toFixed(1)}</p>
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
      </CardContent>
    </Card>
  );
} 