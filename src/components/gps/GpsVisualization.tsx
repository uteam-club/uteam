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

export default function GpsVisualization({ data, profile, eventName, eventDate, teamName, reportId }: GpsVisualizationProps) {
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

  // 🔍 КРИТИЧЕСКАЯ ОТЛАДКА: Проверяем только данные и маппинг
  console.log('🔍 КРИТИЧЕСКАЯ ОТЛАДКА:', {
    dataLength: data.length,
    firstDataKeys: data[0] ? Object.keys(data[0]) : [],
    firstDataValues: data[0] ? Object.entries(data[0]).slice(0, 5).map(([key, value]) => `${key}: ${value}`) : [],
    profileName: profile?.name,
    columnMappingLength: profile?.columnMapping?.length,
    ALL_KEYS: data[0] ? Object.keys(data[0]) : []
  });
  
  // 🔍 РАЗВЕРНУТЫЕ ДАННЫЕ
  if (data[0]) {
    console.log('🔍 РАЗВЕРНУТЫЕ ДАННЫЕ:', JSON.stringify(data[0], null, 2));
  }
  
  // 🔍 МАППИНГ КОЛОНОК В ПРОФИЛЕ
  if (profile?.columnMapping) {
    console.log('🔍 МАППИНГ КОЛОНОК:', JSON.stringify(profile.columnMapping, null, 2));
  }

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
      const isNotPlayerName = !(col.name === 'Player' || col.name === 'name' || col.internalField === 'name' || 
                               (col.displayName && col.displayName.toLowerCase().includes('игрок')));
      
      // Исключаем Time из числовых метрик, так как это строка времени
      const isNotTime = !(col.name === 'Time' || col.internalField === 'Time' || 
                         (col.displayName && col.displayName.toLowerCase().includes('время')));
      
      return isNumeric && isVisible && hasName && isNotPlayerName && isNotTime;
    });

    const result = filteredMetrics.map(col => {
      const key = col.name || col.internalField || '';
      const displayName = col.displayName || col.mappedColumn || col.name || col.internalField || '';
      
      return {
        key,
        label: displayName,
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
    if (!field) return 'from-slate-400 to-slate-400/10';
    
    const lowerField = field.toLowerCase();
    if (lowerField.includes('distance') || lowerField.includes('total')) return 'from-blue-400 to-blue-400/10';
    if (lowerField.includes('zone3')) return 'from-amber-400 to-amber-400/10';
    if (lowerField.includes('zone4')) return 'from-orange-400 to-orange-400/10';
    if (lowerField.includes('zone5')) return 'from-red-400 to-red-400/10';
    if (lowerField.includes('zone')) return 'from-orange-400 to-orange-400/10';
    if (lowerField.includes('sprint')) return 'from-emerald-400 to-emerald-400/10';
    if (lowerField.includes('speed')) return 'from-rose-400 to-rose-400/10';
    if (lowerField.includes('acc')) return 'from-teal-400 to-teal-400/10';
    if (lowerField.includes('dec')) return 'from-cyan-400 to-cyan-400/10';
    if (lowerField.includes('hsr')) return 'from-indigo-400 to-indigo-400/10';
    if (lowerField.includes('m/min')) return 'from-sky-400 to-sky-400/10';
    return 'from-slate-400 to-slate-400/10';
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
    const dataKey = (columnName === 'Player') ? 'name' : columnName;
    
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
      if (columnName !== 'Player' && columnName !== 'Position' && columnName !== 'Time') {
        const dataKey = col.name || col.internalField || columnName;
        const values = data.map(player => parseFloat(player[dataKey]) || 0);
        const sum = values.reduce((acc, val) => acc + val, 0);
        averages[columnName] = Math.round((sum / values.length) * 100) / 100;
      }
    });
    
    return averages;
  }, [data, profile]);

  const selectedMetricData = metrics.find(m => m.key === selectedMetric);

  const averageMetrics = useMemo(() => {
    if (!data.length || !profile?.columnMapping) return null;
    
    const numericFields = profile.columnMapping
      .filter(col => (col.name || col.internalField) && col.dataType === 'number' && col.isVisible)
      .map(col => col.name || col.internalField || '');

    const totals = data.reduce((acc, item) => {
      numericFields.forEach(field => {
        if (!acc[field]) acc[field] = 0;
        acc[field] += parseFloat(item[field] || 0);
      });
      return acc;
    }, {} as { [key: string]: number });

    const averages: { [key: string]: number } = {};
    numericFields.forEach(field => {
      averages[field] = Math.round((totals[field] / data.length) * 100) / 100;
    });

    return averages;
  }, [data, profile]);

  const zoneData = useMemo(() => {
    if (!averageMetrics || !profile?.columnMapping) return [];
    
    const zoneFields = profile.columnMapping
      .filter(col => (col.name || col.internalField) && (col.name || col.internalField)?.toLowerCase().includes('zone') && col.isVisible)
      .slice(0, 3); // Берем только первые 3 зоны
    
    return zoneFields.map((col, index) => {
      const fieldName = col.name || col.internalField || '';
      return {
        name: col.displayName || fieldName || 'Неизвестная зона',
        value: averageMetrics[fieldName] || 0,
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
        metric: col?.displayName || field,
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-vista-dark/30 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-vista-light/60 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm">GPS профиль</span>
          </div>
          <p className="text-vista-light font-medium">{profile.name}</p>
        </div>
        
        <div className="bg-vista-dark/30 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-vista-light/60 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Дата события</span>
          </div>
          <p className="text-vista-light font-medium">
            {new Date(eventDate).toLocaleDateString()}
          </p>
        </div>
        
        <div className="bg-vista-dark/30 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-vista-light/60 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Игроков</span>
          </div>
          <p className="text-vista-light font-medium">{data.length}</p>
        </div>
        
        <div className="bg-vista-dark/30 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-vista-light/60 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Команда</span>
          </div>
          <p className="text-vista-light font-medium">
            {teamName || 'Неизвестно'}
          </p>
        </div>
        
        <div className="bg-vista-dark/30 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-vista-light/60 mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm">Событие</span>
          </div>
          <p className="text-vista-light font-medium">
            {eventName.toLowerCase().includes('тренировка') ? 'Тренировка' : 
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
            <table className="w-full text-sm">
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
                          className="text-center p-3 text-vista-light/70 font-medium cursor-pointer hover:bg-vista-dark/30 transition-colors"
                          onClick={() => handleSort(columnName)}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{col.displayName || columnName}</span>
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
                        const dataKey = (col.name === 'Player' || col.internalField === 'Player') ? 'name' : (col.name || col.internalField || columnName);
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
                            <td key={columnName} className="p-3">
                              <div className="relative">
                                <div className="w-full rounded-md h-8 relative overflow-hidden">
                                  <div 
                                    className={`h-8 rounded-md transition-all duration-300 bg-gradient-to-r ${getBarColor(columnName)} flex items-center justify-between px-3`}
                                    style={{ width: `${percentage}%` }}
                                  >
                                    <span className="text-white text-xs font-medium">
                                      {value.toLocaleString()}
                                    </span>
                                    <span className="text-white/80 text-xs">
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
                            <td key={columnName} className="p-3 text-center">
                              <span className="text-vista-light">
                                {totalMinutes}
                              </span>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={columnName} className="p-3 text-center">
                            <span className="text-vista-light">
                              {player[dataKey]} {getMetricUnit(columnName)}
                            </span>
                          </td>
                        );
                      })}
                  </tr>
                ))}
                
                {/* Строка со средними значениями */}
                <tr className="border-t-2 border-vista-secondary/50 bg-vista-dark/30">
                  {/* Объединенная ячейка для заголовка */}
                  <td colSpan={3} className="p-3 text-center">
                    <div className="text-vista-light/70 text-xs font-medium">
                      Средние значения команды
                    </div>
                  </td>
                  
                  {/* Средние значения для числовых метрик */}
                  {profile?.columnMapping
                    ?.filter(col => {
                      const columnName = col.name || col.internalField || '';
                      return (col.name || col.internalField) && 
                             (col.isVisible !== false) &&
                             columnName !== 'Player' && 
                             columnName !== 'Position' && 
                             columnName !== 'Time';
                    })
                    .map(col => {
                      const columnName = col.name || col.internalField || '';
                      const averageValue = averageValues[columnName] || 0;
                      
                      return (
                        <td key={columnName} className="p-3 text-center">
                          <div className="text-vista-light/50 text-sm">
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



    </div>
  );
} 