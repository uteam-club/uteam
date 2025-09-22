'use client';

import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Download, Edit, BarChart3, Users, Calendar, Star, Activity, Tag, ClipboardType, Clock } from 'lucide-react';
import { convertUnit, formatValue, formatValueOnly, getPrecision } from '@/lib/unit-converter';
import { gpsLogger } from '@/lib/logger';
import { GpsMetricSparkline } from './GpsMetricSparkline';
import { TeamAverageGauges } from './TeamAverageGauges';
import { PlayerGameModels } from './PlayerGameModels';

// Мемоизированные компоненты для оптимизации
const MetricSparklineMemo = memo(GpsMetricSparkline);
const TeamAverageGaugesMemo = memo(TeamAverageGauges);
const PlayerGameModelsMemo = memo(PlayerGameModels);

// Мемоизированная строка таблицы
const TableRowMemo = memo(({ 
  player, 
  columns, 
  onEdit 
}: { 
  player: any; 
  columns: any[]; 
  onEdit: (playerId: string) => void;
}) => {
  const handleEdit = useCallback(() => {
    onEdit(player.playerId);
  }, [player.playerId, onEdit]);

  return (
    <TableRow key={player.playerId} className="hover:bg-vista-secondary/10">
      <TableCell className="font-medium text-vista-light">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-vista-primary/20 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-vista-primary">
              {player.jerseyNumber || '?'}
            </span>
          </div>
          <div>
            <div className="font-medium">{player.playerName}</div>
            <div className="text-xs text-vista-light/60">{player.position}</div>
          </div>
        </div>
      </TableCell>
      {columns.map((column) => {
        const value = player.metrics[column.canonicalMetricCode] || 0;
        const convertedValue = convertUnit(value, column.canonicalUnit, column.displayUnit);
        const formattedValue = formatValue(convertedValue, column.displayUnit, getPrecision(column.displayUnit));
        
        return (
          <TableCell key={column.id} className="text-center text-vista-light">
            <div className="flex flex-col items-center gap-1">
              <span className="font-medium">{formattedValue}</span>
              <MetricSparklineMemo
                playerId={player.playerId}
                metricCode={column.canonicalMetricCode}
                displayUnit={column.displayUnit}
                className="w-16 h-6"
              />
            </div>
          </TableCell>
        );
      })}
      <TableCell className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="text-vista-primary hover:text-vista-primary/80"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});

TableRowMemo.displayName = 'TableRowMemo';

// Мемоизированный заголовок таблицы
const TableHeaderMemo = memo(({ columns }: { columns: any[] }) => (
  <TableHeader>
    <TableRow>
      <TableHead className="text-vista-light/80 font-medium">Игрок</TableHead>
      {columns.map((column) => (
        <TableHead key={column.id} className="text-center text-vista-light/80 font-medium">
          <div className="flex flex-col items-center gap-1">
            <span>{column.displayName}</span>
            <Badge variant="outline" className="text-xs">
              {column.displayUnit}
            </Badge>
          </div>
        </TableHead>
      ))}
      <TableHead className="text-center text-vista-light/80 font-medium">Действия</TableHead>
    </TableRow>
  </TableHeader>
));

TableHeaderMemo.displayName = 'TableHeaderMemo';

interface GpsReportVisualizationOptimizedProps {
  reportId: string;
  profileId: string;
  onEditPlayer?: (playerId: string) => void;
}

export const GpsReportVisualizationOptimized = memo(({ 
  reportId, 
  profileId, 
  onEditPlayer 
}: GpsReportVisualizationOptimizedProps) => {
  const { toast } = useToast();
  const [reportData, setReportData] = useState<any>(null);
  const [teamAverages, setTeamAverages] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [teamAveragesLoading, setTeamAveragesLoading] = useState(false);

  // Мемоизированные колонки профиля
  const profileColumns = useMemo(() => {
    if (!reportData?.profile?.columns) return [];
    return reportData.profile.columns.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
  }, [reportData?.profile?.columns]);

  // Мемоизированные данные игроков
  const playersData = useMemo(() => {
    if (!reportData?.players) return [];
    
    return reportData.players.map((player: any) => {
      const playerMetrics = reportData.reportData
        .filter((row: any) => row.playerId === player.playerId)
        .reduce((acc: any, row: any) => {
          acc[row.canonicalMetricCode] = parseFloat(row.value) || 0;
          return acc;
        }, {});

      return {
        ...player,
        metrics: playerMetrics
      };
    });
  }, [reportData?.players, reportData?.reportData]);

  // Мемоизированные обработчики
  const handleEditPlayer = useCallback((playerId: string) => {
    onEditPlayer?.(playerId);
  }, [onEditPlayer]);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [reportResponse, dataResponse] = await Promise.all([
        fetch(`/api/gps/reports/${reportId}`),
        fetch(`/api/gps/reports/${reportId}/visualization?profileId=${profileId}`)
      ]);

      if (reportResponse.ok && dataResponse.ok) {
        const [reportData, dataData] = await Promise.all([
          reportResponse.json(),
          dataResponse.json()
        ]);
        
        setReportData(dataData);
      } else {
        gpsLogger.error('GpsReportVisualization', 'Failed to load visualization data:', {
          reportStatus: reportResponse.status,
          dataStatus: dataResponse.status
        });
      }
    } catch (error) {
      gpsLogger.error('GpsReportVisualization', 'Error loading report data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные отчета',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [reportId, profileId, toast]);

  const loadTeamAverages = useCallback(async () => {
    try {
      setTeamAveragesLoading(true);
      
      const response = await fetch(`/api/gps/reports/${reportId}/team-averages?profileId=${profileId}`);
      if (response.ok) {
        const data = await response.json();
        setTeamAverages(data);
      } else {
        gpsLogger.error('GpsReportVisualization', 'Failed to load team averages:', response.status);
      }
    } catch (error) {
      gpsLogger.error('GpsReportVisualization', 'Error loading team averages:', error);
    } finally {
      setTeamAveragesLoading(false);
    }
  }, [reportId, profileId]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  useEffect(() => {
    if (reportData) {
      loadTeamAverages();
    }
  }, [reportData, loadTeamAverages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center text-vista-light/60 py-8">
        Не удалось загрузить данные отчета
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок отчета */}
      <Card className="bg-vista-dark border-vista-secondary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-vista-light flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {reportData.report?.name || 'GPS Отчет'}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-vista-light/60">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {reportData.report?.playersCount || 0} игроков
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(reportData.report?.createdAt).toLocaleDateString('ru-RU')}
                </div>
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  {reportData.report?.gpsSystem || 'Unknown'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-vista-light border-vista-secondary/30">
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Командные средние */}
      {teamAverages && (
        <TeamAverageGaugesMemo
          averages={teamAverages.averages}
          loading={teamAveragesLoading}
        />
      )}

      {/* Таблица данных игроков */}
      <Card className="bg-vista-dark border-vista-secondary/30">
        <CardHeader>
          <CardTitle className="text-vista-light flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Данные игроков
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeaderMemo columns={profileColumns} />
              <TableBody>
                {playersData.map((player) => (
                  <TableRowMemo
                    key={player.playerId}
                    player={player}
                    columns={profileColumns}
                    onEdit={handleEditPlayer}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Игровые модели */}
      {reportData && (
        <PlayerGameModelsMemo
          reportId={reportId}
          profileId={profileId}
        />
      )}
    </div>
  );
});

GpsReportVisualizationOptimized.displayName = 'GpsReportVisualizationOptimized';
