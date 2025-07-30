'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Calendar, 
  Users, 
  Target,
  Clock,
  TrendingUp,
  MapPin,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface GpsProfile {
  id: string;
  name: string;
  gpsSystem: string;
  columnMapping: any[];
}

interface GpsReport {
  id: string;
  name: string;
  fileName: string;
  gpsSystem: string;
  eventType: 'TRAINING' | 'MATCH';
  eventId: string;
  teamId: string;
  profileId: string;
  processedData: any[];
  rawData: any[];
  createdAt: string;
  updatedAt: string;
  isProcessed: boolean;
  clubId: string;
  uploadedById: string;
}

interface GpsDataPoint {
  name: string;
  [key: string]: any;
}

export default function PublicGpsReportPage({ params }: { params: { token: string } }) {
  const [report, setReport] = useState<GpsReport | null>(null);
  const [profile, setProfile] = useState<GpsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetchReport();
  }, [params.token]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/gps-reports/${params.token}`);
      
      if (!response.ok) {
        throw new Error('Отчет не найден');
      }
      
      const data = await response.json();
      setReport(data.report);
      setProfile(data.profile);
    } catch (error) {
      console.error('Ошибка при загрузке отчета:', error);
      setError('Не удалось загрузить отчет');
    } finally {
      setLoading(false);
    }
  };

  const transformGpsData = (processedData: any[]): GpsDataPoint[] => {
    if (!processedData || !Array.isArray(processedData)) {
      return [];
    }
    
    return processedData.map((row: any, index: number) => {
      const transformedRow: GpsDataPoint = {
        name: row.name || row.Name || row.NAME || row.playerName || `Неизвестный игрок ${index + 1}`
      };
      
      // Добавляем все остальные поля как есть
      Object.keys(row).forEach(key => {
        if (key !== 'name' && key !== 'Name' && key !== 'NAME' && key !== 'playerName') {
          transformedRow[key] = row[key];
        }
      });
      
      return transformedRow;
    });
  };

  const sortData = (data: GpsDataPoint[], key: string, direction: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aString = String(aValue || '');
      const bString = String(bValue || '');
      
      return direction === 'asc' 
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    });
  };

  const handleSort = (key: string) => {
    const direction = sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!report?.processedData) return [];
    
    const transformedData = transformGpsData(report.processedData);
    
    if (sortConfig) {
      return sortData(transformedData, sortConfig.key, sortConfig.direction);
    }
    
    return transformedData;
  };

  const getAverageValues = () => {
    const data = getSortedData();
    if (data.length === 0) return {};

    const averages: Record<string, number> = {};
    const numericColumns = Object.keys(data[0]).filter(key => 
      key !== 'name' && key !== 'Player' && key !== 'Position' && key !== 'Time'
    );

    numericColumns.forEach(column => {
      const values = data
        .map(row => parseFloat(row[column]))
        .filter(val => !isNaN(val));
      
      if (values.length > 0) {
        averages[column] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });

    return averages;
  };

  const getBarColor = (columnName: string) => {
    const colors: Record<string, string> = {
      'Total distance': 'from-blue-500 to-blue-500/10',
      'Zone 3': 'from-amber-500 to-amber-500/10',
      'Zone 4': 'from-orange-500 to-orange-500/10',
      'Zone 5': 'from-red-500 to-red-500/10',
      'HSR': 'from-purple-500 to-purple-500/10',
      'HSR%': 'from-purple-400 to-purple-400/10',
      'Sprints': 'from-emerald-500 to-emerald-500/10',
      'm/min': 'from-cyan-500 to-cyan-500/10',
      'Acc': 'from-green-500 to-green-500/10',
      'Dec': 'from-green-400 to-green-400/10',
      'Max speed': 'from-rose-500 to-rose-500/10'
    };
    
    return colors[columnName] || 'from-gray-500 to-gray-500/10';
  };

  const getMetricUnit = (columnName: string) => {
    const units: Record<string, string> = {
      'Total distance': 'м',
      'Zone 3': 'м',
      'Zone 4': 'м',
      'Zone 5': 'м',
      'HSR': 'м',
      'HSR%': '%',
      'Sprints': 'шт',
      'm/min': 'м/мин',
      'Acc': 'шт',
      'Dec': 'шт',
      'Max speed': 'км/ч'
    };
    
    return units[columnName] || '';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: ru });
    } catch {
      return 'Дата неизвестна';
    }
  };

  const getEventTypeText = (eventType: string) => {
    return eventType === 'TRAINING' ? 'Тренировка' : 'Матч';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vista-dark flex items-center justify-center">
        <div className="text-vista-light text-lg">Загрузка отчета...</div>
      </div>
    );
  }

  if (error || !report || !profile) {
    return (
      <div className="min-h-screen bg-vista-dark flex items-center justify-center">
        <div className="text-red-400 text-lg">{error || 'Отчет не найден'}</div>
      </div>
    );
  }

  const data = getSortedData();
  const averageValues = getAverageValues();

  return (
    <div className="min-h-screen bg-vista-dark p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-vista-light mb-2">
            GPS Отчет
          </h1>
          <p className="text-vista-light/70">
            {report.name}
          </p>
        </div>

        {/* Информационные блоки */}
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
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Дата события</span>
            </div>
            <p className="text-vista-light font-medium">{formatDate(report.createdAt)}</p>
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
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Команда</span>
            </div>
            <p className="text-vista-light font-medium">
              {report.name.split(' ')[0] || 'Неизвестно'}
            </p>
          </div>
          
          <div className="bg-vista-dark/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-vista-light/60 mb-2">
              <Target className="w-4 h-4" />
              <span className="text-sm">Событие</span>
            </div>
            <p className="text-vista-light font-medium">
              {getEventTypeText(report.eventType)}
            </p>
          </div>
        </div>

        {/* Детальные данные игроков */}
        <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-vista-light">Детальные данные игроков</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-vista-secondary/30">
                    {profile.columnMapping?.map((col: any) => {
                      const columnName = col.name || col.internalField || '';
                      const isNumeric = columnName !== 'Player' && 
                                       columnName !== 'Position' && 
                                       columnName !== 'Time';
                      
                      return (
                        <th 
                          key={columnName}
                          className={`p-3 text-left text-vista-light/70 font-medium ${
                            isNumeric ? 'cursor-pointer hover:text-vista-light transition-colors' : ''
                          }`}
                          onClick={() => isNumeric && handleSort(columnName)}
                        >
                          <div className="flex items-center gap-1">
                            {col.displayName || columnName}
                                                         {isNumeric && sortConfig && sortConfig.key === columnName && (
                               <span className="text-xs">
                                 {sortConfig.direction === 'asc' ? '↑' : '↓'}
                               </span>
                             )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.map((player, index) => (
                    <tr key={index} className="border-b border-vista-secondary/20 hover:bg-vista-dark/30">
                      {profile.columnMapping?.map((col: any) => {
                        const columnName = col.name || col.internalField || '';
                        const value = player[columnName];
                        const isNumeric = !isNaN(value) && value > 0 && 
                                         columnName !== 'Player' && 
                                         columnName !== 'Position' && 
                                         columnName !== 'Time';
                        
                        if (columnName === 'Time') {
                          // Преобразуем время из HH:MM:SS в минуты
                          const timeString = value || '00:00:00';
                          const timeParts = timeString.split(':');
                          const hours = parseInt(timeParts[0]) || 0;
                          const minutes = parseInt(timeParts[1]) || 0;
                          const seconds = parseInt(timeParts[2]) || 0;
                          const totalMinutes = Math.round(hours * 60 + minutes + seconds / 60);
                          
                          return (
                            <td key={columnName} className="p-3 text-center">
                              <span className="text-vista-light">{totalMinutes}</span>
                            </td>
                          );
                        }
                        
                        if (isNumeric) {
                          return (
                            <td key={columnName} className="p-3 text-center">
                              <div className="relative">
                                <div className={`h-8 rounded-md bg-gradient-to-r ${getBarColor(columnName)} flex items-center justify-center`}>
                                  <span className="text-white font-semibold text-sm">
                                    {typeof value === 'number' ? value.toLocaleString() : value}
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={columnName} className="p-3 text-center">
                            <span className="text-vista-light">{value}</span>
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
                    {profile.columnMapping
                      ?.filter((col: any) => {
                        const columnName = col.name || col.internalField || '';
                        return (col.name || col.internalField) && 
                               (col.isVisible !== false) &&
                               columnName !== 'Player' && 
                               columnName !== 'Position' && 
                               columnName !== 'Time';
                      })
                      .map((col: any) => {
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
    </div>
  );
} 