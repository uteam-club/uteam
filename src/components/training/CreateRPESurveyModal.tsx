import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Calendar, Clock, Target } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number: string;
  position: string;
}

interface Training {
  id: string;
  title: string;
  date: string;
  time: string;
  teamId: string;
}

interface CreateRPESurveyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  training: Training | null;
  onSurveyCreated: () => void;
}

export function CreateRPESurveyModal({
  open,
  onOpenChange,
  training,
  onSurveyCreated
}: CreateRPESurveyModalProps) {
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Загрузка игроков команды
  useEffect(() => {
    if (open && training) {
      loadTeamPlayers();
    }
  }, [open, training]);

  const loadTeamPlayers = async () => {
    if (!training) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/teams/${training.teamId}/players`);
      if (!response.ok) {
        throw new Error('Failed to load players');
      }
      
      const data = await response.json();
      setPlayers(data);
      // По умолчанию выбираем всех игроков
      setSelectedPlayers(data.map((p: Player) => p.id));
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список игроков',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleSelectAll = () => {
    setSelectedPlayers(players.map(p => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedPlayers([]);
  };

  const handleCreateSurvey = async () => {
    if (!training || selectedPlayers.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите хотя бы одного игрока',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/trainings/${training.id}/rpe-survey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players: selectedPlayers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create survey');
      }

      const data = await response.json();
      
      toast({
        title: 'Успешно!',
        description: `RPE опрос создан для ${data.playersCount} игроков`,
      });

      onSurveyCreated();
      onOpenChange(false);
      
      // Сброс состояния
      setSelectedPlayers([]);
      
    } catch (error) {
      console.error('Error creating RPE survey:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать опрос',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  if (!training) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-vista-dark border-vista-secondary/30 text-vista-light overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">
            Создать RPE опрос для тренировки
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col min-h-0 flex-1">
          {/* Информация о тренировке */}
          <Card className="bg-vista-dark/30 border-vista-secondary/30 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-vista-light text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-vista-primary" />
                {training.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-vista-light/70">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(training.date)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {training.time}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Выбор игроков */}
          <Card className="bg-vista-dark/30 border-vista-secondary/30 flex-1 min-h-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-vista-light text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-vista-primary" />
                  Выберите игроков
                </CardTitle>
                <Badge variant="secondary" className="bg-vista-primary/20 text-vista-primary">
                  {selectedPlayers.length} из {players.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col min-h-0">
              {/* Кнопки выбора */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                >
                  Выбрать всех
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                >
                  Снять выбор
                </Button>
              </div>

              {/* Список игроков */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-vista-light" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-vista-secondary/20 hover:bg-vista-secondary/10 cursor-pointer"
                      onClick={() => handlePlayerToggle(player.id)}
                    >
                      <Checkbox
                        checked={selectedPlayers.includes(player.id)}
                        onChange={() => handlePlayerToggle(player.id)}
                        className="data-[state=checked]:bg-vista-primary data-[state=checked]:border-vista-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-vista-light">
                          {player.lastName} {player.firstName}
                        </div>
                        <div className="text-sm text-vista-light/60">
                          №{player.number} • {player.position}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Кнопки действий */}
          <div className="flex justify-end gap-3 pt-4 border-t border-vista-secondary/20">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateSurvey}
              disabled={creating || selectedPlayers.length === 0}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Создание...
                </>
              ) : (
                `Создать опрос (${selectedPlayers.length})`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
