import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { useTranslation } from 'react-i18next';
import { Upload, File } from 'lucide-react';

interface CreateExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newExercise: {
    title: string;
    description: string;
    categoryId: string;
    width?: string;
    length?: string;
    tags: string[];
    [key: string]: any;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  errors: {
    title?: string;
    description?: string;
    categoryId?: string;
    width?: string;
    length?: string;
    [key: string]: any;
  };
  loading?: boolean;
  categories?: { id: string; name: string }[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  filePreview?: string;
  filteredTags: { id: string; name: string }[];
  onTagToggle: (tagId: string) => void;
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
  onFileChange,
  filePreview,
  filteredTags,
  onTagToggle,
}) => {
  const { t } = useTranslation();
  return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-y-auto max-h-[80vh] focus:outline-none focus:ring-0 custom-scrollbar">
      <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">{t('exercisesPage.create_modal_title')}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4 custom-scrollbar">
        <div className="space-y-2">
            <Label htmlFor="new-title" className="text-vista-light/40 font-normal">{t('exercisesPage.title_label')}</Label>
          <Input id="new-title"
            name="title"
            value={newExercise.title}
            onChange={onChange}
            className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
            disabled={loading}
           autoComplete="off" />
          {errors.title && (
            <p className="text-red-400 text-sm">{errors.title}</p>
          )}
        </div>
        <div className="space-y-2">
            <Label htmlFor="new-description" className="text-vista-light/40 font-normal">{t('exercisesPage.description_label')}</Label>
          <Textarea
            id="new-description"
            name="description"
            value={newExercise.description}
            onChange={onChange}
            className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
            disabled={loading}
          />
          {errors.description && (
            <p className="text-red-400 text-sm">{errors.description}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
              <Label htmlFor="new-width" className="text-vista-light/40 font-normal">{t('exercisesPage.width_label')}</Label>
            <Input id="new-width"
              name="width"
              type="number"
              value={newExercise.width || ''}
              onChange={onChange}
              className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
              disabled={loading}
              onFocus={e => { if (e.target.value === '0') e.target.value = ''; }} autoComplete="off" />
          </div>
          <div className="space-y-2">
              <Label htmlFor="new-length" className="text-vista-light/40 font-normal">{t('exercisesPage.length_label')}</Label>
            <Input id="new-length"
              name="length"
              type="number"
              value={newExercise.length || ''}
              onChange={onChange}
              className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
              disabled={loading}
              onFocus={e => { if (e.target.value === '0') e.target.value = ''; }} autoComplete="off" />
          </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="new-category" className="text-vista-light/40 font-normal">{t('exercisesPage.category_label')}</Label>
          <Select
            value={newExercise.categoryId}
            onValueChange={value => onChange({ target: { name: 'categoryId', value } } as any)}
            disabled={loading}
          >
            <SelectTrigger className="bg-vista-dark border-vista-secondary/30 text-vista-light rounded-md px-3 py-2 focus:outline-none focus:ring-0">
                <SelectValue placeholder={t('exercisesPage.select_category_placeholder')} />
            </SelectTrigger>
            <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-vista-light">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && (
            <p className="text-red-400 text-sm">{errors.categoryId}</p>
          )}
        </div>
        <div className="space-y-2">
            <Label className="text-vista-light/40 font-normal">{t('exercisesPage.tags_label')}</Label>
          <Select
            value={newExercise.tags.length > 0 ? 'selected' : 'all'}
            onValueChange={value => { if (value === 'all') onTagToggle('clear'); }}
            disabled={loading || filteredTags.length === 0}
          >
            <SelectTrigger className="bg-vista-dark border-vista-secondary/30 text-vista-light rounded-md px-3 py-2 focus:outline-none focus:ring-0 min-h-[40px]">
                <SelectValue placeholder={t('exercisesPage.select_tags')}>
                {newExercise.tags.length > 0
                  ? filteredTags.filter(tag => newExercise.tags.includes(tag.id)).map(tag => tag.name).join(', ')
                    : t('exercisesPage.select_tags')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light shadow-lg max-h-60 overflow-y-auto min-w-[220px] custom-scrollbar">
              {filteredTags.length === 0 ? (
                  <div className="px-3 py-2 text-vista-light/50 text-sm">{t('exercisesPage.no_tags_for_category')}</div>
              ) : (
                <div className="p-2 space-y-1">
                  <button
                    type="button"
                    className="mb-2 w-full text-left text-xs text-vista-light/60 hover:text-vista-primary"
                    onClick={e => { e.preventDefault(); onTagToggle('clear'); }}
                  >
                      {t('exercisesPage.clear_selection')}
                  </button>
                  {filteredTags.map(tag => (
                    <div key={tag.id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={newExercise.tags.includes(tag.id)}
                        onChange={() => onTagToggle(tag.id)}
                        className="accent-vista-primary"
                        id={`tag-${tag.id}`}
                        disabled={loading}
                      />
                      <label htmlFor={`tag-${tag.id}`} className="text-sm cursor-pointer">
                        {tag.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="new-file" className="text-vista-light/40 font-normal">{t('exercisesPage.media_label')}</Label>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                id="new-file"
                name="file"
                type="file"
                accept="image/*,video/*"
                onChange={onFileChange}
                className="hidden"
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('new-file')?.click()}
                disabled={loading}
                className="bg-transparent border border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 h-9 px-3 font-normal flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {t('exercisesPage.choose_file')}
              </Button>
              <span className="text-vista-light/60 text-sm">
                {filePreview ? t('exercisesPage.file_selected') : t('exercisesPage.no_file_selected')}
              </span>
            </div>
            {filePreview && (
              <div className="mt-2">
                  <img src={filePreview} alt={t('exercisesPage.media_preview_alt')} className="max-h-40 rounded-md border border-vista-secondary/30" />
              </div>
            )}
          </div>
        </div>
      </div>
        <DialogFooter className="flex justify-end gap-2 mt-4">
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
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
};

export default CreateExerciseModal; 