'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Eye, Edit, Trash2, Calendar, Filter, Search, History } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { GpsReportHistoryModal } from './GpsReportHistoryModal';

interface GpsReport {
  id: string;
  name: string;
  fileName: string;
  gpsSystem: string;
  eventType: 'training' | 'match';
  status: 'uploaded' | 'processed' | 'error';
  playersCount: number;
  hasEdits: boolean;
  createdAt: string;
  teamName: string;
  eventName: string;
}

export function GpsReportsListTab() {
  const { toast } = useToast();
  const [reports, setReports] = useState<GpsReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [selectedReportName, setSelectedReportName] = useState<string>('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gps/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error loading reports:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить отчеты',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (reportId: string) => {
    // TODO: Implement view report
  };

  const handleEditReport = (reportId: string) => {
    // TODO: Implement edit report
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот отчет?')) {
      return;
    }

    try {
      const response = await fetch(`/api/gps/reports/${reportId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Отчет удален',
          description: 'GPS отчет успешно удален',
        });
        loadReports();
      } else {
        throw new Error('Ошибка при удалении отчета');
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error deleting report:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить отчет',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadReport = (reportId: string) => {
    // TODO: Implement download report
  };

  const handleViewHistory = (reportId: string, reportName: string) => {
    setSelectedReportId(reportId);
    setSelectedReportName(reportName);
    setHistoryModalOpen(true);
  };

  const filteredReports = reports.filter(report => {
    if (filterStatus !== 'all' && report.status !== filterStatus) return false;
    if (filterEventType !== 'all' && report.eventType !== filterEventType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Список отчетов</h2>
          <p className="text-muted-foreground">
            Просматривайте и управляйте всеми GPS отчетами
          </p>
        </div>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Статус</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="uploaded">Загружен</SelectItem>
                  <SelectItem value="processed">Обработан</SelectItem>
                  <SelectItem value="error">Ошибка</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-type-filter">Тип события</Label>
              <Select value={filterEventType} onValueChange={setFilterEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="training">Тренировка</SelectItem>
                  <SelectItem value="match">Матч</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-vista-primary border-t-transparent" />
        </div>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Нет отчетов</CardTitle>
            <CardDescription>
              {reports.length === 0 
                ? 'Загрузите первый GPS отчет, чтобы начать анализ данных'
                : 'Нет отчетов, соответствующих выбранным фильтрам'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {reports.length === 0 
                ? 'Перейдите на вкладку "Анализ" для создания нового отчета'
                : 'Попробуйте изменить фильтры или очистить их'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(report.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                      <span>{report.teamName}</span>
                      <span>{report.eventName}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={report.status === 'processed' ? 'default' : 'secondary'}>
                      {report.status === 'processed' ? 'Обработан' : 
                       report.status === 'uploaded' ? 'Загружен' : 'Ошибка'}
                    </Badge>
                    {report.hasEdits && (
                      <Badge variant="outline">Изменен</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Файл: {report.fileName}</p>
                    <p>Система: {report.gpsSystem}</p>
                    <p>Игроков: {report.playersCount}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReport(report.id)}
                      title="Просмотр"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditReport(report.id)}
                      title="Редактировать"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewHistory(report.id, report.name)}
                      title="История изменений"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadReport(report.id)}
                      title="Скачать"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteReport(report.id)}
                      className="text-destructive hover:text-destructive"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно истории изменений */}
      <GpsReportHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        reportId={selectedReportId}
        reportName={selectedReportName}
      />
    </div>
  );
}

export default GpsReportsListTab;