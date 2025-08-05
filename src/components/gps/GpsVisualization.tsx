'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  Zap, 
  Target, 
  Users, 
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Target as TargetIcon,
  Trash2
} from 'lucide-react';
import PlayerTiles from './PlayerTiles';

interface GpsDataPoint {
  [key: string]: any; // Динамические поля из профиля
  name: string;
}

interface GpsProfile {
  id: string;
  name: string;
  gpsSystem: string;
  columnMapping: Array<{
    type?: 'column' | 'formula';
    name?: string;
    internalField?: string;
    mappedColumn?: string;
    excelColumn?: string;
    displayName: string;
    dataType: 'number' | 'string' | 'boolean';
    isVisible: boolean;
    formula?: any;
  }>;
  metricsConfig: {
    primaryMetrics: string[];
    secondaryMetrics: string[];
    chartTypes: {
      [metric: string]: 'bar' | 'line' | 'radar' | 'pie';
    };
  };
  visualizationConfig: {
    colors: {
      [metric: string]: string;
    };
    defaultChartType: 'bar' | 'line' | 'radar';
  };
}

interface GpsVisualizationProps {
  data: GpsDataPoint[];
  profile: GpsProfile;
  eventName: string;
  eventDate: string;
  teamName?: string;
  reportId?: string;
  teamId?: string;
  eventType?: 'TRAINING' | 'MATCH';
  isPublic?: boolean;
}

const COLORS = {
  total: '#3B82F6',
  zone3: '#F59E0B',
  zone4: '#EF4444',
  zone5: '#8B5CF6',
  sprints: '#10B981',
  maxSpeed: '#EC4899',
  accDec: '#06B6D4'
};

const ZONE_COLORS = ['#F59E0B', '#EF4444', '#8B5CF6'];

