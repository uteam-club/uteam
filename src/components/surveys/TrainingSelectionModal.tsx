import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, Target } from 'lucide-react';

interface Training {
  id: string;
  title: string;
  date: string;
  time: string;
  category: string;
  type: string;
}

interface TrainingSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: string | null;
  onTrainingSelected: (training: Training) => void;
}

export function TrainingSelectionModal({
  open,
  onOpenChange,
  playerId,
  onTrainingSelected
}: TrainingSelectionModalProps) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && playerId) {
      loadAvailableTrainings();
    }
  }, [open, playerId]);

  const loadAvailableTrainings = async () => {
    if (!playerId) return;

    setLoading(true);
    try {
      // Получаем тренировки за последние 7 дней для игрока
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const response = await fetch(
        `/api/players/${playerId}/available-trainings?startDate=${weekAgo.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}`
      );

      if (!response.ok) {
        throw new Error('Failed to load trainings');
      }

      const data = await response.json();
      setTrainings(data);
    } catch (error) {
      console.error('Error loading trainings:', error);
      setTrainings([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'short'
    });
  };

  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'TRAINING': return 'Тренировка';
      case 'GYM': return 'Зал';
      case 'MATCH': return 'Матч';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TRAINING': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'GYM': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'MATCH': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isYesterday = (dateStr: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateStr === yesterday.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-vista-dark border-vista-secondary/30 text-vista-light overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
            <Target className="h-5 w-5 text-vista-primary" />
            Выберите тренировку для оценки
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col min-h-0 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-vista-light" />
            </div>
          ) : trainings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-vista-light/60 mb-2">
                Нет доступных тренировок для оценки
              </div>
              <div className="text-vista-light/40 text-sm">
                Тренировки отображаются за последние 7 дней
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {trainings.map((training) => (
                <Card
                  key={training.id}
                  className="bg-vista-dark/30 border-vista-secondary/30 hover:bg-vista-secondary/10 cursor-pointer transition-colors"
                  onClick={() => {
                    onTrainingSelected(training);
                    onOpenChange(false);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-vista-light">
                        {training.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isToday(training.date) && (
                          <Badge className="bg-vista-primary/20 text-vista-primary text-xs">
                            Сегодня
                          </Badge>
                        )}
                        {isYesterday(training.date) && (
                          <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                            Вчера
                          </Badge>
                        )}
                        <Badge className={`${getTypeColor(training.type)} border text-xs`}>
                          {getTypeDisplay(training.type)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-vista-light/70">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(training.date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {training.time}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-vista-light/60 border-vista-secondary/30">
                        {training.category}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
