import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface EditFitnessTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: { id: string; name: string; description?: string } | null;
  onSuccess: () => void;
}

export default function EditFitnessTestModal({ open, onOpenChange, test, onSuccess }: EditFitnessTestModalProps) {
  const [name, setName] = useState(test?.name || '');
  const [description, setDescription] = useState(test?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  React.useEffect(() => {
    setName(test?.name || '');
    setDescription(test?.description || '');
  }, [test]);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fitness-tests/${test?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) throw new Error(t('fitnessTest.save_error'));
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      setError(t('fitnessTest.save_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark text-vista-light rounded-xl p-6 shadow-xl border-vista-secondary/30">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-vista-light">
            {t('fitnessTest.edit_modal_title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <span className="block text-xs text-vista-light/60 mb-1">
              {t('fitnessTest.test_name_label')}
            </span>
            <Input value={name}
              onChange={e => setName(e.target.value)} autoComplete="off"
              disabled={loading}
              className="bg-vista-dark text-vista-light border-vista-secondary/30"
            />
          </div>
          <div>
            <span className="block text-xs text-vista-light/60 mb-1">
              {t('fitnessTest.test_description_label')}
            </span>
            <Input value={description}
              onChange={e => setDescription(e.target.value)} autoComplete="off"
              disabled={loading}
              className="bg-vista-dark text-vista-light border-vista-secondary/30"
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
        <DialogFooter className="mt-6 flex flex-row gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="min-w-[100px]">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || loading} className="min-w-[100px]">
            {loading ? <span className="animate-pulse">{t('common.saving')}</span> : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 