import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface CreateExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newExercise: {
    title: string;
    description: string;
    categoryId: string;
    [key: string]: any;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  errors: {
    title?: string;
    description?: string;
    categoryId?: string;
    [key: string]: any;
  };
  loading?: boolean;
  categories?: { id: string; name: string }[];
}

const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({
  open,
  onOpenChange,
  newExercise,
  onChange,
  onSave,
  onCancel,
  errors,
  loading = false,
  categories = [],
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-y-auto max-h-[80vh] backdrop-blur-xl focus:outline-none focus:ring-0">
      <DialogHeader>
        <DialogTitle className="text-vista-light text-xl">Новое упражнение</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4 custom-scrollbar">
        <div className="space-y-2">
          <Label htmlFor="new-title" className="text-vista-light/40 font-normal">Название</Label>
          <Input
            id="new-title"
            name="title"
            value={newExercise.title}
            onChange={onChange}
            className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
            disabled={loading}
          />
          {errors.title && (
            <p className="text-red-400 text-sm">{errors.title}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-description" className="text-vista-light/40 font-normal">Описание</Label>
          <Textarea
            id="new-description"
            name="description"
            value={newExercise.description}
            onChange={onChange}
            className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
            disabled={loading}
          />
          {errors.description && (
            <p className="text-red-400 text-sm">{errors.description}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-category" className="text-vista-light/40 font-normal">Категория</Label>
          <select
            id="new-category"
            name="categoryId"
            value={newExercise.categoryId}
            onChange={onChange}
            className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light rounded-md px-3 py-2 focus:outline-none focus:ring-0"
            disabled={loading}
          >
            <option value="">Выберите категорию</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-red-400 text-sm">{errors.categoryId}</p>
          )}
        </div>
      </div>
      <DialogFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
          disabled={loading}
        >
          Отмена
        </Button>
        <Button
          onClick={onSave}
          className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0"
          disabled={loading || !newExercise.title || !newExercise.description || !newExercise.categoryId}
        >
          {loading ? 'Создание...' : 'Создать'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CreateExerciseModal; 