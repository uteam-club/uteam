import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, Clock } from 'lucide-react';

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
  const { t } = useTranslation();
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

  const isSingleTeam = teams.length === 1;

  // competitionTypeLabels для селекта
  const competitionTypeLabels = {
    FRIENDLY: t('addMatchModal.friendly'),
    LEAGUE: t('addMatchModal.league'),
    CUP: t('addMatchModal.cup')
  };

  const matchTypeLabels = useMemo(() => ({
    HOME: t('addMatchModal.home'),
    AWAY: t('addMatchModal.away'),
  }), [t]);

  // Загрузка списка команд
  useEffect(() => {
    if (isOpen) {
      fetchTeams();
      setMatchDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (isSingleTeam && teams[0]) {
      setTeamId(teams[0].id);
    }
  }, [isSingleTeam, teams]);

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
        title: t('addMatchModal.error'),
        description: t('addMatchModal.load_teams_error'),
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
        title: t('addMatchModal.error'),
        description: t('addMatchModal.required_fields_error'),
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
        }),
      });

      if (response.ok) {
        toast({
          title: t('addMatchModal.success'),
          description: t('addMatchModal.match_added'),
        });
        resetForm();
        onMatchAdded();
        onClose();
      } else {
        const errorData = await response.json();
        toast({
          title: t('addMatchModal.error'),
          description: errorData.error || t('addMatchModal.add_error'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Ошибка при добавлении матча:', error);
      toast({
        title: t('addMatchModal.error'),
        description: t('addMatchModal.unknown_error'),
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
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-y-auto max-h-[80vh] focus:outline-none focus:ring-0 custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">{t('addMatchModal.title')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Тип соревнований */}
          <div className="space-y-2">
            <Label htmlFor="competitionType" className="text-vista-light/40 font-normal">{t('addMatchModal.competition_type')}</Label>
            <Select 
              value={competitionType} 
              onValueChange={setCompetitionType}
            >
              <SelectTrigger className="w-full bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9">
                <SelectValue placeholder={t('addMatchModal.select_competition_type')} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                <SelectItem value="FRIENDLY" className="text-vista-light">{competitionTypeLabels.FRIENDLY}</SelectItem>
                <SelectItem value="LEAGUE" className="text-vista-light">{competitionTypeLabels.LEAGUE}</SelectItem>
                <SelectItem value="CUP" className="text-vista-light">{competitionTypeLabels.CUP}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Дата и время матча */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="matchDate" className="text-vista-light/40 font-normal">{t('addMatchModal.match_date')}</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50 cursor-pointer z-10" />
                <Input
                  id="matchDate"
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="pl-10 bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                  onClick={(e) => {
                    try {
                      (e.target as HTMLInputElement).showPicker();
                    } catch (error) {}
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchTime" className="text-vista-light/40 font-normal">{t('addMatchModal.match_time')}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50 cursor-pointer z-10" />
                <Input
                  id="matchTime"
                  type="time"
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                  className="pl-10 bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                  onClick={(e) => {
                    try {
                      (e.target as HTMLInputElement).showPicker();
                    } catch (error) {}
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Статус матча и тип матча на одном уровне */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="matchStatus" className="text-vista-light/40 font-normal">{t('addMatchModal.status')}</Label>
              <Select
                value={matchStatus}
                onValueChange={v => setMatchStatus(v as 'SCHEDULED' | 'FINISHED')}
              >
                              <SelectTrigger className="w-full bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9">
                <SelectValue placeholder={t('addMatchModal.select_status')} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                <SelectItem value="SCHEDULED" className="text-vista-light">{t('addMatchModal.scheduled')}</SelectItem>
                <SelectItem value="FINISHED" className="text-vista-light">{t('addMatchModal.finished')}</SelectItem>
              </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="isHome" className="text-vista-light/40 font-normal">{t('addMatchModal.match_type')}</Label>
              <Select
                value={isHome ? 'HOME' : 'AWAY'}
                onValueChange={v => setIsHome(v === 'HOME')}
              >
                              <SelectTrigger className="w-full bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9">
                <SelectValue placeholder={t('addMatchModal.select_match_type')} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                <SelectItem value="HOME" className="text-vista-light">{matchTypeLabels.HOME}</SelectItem>
                <SelectItem value="AWAY" className="text-vista-light">{matchTypeLabels.AWAY}</SelectItem>
              </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Выбор команды и счет */}
          <div className="flex gap-4">
            {!isSingleTeam && (
                              <div className="flex-1 flex flex-col space-y-2">
                  <Label htmlFor="teamId" className="text-vista-light/40 font-normal">{t('addMatchModal.team')}</Label>
                <Select 
                  value={teamId} 
                  onValueChange={setTeamId}
                  disabled={loading || teams.length === 0}
                >
                  <SelectTrigger className="w-full bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9">
                    <SelectValue placeholder={t('addMatchModal.select_team')} />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id} className="text-vista-light">
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
                          <div className="w-20 flex flex-col space-y-2">
                <Label htmlFor="teamGoals" className="text-vista-light/40 font-normal">{t('addMatchModal.goals')}</Label>
                <Input
                  id="teamGoals"
                  type="number"
                  min="0"
                  value={teamGoals}
                  onChange={(e) => setTeamGoals(parseInt(e.target.value))}
                  className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9"
                disabled={matchStatus !== 'FINISHED'}
                  onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                />
            </div>
          </div>
          
          {/* Команда соперника и счет */}
          <div className="flex gap-4">
                          <div className="flex-1 flex flex-col space-y-2">
                <Label htmlFor="opponentName" className="text-vista-light/40 font-normal">{t('addMatchModal.opponent')}</Label>
                <Input
                  id="opponentName"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  placeholder={t('addMatchModal.opponent_placeholder')}
                  className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9"
                />
              </div>
            <div className="w-20 flex flex-col space-y-2">
              <Label htmlFor="opponentGoals" className="text-vista-light/40 font-normal">{t('addMatchModal.goals')}</Label>
                <Input
                  id="opponentGoals"
                  type="number"
                  min="0"
                  value={opponentGoals}
                  onChange={(e) => setOpponentGoals(parseInt(e.target.value))}
                  className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 h-9"
                disabled={matchStatus !== 'FINISHED'}
                  onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                />
            </div>
          </div>
          
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={onClose} className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal">
              {t('addMatchModal.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || loading} 
              className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
            >
              {submitting ? t('addMatchModal.saving') : t('addMatchModal.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 