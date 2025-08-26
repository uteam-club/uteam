import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
}

interface TrainingDurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  date: string;
  players: Player[];
  onDurationUpdate: () => void;
}

export function TrainingDurationModal({
  open,
  onOpenChange,
  teamId,
  date,
  players,
  onDurationUpdate
}: TrainingDurationModalProps) {
  const { toast } = useToast();
  const [isIndividualMode, setIsIndividualMode] = useState(false);
  const [globalDuration, setGlobalDuration] = useState<number>(70);
  const [individualDurations, setIndividualDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Загружаем текущие настройки длительности
  useEffect(() => {
    if (open && teamId && date) {
      loadDurationSettings();
    }
  }, [open, teamId, date]);

  const loadDurationSettings = async () => {
    if (!teamId || !date) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/surveys/rpe/duration?teamId=${teamId}&date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setGlobalDuration(data.globalDuration || 70);
        setIndividualDurations(data.individualDurations || {});
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек длительности:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!teamId || !date) return;
    
    setSaving(true);
    try {
      // Сохраняем общую длительность
      if (!isIndividualMode) {
        await fetch('/api/surveys/rpe/duration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            date,
            globalDuration
          })
        });
      } else {
        // Сохраняем индивидуальные длительности
        const individualDurationsToSave = Object.entries(individualDurations).map(([playerId, duration]) => ({
          teamId,
          date,
          playerId,
          individualDuration: duration
        }));

        await fetch('/api/surveys/rpe/duration/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            date,
            individualDurations: individualDurationsToSave
          })
        });
      }
      
      toast({
        title: 'Настройки сохранены',
        description: 'Длительность тренировки успешно обновлена'
      });
      
      onDurationUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGlobalDurationChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setGlobalDuration(numValue);
    
    // Если включен индивидуальный режим, обновляем все индивидуальные значения
    if (isIndividualMode) {
      const newIndividualDurations = { ...individualDurations };
      players.forEach(player => {
        newIndividualDurations[player.id] = numValue;
      });
      setIndividualDurations(newIndividualDurations);
    }
  };

  const handleIndividualDurationChange = (playerId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setIndividualDurations(prev => ({
      ...prev,
      [playerId]: numValue
    }));
  };

  const resetToGlobal = () => {
    const newIndividualDurations = { ...individualDurations };
    players.forEach(player => {
      newIndividualDurations[player.id] = globalDuration;
    });
    setIndividualDurations(newIndividualDurations);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-vista-light">Загрузка...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-2xl w-full overflow-hidden backdrop-blur-xl h-[90vh] mt-8"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Управление длительностью тренировки</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
            {/* Блок с режимом и временем в самом верху */}
            <div className="p-4 border-b border-vista-secondary/20">
              <div className="flex items-center justify-between p-4 bg-vista-dark/60 border border-vista-secondary/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="individual-mode"
                    checked={isIndividualMode}
                    onCheckedChange={setIsIndividualMode}
                    className="data-[state=checked]:bg-vista-primary"
                  />
                  <div className="px-3 py-1 bg-vista-primary/20 text-vista-primary text-sm font-medium rounded border border-vista-primary/30">
                    {isIndividualMode ? 'Индивидуальный режим' : 'Общий режим'}
                  </div>
                </div>
                
                {/* Поле для ввода общей длительности */}
                <div className="flex items-center gap-3">
                  <Label className="text-vista-light/70 font-normal text-sm">Длительность:</Label>
                  <Input
                    type="number"
                    value={globalDuration}
                    onChange={(e) => handleGlobalDurationChange(e.target.value)}
                    className="w-20 text-center bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                    min="1"
                    max="300"
                  />
                  <span className="text-vista-light/80 text-sm">мин</span>
                </div>
              </div>
            </div>

            {/* Основной контент - растягиваем до кнопок */}
            <div className="flex-1 px-6 py-4">
              {/* Индивидуальные настройки */}
              {isIndividualMode && (
                <div className="space-y-4 h-full">
                  <div className="flex items-center justify-between">
                    <Label className="text-vista-light/70 font-normal">Индивидуальные настройки</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToGlobal}
                      className="text-vista-primary border-vista-primary hover:bg-vista-primary hover:text-white text-xs px-3 py-1"
                    >
                      Сбросить к общему времени
                    </Button>
                  </div>
                  <p className="text-xs text-vista-light/50">
                    Укажите индивидуальную длительность для игроков, если она отличается от общей
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    {players.map(player => (
                      <div key={player.id} className="flex items-center justify-between p-2 bg-vista-dark/60 rounded border border-vista-secondary/20">
                        <div className="flex items-center gap-2">
                          <span className="text-vista-light text-sm">
                            {player.lastName} {player.firstName}
                          </span>
                          {player.number && (
                            <span className="text-vista-light/50 text-xs">№{player.number}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={individualDurations[player.id] || globalDuration}
                            onChange={(e) => handleIndividualDurationChange(player.id, e.target.value)}
                            className="w-20 text-center text-sm bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                            min="1"
                            max="300"
                          />
                          <span className="text-vista-light/50 text-xs">мин</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Компактные кнопки внизу */}
            <div className="flex justify-end gap-3 p-4 border-t border-vista-secondary/20">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
                disabled={saving}
              >
                Отмена
              </Button>
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0"
              >
                {saving ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-vista-dark border-t-transparent rounded-full"></div>
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
    </Dialog>
  );
}
