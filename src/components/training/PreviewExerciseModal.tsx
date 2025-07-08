import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface User { id: string; name: string; }
interface Category { id: string; name: string; }
interface Tag { id: string; name: string; exerciseCategoryId: string; }
interface Exercise {
  id: string;
  title: string;
  description: string;
  authorId: string;
  author: User;
  categoryId: string;
  category: Category;
  tags: Tag[];
  createdAt: string;
  width?: number;
  length?: number;
  mediaItems?: { id: string; name: string; type: string; url: string; publicUrl: string; }[];
}

interface PreviewExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  isEditMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
  editForm: {
    title: string;
    description: string;
    length: string;
    width: string;
    categoryId: string;
    tags: string[];
    file: File | null;
  };
  onEditChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  editErrors: {
    title?: string;
    description?: string;
    categoryId?: string;
    [key: string]: any;
  };
  loading?: boolean;
  categories?: Category[];
}

const PreviewExerciseModal: React.FC<PreviewExerciseModalProps> = ({
  open,
  onOpenChange,
  exercise,
  isEditMode,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  editForm,
  onEditChange,
  editErrors,
  loading = false,
  categories = [],
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={`bg-vista-dark border-vista-secondary/30 text-vista-light max-h-[90vh] overflow-y-auto focus:outline-none focus:ring-0 mt-8 ${exercise && exercise.mediaItems && exercise.mediaItems.length > 0 ? 'max-w-2xl' : 'max-w-lg'}`}>
      {exercise && (
        <>
          <DialogHeader>
            <DialogTitle className="text-xl text-vista-light">
              {isEditMode ? 'Редактирование упражнения' : exercise.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isEditMode ? (
              <>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="edit-title" className="text-vista-light/40 font-normal">Название</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    value={editForm.title}
                    onChange={onEditChange}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                    disabled={loading}
                  />
                  {editErrors.title && <p className="text-red-400 text-sm">{editErrors.title}</p>}
                </div>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="edit-description" className="text-vista-light/40 font-normal">Описание</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    value={editForm.description}
                    onChange={onEditChange}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                    disabled={loading}
                  />
                  {editErrors.description && <p className="text-red-400 text-sm">{editErrors.description}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-width" className="text-vista-light/40 font-normal">Ширина (м)</Label>
                    <Input
                      id="edit-width"
                      name="width"
                      type="number"
                      value={editForm.width}
                      onChange={onEditChange}
                      className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-length" className="text-vista-light/40 font-normal">Длина (м)</Label>
                    <Input
                      id="edit-length"
                      name="length"
                      type="number"
                      value={editForm.length}
                      onChange={onEditChange}
                      className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="edit-category" className="text-vista-light/40 font-normal">Категория</Label>
                  <select
                    id="edit-category"
                    name="categoryId"
                    value={editForm.categoryId}
                    onChange={onEditChange}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light rounded-md px-3 py-2 focus:outline-none focus:ring-0"
                    disabled={loading}
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {editErrors.categoryId && <p className="text-red-400 text-sm">{editErrors.categoryId}</p>}
                </div>
              </>
            ) : (
              <>
                {/* Медиафайл сверху */}
                <div className="mb-4 flex justify-center">
                  {exercise.mediaItems && exercise.mediaItems.length > 0 ? (
                    <img
                      src={exercise.mediaItems[0].publicUrl}
                      alt={exercise.title}
                      className="max-w-2xl w-full max-h-96 object-contain rounded-md bg-vista-dark/70 mx-auto"
                      style={{ display: 'block' }}
                    />
                  ) : (
                    <div className="w-full h-64 flex items-center justify-center bg-vista-dark/70 rounded-md text-vista-light/40">
                      Нет медиа
                    </div>
                  )}
                </div>
                {/* Категория и теги на одной строке */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-block"><span className="bg-vista-primary/20 text-vista-primary text-xs rounded px-2 py-1">{exercise.category?.name || '-'}</span></span>
                  {exercise.tags.length > 0 ? (
                    exercise.tags.map(tag => (
                      <span key={tag.id} className="bg-vista-secondary/20 text-vista-light/90 text-xs rounded px-2 py-1">{tag.name}</span>
                    ))
                  ) : (
                    <span className="text-vista-light/50 text-xs">Теги: -</span>
                  )}
                </div>
                {/* Название */}
                <div className="mb-2">
                  <h3 className="text-lg font-semibold text-vista-light mb-1">{exercise.title}</h3>
                </div>
                {/* Описание */}
                <div className="mb-4">
                  <p className="text-vista-light/70 whitespace-pre-line">{exercise.description}</p>
                </div>
                {/* Размеры площадки */}
                {(exercise.length || exercise.width) && (
                  <div className="flex gap-4 mb-4 text-xs text-vista-light/60">
                    {exercise.length && <span>Длина: {exercise.length} м</span>}
                    {exercise.width && <span>Ширина: {exercise.width} м</span>}
                  </div>
                )}
                {/* Автор */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-vista-light/70 mb-1">Автор:</h4>
                  <p className="text-vista-light">{exercise.author?.name || 'Неизвестно'}</p>
                </div>
              </>
            )}
          </div>
          {/* Кнопки управления */}
          <DialogFooter className="flex justify-end gap-2 mt-4">
            {isEditMode ? (
              <>
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
                  disabled={loading}
                >
                  Сохранить
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
                  disabled={loading}
                >
                  Редактировать
                </Button>
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 focus:outline-none focus:ring-0"
                  disabled={loading}
                >
                  Удалить
                </Button>
              </>
            )}
          </DialogFooter>
        </>
      )}
    </DialogContent>
  </Dialog>
);

export default PreviewExerciseModal; 