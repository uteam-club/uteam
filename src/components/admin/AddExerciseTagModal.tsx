import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

interface AddExerciseTagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTag: { name: string; categoryId: string };
  categories: { id: string; name: string }[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCategoryChange: (categoryId: string) => void;
  onAdd: () => void;
  onCancel: () => void;
  error?: string;
  loading?: boolean;
}

export const AddExerciseTagModal: React.FC<AddExerciseTagModalProps> = ({ open, onOpenChange, newTag, categories, onChange, onCategoryChange, onAdd, onCancel, error, loading }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md w-full overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center mb-2 text-vista-light">{t('adminPage.add_tag')}</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">{error}</div>
        )}
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="exercise-tag-name" className="text-vista-light/70 font-normal">{t('adminPage.tag_name')}</Label>
            <Input id="exercise-tag-name" name="name" value={newTag.name} onChange={onChange} className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light" placeholder={t('adminPage.placeholder_tagName')} disabled={loading}  autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exercise-tag-category" className="text-vista-light/70 font-normal">{t('adminPage.category')}</Label>
            <Select value={newTag.categoryId} onValueChange={onCategoryChange} disabled={loading}>
              <SelectTrigger id="exercise-tag-category" className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                <SelectValue placeholder={t('adminPage.select_category')} />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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