import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface DeleteFitnessTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: { id: string; name: string } | null;
  onSuccess: () => void;
}

export default function DeleteFitnessTestModal({ open, onOpenChange, test, onSuccess }: DeleteFitnessTestModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fitness-tests/${test?.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(t('fitnessTest.page.delete_test_error'));
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      setError(t('fitnessTest.page.delete_test_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark text-vista-light rounded-xl p-6 shadow-xl border-vista-secondary/30">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-vista-light">{t('fitnessTest.page.delete_test_modal_title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>{t('fitnessTest.page.delete_test_confirm', { name: test?.name })}</div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
        <DialogFooter className="mt-6 flex flex-row gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="min-w-[100px]">{t('common.cancel')}</Button>
          <Button variant="outline" onClick={handleDelete} disabled={loading} className="min-w-[100px] border-vista-error/50 text-vista-error hover:bg-vista-error/10">
            {loading ? <span className="animate-pulse">{t('common.deleting')}</span> : t('fitnessTest.page.delete_test_btn_confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 