'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, FileText, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import GpsVisualization from './GpsVisualization';

interface GpsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  matchName?: string;
  matchDate?: string;
  teamId?: string;
  teamName?: string;
}

interface GpsReport {
  id: string;
  name: string;
  processedData: any[];
  profileId: string;
  eventType: string;
  createdAt: string;
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

export default function GpsReportModal({ 
  isOpen, 
  onClose, 
  matchId, 
  matchName = 'Матч',
  matchDate = '',
  teamId = '',
  teamName = ''
}: GpsReportModalProps) {
  const { t } = useTranslation();
  const [report, setReport] = useState<GpsReport | null>(null);
  const [profile, setProfile] = useState<GpsProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && matchId) {
      fetchGpsReport();
    }
  }, [isOpen, matchId]);

  const fetchGpsReport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Получаем GPS отчет для данного матча
      const response = await fetch(`/api/gps-reports?eventId=${matchId}&eventType=MATCH`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить GPS отчет');
      }

      const reports = await response.json();
      
      if (reports.length === 0) {
        setReport(null);
        setProfile(null);
        return;
      }

      const gpsReport = reports[0]; // Берем первый отчет
      setReport(gpsReport);

      // Получаем профиль для отчета
      if (gpsReport.profileId) {
        const profileResponse = await fetch(`/api/gps-profiles/${gpsReport.profileId}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData);
        }
      }

    } catch (err) {
      console.error('Ошибка при загрузке GPS отчета:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке отчета');
    } finally {
      setIsLoading(false);
    }
  };

  const transformGpsData = (processedData: any[]): any[] => {
    if (!processedData || !Array.isArray(processedData)) {
      return [];
    }
    
    return processedData.map((row: any, index: number) => {
      const transformedRow: any = {
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

  const handleClose = () => {
    setReport(null);
    setProfile(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto bg-vista-dark border-vista-secondary/50">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl flex items-center">
            <Activity className="w-5 h-5 mr-2 text-vista-primary" />
            GPS отчет матча
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary mx-auto"></div>
                <p className="mt-2 text-vista-light/70">Загрузка GPS отчета...</p>
              </div>
            </div>
          ) : error ? (
            <Card className="bg-vista-dark/50 border-vista-secondary/50">
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                  <h3 className="text-vista-light text-lg mb-2">Ошибка загрузки</h3>
                  <p className="text-vista-light/70 mb-4">{error}</p>
                  <Button 
                    onClick={fetchGpsReport}
                    className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                  >
                    Попробовать снова
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !report ? (
            <Card className="bg-vista-dark/50 border-vista-secondary/50">
              <CardContent className="p-6">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-vista-light/50" />
                  <h3 className="text-vista-light text-lg mb-2">GPS отчет не найден</h3>
                  <p className="text-vista-light/70 mb-4">
                    К данному матчу еще не загружен GPS отчет
                  </p>
                  <p className="text-vista-light/50 text-sm">
                    Загрузите GPS отчет для этого матча на странице "GPS отчеты"
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : report && profile ? (
            <div className="space-y-4">
              {/* Информация о матче */}
              <Card className="bg-vista-dark/50 border-vista-secondary/50">
                <CardHeader>
                  <CardTitle className="text-vista-light text-lg">
                    {matchName} • {matchDate}
                  </CardTitle>
                  {teamName && (
                    <p className="text-vista-light/70 text-sm">Команда: {teamName}</p>
                  )}
                </CardHeader>
              </Card>

              {/* Визуализация GPS отчета */}
              <GpsVisualization
                data={transformGpsData(report.processedData)}
                profile={profile}
                eventName={report.name}
                eventDate={report.createdAt}
                teamName={teamName}
                reportId={report.id}
                teamId={teamId}
                eventType="MATCH"
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
