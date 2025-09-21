'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Download, Edit, BarChart3, Users, Calendar, Star, Activity, Tag, ClipboardType, Clock } from 'lucide-react';
import { convertUnit, formatValue, formatValueOnly, getPrecision } from '@/lib/unit-converter';
import { GpsMetricSparkline } from './GpsMetricSparkline';
import { TeamAverageGauges } from './TeamAverageGauges';

// Кастомные иконки
const CircleStarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11.051 7.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.867l-1.156-1.152a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"/>
    <circle cx="12" cy="12" r="10"/>
  </svg>
);

const TrafficConeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16.05 10.966a5 2.5 0 0 1-8.1 0"/>
    <path d="m16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04"/>
    <path d="M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z"/>
    <path d="M9.194 6.57a5 2.5 0 0 0 5.61 0"/>
  </svg>
);

interface GpsProfile {
  id: string;
  name: string;
  columns: GpsProfileColumn[];
}

interface GpsProfileColumn {
  id: string;
  canonicalMetricCode: string;
  displayName: string;
  displayUnit: string;
  displayOrder: number;
  isVisible: boolean;
}

interface GpsReportData {
  id: string;
  playerId: string;
  playerName: string;
  playerData: Record<string, { value: number; unit: string }>;
  isEdited: boolean;
  lastEditedAt: string | null;
}

interface GpsReportVisualizationProps {
  teamId: string;
  eventId: string;
  eventType: 'training' | 'match';
  profileId: string;
}

