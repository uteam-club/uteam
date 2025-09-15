'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, FileText, Calendar, Clock, Users, AlertCircle } from 'lucide-react';
import { useClub } from '@/providers/club-provider';
import { toast } from '@/components/ui/use-toast';

interface TrainingWithReport {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  status: string;
  categoryName: string | null;
  teamName: string | null;
  teamId: string;
  gpsReport: {
    id: string;
    name: string;
    fileName: string;
    status: string;
    createdAt: string;
    fileSize: number | null;
  };
}

export default function GpsReportsListTab() {
  const { club } = useClub();
  const [trainings, setTrainings] = useState<TrainingWithReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadTrainings = async () => {
    if (!club?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/trainings/with-gps-reports');
      if (!response.ok) {
        throw new Error('Failed to load trainings');
      }
      const data = await response.json();
      setTrainings(data);
    } catch (error) {
      console.error('Error loading trainings with GPS reports:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список отчетов',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainings();
  }, [club?.id]);

  const handleDeleteReport = async (reportId: string, trainingTitle: string) => {
    if (!confirm(`Удалить GPS отчет из тренировки "${trainingTitle}"? Это действие нельзя отменить.`)) {
      return;
    }

    setDeleting(reportId);
    try {
      const response = await fetch(`/api/gps/reports/${reportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      toast({
        title: 'Успешно',
        description: 'GPS отчет удален. Тренировка освобождена для загрузки нового файла.',
      });

      // Перезагружаем список
      await loadTrainings();
    } catch (error) {
      console.error('Error deleting GPS report:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить GPS отчет',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
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
  };

  const getTrainingTypeBadge = (type: string) => {
    switch (type) {
      case 'GYM':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 font-normal text-xs">Тренажерный зал</Badge>;
      case 'FIELD':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-normal text-xs">Тренировка</Badge>;
      default:
        return <Badge className="bg-vista-secondary/20 text-vista-light border-vista-secondary/50 font-normal text-xs">{type}</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Неизвестно';
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
      </div>
    );
  }

  if (trainings.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-vista-secondary/50 shadow-md rounded-md">
        <FileText className="h-8 w-8 text-vista-light/30 mx-auto mb-2" />
        <p className="text-vista-light/60">Нет тренировок с загруженными GPS отчетами</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-vista-light">Список отчетов</h3>
          <p className="text-sm text-vista-light/60">
            Тренировки с загруженными GPS отчетами ({trainings.length})
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {trainings.map((training, index) => (
          <Card 
            key={`${training.id}-${training.gpsReport.id}-${index}`} 
            className="bg-vista-dark/70 border-vista-secondary/50 hover:bg-vista-dark/90 transition-all shadow-md hover:shadow-xl"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="font-semibold text-vista-light text-lg">{training.title}</h4>
                    {getTrainingTypeBadge(training.type)}
                    {getStatusBadge(training.gpsReport.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-vista-light/70">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(training.date).toLocaleDateString('ru-RU')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-vista-light/70">
                        <Clock className="h-4 w-4" />
                        <span>{training.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-vista-light/70">
                        <Users className="h-4 w-4" />
                        <span>{training.teamName || 'Команда'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm text-vista-light/70">
                        <span className="font-medium">Файл:</span> {training.gpsReport.fileName}
                      </div>
                      <div className="text-sm text-vista-light/70">
                        <span className="font-medium">Размер:</span> {formatFileSize(training.gpsReport.fileSize)}
                      </div>
                      <div className="text-sm text-vista-light/70">
                        <span className="font-medium">Загружен:</span> {new Date(training.gpsReport.createdAt).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>

                  {training.categoryName && (
                    <div className="text-sm text-vista-light/60">
                      Категория: {training.categoryName}
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteReport(training.gpsReport.id, training.title)}
                    disabled={deleting === training.gpsReport.id}
                    className="bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20 h-8 px-3 font-normal text-xs shadow-lg"
                  >
                    {deleting === training.gpsReport.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить отчет
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
