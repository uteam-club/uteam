import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  onEditChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { name: string; value: string } }) => void;
  // Новые пропсы для редактирования тегов и картинки
  filteredEditTags?: { id: string; name: string }[];
  onEditTagToggle?: (tagId: string) => void;
  onEditFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filePreviewEdit?: string | null;
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
  filteredEditTags = [],
  onEditTagToggle,
  onEditFileChange,
  filePreviewEdit,
  editErrors,
  loading = false,
  categories = [],
}) => {
  const { t } = useTranslation();
  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent 
      className={`bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-h-[80vh] overflow-y-auto focus:outline-none focus:ring-0 mt-8 custom-scrollbar ${isEditMode ? 'max-w-md' : (exercise && exercise.mediaItems && exercise.mediaItems.length > 0 ? 'max-w-xl' : 'max-w-md')}`}
      aria-describedby="exercise-description"
    >
      {exercise && (
        <>
          <DialogHeader>
            <DialogTitle className="text-lg text-vista-light">
                {isEditMode ? t('exercisesPage.edit_modal_title') : exercise.title}
            </DialogTitle>
            <DialogDescription id="exercise-description" className="sr-only">
              {isEditMode ? t('exercisesPage.edit_modal_title') : (exercise.description || exercise.title)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            {isEditMode ? (
              <div className="grid gap-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-title" className="text-vista-light/40 font-normal">{t('exercisesPage.title_label')}</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    value={editForm.title}
                    onChange={onEditChange}
                    className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                    disabled={loading}
                  />
                  {editErrors.title && <p className="text-red-400 text-sm">{editErrors.title}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-description" className="text-vista-light/40 font-normal">{t('exercisesPage.description_label')}</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    value={editForm.description}
                    onChange={onEditChange}
                    className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                    disabled={loading}
                  />
                  {editErrors.description && <p className="text-red-400 text-sm">{editErrors.description}</p>}
                </div>
                              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-width" className="text-vista-light/40 font-normal">{t('exercisesPage.width_label')}</Label>
                  <Input
                    id="edit-width"
                    name="width"
                    type="number"
                    value={editForm.width}
                    onChange={onEditChange}
                    className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                    disabled={loading}
                    onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-length" className="text-vista-light/40 font-normal">{t('exercisesPage.length_label')}</Label>
                  <Input
                    id="edit-length"
                    name="length"
                    type="number"
                    value={editForm.length}
                    onChange={onEditChange}
                    className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                    disabled={loading}
                    onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                  />
                </div>
              </div>
              
              {/* Категория и теги на одном уровне */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-category" className="text-vista-light/40 font-normal">{t('exercisesPage.category_label')}</Label>
                  <Select
                    value={editForm.categoryId}
                    onValueChange={value => onEditChange({ target: { name: 'categoryId', value } } as any)}
                    disabled={loading}
                  >
                    <SelectTrigger 
                      id="edit-category"
                      className="bg-vista-dark border border-vista-secondary/30 text-vista-light rounded-md px-3 py-2 focus:outline-none focus:ring-0 min-h-[40px]"
                    >
                      <SelectValue placeholder={t('exercisesPage.select_category_placeholder')} />
                    </SelectTrigger>
                    <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-vista-light">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editErrors.categoryId && <p className="text-red-400 text-sm">{editErrors.categoryId}</p>}
                </div>
                
                <div className="space-y-2">
                    <Label className="text-vista-light/40 font-normal">{t('exercisesPage.tags_label')}</Label>
                  <Select
                    value={editForm.tags.length > 0 ? 'selected' : 'all'}
                    onValueChange={value => { if (value === 'all') onEditTagToggle && onEditTagToggle('clear'); }}
                    disabled={loading || filteredEditTags.length === 0}
                  >
                    <SelectTrigger className="bg-vista-dark border border-vista-secondary/30 text-vista-light rounded-md px-3 py-2 focus:outline-none focus:ring-0 min-h-[40px]">
                        <SelectValue placeholder={t('exercisesPage.select_tags')}>
                        {editForm.tags.length > 0
                          ? `${editForm.tags.length} ${t('exercisesPage.selected_tags')}`
                            : t('exercisesPage.select_tags')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg max-h-60 overflow-y-auto min-w-[220px] custom-scrollbar">
                      {filteredEditTags.length === 0 ? (
                          <div className="px-3 py-2 text-vista-light/50 text-sm">{t('exercisesPage.no_tags_for_category')}</div>
                      ) : (
                        <div className="p-2 space-y-1">
                          <button
                            type="button"
                            className="mb-2 w-full text-left text-xs text-vista-light/60 hover:text-vista-primary"
                            onClick={e => { e.preventDefault(); onEditTagToggle && onEditTagToggle('clear'); }}
                          >
                              {t('exercisesPage.clear_selection')}
                          </button>
                          {filteredEditTags.map(tag => (
                            <div key={tag.id} className="flex items-center gap-2 py-1">
                              <input
                                type="checkbox"
                                checked={editForm.tags.includes(tag.id)}
                                onChange={() => onEditTagToggle && onEditTagToggle(tag.id)}
                                className="accent-vista-primary"
                                id={`edit-tag-${tag.id}`}
                                disabled={loading}
                              />
                              <label htmlFor={`edit-tag-${tag.id}`} className="text-sm cursor-pointer">
                                {tag.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Отображение выбранных тегов */}
              {editForm.tags.length > 0 && (
                <div className="bg-vista-dark/20 backdrop-blur-sm border border-vista-light/10 rounded-lg p-3">
                  <div className="flex flex-wrap gap-2">
                    {editForm.tags.map((tagId) => {
                      const tag = filteredEditTags.find(t => t.id === tagId);
                      return tag ? (
                        <div key={tag.id} className="bg-vista-primary/20 border border-vista-primary/30 text-vista-primary px-2 py-1 rounded-md text-xs flex items-center gap-1">
                          <span className="text-vista-primary">•</span>
                          {tag.name}
                          <button 
                            onClick={() => onEditTagToggle && onEditTagToggle(tag.id)} 
                            className="ml-1 hover:bg-vista-primary/30 rounded-full p-0.5 transition-colors"
                            disabled={loading}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

                {/* Замена изображения */}
                <div className="space-y-2">
                    <Label htmlFor="edit-file" className="text-vista-light/40 font-normal">{t('exercisesPage.media_label')}</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        id="edit-file"
                        name="file"
                        type="file"
                        accept="image/*,video/*"
                        onChange={onEditFileChange}
                        className="hidden"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('edit-file')?.click()}
                        disabled={loading}
                        className="bg-transparent border border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 h-9 px-3 font-normal flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {t('exercisesPage.choose_file')}
                      </Button>
                      <span className="text-vista-light/60 text-sm">
                        {filePreviewEdit ? t('exercisesPage.file_selected') : t('exercisesPage.no_file_selected')}
                      </span>
                    </div>
                    {filePreviewEdit && (
                      <div className="mt-2">
                          <img src={filePreviewEdit} alt={t('exercisesPage.media_preview_alt')} className="max-h-40 rounded-md border border-vista-secondary/30" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Медиафайл сверху */}
                <div className="mb-3 flex justify-center">
                  {exercise.mediaItems && exercise.mediaItems.length > 0 ? (
                    <img
                      src={exercise.mediaItems[0].publicUrl}
                      alt={exercise.title}
                      className="max-w-xl w-full max-h-64 object-contain rounded-md bg-vista-dark/70 mx-auto"
                      style={{ display: 'block' }}
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center bg-vista-dark/70 rounded-md text-vista-light/40 text-sm">
                        {t('exercisesPage.no_media')}
                    </div>
                  )}
                </div>
                {/* Категория и теги на одной строке */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="inline-block"><span className="bg-vista-primary/20 text-vista-primary text-xs rounded px-2 py-1">{exercise.category?.name || '-'}</span></span>
                  {exercise.tags.length > 0 ? (
                    exercise.tags.map(tag => (
                      <span key={tag.id} className="bg-vista-secondary/20 text-vista-light/90 text-xs rounded px-2 py-1">{tag.name}</span>
                    ))
                  ) : (
                      <span className="text-vista-light/50 text-xs">{t('exercisesPage.no_tags')}</span>
                  )}
                </div>
                {/* Название */}
                <div className="mb-2">
                  <h3 className="text-base font-semibold text-vista-light mb-1">{exercise.title}</h3>
                </div>
                {/* Описание */}
                <div className="mb-3">
                  <p className="text-vista-light/70 whitespace-pre-line text-sm">{exercise.description}</p>
                </div>
                {/* Размеры площадки */}
                {(exercise.length || exercise.width) && (
                  <div className="flex gap-4 mb-3 text-xs text-vista-light/60">
                      {exercise.length && <span>{t('exercisesPage.length_label')}: {exercise.length} м</span>}
                      {exercise.width && <span>{t('exercisesPage.width_label')}: {exercise.width} м</span>}
                  </div>
                )}
                {/* Автор */}
                <div className="mt-3">
                    <h4 className="text-xs font-medium text-vista-light/70 mb-1">{t('exercisesPage.author')}:</h4>
                    <p className="text-vista-light text-sm">{exercise.author?.name || t('exercisesPage.unknown')}</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            {isEditMode ? (
              <>
                  <Button 
                    variant="outline" 
                    onClick={onCancel} 
                    disabled={loading}
                    className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button 
                    onClick={onSave} 
                    disabled={loading}
                    className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
                  >
                    {t('common.save')}
                  </Button>
              </>
            ) : (
              <>
                  <Button 
                    onClick={onEdit} 
                    disabled={loading}
                    className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
                  >
                    {t('exercisesPage.edit_btn')}
                  </Button>
                  <Button 
                    onClick={onDelete} 
                    disabled={loading}
                    className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
                  >
                    {t('exercisesPage.delete_btn')}
                  </Button>
              </>
            )}
          </DialogFooter>
        </>
      )}
    </DialogContent>
  </Dialog>
);
};

export default PreviewExerciseModal; 