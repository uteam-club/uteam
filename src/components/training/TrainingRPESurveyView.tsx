import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Users, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';

interface RPEResponse {
  id: string;
  playerId: string;
  rpeScore: number;
  durationMinutes: number | null;
  createdAt: string;
  completedAt: string | null;
  playerFirstName: string;
  playerLastName: string;
}

interface Training {
  id: string;
  title: string;
  date: string;
  time: string;
  teamId: string;
}

interface TrainingRPESurveyData {
  training: Training;
  responses: RPEResponse[];
  totalResponses: number;
  completedResponses: number;
}

interface TrainingRPESurveyViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainingId: string | null;
}

export function TrainingRPESurveyView({
  open,
  onOpenChange,
  trainingId
}: TrainingRPESurveyViewProps) {
  const [data, setData] = useState<TrainingRPESurveyData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && trainingId) {
      loadSurveyData();
    }
  }, [open, trainingId]);

  const loadSurveyData = async () => {
    if (!trainingId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/trainings/${trainingId}/rpe-survey`);
      if (!response.ok) {
        throw new Error('Failed to load survey data');
      }
      
      const surveyData = await response.json();
      setData(surveyData);
    } catch (error) {
      console.error('Error loading survey data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRPEColor = (score: number) => {
    if (score <= 2) return 'bg-green-500';
    if (score <= 4) return 'bg-green-400';
    if (score <= 6) return 'bg-yellow-500';
    if (score <= 8) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getWorkload = (rpe: number, duration: number | null) => {
    return duration ? rpe * duration : null;
  };

  const getWorkloadColor = (workload: number | null) => {
    if (!workload) return 'bg-gray-500';
    if (workload <= 200) return 'bg-green-500';
    if (workload <= 400) return 'bg-yellow-500';
    if (workload <= 600) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (!data && !loading) {
    return null;
  }

  const completionRate = data ? Math.round((data.completedResponses / data.totalResponses) * 100) : 0;
  const completedResponses = data?.responses?.filter(r => r.completedAt) || [];
  const averageRPE = completedResponses.length > 0 
    ? Math.round(completedResponses.reduce((sum, r) => sum + r.rpeScore, 0) / completedResponses.length * 10) / 10
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-vista-dark border-vista-secondary/30 text-vista-light overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">
            RPE опрос для тренировки
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-vista-light" />
          </div>
        ) : data ? (
          <div className="flex flex-col min-h-0 flex-1">
            {/* Информация о тренировке */}
            <Card className="bg-vista-dark/30 border-vista-secondary/30 mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-vista-light text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-vista-primary" />
                  {data.training.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-vista-light/70 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(data.training.date)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {data.training.time}
                  </div>
                </div>

                {/* Статистика */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-vista-dark/50 rounded-lg">
                    <div className="text-xl font-bold text-vista-light">{data.totalResponses}</div>
                    <div className="text-sm text-vista-light/70">Всего игроков</div>
                  </div>
                  <div className="text-center p-3 bg-vista-dark/50 rounded-lg">
                    <div className="text-xl font-bold text-green-400">{data.completedResponses}</div>
                    <div className="text-sm text-vista-light/70">Ответили</div>
                  </div>
                  <div className="text-center p-3 bg-vista-dark/50 rounded-lg">
                    <div className="text-xl font-bold text-vista-primary">{completionRate}%</div>
                    <div className="text-sm text-vista-light/70">Выполнено</div>
                  </div>
                  <div className="text-center p-3 bg-vista-dark/50 rounded-lg">
                    <div className="text-xl font-bold text-orange-400">{averageRPE || '—'}</div>
                    <div className="text-sm text-vista-light/70">Средний RPE</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Список ответов */}
            <Card className="bg-vista-dark/30 border-vista-secondary/30 flex-1 min-h-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-vista-light text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-vista-primary" />
                  Ответы игроков
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col min-h-0">
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                  {data.responses.map((response) => {
                    const workload = getWorkload(response.rpeScore, response.durationMinutes);
                    const isCompleted = !!response.completedAt;

                    return (
                      <div
                        key={response.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-vista-secondary/20 hover:bg-vista-secondary/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-400" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-yellow-400" />
                            )}
                            <div>
                              <div className="font-medium text-vista-light">
                                {response.playerLastName} {response.playerFirstName}
                              </div>
                              <div className="text-sm text-vista-light/60">
                                {isCompleted 
                                  ? `Ответил ${formatTime(response.completedAt!)}`
                                  : 'Ожидает ответа'
                                }
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* RPE Score */}
                          <div className="text-center">
                            <div className="text-xs text-vista-light/60 mb-1">RPE</div>
                            {isCompleted ? (
                              <Badge className={`${getRPEColor(response.rpeScore)} text-white font-bold`}>
                                {response.rpeScore}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-vista-light/50 border-vista-secondary/30">
                                —
                              </Badge>
                            )}
                          </div>

                          {/* Duration */}
                          <div className="text-center">
                            <div className="text-xs text-vista-light/60 mb-1">Время</div>
                            <Badge variant="outline" className="text-vista-light border-vista-secondary/30">
                              {response.durationMinutes ? `${response.durationMinutes} мин` : '—'}
                            </Badge>
                          </div>

                          {/* Workload */}
                          <div className="text-center">
                            <div className="text-xs text-vista-light/60 mb-1">Нагрузка</div>
                            {workload ? (
                              <Badge className={`${getWorkloadColor(workload)} text-white font-bold`}>
                                {workload}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-vista-light/50 border-vista-secondary/30">
                                —
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Кнопка закрытия */}
            <div className="flex justify-end pt-4 border-t border-vista-secondary/20">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
              >
                Закрыть
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-vista-light/60">
              Не удалось загрузить данные опроса
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
