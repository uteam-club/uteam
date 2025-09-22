'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Settings, 
  AlertCircle
} from 'lucide-react';

interface PlayerGameModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  onOpenSettings: () => void;
}

interface GameModel {
  id: string;
  playerId: string;
  calculatedAt: string;
  matchesCount: number;
  totalMinutes: number;
  metrics: Record<string, number>;
  matchIds: string[];
  version: number;
}

interface CanonicalMetric {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
}

export function PlayerGameModelModal({ 
  isOpen, 
  onClose, 
  playerId, 
  playerName,
  onOpenSettings 
}: PlayerGameModelModalProps) {
  const [loading, setLoading] = useState(false);
  const [gameModel, setGameModel] = useState<GameModel | null>(null);
  const [canonicalMetrics, setCanonicalMetrics] = useState<CanonicalMetric[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [metricUnits, setMetricUnits] = useState<Record<string, string>>({});
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  // Загружаем данные при открытии модалки
  useEffect(() => {
    if (isOpen) {
      loadGameModel();
      loadSettings();
      loadCanonicalMetrics();
    }
  }, [isOpen, playerId]);

  const loadGameModel = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/players/${playerId}/game-model`);
      if (!response.ok) throw new Error('Failed to fetch game model');
      
      const data = await response.json();
      if (data.success) {
        setGameModel(data.gameModel);
      }
    } catch (error) {
      console.error('Error loading game model:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}/game-model/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      if (data.success && data.settings) {
        setSelectedMetrics(data.settings.selectedMetrics || []);
        setMetricUnits(data.settings.metricUnits || {});
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadCanonicalMetrics = async () => {
    try {
      const response = await fetch('/api/gps/canonical-metrics');
      if (!response.ok) throw new Error('Failed to fetch canonical metrics');
      
      const data = await response.json();
      if (data.success) {
        setCanonicalMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error('Error loading canonical metrics:', error);
    }
  };


  const formatValue = (value: number) => {
    if (Number.isInteger(value)) {
      return value.toString();
    } else {
      return value.toFixed(1);
    }
  };

  // Функция для перевода названий метрик на английский язык
  const getEnglishMetricName = (metricCode: string, russianName: string) => {
    const translations: Record<string, string> = {
      'acc_zone4_count': 'Accelerations Zone 4',
      'speed_zone5_entries': 'Speed Zone 5 Entries',
      'dec_zone4_count': 'Decelerations Zone 4',
      'total_distance': 'Total Distance',
      'distance_zone3': 'Distance Zone 3',
      'distance_zone4': 'Distance Zone 4',
      'distance_zone5': 'Distance Zone 5',
      'distance_per_min': 'Distance per Minute',
      'hsr_percentage': 'HSR %',
      'hsr_distance': 'HSR Distance',
      'sprint_distance': 'Sprint Distance',
      'sprints_count': 'Sprints Count',
      'player_load': 'Player Load',
      'power_score': 'Power Score',
      'work_ratio': 'Work Ratio',
      'time_in_speed_zone1': 'Time in Speed Zone 1',
      'time_in_speed_zone2': 'Time in Speed Zone 2',
      'time_in_speed_zone3': 'Time in Speed Zone 3',
      'time_in_speed_zone4': 'Time in Speed Zone 4',
      'time_in_speed_zone5': 'Time in Speed Zone 5',
      'time_in_speed_zone6': 'Time in Speed Zone 6',
      'speed_zone1_entries': 'Speed Zone 1 Entries',
      'speed_zone2_entries': 'Speed Zone 2 Entries',
      'speed_zone3_entries': 'Speed Zone 3 Entries',
      'speed_zone4_entries': 'Speed Zone 4 Entries',
      'speed_zone6_entries': 'Speed Zone 6 Entries',
      'acc_zone1_count': 'Accelerations Zone 1',
      'acc_zone2_count': 'Accelerations Zone 2',
      'acc_zone3_count': 'Accelerations Zone 3',
      'acc_zone5_count': 'Accelerations Zone 5',
      'acc_zone6_count': 'Accelerations Zone 6',
      'dec_zone1_count': 'Decelerations Zone 1',
      'dec_zone2_count': 'Decelerations Zone 2',
      'dec_zone3_count': 'Decelerations Zone 3',
      'dec_zone5_count': 'Decelerations Zone 5',
      'dec_zone6_count': 'Decelerations Zone 6',
      'distance_zone1': 'Distance Zone 1',
      'distance_zone2': 'Distance Zone 2',
      'distance_zone6': 'Distance Zone 6',
      'hml_distance': 'HML Distance',
      'explosive_distance': 'Explosive Distance',
      'time_in_hr_zone1': 'Time in HR Zone 1',
      'time_in_hr_zone2': 'Time in HR Zone 2',
      'time_in_hr_zone3': 'Time in HR Zone 3',
      'time_in_hr_zone4': 'Time in HR Zone 4',
      'time_in_hr_zone5': 'Time in HR Zone 5',
      'time_in_hr_zone6': 'Time in HR Zone 6',
      'impacts_count': 'Impacts Count'
    };

    return translations[metricCode] || russianName;
  };


  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar mt-8">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-vista-primary" />
              Игровая модель - {playerName}
            </DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Загрузка данных игровой модели...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar mt-8">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-vista-primary" />
            Игровая модель - {playerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Кнопки */}
          <div className="flex justify-start gap-2">
            <Button
              onClick={onOpenSettings}
              className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
            >
              <Settings className="w-4 h-4 mr-2" />
              Настройки
            </Button>
            <Button
              onClick={() => setShowDescriptionModal(true)}
              className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Описание
            </Button>
          </div>

          {/* Основной контент */}
          {!gameModel ? (
            <Card className="bg-vista-dark/50 border-vista-secondary/20">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-vista-light/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-vista-light mb-2">
                  Игровая модель не рассчитана
                </h3>
                <p className="text-vista-light/70 mb-4">
                  Для расчета игровой модели необходимо минимум 1 матч с GPS данными, 
                  где игрок сыграл 60+ минут.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">

              {/* Метрики */}
              {selectedMetrics.length > 0 && gameModel.metrics ? (
                <div>
                  <h3 className="text-vista-light text-lg mb-4">Выбранные метрики</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedMetrics.map((metricCode) => {
                      const metric = canonicalMetrics.find(m => m.code === metricCode);
                      const value = gameModel.metrics[metricCode];
                      
                      if (!metric || value === undefined) return null;

                      return (
                        <div key={metricCode} className="bg-vista-dark/30 rounded-lg p-4 border border-vista-secondary/20 hover:border-vista-secondary/40 transition-colors">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="text-xs font-light text-vista-light/80 leading-tight">
                              {getEnglishMetricName(metric.code, metric.name)}
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-vista-primary">
                                {formatValue(value)} <span className="text-sm font-normal text-vista-light/70">{metricUnits[metricCode] || metric.unit}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Card className="bg-vista-dark/50 border-vista-secondary/20">
                  <CardContent className="p-8 text-center">
                    <Settings className="w-12 h-12 text-vista-light/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-vista-light mb-2">
                      Метрики не выбраны
                    </h3>
                    <p className="text-vista-light/70 mb-4">
                      Выберите метрики для отображения в настройках
                    </p>
                    <Button
                      onClick={onOpenSettings}
                      variant="outline"
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Открыть настройки
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Модалка описания */}
      <Dialog open={showDescriptionModal} onOpenChange={setShowDescriptionModal}>
        <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar mt-8">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-lg font-medium flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-vista-primary" />
              Как рассчитывается игровая модель
            </DialogTitle>
            <DialogDescription className="text-vista-light/70 text-sm">
              Пошаговое объяснение алгоритма расчета игровой модели игрока
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="bg-vista-dark/50 border border-vista-secondary/20 rounded-lg p-3">
                <h3 className="text-base font-medium text-vista-light mb-2">1. Сбор данных</h3>
                <ul className="space-y-1.5 text-vista-light/80 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Система анализирует GPS отчеты только матчей (тренировки исключаются)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Учитываются только матчи, где игрок сыграл 60+ минут</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Берется максимум 10 последних подходящих матчей</span>
                  </li>
                </ul>
              </div>

              <div className="bg-vista-dark/50 border border-vista-secondary/20 rounded-lg p-3">
                <h3 className="text-base font-medium text-vista-light mb-2">2. Нормализация метрик</h3>
                <ul className="space-y-1.5 text-vista-light/80 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Для каждого матча: <code className="bg-vista-dark px-1 rounded text-xs">(значение_метрики / минуты_игры) × 90</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Это приводит все метрики к стандарту "за 90 минут"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Используются только усредняемые метрики (48 из доступных)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-vista-dark/50 border border-vista-secondary/20 rounded-lg p-3">
                <h3 className="text-base font-medium text-vista-light mb-2">3. Усреднение</h3>
                <ul className="space-y-1.5 text-vista-light/80 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Все нормализованные значения усредняются по всем матчам</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Результат - профиль игрока за 90 минут игры</span>
                  </li>
                </ul>
              </div>

              <div className="bg-vista-dark/50 border border-vista-secondary/20 rounded-lg p-3">
                <h3 className="text-base font-medium text-vista-light mb-2">4. Сохранение</h3>
                <ul className="space-y-1.5 text-vista-light/80 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Результат кэшируется в базе данных</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Автоматически обновляется при изменении GPS данных</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-vista-primary font-bold text-xs">•</span>
                    <span>Версионируется для отслеживания изменений</span>
                  </li>
                </ul>
              </div>

              <div className="bg-vista-dark/50 border border-vista-secondary/20 rounded-lg p-3">
                <h3 className="text-base font-medium text-vista-light mb-2">Пример расчета</h3>
                <div className="bg-vista-dark/70 rounded p-2 text-xs font-mono text-vista-light/90">
                  <div>Матч 1: 80 минут, дистанция 6000м</div>
                  <div>Нормализация: (6000 / 80) × 90 = 6750м за 90 минут</div>
                  <div className="mt-1">Матч 2: 90 минут, дистанция 7000м</div>
                  <div>Нормализация: (7000 / 90) × 90 = 7000м за 90 минут</div>
                  <div className="mt-1 text-vista-primary font-medium">
                    Итог: (6750 + 7000) / 2 = 6875м за 90 минут
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              onClick={() => setShowDescriptionModal(false)}
              className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
            >
              Понятно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