export function GpsReportVisualization({ teamId, eventId, eventType, profileId }: GpsReportVisualizationProps) {
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<GpsProfile | null>(null);
  const [reportData, setReportData] = useState<GpsReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportInfo, setReportInfo] = useState<any>(null);
  const [eventInfo, setEventInfo] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<Record<string, Record<string, number[]>>>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [teamAverages, setTeamAverages] = useState<{
    currentAverages: Record<string, number>;
    historicalAverages: Record<string, number>;
    metrics: Array<{
      canonicalMetricCode: string;
      displayName: string;
      displayUnit: string;
      canAverage: boolean;
    }>;
    playerCount?: number;
    categoryInfo?: {
      name: string;
      eventCount: number;
      reportCount: number;
      type?: 'training' | 'match';
    };
  } | null>(null);
  const [teamAveragesLoading, setTeamAveragesLoading] = useState(false);

  useEffect(() => {
    if (teamId && eventId) {
      loadReportData();
    }
  }, [teamId, eventId, profileId]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      console.log('Loading report data for:', { teamId, eventId, eventType, profileId });
      
      // Загружаем выбранный профиль
      const profileResponse = await fetch(`/api/gps/profiles/${profileId}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('Profile loaded:', profileData);
        if (profileData.profile) {
          setProfile(profileData.profile);
        }
      }

      // Загружаем данные отчета
      const reportResponse = await fetch(`/api/gps/reports?teamId=${teamId}&eventId=${eventId}&eventType=${eventType}`);
      if (reportResponse.ok) {
        const reportsData = await reportResponse.json();
        console.log('Reports loaded:', reportsData);
        if (reportsData.reports && reportsData.reports.length > 0) {
          const report = reportsData.reports[0];
          setReportInfo(report);
          
          // Загружаем данные игроков для визуализации с profileId
          const dataResponse = await fetch(`/api/gps/reports/${report.id}/visualization?profileId=${profileId}`);
          if (dataResponse.ok) {
            const data = await dataResponse.json();
            console.log('Visualization data loaded:', data);
            setReportData(data.data || []);
            
            // Обновляем профиль из ответа API
            if (data.profile) {
              setProfile(data.profile);
            }
            
            // Обновляем информацию о событии
            if (data.event) {
              console.log('Event info loaded:', data.event);
              setEventInfo(data.event);
            }
            
            // Загружаем исторические данные для каждого игрока и метрики
            await loadHistoricalData(data.data || []);
            
            // Загружаем данные для спидометров (для тренировок и матчей)
            await loadTeamAverages(report.id);
          } else {
            console.error('Failed to load visualization data:', dataResponse.status, dataResponse.statusText);
          }
        } else {
          console.log('No reports found for the selected criteria');
        }
      } else {
        console.error('Failed to load reports:', reportResponse.status, reportResponse.statusText);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные отчета',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamAverages = async (reportId: string) => {
    try {
      setTeamAveragesLoading(true);
      
      const response = await fetch(`/api/gps/reports/${reportId}/team-averages?profileId=${profileId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Team averages loaded:', data);
        setTeamAverages(data);
      } else {
        console.error('Failed to load team averages:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading team averages:', error);
    } finally {
      setTeamAveragesLoading(false);
    }
  };

  const loadHistoricalData = async (players: GpsReportData[]) => {
    if (!profile) return;

    const historicalDataMap: Record<string, Record<string, number[]>> = {};

    // Загружаем исторические данные для каждого игрока и каждой метрики
    for (const player of players) {
      historicalDataMap[player.playerId] = {};
      
      for (const column of profile.columns) {
        if (column.canonicalMetricCode === 'athlete_name' || !column.isVisible) continue;
        
        try {
          const response = await fetch(
            `/api/gps/players/${player.playerId}/metrics/${column.canonicalMetricCode}/history?eventType=${eventType}&days=30`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // Берем последние 5 значений для графика
              const values = data.data
                .slice(0, 5)
                .map((item: any) => item.value)
                .reverse(); // Обращаем порядок для хронологического отображения
              
              historicalDataMap[player.playerId][column.canonicalMetricCode] = values;
            }
          }
        } catch (error) {
          console.error(`Error loading historical data for player ${player.playerId}, metric ${column.canonicalMetricCode}:`, error);
        }
      }
    }

    setHistoricalData(historicalDataMap);
  };

  const convertAndFormatValue = (value: number, fromUnit: string, toUnit: string): string => {
    // Проверяем, что значение валидное
    if (value === null || value === undefined || isNaN(value)) {
      return `— ${toUnit}`;
    }
    
    const convertedValue = convertUnit(value, fromUnit, toUnit);
    
    // Проверяем результат конвертации
    if (convertedValue === null || convertedValue === undefined || (typeof convertedValue === 'number' && isNaN(convertedValue))) {
      return `— ${toUnit}`;
    }
    
    const precision = getPrecision(toUnit);
    return formatValue(convertedValue, toUnit, precision);
  };

  const getVisibleColumns = () => {
    if (!profile) return [];
    
    const columns = profile.columns
      .filter(col => col.isVisible)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    
    return columns;
  };

  const getPlayerNameColumnWidth = () => {
    if (reportData.length === 0) return 220; // Минимальная ширина по умолчанию
    
    // Находим максимальную длину имени
    const maxLength = Math.max(...reportData.map(player => player.playerName.length));
    
    // Вычисляем ширину на основе длины текста (примерно 8px на символ + отступы)
    const calculatedWidth = Math.max(maxLength * 8 + 40, 150); // Минимум 150px, максимум 300px
    return Math.min(calculatedWidth, 300);
  };

  const getPlayerMetricValue = (playerData: GpsReportData, metricCode: string, displayUnit: string) => {
    const metric = playerData.playerData[metricCode];
    if (!metric) {
      console.log(`Metric ${metricCode} not found for player ${playerData.playerName}. Available metrics:`, Object.keys(playerData.playerData));
      return '-';
    }
    
    // Для строковых метрик возвращаем значение как есть
    if (metricCode === 'athlete_name' || metricCode === 'position') {
      return metric.value || '-';
    }
    
    // Для числовых метрик форматируем только значение без единиц измерения
    const precision = getPrecision(displayUnit);
    return formatValueOnly(metric.value, precision);
  };

  const getColumnValues = (metricCode: string) => {
    return reportData
      .map(player => {
        const metric = player.playerData[metricCode];
        if (!metric || metricCode === 'athlete_name' || metricCode === 'position') {
          return null;
        }
        return parseFloat(metric.value);
      })
      .filter(value => value !== null && !isNaN(value)) as number[];
  };

  const handleSort = (columnCode: string) => {
    if (sortColumn === columnCode) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnCode);
      setSortDirection('asc');
    }
  };

  const getSortedData = () => {
    if (!sortColumn) return reportData;

    return [...reportData].sort((a, b) => {
      const aValue = a.playerData[sortColumn]?.value;
      const bValue = b.playerData[sortColumn]?.value;

      // Для строковых значений (athlete_name, position)
      if (sortColumn === 'athlete_name' || sortColumn === 'position') {
        const aStr = String(aValue || '');
        const bStr = String(bValue || '');
        return sortDirection === 'asc' 
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }

      // Для числовых значений
      const aNum = parseFloat(aValue || '0');
      const bNum = parseFloat(bValue || '0');
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-vista-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Профиль не найден</h3>
          <p className="text-muted-foreground mb-4">
            Для этой команды не настроен профиль визуализации GPS данных
          </p>
          <Button variant="outline">
            Настроить профиль
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (reportData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Данные не найдены</h3>
          <p className="text-muted-foreground">
            Для выбранного события нет GPS данных
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleColumns = getVisibleColumns();

  // Отладка видимых колонок
  console.log('Visible columns:', visibleColumns.map(col => ({ 
    code: col.canonicalMetricCode, 
    name: col.displayName, 
    unit: col.displayUnit 
  })));
  
  // Проверяем, есть ли position и duration в профиле
  const hasPositionInProfile = visibleColumns.some(col => col.canonicalMetricCode === 'position');
  const hasDurationInProfile = visibleColumns.some(col => col.canonicalMetricCode === 'duration');
  console.log('Profile has position:', hasPositionInProfile, 'Profile has duration:', hasDurationInProfile);

  return (
    <div className="space-y-6">
      {/* Информация о событии */}
      {reportInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Дата и время события */}
          <div className="bg-vista-dark/50 border border-vista-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-vista-primary/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-vista-primary" />
              </div>
              <div>
                <p className="text-xs text-vista-light/70 mb-1">Дата и время</p>
                <p className="text-sm font-medium text-vista-light">
                  {eventInfo && eventInfo.date && eventInfo.time 
                    ? `${new Date(eventInfo.date).toLocaleDateString('ru-RU')} • ${eventInfo.time}`
                    : `${new Date(reportInfo.createdAt).toLocaleDateString('ru-RU')} • ${new Date(reportInfo.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
            </div>
          </div>
          
          {/* Тип события */}
          <div className="bg-vista-dark/50 border border-vista-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-vista-primary/20 rounded-lg flex items-center justify-center">
                {eventType === 'training' ? (
                  <TrafficConeIcon className="h-4 w-4 text-vista-primary" />
                ) : (
                  <CircleStarIcon className="h-4 w-4 text-vista-primary" />
                )}
              </div>
              <div>
                <p className="text-xs text-vista-light/70 mb-1">Тип события</p>
                <p className="text-sm font-medium text-vista-light">
                  {eventType === 'training' ? 'Тренировка' : 'Матч'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Третья карточка - зависит от типа события */}
          <div className="bg-vista-dark/50 border border-vista-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-vista-primary/20 rounded-lg flex items-center justify-center">
                <Tag className="h-4 w-4 text-vista-primary" />
              </div>
              <div>
                <p className="text-xs text-vista-light/70 mb-1">
                  {eventType === 'training' ? 'Категория тренировки' : 'Тип соревнования'}
                </p>
                <p className="text-sm font-medium text-vista-light">
                  {eventType === 'training' 
                    ? (eventInfo?.categoryName || 'Не указана')
                    : (eventInfo?.competitionType === 'FRIENDLY' ? 'Товарищеский' : 
                       eventInfo?.competitionType === 'LEAGUE' ? 'Лига' : 
                       eventInfo?.competitionType === 'CUP' ? 'Кубок' : 
                       eventInfo?.competitionType || 'Не указан')
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Четвертая карточка - зависит от типа события */}
          <div className="bg-vista-dark/50 border border-vista-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-vista-primary/20 rounded-lg flex items-center justify-center">
                <ClipboardType className="h-4 w-4 text-vista-primary" />
              </div>
              <div>
                <p className="text-xs text-vista-light/70 mb-1">
                  {eventType === 'training' ? 'Название тренировки' : 'Информация о матче'}
                </p>
                <p className="text-sm font-medium text-vista-light">
                  {eventType === 'training' 
                    ? (eventInfo?.title || reportInfo.name)
                    : (() => {
                        const homeTeam = eventInfo?.isHome ? eventInfo?.teamName : eventInfo?.opponentName;
                        const awayTeam = eventInfo?.isHome ? eventInfo?.opponentName : eventInfo?.teamName;
                        const homeGoals = eventInfo?.isHome ? eventInfo?.teamGoals : eventInfo?.opponentGoals;
                        const awayGoals = eventInfo?.isHome ? eventInfo?.opponentGoals : eventInfo?.teamGoals;
                        
                        return `${homeTeam || 'Команда'} ${homeGoals ?? 0} - ${awayGoals ?? 0} ${awayTeam || 'Соперник'}`;
                      })()
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Таблица с данными */}
      <Card className="bg-vista-dark/50 border-vista-secondary/30 shadow-none hover:shadow-none">
        <CardContent className="p-0">
          <div className="w-full overflow-hidden">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="border-b border-vista-secondary/20 hover:bg-transparent">
                  {visibleColumns.map((column) => {
                    const playerNameColumnWidth = getPlayerNameColumnWidth();
                    return (
                        <TableHead 
                          key={column.id} 
                          className={`text-center text-vista-light/70 font-normal text-xs py-3 px-2 cursor-pointer transition-colors hover:!bg-transparent`}
                          style={{
                            width: column.canonicalMetricCode === 'athlete_name' 
                              ? `${playerNameColumnWidth}px` 
                              : `${100 / (visibleColumns.length - 1)}%`
                          }}
                          onClick={() => handleSort(column.canonicalMetricCode)}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-medium">{column.displayName}</span>
                              {sortColumn === column.canonicalMetricCode && (
                                <span className="text-xs">
                                  {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                            {column.canonicalMetricCode !== 'athlete_name' && (
                              <span className="text-xs text-vista-light/30 mt-1">
                                {column.canonicalMetricCode === 'position' ? '' : column.displayUnit}
                              </span>
                            )}
                          </div>
                        </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedData().map((player) => {
                  const playerNameColumnWidth = getPlayerNameColumnWidth();
                  return (
                    <TableRow key={player.id} className="border-b border-vista-secondary/10 hover:bg-vista-dark/30">
                      {visibleColumns.map((column) => {
                        const value = getPlayerMetricValue(player, column.canonicalMetricCode, column.displayUnit);
                        const hasData = value !== '-';
                        
                        // Получаем числовое значение для графика
                        const numericValue = hasData ? parseFloat(value.replace(/[^\d.-]/g, '')) : 0;
                        
                        // Получаем все значения в колонке для нормализации
                        const columnValues = getColumnValues(column.canonicalMetricCode);
                        
                        // Получаем исторические данные для этого игрока и метрики
                        const playerHistoricalData = historicalData[player.playerId]?.[column.canonicalMetricCode] || [];
                        
                        return (
                          <TableCell 
                            key={column.id} 
                            className={`py-3 px-2 ${
                              column.canonicalMetricCode === 'athlete_name' ? 'text-left' : 'text-center'
                            }`}
                            style={{
                              width: column.canonicalMetricCode === 'athlete_name' 
                                ? `${playerNameColumnWidth}px` 
                                : `${100 / (visibleColumns.length - 1)}%`,
                              maxWidth: column.canonicalMetricCode === 'athlete_name' 
                                ? `${playerNameColumnWidth}px` 
                                : `${100 / (visibleColumns.length - 1)}%`,
                              overflow: 'hidden'
                            }}
                          >
                          {column.canonicalMetricCode === 'athlete_name' ? (
                            <span className="text-vista-light/90 font-medium truncate block max-w-full">
                              {player.playerName}
                            </span>
                          ) : hasData ? (
                            column.canonicalMetricCode === 'position' || column.canonicalMetricCode === 'duration' || column.canonicalMetricCode === 'time_on_field' ? (
                              <span className="text-vista-light/90 font-medium text-sm">
                                {value}
                              </span>
                            ) : (
                              <div className="flex items-center justify-center w-full h-full">
                                <div className="relative flex items-center justify-center">
                                  <GpsMetricSparkline
                                    value={numericValue}
                                    unit={column.displayUnit}
                                    historicalData={columnValues}
                                    width={70}
                                    height={28}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-xs text-vista-light/90 font-medium z-10">
                                    {value}
                                  </span>
                                </div>
                              </div>
                            )
                          ) : (
                            <span className="text-vista-light/50 text-sm">-</span>
                          )}
                        </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Блок со спидометрами (для тренировок и матчей) */}
      {teamAverages && (
        <TeamAverageGauges
          currentAverages={teamAverages.currentAverages}
          historicalAverages={teamAverages.historicalAverages}
          metrics={teamAverages.metrics}
          playerCount={teamAverages.playerCount}
          categoryInfo={teamAverages.categoryInfo}
          isLoading={teamAveragesLoading}
        />
      )}

    </div>
  );
}

export default GpsReportVisualization;
