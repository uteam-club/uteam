import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';
import { TimezoneSelect } from '../ui/timezone-select';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { useTranslation } from 'react-i18next';

interface AddTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTeam: { name: string; timezone: string; type: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onAdd: () => void;
  onCancel: () => void;
  error?: string;
  loading?: boolean;
}

export const AddTeamModal: React.FC<AddTeamModalProps> = ({ open, onOpenChange, newTeam, onChange, onAdd, onCancel, error, loading }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">{t('adminPage.add_team')}</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">{error}</div>
        )}
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-vista-light/70 font-normal">{t('adminPage.team_name')}</Label>
            <Input id="team-name" name="name" value={newTeam.name} onChange={onChange} className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light" placeholder={t('adminPage.placeholder_teamName')} disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-type" className="text-vista-light/70 font-normal">{t('adminPage.team_type')}</Label>
            <Select value={newTeam.type} onValueChange={value => onChange({ target: { name: 'type', value } } as any)} disabled={loading}>
              <SelectTrigger id="team-type" className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light">
                <SelectValue placeholder={t('adminPage.team_type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="academy">{t('adminPage.academy')}</SelectItem>
                <SelectItem value="contract">{t('adminPage.contract')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <TimezoneSelect
              value={newTeam.timezone}
              onChange={tz => onChange({ target: { name: 'timezone', value: tz } } as any)}
              label={t('adminPage.timezone_label')}
              placeholder={t('adminPage.select_timezone')}
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0" disabled={loading}>{t('adminPage.cancel')}</Button>
          <Button onClick={onAdd} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0" disabled={loading}>{loading ? t('adminPage.saving') : t('adminPage.add')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 