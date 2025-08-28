import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Clock, Users, User, Settings } from 'lucide-react';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  pinCode: string;
  telegramId?: number;
}

interface TrainingDurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainingId: string;
  players: Player[];
  onDurationUpdate: () => void;
}

export function TrainingDurationModal({
  open,
  onOpenChange,
  trainingId,
  players,
  onDurationUpdate
}: TrainingDurationModalProps) {
  const { toast } = useToast();
  const [isIndividualMode, setIsIndividualMode] = useState(false);
  const [globalDuration, setGlobalDuration] = useState<number | undefined>(undefined);
  const [individualDurations, setIndividualDurations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Загружаем текущие настройки длительности
  useEffect(() => {
    if (open && trainingId) {
      loadDurationSettings();
    }
  }, [open, trainingId]);

  const loadDurationSettings = async () => {
    if (!trainingId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/trainings/${trainingId}/duration`);
      if (response.ok) {
        const data = await response.json();
        setGlobalDuration(data.globalDuration || undefined);
        setIndividualDurations(data.individualDurations || {});
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек длительности:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!trainingId) return;
    
    setSaving(true);
    try {
      if (isIndividualMode) {
        // Сохраняем индивидуальные настройки
        for (const [playerId, duration] of Object.entries(individualDurations)) {
          if (duration > 0) {
            await fetch(`/api/trainings/${trainingId}/duration`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerId,
                individualDuration: duration
              })
            });
          }
        }
        toast({
          title: "Настройки сохранены",
          description: "Индивидуальные длительности обновлены",
        });
      } else {
        // Сохраняем общую настройку
        const response = await fetch(`/api/trainings/${trainingId}/duration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            globalDuration: globalDuration || null
          })
        });

        if (response.ok) {
          toast({
            title: "Настройки сохранены",
            description: `Общая длительность: ${globalDuration || 'не задана'}`,
          });
        } else {
          throw new Error('Ошибка при сохранении');
        }
      }

      onDurationUpdate();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGlobalDurationChange = (value: string) => {
    const numValue = value === '' ? undefined : parseInt(value) || undefined;
    setGlobalDuration(numValue);
    
    // Если включен индивидуальный режим, обновляем все индивидуальные значения
    if (isIndividualMode && numValue !== undefined) {
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
    if (globalDuration !== undefined) {
      const newIndividualDurations = { ...individualDurations };
      players.forEach(player => {
        newIndividualDurations[player.id] = globalDuration;
      });
      setIndividualDurations(newIndividualDurations);
    }
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
              <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-lg w-full h-[calc(100vh-var(--modal-top-spacing)-var(--modal-bottom-spacing))] overflow-y-auto backdrop-blur-xl">
        <div className="flex flex-col h-full space-y-4 pt-4">
          {/* Переключатель режима */}
          <div className="flex items-center justify-between p-4 bg-vista-secondary/10 rounded-lg border border-vista-secondary/20">
            <div className="flex items-center gap-3">
              <div>
                <Label className="text-vista-light font-medium">Индивидуальные настройки</Label>
                <p className="text-xs text-vista-light/60">Устанавливать длительность отдельно для каждого игрока</p>
              </div>
            </div>
            <Switch
              checked={isIndividualMode}
              onCheckedChange={setIsIndividualMode}
            />
          </div>

          {/* Общая длительность */}
          {!isIndividualMode && (
            <div className="space-y-3 p-4 bg-vista-secondary/5 rounded-lg border border-vista-secondary/20">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-vista-primary" />
                <Label className="text-vista-light font-medium">Общая длительность команды</Label>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  max="300"
                  value={globalDuration || ''}
                  onChange={(e) => handleGlobalDurationChange(e.target.value)}
                  placeholder="мин"
                  className="w-24 bg-vista-dark border-vista-secondary/50 text-vista-light"
                />
                <span className="text-vista-light/70 text-sm">минут</span>
                {globalDuration && (
                  <Badge variant="secondary" className="bg-vista-primary/20 text-vista-primary">
                    {globalDuration} мин
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Индивидуальные настройки */}
          {isIndividualMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-end">
                {globalDuration && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetToGlobal}
                    className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                  >
                    Применить ко всем: {globalDuration} мин
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between py-0.5 px-2 bg-vista-secondary/5 rounded-lg border border-vista-secondary/20">
                    <div className="text-sm text-vista-light">
                      {player.firstName} {player.lastName}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="300"
                        value={individualDurations[player.id] || ''}
                        onChange={(e) => handleIndividualDurationChange(player.id, e.target.value)}
                        placeholder="мин"
                        className="w-20 bg-vista-dark border-vista-secondary/50 text-vista-light"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex justify-end gap-3 pt-4 border-t border-vista-secondary/20 mt-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
          >
            Отмена
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}