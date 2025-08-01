import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrainingCategories } from '@/hooks/useExerciseData';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface Team {
  id: string;
  name: string;
}
interface Category {
  id: string;
  name: string;
}
interface CreateTrainingModalProps {
  isOpen: boolean;
  initialDate: Date | null;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTrainingModal({ isOpen, initialDate, onClose, onCreated }: CreateTrainingModalProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { categories = [], isLoading: isLoadingCategories } = useTrainingCategories();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [newTraining, setNewTraining] = useState({
    title: '',
    teamId: '',
    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : '',
    time: '12:00',
    categoryId: '',
    type: 'TRAINING',
  });
  const [errors, setErrors] = useState({
    title: '',
    teamId: '',
    date: '',
    categoryId: ''
  });

  const isSingleTeam = teams.length === 1;

  useEffect(() => {
    async function fetchTeams() {
      try {
        setIsLoadingTeams(true);
        const response = await fetch('/api/teams', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!response.ok) throw new Error('Не удалось загрузить команды');
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        setTeams([]);
      } finally {
        setIsLoadingTeams(false);
      }
    }
    if (session?.user && isOpen) fetchTeams();
  }, [session, isOpen]);

  useEffect(() => {
    setNewTraining((prev) => ({ ...prev, date: initialDate ? format(initialDate, 'yyyy-MM-dd') : '' }));
  }, [initialDate]);

  useEffect(() => {
    if (isSingleTeam && teams[0]) {
      setNewTraining((prev) => ({ ...prev, teamId: teams[0].id }));
    }
  }, [isSingleTeam, teams]);

  const handleInputChange = (field: string, value: string) => {
    setNewTraining((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    let hasError = false;
    const newErrors = { title: '', teamId: '', date: '', categoryId: '' };
    if (!newTraining.title) { newErrors.title = t('trainingsPage.validation_title_required'); hasError = true; }
    if (!isSingleTeam && !newTraining.teamId) { newErrors.teamId = t('trainingsPage.validation_team_required'); hasError = true; }
    if (!newTraining.date) { newErrors.date = t('trainingsPage.validation_date_required'); hasError = true; }
    if (!newTraining.categoryId) { newErrors.categoryId = t('trainingsPage.validation_category_required'); hasError = true; }
    setErrors(newErrors);
    if (hasError) return;
    try {
      const response = await fetch('/api/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTraining),
      });
      if (!response.ok) throw new Error(t('trainingsPage.error_creating_training'));
      setNewTraining({ title: '', teamId: '', date: '', time: '12:00', categoryId: '', type: 'TRAINING' });
      onCreated();
      onClose();
    } catch (error) {
      // Можно добавить toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">{t('trainingsPage.create_modal_title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-vista-light/40 font-normal">{t('trainingsPage.title_label')}</Label>
            <Input
              id="title"
              value={newTraining.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
              placeholder={t('trainingsPage.title_placeholder')}
            />
            {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
          </div>
          {!isSingleTeam && (
            <>
              <Label htmlFor="team" className="text-vista-light/40 font-normal">{t('trainingsPage.team_label')}</Label>
              <Select
                value={newTraining.teamId}
                onValueChange={(value) => handleInputChange('teamId', value)}
                disabled={isLoadingTeams}
              >
                <SelectTrigger 
                  id="team"
                  className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
                >
                  <SelectValue placeholder={isLoadingTeams ? t('trainingsPage.loading') : t('trainingsPage.select_team_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.teamId && <p className="text-red-500 text-sm">{errors.teamId}</p>}
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-vista-light/40 font-normal">{t('trainingsPage.date_label')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Input
                  id="modal-training-date"
                  type="date"
                  value={newTraining.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                  onClick={(e) => {
                    try {
                      (e.target as HTMLInputElement).showPicker();
                    } catch (error) {}
                  }}
                />
                {errors.date && <p className="text-red-500 text-sm">{errors.date}</p>}
              </div>
              <div className="relative">
                <Input
                  id="modal-training-time"
                  type="time"
                  value={newTraining.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                  onClick={(e) => {
                    try {
                      (e.target as HTMLInputElement).showPicker();
                    } catch (error) {}
                  }}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category" className="text-vista-light/40 font-normal">{t('trainingsPage.category_label')}</Label>
            <Select
              value={newTraining.categoryId}
              onValueChange={(value) => handleInputChange('categoryId', value)}
              disabled={isLoadingCategories}
            >
              <SelectTrigger 
                id="category"
                className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
              >
                <SelectValue placeholder={isLoadingCategories ? t('trainingsPage.loading') : t('trainingsPage.select_category_placeholder')} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                {categories.map((category: Category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-red-500 text-sm">{errors.categoryId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type" className="text-vista-light/40 font-normal">{t('trainingsPage.type_label')}</Label>
            <Select
              value={newTraining.type}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              <SelectTrigger 
                id="training-type"
                className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
              >
                <SelectValue placeholder={t('trainingsPage.select_type_placeholder')} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                <SelectItem value="TRAINING">{t('trainingsPage.type_training')}</SelectItem>
                <SelectItem value="GYM">{t('trainingsPage.type_gym')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
          >
            {t('common.cancel')}
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow-sm"
          >
            {t('trainingsPage.create_training_btn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 