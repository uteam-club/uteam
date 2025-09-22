'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Calendar, Filter, Search, History, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface GpsReport {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  gpsSystem: string;
  eventType: 'training' | 'match';
  eventId: string;
  teamId: string;
  teamName: string;
  isProcessed: boolean;
  hasEdits: boolean;
  playersCount: number;
  status: 'uploaded' | 'processed' | 'error';
  createdAt: string;
  updatedAt: string;
  // Дополнительная информация для тренировок
  trainingName?: string;
  trainingCategory?: string;
  trainingType?: 'training' | 'gym';
  trainingDate?: string;
  // Дополнительная информация для матчей
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  competitionType?: 'friendly' | 'league' | 'cup';
  matchDate?: string;
}

interface GpsReportsListProps {
  onEditReport?: (reportId: string) => void;
  onDeleteReport?: (reportId: string) => void;
  onViewHistory?: (reportId: string, reportName: string) => void;
}

export function GpsReportsList({ onEditReport, onDeleteReport, onViewHistory }: GpsReportsListProps) {
  const [reports, setReports] = useState<GpsReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('');
  const [teams, setTeams] = useState<Array<{id: string, name: string}>>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
    fetchTeams();
  }, []);

  // Автоматическое обновление при изменении фильтров
  useEffect(() => {
    fetchReports();
  }, [filterTeam, filterType]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTeam && filterTeam !== 'all') params.append('teamId', filterTeam);
      if (filterType && filterType !== 'all') params.append('eventType', filterType);

      const response = await fetch(`/api/gps/reports?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setReports(data.reports || []);
      } else {
        gpsLogger.error('Component', 'Error fetching reports:', data.error);
        setReports([]);
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/gps/teams');
      const data = await response.json();
      
      if (data.success) {
        setTeams(data.teams || []);
      } else {
        gpsLogger.error('Component', 'Error fetching teams:', data.error);
        setTeams([]);
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error fetching teams:', error);
      setTeams([]);
    }
  };


  const handleViewHistory = (reportId: string, reportName: string) => {
    onViewHistory?.(reportId, reportName);
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  const handleDelete = (reportId: string) => {
    setReportToDelete(reportId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      const response = await fetch(`/api/gps/reports/${reportToDelete}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setReports(prev => prev.filter(report => report.id !== reportToDelete));
        onDeleteReport?.(reportToDelete);
        setDeleteModalOpen(false);
        setReportToDelete(null);
        toast({
          title: 'Отчет удален',
          description: 'GPS отчет успешно удален.',
        });
      } else {
        throw new Error('Ошибка при удалении отчета');
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error deleting report:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить отчет. Попробуйте еще раз.',
        variant: 'destructive',
      });
    }
  };

  const getEventTypeLabel = (type: string) => {
    return type === 'training' ? 'Тренировка' : 'Матч';
  };

  const getEventTypeVariant = (type: string) => {
    return type === 'training' ? 'default' : 'secondary';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTrainingTypeLabel = (trainingType?: string) => {
    switch (trainingType) {
      case 'training':
        return 'Тренировка';
      case 'gym':
        return 'Тренажерный зал';
      default:
        return 'Тренировка';
    }
  };

  const getCompetitionTypeLabel = (competitionType?: string) => {
    switch (competitionType) {
      case 'friendly':
        return 'Товарищеский';
      case 'league':
        return 'Лига';
      case 'cup':
        return 'Кубок';
      default:
        return 'Товарищеский';
    }
  };

  const formatEventDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTrainingInfo = (report: GpsReport) => {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-vista-light">
            {report.trainingName || report.name}
          </h3>
          <Badge variant={getEventTypeVariant(report.eventType)} className="bg-vista-primary/20 text-vista-light border-vista-primary/30 text-xs">
            {getTrainingTypeLabel(report.trainingType)}
          </Badge>
        </div>
        <div className="text-xs text-vista-light/70 space-y-0.5">
          <div>Команда: <span className="text-vista-light">{report.teamName}</span></div>
          {report.trainingCategory && (
            <div>Категория: <span className="text-vista-light">{report.trainingCategory}</span></div>
          )}
          {report.trainingDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatEventDate(report.trainingDate)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMatchInfo = (report: GpsReport) => {
    const scoreText = report.homeScore !== undefined && report.awayScore !== undefined 
      ? `${report.homeScore} - ${report.awayScore}`
      : 'TBD';
    
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-vista-light">
            {report.homeTeamName && report.awayTeamName 
              ? `${report.homeTeamName} - ${report.awayTeamName}`
              : report.name
            }
          </h3>
          <Badge variant={getEventTypeVariant(report.eventType)} className="bg-vista-primary/20 text-vista-light border-vista-primary/30 text-xs">
            {getEventTypeLabel(report.eventType)}
          </Badge>
        </div>
        <div className="text-xs text-vista-light/70 space-y-0.5">
          <div>Команда: <span className="text-vista-light">{report.teamName}</span></div>
          <div className="flex items-center gap-2">
            <span>Счет: <span className="text-vista-light font-medium">{scoreText}</span></span>
            {report.competitionType && (
              <span>• <span className="text-vista-light">{getCompetitionTypeLabel(report.competitionType)}</span></span>
            )}
          </div>
          {report.matchDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatEventDate(report.matchDate)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredReports = reports.filter(report => {
    // Поиск по названию
    const matchesSearch = searchTerm === '' || 
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Фильтр по команде
    const matchesTeam = filterTeam === '' || filterTeam === 'all' || report.teamId === filterTeam;
    
    // Фильтр по типу события
    const matchesType = filterType === '' || filterType === 'all' || report.eventType === filterType;
    
    return matchesSearch && matchesTeam && matchesType;
  });

  if (loading) {
    return (
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-vista-primary/30 border-t-vista-primary"></div>
          <span className="ml-2 text-vista-light/70">Загрузка отчетов...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-vista-light/70 h-4 w-4" />
                <Input
                  placeholder="Поиск по названию отчета..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-vista-dark/50 border-vista-secondary/50 text-vista-light placeholder:text-vista-light/50"
                />
              </div>
            </div>
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-full md:w-[200px] bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg transition-all duration-200 group">
                <SelectValue placeholder="Все команды" />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light custom-scrollbar">
                <SelectItem value="all" className="text-vista-light hover:bg-vista-dark/70">Все команды</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id} className="text-vista-light hover:bg-vista-dark/70">
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px] bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg transition-all duration-200 group">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light custom-scrollbar">
                <SelectItem value="all" className="text-vista-light hover:bg-vista-dark/70">Все типы</SelectItem>
                <SelectItem value="training" className="text-vista-light hover:bg-vista-dark/70">Тренировки</SelectItem>
                <SelectItem value="match" className="text-vista-light hover:bg-vista-dark/70">Матчи</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Список отчетов */}
      {filteredReports.length > 0 ? (
        <div className="space-y-2">
          {filteredReports.map((report) => (
            <Card key={report.id} className="bg-vista-dark/30 border-vista-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    {/* Основная информация о событии */}
                    {report.eventType === 'training' ? renderTrainingInfo(report) : renderMatchInfo(report)}
                    
                    {/* Дополнительные бейджи */}
                    <div className="flex items-center gap-2">
                      {report.hasEdits && (
                        <Badge variant="outline" className="border-vista-secondary/50 text-vista-light">Изменен</Badge>
                      )}
                      {!report.isProcessed && (
                        <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/30">Обработка</Badge>
                      )}
                    </div>
                    
                    {/* Техническая информация */}
                    <div className="flex items-center gap-3 text-sm text-vista-light/70">
                      <span>{report.fileName}</span>
                      <span>•</span>
                      <span>{report.playersCount} игроков</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEditReport?.(report.id)}
                      className="bg-vista-dark/30 border-vista-secondary/50 text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/50 h-9 px-4 text-sm w-32"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Редактировать
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewHistory(report.id, report.name)}
                      className="bg-vista-dark/30 border-vista-secondary/50 text-vista-light hover:bg-vista-primary/20 hover:border-vista-primary/50 h-9 px-4 text-sm w-32"
                    >
                      <History className="mr-2 h-4 w-4" />
                      История
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(report.id)}
                      className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-4 text-sm w-32"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-vista-dark/30 border-vista-secondary/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-vista-light/70 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-vista-light">Нет отчетов</h3>
            <p className="text-vista-light/70 text-center mb-4">
              {searchTerm || filterTeam || filterType 
                ? 'По вашему запросу отчеты не найдены'
                : 'Загрузите первый GPS отчет для начала анализа'
              }
            </p>
            {!searchTerm && !filterTeam && !filterType && (
              <Button 
                onClick={() => window.location.reload()}
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Обновить
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Модальное окно подтверждения удаления */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="bg-vista-dark border-vista-secondary/30">
          <DialogHeader>
            <DialogTitle className="text-vista-light">Подтверждение удаления</DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Вы уверены, что хотите удалить этот отчет? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="bg-transparent border border-vista-secondary/50 text-vista-light hover:bg-vista-dark/50"
            >
              Отмена
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-vista-error hover:bg-vista-error/90 text-white"
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GpsReportsList;
