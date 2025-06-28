import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';
import { TimezoneSelect } from '../ui/timezone-select';

interface EditTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: { name: string; timezone: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  error?: string;
  loading?: boolean;
}

export const EditTeamModal: React.FC<EditTeamModalProps> = ({ open, onOpenChange, team, onChange, onSave, onCancel, error, loading }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">Редактировать команду</DialogTitle>
      </DialogHeader>
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">{error}</div>
      )}
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="team-name" className="text-vista-light/70 font-normal">Название команды</Label>
          <Input id="team-name" name="name" value={team.name} onChange={onChange} className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light" placeholder="Введите название" disabled={loading} />
        </div>
        <div className="space-y-2">
          <TimezoneSelect
            value={team.timezone}
            onChange={tz => onChange({ target: { name: 'timezone', value: tz } } as any)}
            label="Часовой пояс команды"
            placeholder="Выберите часовой пояс"
            disabled={loading}
          />
        </div>
      </div>
      <DialogFooter className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0" disabled={loading}>Отмена</Button>
        <Button onClick={onSave} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
); 