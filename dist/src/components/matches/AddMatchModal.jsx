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
export function AddMatchModal({ isOpen, onClose, onMatchAdded }) {
    const { toast } = useToast();
    const { data: session } = useSession();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    // Состояние формы
    const [competitionType, setCompetitionType] = useState('FRIENDLY');
    const [matchDate, setMatchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [matchTime, setMatchTime] = useState('12:00');
    const [isHome, setIsHome] = useState(true);
    const [teamId, setTeamId] = useState('');
    const [opponentName, setOpponentName] = useState('');
    const [teamGoals, setTeamGoals] = useState(0);
    const [opponentGoals, setOpponentGoals] = useState(0);
    // Загрузка списка команд
    useEffect(() => {
        if (isOpen) {
            fetchTeams();
        }
    }, [isOpen]);
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
        }
        catch (error) {
            console.error('Ошибка при получении команд:', error);
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить список команд',
                variant: 'destructive',
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleSubmit = async (e) => {
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
                    teamGoals: Number(teamGoals),
                    opponentGoals: Number(opponentGoals),
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
            }
            else {
                const errorData = await response.json();
                toast({
                    title: 'Ошибка',
                    description: errorData.error || 'Не удалось добавить матч',
                    variant: 'destructive',
                });
            }
        }
        catch (error) {
            console.error('Ошибка при добавлении матча:', error);
            toast({
                title: 'Ошибка',
                description: 'Произошла ошибка при добавлении матча',
                variant: 'destructive',
            });
        }
        finally {
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
    };
    return (<Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark border-vista-secondary/50 text-vista-light">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">Добавить матч</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Тип соревнований */}
          <div className="space-y-2">
            <Label htmlFor="competitionType" className="text-vista-light">Тип соревнований</Label>
            <Select value={competitionType} onValueChange={setCompetitionType}>
              <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                <SelectValue placeholder="Выберите тип соревнований"/>
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
              <Label htmlFor="matchDate" className="text-vista-light">Дата матча</Label>
              <Input id="matchDate" type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchTime" className="text-vista-light">Время матча</Label>
              <Input id="matchTime" type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"/>
            </div>
          </div>
          
          {/* Статус матча */}
          <div className="flex items-center justify-between">
            <Label htmlFor="matchStatus" className="text-vista-light">Статус матча</Label>
            <div className="flex items-center space-x-2">
              <span className={!isHome ? "text-vista-light" : "text-vista-light/50"}>Выездной</span>
              <Switch id="matchStatus" checked={isHome} onCheckedChange={setIsHome}/>
              <span className={isHome ? "text-vista-light" : "text-vista-light/50"}>Домашний</span>
            </div>
          </div>
          
          {/* Выбор команды и счет */}
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <div className="flex-grow">
                <Label htmlFor="teamId" className="text-vista-light">Наша команда</Label>
                <Select value={teamId} onValueChange={setTeamId} disabled={loading || teams.length === 0}>
                  <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                    <SelectValue placeholder="Выберите команду"/>
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/30">
                    {teams.map((team) => (<SelectItem key={team.id} value={team.id} className="text-vista-light">
                        {team.name}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-20">
                <Label htmlFor="teamGoals" className="text-vista-light">Голы</Label>
                <Input id="teamGoals" type="number" min="0" value={teamGoals} onChange={(e) => setTeamGoals(parseInt(e.target.value))} className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"/>
              </div>
            </div>
          </div>
          
          {/* Команда соперника и счет */}
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <div className="flex-grow">
                <Label htmlFor="opponentName" className="text-vista-light">Команда соперника</Label>
                <Input id="opponentName" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} placeholder="Введите название команды соперника" className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"/>
              </div>
              <div className="w-20">
                <Label htmlFor="opponentGoals" className="text-vista-light">Голы</Label>
                <Input id="opponentGoals" type="number" min="0" value={opponentGoals} onChange={(e) => setOpponentGoals(parseInt(e.target.value))} className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"/>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-vista-secondary/30">
              Отмена
            </Button>
            <Button type="submit" disabled={submitting || loading} className="bg-vista-primary hover:bg-vista-primary/90">
              {submitting ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>);
}
