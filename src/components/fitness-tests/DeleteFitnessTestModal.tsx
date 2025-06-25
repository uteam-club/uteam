import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteFitnessTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: { id: string; name: string } | null;
  onSuccess: () => void;
}

export default function DeleteFitnessTestModal({ open, onOpenChange, test, onSuccess }: DeleteFitnessTestModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fitness-tests/${test?.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Ошибка при удалении');
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      setError('Ошибка при удалении');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark text-vista-light rounded-xl p-6 shadow-xl border-vista-secondary/30">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-vista-light">Удалить тест</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>Вы точно хотите удалить тест <b className="text-vista-primary">"{test?.name}"</b>? Все результаты будут потеряны.</div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
        <DialogFooter className="mt-6 flex flex-row gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="min-w-[100px]">Отмена</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading} className="min-w-[100px]">
            {loading ? <span className="animate-pulse">Удаляю...</span> : 'Да, удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 