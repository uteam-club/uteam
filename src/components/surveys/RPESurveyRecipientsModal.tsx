import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Users, User, Settings, CheckCircle, XCircle } from 'lucide-react';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  pinCode: string;
  telegramId?: number;
}

interface RPESurveyRecipientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onRecipientsUpdate: () => void;
}

export function RPESurveyRecipientsModal({
  open,
  onOpenChange,
  teamId,
  teamName,
  onRecipientsUpdate
}: RPESurveyRecipientsModalProps) {
  const { toast } = useToast();
  const [isIndividualMode, setIsIndividualMode] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Загружаем игроков команды и текущие настройки получателей
  useEffect(() => {
    console.log('RPE Modal useEffect triggered:', { open, teamId });
    if (open && teamId) {
      loadTeamData();
    }
  }, [open, teamId]);

  const loadTeamData = async () => {
    if (!teamId) return;
    
    console.log('Loading RPE team data for teamId:', teamId);
    setLoading(true);
    try {
      // Загружаем игроков команды
      console.log('Fetching players for RPE team:', teamId);
      const playersResponse = await fetch(`/api/teams/${teamId}/players`);
      if (playersResponse.ok) {
        const playersData = await playersResponse.json();
        console.log('RPE Players loaded:', playersData);
        setPlayers(playersData);
        
        // Загружаем текущие настройки получателей
        const recipientsResponse = await fetch(`/api/survey/rpe/recipients?teamId=${teamId}`);
        if (recipientsResponse.ok) {
          const recipientsData = await recipientsResponse.json();
          if (recipientsData.isIndividualMode) {
            setIsIndividualMode(true);
            setSelectedPlayers(new Set(recipientsData.selectedPlayerIds || []));
          } else {
            setIsIndividualMode(false);
            setSelectedPlayers(new Set(playersData.map((p: Player) => p.id)));
          }
        } else {
          // По умолчанию выбираем всех игроков
          setSelectedPlayers(new Set(playersData.map((p: Player) => p.id)));
        }
      } else {
        console.error('Failed to load RPE players:', playersResponse.status);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить игроков команды",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных команды RPE:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные команды",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!teamId) return;
    
    setSaving(true);
    try {
      console.log('Saving RPE settings:', {
        teamId,
        isIndividualMode,
        selectedPlayerIds: isIndividualMode ? Array.from(selectedPlayers) : null
      });

      const response = await fetch(`/api/survey/rpe/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          isIndividualMode,
          selectedPlayerIds: isIndividualMode ? Array.from(selectedPlayers) : null
        })
      });
      
      if (response.ok) {
        toast({
          title: "Настройки сохранены",
          description: isIndividualMode 
            ? `Выбрано ${selectedPlayers.size} игроков из ${players.length}`
            : "Опросник RPE будет отправляться всем игрокам команды",
        });
        onRecipientsUpdate();
        onOpenChange(false);
      } else {
        throw new Error('Ошибка при сохранении');
      }
      
    } catch (error) {
      console.error('Ошибка при сохранении RPE:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const selectAllPlayers = () => {
    setSelectedPlayers(new Set(players.map(p => p.id)));
  };

  const deselectAllPlayers = () => {
    setSelectedPlayers(new Set());
  };

  const handleModeChange = (newMode: boolean) => {
    setIsIndividualMode(newMode);
    if (newMode) {
      // При переключении на индивидуальный режим, выбираем всех игроков по умолчанию
      setSelectedPlayers(new Set(players.map(p => p.id)));
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-vista-primary" />
            <span className="ml-2 text-vista-light">Загрузка...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-lg w-full h-[calc(100vh-var(--modal-top-spacing)-var(--modal-bottom-spacing))] overflow-y-auto backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-vista-light text-center">
            Выбор получателей опросника RPE
          </DialogTitle>
          <DialogDescription className="text-sm text-vista-light/60 text-center">
            Команда: {teamName}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col h-full space-y-4">

          {/* Переключатель режима */}
          <div className="flex items-center justify-between p-4 bg-vista-secondary/10 rounded-lg border border-vista-secondary/20">
            <div className="flex items-center gap-3">
              <div>
                <Label className="text-vista-light font-medium">Индивидуальный выбор</Label>
                <p className="text-xs text-vista-light/60">Выбрать конкретных игроков для получения опросника RPE</p>
              </div>
            </div>
            <Switch
              checked={isIndividualMode}
              onCheckedChange={handleModeChange}
            />
          </div>

          {/* Режим "Все игроки" */}
          {!isIndividualMode && (
            <div className="space-y-3 p-4 bg-vista-secondary/5 rounded-lg border border-vista-secondary/20">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-vista-primary" />
                <Label className="text-vista-light font-medium">Отправка всем игрокам</Label>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                  {players.length} игроков
                </Badge>
                <span className="text-vista-light/70 text-sm">Опросник RPE будет отправляться всем игрокам команды</span>
              </div>
            </div>
          )}

          {/* Индивидуальные настройки */}
          {isIndividualMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-vista-light/70">
                  Выбрано: {selectedPlayers.size} из {players.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllPlayers}
                    className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 text-xs"
                  >
                    Выбрать всех
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={deselectAllPlayers}
                    className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 text-xs"
                  >
                    Снять выбор
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {players.map((player) => {
                  const isSelected = selectedPlayers.has(player.id);
                  return (
                    <div 
                      key={player.id} 
                      className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-vista-primary/20 border-vista-primary/50' 
                          : 'bg-vista-secondary/5 border-vista-secondary/20 hover:bg-vista-secondary/10'
                      }`}
                      onClick={() => handlePlayerToggle(player.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'border-vista-primary bg-vista-primary' 
                            : 'border-vista-secondary/50'
                        }`}>
                          {isSelected && <CheckCircle className="h-3 w-3 text-vista-dark" />}
                        </div>
                        <div className="text-sm text-vista-light">
                          {player.firstName} {player.lastName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.telegramId ? (
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                            Telegram
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-500/20 text-red-400 text-xs">
                            Нет Telegram
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedPlayers.size === 0 && (
                <div className="text-center py-4 text-vista-light/50 text-sm">
                  Не выбрано ни одного игрока
                </div>
              )}
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
            disabled={saving || (isIndividualMode && selectedPlayers.size === 0)}
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
