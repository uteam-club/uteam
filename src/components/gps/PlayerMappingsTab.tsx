'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileText, AlertCircle } from 'lucide-react';
import { GpsReport } from '@/types/gps';
import { useClub } from '@/providers/club-provider';
import { toast } from '@/components/ui/use-toast';
import { fetchGpsReports } from '@/lib/gps-api';
import PlayerMappingModal from './PlayerMappingModal';

export default function PlayerMappingsTab() {
  const { club } = useClub();
  const [reports, setReports] = useState<GpsReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<GpsReport | null>(null);

  const loadReports = async () => {
    if (!club?.id) return;
    
    setLoading(true);
    try {
      const data = await fetchGpsReports(club.id);
      setReports(data);
    } catch (error) {
      console.error('Error loading GPS reports:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить GPS отчеты',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [club?.id]);

  const handleMapPlayers = (report: GpsReport) => {
    setSelectedReport(report);
    setShowMappingModal(true);
  };

  const handleMappingCompleted = () => {
    setShowMappingModal(false);
    loadReports();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="secondary">Загружен</Badge>;
      case 'processed':
        return <Badge variant="default">Обработан</Badge>;
      case 'error':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportType = (report: GpsReport) => {
    if (report.trainingId) return 'Тренировка';
    if (report.matchId) return 'Матч';
    return 'Общий';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-vista-light">Маппинги игроков</h3>
          <p className="text-sm text-vista-light/70">
            Настраивайте маппинги игроков для загруженных GPS отчетов
          </p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-vista-secondary/50 shadow-md rounded-md">
          <FileText className="h-12 w-12 text-vista-light/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-vista-light">Нет GPS отчетов</h3>
          <p className="text-vista-light/60 text-center">
            Загрузите GPS отчеты на вкладке &quot;Анализ&quot; для настройки маппингов
          </p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-vista-dark/30 border-vista-secondary/50">
            <TabsTrigger 
              value="all"
              className="data-[state=active]:bg-vista-primary/20 data-[state=active]:text-vista-primary data-[state=active]:border-vista-primary/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20"
            >
              Все отчеты
            </TabsTrigger>
            <TabsTrigger 
              value="uploaded"
              className="data-[state=active]:bg-vista-primary/20 data-[state=active]:text-vista-primary data-[state=active]:border-vista-primary/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20"
            >
              Загружены
            </TabsTrigger>
            <TabsTrigger 
              value="processed"
              className="data-[state=active]:bg-vista-primary/20 data-[state=active]:text-vista-primary data-[state=active]:border-vista-primary/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20"
            >
              Обработаны
            </TabsTrigger>
            <TabsTrigger 
              value="error"
              className="data-[state=active]:bg-vista-primary/20 data-[state=active]:text-vista-primary data-[state=active]:border-vista-primary/30 text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20"
            >
              Ошибки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <ReportsList 
              reports={reports} 
              onMapPlayers={handleMapPlayers}
            />
          </TabsContent>

          <TabsContent value="uploaded" className="space-y-4">
            <ReportsList 
              reports={reports.filter(r => r.status === 'uploaded')} 
              onMapPlayers={handleMapPlayers}
            />
          </TabsContent>

          <TabsContent value="processed" className="space-y-4">
            <ReportsList 
              reports={reports.filter(r => r.status === 'processed')} 
              onMapPlayers={handleMapPlayers}
            />
          </TabsContent>

          <TabsContent value="error" className="space-y-4">
            <ReportsList 
              reports={reports.filter(r => r.status === 'error')} 
              onMapPlayers={handleMapPlayers}
            />
          </TabsContent>
        </Tabs>
      )}

      {showMappingModal && selectedReport && (
        <PlayerMappingModal
          open={showMappingModal}
          onOpenChange={setShowMappingModal}
          report={selectedReport}
          onMappingCompleted={handleMappingCompleted}
        />
      )}
    </div>
  );
}

interface ReportsListProps {
  reports: GpsReport[];
  onMapPlayers: (report: GpsReport) => void;
}

function ReportsList({ reports, onMapPlayers }: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-vista-secondary/50 shadow-md rounded-md">
        <AlertCircle className="h-8 w-8 text-vista-light/30 mx-auto mb-2" />
        <p className="text-vista-light/60">Нет отчетов в этой категории</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div 
          key={report.id} 
          className="rounded-lg border border-vista-secondary/50 bg-vista-dark/70 hover:bg-vista-dark/90 transition-all overflow-hidden flex flex-col shadow-md hover:shadow-xl"
        >
          <div className="p-5 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-vista-light">{report.name}</h4>
                  {getStatusBadge(report.status)}
                  <Badge className="bg-vista-secondary/20 text-vista-light border border-vista-secondary/50 shadow-md font-normal text-xs">
                    {getReportType(report)}
                  </Badge>
                </div>
                <div className="text-sm text-vista-light/70 space-y-1">
                  <div>Файл: {report.fileName}</div>
                  <div>Создан: {new Date(report.createdAt).toLocaleDateString('ru-RU')}</div>
                  {report.errorMessage && (
                    <div className="text-red-400">
                      Ошибка: {report.errorMessage}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {report.status === 'uploaded' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMapPlayers(report)}
                    className="bg-vista-dark/30 backdrop-blur-sm border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-8 px-3 font-normal text-xs shadow-lg"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Настроить игроков
                  </Button>
                )}
                {report.status === 'processed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMapPlayers(report)}
                    className="bg-vista-dark/30 backdrop-blur-sm border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-8 px-3 font-normal text-xs shadow-lg"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Изменить маппинг
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'uploaded':
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-normal text-xs">Загружен</Badge>;
    case 'processed':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-normal text-xs">Обработан</Badge>;
    case 'error':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-normal text-xs">Ошибка</Badge>;
    default:
      return <Badge className="bg-vista-secondary/20 text-vista-light border-vista-secondary/50 font-normal text-xs">{status}</Badge>;
  }
}

function getReportType(report: GpsReport) {
  if (report.trainingId) return 'Тренировка';
  if (report.matchId) return 'Матч';
  return 'Общий';
}
