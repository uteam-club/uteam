import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';

interface EditExerciseCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: { name: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  error?: string;
  loading?: boolean;
}

export const EditExerciseCategoryModal: React.FC<EditExerciseCategoryModalProps> = ({ open, onOpenChange, category, onChange, onSave, onCancel, error, loading }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">Редактировать категорию упражнения</DialogTitle>
      </DialogHeader>
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">{error}</div>
      )}
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="exercise-category-name" className="text-vista-light/70 font-normal">Название категории</Label>
          <Input id="exercise-category-name" name="name" value={category.name} onChange={onChange} className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light" placeholder="Введите название" disabled={loading} />
        </div>
      </div>
      <DialogFooter className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0" disabled={loading}>Отмена</Button>
        <Button onClick={onSave} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
); 