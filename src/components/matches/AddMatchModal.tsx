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
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">{t('addMatchModal.title')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Тип соревнований */}
          <div className="space-y-2">
            <Label htmlFor="competitionType" className="text-vista-light/40 font-normal">{t('addMatchModal.competition_type')}</Label>
            <Select 
              value={competitionType} 
              onValueChange={setCompetitionType}
            >
              <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                <SelectValue placeholder={t('addMatchModal.select_competition_type')} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/30">
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
              <Input
                id="matchDate"
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchTime" className="text-vista-light/40 font-normal">{t('addMatchModal.match_time')}</Label>
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
            <Label htmlFor="matchStatus" className="text-vista-light/40 font-normal">{t('addMatchModal.status')}</Label>
            <Select
              value={matchStatus}
              onValueChange={v => setMatchStatus(v as 'SCHEDULED' | 'FINISHED')}
            >
              <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                <SelectValue placeholder={t('addMatchModal.select_status')} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/30">
                <SelectItem value="SCHEDULED" className="text-vista-light">{t('addMatchModal.scheduled')}</SelectItem>
                <SelectItem value="FINISHED" className="text-vista-light">{t('addMatchModal.finished')}</SelectItem>
              </SelectContent>
            </Select>
            </div>
          
          {/* Тип матча (домашний/выездной) */}
          <div className="space-y-2">
            <Label htmlFor="isHome" className="text-vista-light/40 font-normal">{t('addMatchModal.match_type')}</Label>
            <Select
              value={isHome ? 'HOME' : 'AWAY'}
              onValueChange={v => setIsHome(v === 'HOME')}
            >
              <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                <SelectValue placeholder={t('addMatchModal.select_match_type')} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/30">
                <SelectItem value="HOME" className="text-vista-light">{matchTypeLabels.HOME}</SelectItem>
                <SelectItem value="AWAY" className="text-vista-light">{matchTypeLabels.AWAY}</SelectItem>
              </SelectContent>
            </Select>
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
                  <SelectTrigger className="w-full bg-vista-dark-lighter border-vista-secondary/30">
                    <SelectValue placeholder={t('addMatchModal.select_team')} />
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
            )}
            <div className="w-20 flex flex-col space-y-2">
              <Label htmlFor="teamGoals" className="text-vista-light/40 font-normal">{t('addMatchModal.goals')}</Label>
                <Input
                  id="teamGoals"
                  type="number"
                  min="0"
                  value={teamGoals}
                  onChange={(e) => setTeamGoals(parseInt(e.target.value))}
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
                disabled={matchStatus !== 'FINISHED'}
                  onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                />
            </div>
          </div>
          
          {/* Команда соперника и счет */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col space-y-2">
              <Label htmlFor="opponentName" className="text-vista-light/40 font-normal mb-2">{t('addMatchModal.opponent')}</Label>
                <Input
                  id="opponentName"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  placeholder={t('addMatchModal.opponent_placeholder')}
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
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
                  className="bg-vista-dark-lighter border-vista-secondary/30 text-vista-light"
                disabled={matchStatus !== 'FINISHED'}
                  onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-vista-secondary/30">
              {t('addMatchModal.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || loading} 
              className="bg-vista-primary hover:bg-vista-primary/90"
            >
              {submitting ? t('addMatchModal.saving') : t('addMatchModal.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 