export default function GpsVisualization({ data, profile, eventName, eventDate, teamName, reportId, teamId, eventType, isPublic = false }: GpsVisualizationProps) {
  // Дополнительная проверка данных
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-vista-light">Нет данных для визуализации</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-vista-light">Профиль не загружен</p>
      </div>
    );
  }

  const columnMapping = profile.columnMapping;
  
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'radar'>('bar');
  
  // Состояние для сортировки
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);



  const getMetricIcon = (field: string) => {
    if (!field) return Activity; // Возвращаем иконку по умолчанию если поле пустое
    
    const iconMap: { [key: string]: any } = {
      total: Activity,
      distance: Activity,
      zone3: TrendingUp,
      zone4: Zap,
      zone5: Target,
      sprints: Zap,
      maxSpeed: Target,
      speed: Target,
      acceleration: Zap,
      deceleration: Zap,
      heartRate: Activity,
      default: Activity
    };
    return iconMap[field.toLowerCase()] || iconMap.default;
  };

  // Фильтруем метрики (только числовые колонки)
  const metrics = useMemo(() => {
    if (!profile?.columnMapping || !Array.isArray(profile.columnMapping)) {
      return [];
    }

    const filteredMetrics = profile.columnMapping.filter(col => {
      // Определяем dataType на основе имени колонки, если оно не задано
      const determineDataType = (colName: string): string => {
        const numericKeywords = [
          'distance', 'дистанция', 'speed', 'скорость', 'time', 'время',
          'zone', 'зона', 'acc', 'ускорения', 'dec', 'торможения',
          'total', 'общая', 'max', 'макс', 'count', 'количество'
        ];
        
        const colNameLower = colName.toLowerCase();
        return numericKeywords.some(keyword => colNameLower.includes(keyword)) ? 'number' : 'string';
      };
      
      const dataType = col.dataType || determineDataType(col.name || col.internalField || '');
      const isNumeric = dataType === 'number';
      const isVisible = col.isVisible !== false;
      const hasName = col.name || col.internalField;
      const isNotPlayerName = !(col.name === 'Player' || col.name === 'name' || col.internalField === 'name');
      
      // Исключаем Time из числовых метрик, так как это строка времени
      const isNotTime = !(col.name === 'Time' || col.internalField === 'Time');
      
      return isNumeric && isVisible && hasName && isNotPlayerName && isNotTime;
    });

    const result = filteredMetrics.map(col => {
      const key = col.name || col.internalField || '';
      const label = col.name || col.internalField || '';
      
      return {
        key,
        label: label,
        icon: getMetricIcon(key),
        color: profile.visualizationConfig?.colors?.[key] || COLORS.total
      };
    });
    
    return result;
  }, [profile?.columnMapping, profile?.visualizationConfig?.colors]);

  // Устанавливаем первую метрику как выбранную по умолчанию
  useEffect(() => {
    if (metrics.length > 0 && !selectedMetric) {
      const firstMetric = metrics[0]?.key || '';
      if (firstMetric) {
        setSelectedMetric(firstMetric);
      }
    }
  }, [metrics, selectedMetric]);

  // Устанавливаем тип графика из профиля
  useMemo(() => {
    if (profile?.visualizationConfig?.defaultChartType) {
      setChartType(profile.visualizationConfig.defaultChartType);
    }
  }, [profile]);

  const getMetricUnit = (field: string) => {
    if (!field) return '';
    
    const unitMap: { [key: string]: string } = {
      total: 'm',
      distance: 'm',
      zone3: 'm',
      zone4: 'm',
      zone5: 'm',
      maxSpeed: 'км/ч',
      speed: 'км/ч',
      sprints: '',
      acceleration: '',
      deceleration: '',
      heartRate: 'уд/мин',
      default: ''
    };
    return unitMap[field.toLowerCase()] || unitMap.default;
  };

  const getBadgeColor = (field: string) => {
    if (!field) return 'gray';
    
    const colorMap: { [key: string]: string } = {
      total: 'blue',
      distance: 'blue',
      zone3: 'orange',
      zone4: 'red',
      zone5: 'purple',
      maxSpeed: 'pink',
      speed: 'pink',
      sprints: 'green',
      acceleration: 'cyan',
      deceleration: 'cyan',
      heartRate: 'red',
      default: 'gray'
    };
    return colorMap[field.toLowerCase()] || colorMap.default;
  };

  const getBarColor = (field: string) => {
    // Все показатели одного цвета - градиент с разной прозрачностью (40% слева, 5% справа)
    return 'from-cyan-500/40 to-blue-500/5';
  };

  // Функция сортировки
  const sortData = (data: GpsDataPoint[], key: string, direction: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      const aValue = parseFloat(a[key]) || 0;
      const bValue = parseFloat(b[key]) || 0;
      
      if (direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  // Обработчик клика по заголовку
  const handleSort = (columnName: string) => {
    // Находим колонку в профиле для получения правильного dataKey
    const column = profile?.columnMapping?.find(col => 
      (col.name || col.internalField) === columnName
    );
    
    const dataKey = (columnName === 'Player') ? 'name' : (column?.mappedColumn || columnName);
    
    setSortConfig(prevConfig => {
      if (prevConfig?.key === dataKey) {
        // Если уже сортируем по этой колонке, меняем направление
        return {
          key: dataKey,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // Если новая колонка, сортируем по убыванию
        return {
          key: dataKey,
          direction: 'desc'
        };
      }
    });
  };

  // Отсортированные данные
  const sortedData = sortConfig 
    ? sortData(data, sortConfig.key, sortConfig.direction)
    : data;

  // Вычисление средних значений
  const averageValues = useMemo(() => {
    const averages: { [key: string]: number } = {};
    
    profile?.columnMapping?.forEach(col => {
      const columnName = col.name || col.internalField || '';
      if (columnName !== 'Player' && columnName !== 'Position') {
        const dataKey = col.mappedColumn || col.name || col.internalField || columnName;
        
        if (columnName === 'Time') {
          // Для времени парсим из формата HH:MM:SS в минуты
          const timeValues = data.map(player => {
            const timeString = player[dataKey] || '00:00:00';
            const timeParts = timeString.split(':');
            const hours = parseInt(timeParts[0]) || 0;
            const minutes = parseInt(timeParts[1]) || 0;
            const seconds = parseInt(timeParts[2]) || 0;
            return hours * 60 + minutes + seconds / 60;
          });
          const sum = timeValues.reduce((acc, val) => acc + val, 0);
          averages[columnName] = Math.round(sum / timeValues.length);
        } else {
          // Для остальных числовых полей
          const values = data.map(player => parseFloat(player[dataKey]) || 0);
          const sum = values.reduce((acc, val) => acc + val, 0);
          averages[columnName] = Math.round((sum / values.length) * 100) / 100;
        }
      }
    });
    
    return averages;
  }, [data, profile]);

  const selectedMetricData = metrics.find(m => m.key === selectedMetric);

  const averageMetrics = useMemo(() => {
    if (!data.length || !profile?.columnMapping) return null;
    
    const numericFields = profile.columnMapping
      .filter(col => (col.name || col.internalField) && col.dataType === 'number' && col.isVisible)
      .map(col => ({
        name: col.name || col.internalField || '',
        dataKey: col.mappedColumn || col.name || col.internalField || ''
      }));

    const totals = data.reduce((acc, item) => {
      numericFields.forEach(field => {
        if (!acc[field.name]) acc[field.name] = 0;
        acc[field.name] += parseFloat(item[field.dataKey] || 0);
      });
      return acc;
    }, {} as { [key: string]: number });

    const averages: { [key: string]: number } = {};
    numericFields.forEach(field => {
      averages[field.name] = Math.round((totals[field.name] / data.length) * 100) / 100;
    });

    return averages;
  }, [data, profile]);

  const zoneData = useMemo(() => {
    if (!averageMetrics || !profile?.columnMapping) return [];
    
    const zoneFields = profile.columnMapping
      .filter(col => (col.name || col.internalField) && (col.name || col.internalField)?.toLowerCase().includes('zone') && col.isVisible)
      .slice(0, 3) // Берем только первые 3 зоны
      .map(col => ({
        name: col.name || col.internalField || '',
        dataKey: col.mappedColumn || col.name || col.internalField || ''
      }));
    
    return zoneFields.map((col, index) => {
      return {
        name: col.name || 'Неизвестная зона',
        value: averageMetrics[col.name] || 0,
        color: ZONE_COLORS[index] || ZONE_COLORS[0]
      };
    });
  }, [averageMetrics, profile]);

  const radarData = useMemo(() => {
    if (!averageMetrics || !profile?.columnMapping) return [];
    
    const primaryMetrics = profile.metricsConfig?.primaryMetrics || 
      profile.columnMapping
        .filter(col => (col.name || col.internalField) && col.dataType === 'number' && col.isVisible)
        .slice(0, 6)
        .map(col => col.name || col.internalField || '');
    
    return primaryMetrics.map(field => {
      const col = profile.columnMapping.find(c => (c.name || c.internalField) === field);
      const value = averageMetrics[field] || 0;
      const maxValue = Math.max(...data.map(item => parseFloat(item[field] || 0)));
      
      return {
        metric: col?.name || col?.internalField || field,
        value: value,
        fullMark: maxValue * 1.2 // 20% больше максимального значения
      };
    });
  }, [averageMetrics, profile, data]);

  if (!data.length) {
    return (
      <div className="text-center py-12 text-vista-light/50">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>Нет данных для визуализации</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и информация */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
        <div className="bg-vista-dark/30 p-2 sm:p-4 rounded-lg">
          <div className="flex items-center gap-1 sm:gap-2 text-vista-light/60 mb-1 sm:mb-2">
            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">GPS профиль</span>
          </div>
          <p className="text-vista-light font-medium text-xs sm:text-sm">{profile.name}</p>
        </div>
        
        <div className="bg-vista-dark/30 p-2 sm:p-4 rounded-lg">
          <div className="flex items-center gap-1 sm:gap-2 text-vista-light/60 mb-1 sm:mb-2">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Дата события</span>
          </div>
          <p className="text-vista-light font-medium text-xs sm:text-sm">
            {new Date(eventDate).toLocaleDateString()}
          </p>
        </div>
        
        <div className="bg-vista-dark/30 p-2 sm:p-4 rounded-lg">
          <div className="flex items-center gap-1 sm:gap-2 text-vista-light/60 mb-1 sm:mb-2">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Игроков</span>
          </div>
          <p className="text-vista-light font-medium text-xs sm:text-sm">{data.length}</p>
        </div>
        
        <div className="bg-vista-dark/30 p-2 sm:p-4 rounded-lg">
          <div className="flex items-center gap-1 sm:gap-2 text-vista-light/60 mb-1 sm:mb-2">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Команда</span>
          </div>
          <p className="text-vista-light font-medium text-xs sm:text-sm">
            {teamName || 'Неизвестно'}
          </p>
        </div>
        
        <div className="bg-vista-dark/30 p-2 sm:p-4 rounded-lg">
          <div className="flex items-center gap-1 sm:gap-2 text-vista-light/60 mb-1 sm:mb-2">
            <Target className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Событие</span>
          </div>
          <p className="text-vista-light font-medium text-xs sm:text-sm">
            {eventType === 'TRAINING' ? 'Тренировка' : 
             eventType === 'MATCH' ? 'Матч' : 
             eventName.toLowerCase().includes('тренировка') ? 'Тренировка' : 
             eventName.toLowerCase().includes('матч') ? 'Матч' : 
             'Событие'}
          </p>
        </div>
      </div>

      {/* Детальная таблица с горизонтальными полосами */}
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-vista-light">Детальные данные игроков</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-vista-secondary/30">
                  {profile?.columnMapping
                    ?.filter(col => (col.name || col.internalField) && (col.isVisible !== false))
                    .map(col => {
                      const columnName = col.name || col.internalField || '';
                      const dataKey = (col.name === 'Player' || col.internalField === 'Player') ? 'name' : columnName;
                      const isSorted = sortConfig?.key === dataKey;
                      const sortDirection = isSorted ? sortConfig.direction : null;
                      
                      return (
                        <th 
                          key={columnName} 
                          className="text-center p-1 sm:p-3 text-vista-light/70 font-medium cursor-pointer hover:bg-vista-dark/30 transition-colors"
                          onClick={() => handleSort(columnName)}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{col.name || col.internalField || columnName}</span>
                            {isSorted && (
                              <span className="text-vista-primary">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((player, index) => (
                  <tr key={player.name} className="border-b border-vista-secondary/20 hover:bg-vista-dark/30">
                    {profile?.columnMapping
                      ?.filter(col => (col.name || col.internalField) && (col.isVisible !== false))
                      .map(col => {
                        const columnName = col.name || col.internalField || '';
                        const dataKey = (col.name === 'Player' || col.internalField === 'Player') ? 'name' : (col.mappedColumn || col.name || col.internalField || columnName);
                        const value = parseFloat(player[dataKey]) || 0;
                        
                        // Для числовых метрик создаем горизонтальные полосы
                        // Проверяем, является ли поле числовым (исключаем имя, позицию и время)
                        const isNumericField = columnName !== 'Player' && 
                                             columnName !== 'Position' && 
                                             columnName !== 'Time' && 
                                             !isNaN(value) && 
                                             value > 0;
                        
                        if (isNumericField) {
                          const maxValue = Math.max(...data.map(p => parseFloat(p[dataKey]) || 0));
                          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                          

                          
                          return (
                            <td key={columnName} className="p-1 sm:p-3">
                              <div className="relative">
                                <div className="w-full rounded-md h-6 sm:h-8 relative overflow-hidden">
                                  <div 
                                    className={`h-6 sm:h-8 rounded-md transition-all duration-300 bg-gradient-to-r ${getBarColor(columnName)} flex items-center justify-between px-1 sm:px-3`}
                                    style={{ width: `${percentage}%` }}
                                  >
                                    <span className="text-white text-[10px] sm:text-xs font-medium">
                                      {value.toLocaleString()}
                                    </span>
                                    <span className="text-white/80 text-[8px] sm:text-xs">
                                      {getMetricUnit(columnName)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          );
                        }
                        
                        // Для остальных полей (имя, позиция, время) показываем обычный текст
                        if (columnName === 'Time') {
                          // Преобразуем время из HH:MM:SS в минуты
                          const timeString = player[dataKey] || '00:00:00';
                          const timeParts = timeString.split(':');
                          const hours = parseInt(timeParts[0]) || 0;
                          const minutes = parseInt(timeParts[1]) || 0;
                          const seconds = parseInt(timeParts[2]) || 0;
                          const totalMinutes = Math.round(hours * 60 + minutes + seconds / 60);
                          
                          return (
                            <td key={columnName} className="p-1 sm:p-3 text-center">
                              <span className="text-vista-light text-[10px] sm:text-sm">
                                {totalMinutes}
                              </span>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={columnName} className="p-1 sm:p-3 text-center">
                            <span className="text-vista-light text-[10px] sm:text-sm">
                              {player[dataKey]} {getMetricUnit(columnName)}
                            </span>
                          </td>
                        );
                      })}
                  </tr>
                ))}
                
                {/* Строка со средними значениями */}
                <tr className="border-t-2 border-vista-secondary/50 bg-vista-dark/30">
                  {profile?.columnMapping
                    ?.filter(col => (col.name || col.internalField) && (col.isVisible !== false))
                    .map(col => {
                      const columnName = col.name || col.internalField || '';
                      
                                               // Для Player показываем заголовок "Средние значения команды"
                         if (columnName === 'Player') {
                           return (
                             <td key={columnName} className="p-1 sm:p-3 text-center">
                               <div className="text-vista-light/70 text-[8px] sm:text-xs font-medium">
                                 Средние значения команды
                               </div>
                             </td>
                           );
                         }
                      
                                               // Для Time показываем среднее время
                         if (columnName === 'Time') {
                           const averageTime = averageValues[columnName] || 0;
                           return (
                             <td key={columnName} className="p-1 sm:p-3 text-center">
                               <div className="text-vista-light/50 text-[10px] sm:text-sm">
                                 {Math.round(averageTime)}
                               </div>
                             </td>
                           );
                         }
                      
                                               // Для остальных числовых метрик показываем средние значения
                         const averageValue = averageValues[columnName] || 0;
                         return (
                           <td key={columnName} className="p-1 sm:p-3 text-center">
                             <div className="text-vista-light/50 text-[10px] sm:text-sm">
                               {averageValue.toLocaleString()}
                             </div>
                           </td>
                         );
                    })}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Плитки игроков */}
      {teamId && profile.id && (
        (() => {
          // Извлекаем время игроков из данных
          const currentMatchMinutes: Record<string, number> = {};
          
          data.forEach(player => {
            const timeValue = player['Time'] || player['time'] || '00:00:00';
            const timeParts = timeValue.split(':');
            const hours = parseInt(timeParts[0]) || 0;
            const minutes = parseInt(timeParts[1]) || 0;
            const seconds = parseInt(timeParts[2]) || 0;
            const totalMinutes = Math.round(hours * 60 + minutes + seconds / 60);
            
            currentMatchMinutes[player.name] = totalMinutes;
          });

          return (
            <PlayerTiles
              gpsData={data}
              teamId={teamId}
              profileId={profile.id}
              currentMatchMinutes={currentMatchMinutes}
              profile={profile}
              isPublic={isPublic}
            />
          );
        })()
      )}

    </div>
  );
} 