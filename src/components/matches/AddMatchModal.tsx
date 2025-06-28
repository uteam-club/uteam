import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { TimezoneSelect } from '../ui/timezone-select';

interface Team {
  id: string;
  name: string;
}

interface AddMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchAdded: () => void;
  initialDate?: Date | null;
}

export function AddMatchModal({ isOpen, onClose, onMatchAdded, initialDate }: AddMatchModalProps) {
  const { toast } = useToast();
  const { data: session } = useSession();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Состояние формы
  const [competitionType, setCompetitionType] = useState('FRIENDLY');
  const [matchDate, setMatchDate] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [matchTime, setMatchTime] = useState('12:00');
  const [isHome, setIsHome] = useState(true);
  const [teamId, setTeamId] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [teamGoals, setTeamGoals] = useState(0);
  const [opponentGoals, setOpponentGoals] = useState(0);
  const [matchStatus, setMatchStatus] = useState<'SCHEDULED' | 'FINISHED'>('SCHEDULED');
  const [timezone, setTimezone] = useState('Europe/Moscow');

  // Загрузка списка команд
  useEffect(() => {
    if (isOpen) {
      fetchTeams();
      setMatchDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    async function fetchTeamTimezone(teamId: string) {
      if (!teamId) return;
      try {
        const response = await fetch(`/api/teams/${teamId}`);
        if (!response.ok) return;
        const data = await response.json();
        setTimezone(data.timezone || 'Europe/Moscow');
      } catch {}
    }
    if (teamId) fetchTeamTimezone(teamId);
  }, [teamId]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
        if (data.length > 0) {
          setTeamId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Ошибка при получении команд:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список команд',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamId || !opponentName) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitionType,
          date: matchDate,
          time: matchTime,
          isHome,
          teamId,
          opponentName,
          status: matchStatus,
          teamGoals: matchStatus === 'FINISHED' ? Number(teamGoals) : null,
          opponentGoals: matchStatus === 'FINISHED' ? Number(opponentGoals) : null,
          timezone,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Матч успешно добавлен',
        });
        resetForm();
        onMatchAdded();
        onClose();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Ошибка',
          description: errorData.error || 'Не удалось добавить матч',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Ошибка при добавлении матча:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при добавлении матча',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCompetitionType('FRIENDLY');
    setMatchDate(format(new Date(), 'yyyy-MM-dd'));
    setMatchTime('12:00');
    setIsHome(true);
    setTeamId(teams.length > 0 ? teams[0].id : '');
    setOpponentName('');
    setTeamGoals(0);
    setOpponentGoals(0);
    setMatchStatus('SCHEDULED');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">Добавить матч</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Тип соревнований */}
          <div className="space-y-2">
            <Label htmlFor="competitionType" className="text-vista-light/40 font-normal">Тип соревнований</Label>
            <Select 
              value={competitionType} 
              onValueChange={setCompetitionType}
            >
              <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                <SelectValue placeholder="Выберите тип соревнований" />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/30">
                <SelectItem value="FRIENDLY" className="text-vista-light">Товарищеский</SelectItem>
                <SelectItem value="LEAGUE" className="text-vista-light">Лига</SelectItem>
                <SelectItem value="CUP" className="text-vista-light">Кубок</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Дата и время матча */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="matchDate" className="text-vista-light/40 font-normal">Дата матча</Label>
              <Input
                id="matchDate"
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchTime" className="text-vista-light/40 font-normal">Время матча</Label>
              <Input
                id="matchTime"
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
              />
            </div>
          </div>
          
          {/* Статус матча (запланирован/завершён) */}
          <div className="space-y-2">
            <Label htmlFor="matchStatus" className="text-vista-light/40 font-normal">Статус матча</Label>
            <Select
              value={matchStatus}
              onValueChange={v => setMatchStatus(v as 'SCHEDULED' | 'FINISHED')}
            >
              <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                <SelectValue placeholder="Выберите статус матча" />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/30">
                <SelectItem value="SCHEDULED" className="text-vista-light">Запланирован</SelectItem>
                <SelectItem value="FINISHED" className="text-vista-light">Завершён</SelectItem>
              </SelectContent>
            </Select>
            </div>
          
          {/* Тип матча (домашний/выездной) */}
          <div className="space-y-2">
            <Label htmlFor="isHome" className="text-vista-light/40 font-normal">Тип матча</Label>
            <Select
              value={isHome ? 'HOME' : 'AWAY'}
              onValueChange={v => setIsHome(v === 'HOME')}
            >
              <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                <SelectValue placeholder="Выберите тип матча" />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/30">
                <SelectItem value="HOME" className="text-vista-light">Домашний</SelectItem>
                <SelectItem value="AWAY" className="text-vista-light">Выездной</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Выбор команды и счет */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col space-y-2">
              <Label htmlFor="teamId" className="text-vista-light/40 font-normal mb-2">Наша команда</Label>
                <Select 
                  value={teamId} 
                  onValueChange={setTeamId}
                  disabled={loading || teams.length === 0}
                >
                  <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                    <SelectValue placeholder="Выберите команду" />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/30">
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id} className="text-vista-light">
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            <div className="w-20 flex flex-col space-y-2">
              <Label htmlFor="teamGoals" className="text-vista-light/40 font-normal mb-2">Голы</Label>
                <Input
                  id="teamGoals"
                  type="number"
                  min="0"
                  value={teamGoals}
                  onChange={(e) => setTeamGoals(parseInt(e.target.value))}
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
                disabled={matchStatus !== 'FINISHED'}
                />
            </div>
          </div>
          
          {/* Команда соперника и счет */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col space-y-2">
              <Label htmlFor="opponentName" className="text-vista-light/40 font-normal mb-2">Команда соперника</Label>
                <Input
                  id="opponentName"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  placeholder="Введите название команды соперника"
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
                />
              </div>
            <div className="w-20 flex flex-col space-y-2">
              <Label htmlFor="opponentGoals" className="text-vista-light/40 font-normal mb-2">Голы</Label>
                <Input
                  id="opponentGoals"
                  type="number"
                  min="0"
                  value={opponentGoals}
                  onChange={(e) => setOpponentGoals(parseInt(e.target.value))}
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
                disabled={matchStatus !== 'FINISHED'}
                />
            </div>
          </div>
          
          <div className="mt-2">
            <TimezoneSelect
              value={timezone}
              onChange={setTimezone}
              label="Часовой пояс матча"
              placeholder="Выберите часовой пояс"
              disabled={!teamId}
            />
          </div>
          {timezone && (
            <div className="text-xs text-vista-light/60 mt-1">Время матча указывается в часовом поясе: <b>{timezone}</b></div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-vista-secondary/30">
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || loading} 
              className="bg-vista-primary hover:bg-vista-primary/90"
            >
              {submitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 