'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import GpsVisualization from '@/components/gps/GpsVisualization';

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

interface Team {
  id: string;
  name: string;
}

interface Match {
  id: string;
  name: string;
  date: string;
  opponentName: string;
  teamGoals: number;
  opponentGoals: number;
}

interface Training {
  id: string;
  name: string;
  date: string;
  title: string;
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
  team?: Team;
  event?: Match | Training;
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

  const data = transformGpsData(report.processedData);

  return (
    <div className="min-h-screen bg-vista-dark p-2 sm:p-6">
      <div className="w-full max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
        {/* Заголовок */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-vista-light mb-2">
            GPS Отчет
          </h1>
          {(() => {
            if (report.event) {
              if (report.eventType === 'MATCH') {
                const match = report.event as Match;
                return (
                  <div>
                    <p className="text-sm text-vista-light/50 mb-1">
                      {formatDate(match.date)}
                    </p>
                    <p className="text-vista-light/70">
                      {report.team?.name || 'Команда'} {match.teamGoals}:{match.opponentGoals} {match.opponentName}
                    </p>
                  </div>
                );
              } else if (report.eventType === 'TRAINING') {
                const training = report.event as Training;
                return (
                  <div>
                    <p className="text-sm text-vista-light/50 mb-1">
                      {formatDate(training.date)}
                    </p>
                    <p className="text-vista-light/70">
                      {training.title || 'Тренировка'}
                    </p>
                  </div>
                );
              }
            }
            // Fallback если нет данных о событии
            return (
              <div>
                <p className="text-sm text-vista-light/50 mb-1">
                  {formatDate(report.createdAt)}
                </p>
                <p className="text-vista-light/70">
                  {getEventTypeText(report.eventType)}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Используем тот же компонент GpsVisualization что и в приложении */}
        <GpsVisualization
          data={data}
          profile={profile}
          eventName={report.name}
          eventDate={report.createdAt}
          teamName={report.team?.name}
          reportId={report.id}
          teamId={report.teamId}
          eventType={report.eventType}
          isPublic={true}
        />
      </div>
    </div>
  );
} 