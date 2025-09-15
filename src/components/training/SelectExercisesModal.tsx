import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { X, Check, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generatePaginationPages, isEllipsis } from '@/lib/pagination';

interface Author { id: string; name: string; }
interface Category { id: string; name: string; }
interface Tag { id: string; name: string; }
interface Exercise {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: Tag[];
  mediaItems?: { id: string; url: string; publicUrl?: string; type: string }[];
}

interface SelectExercisesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authors: Author[];
  categories: Category[];
  tags: Tag[];
  exercises: Exercise[];
  selectedExercises: string[];
  onSelect: (exerciseId: string) => void;
  onAdd: () => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedAuthor: string | null;
  setSelectedAuthor: (v: string | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (v: string | null) => void;
  selectedTags: string[];
  setSelectedTags: (v: string[]) => void;
  resetFilters: () => void;
  isLoading: boolean;
  error?: string;
  currentPage: number;
  setCurrentPage: (v: number) => void;
  exercisesPerPage: number;
  filteredExercises: Exercise[];
}

const SelectExercisesModal: React.FC<SelectExercisesModalProps> = (props) => {
  const { t } = useTranslation();
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="bg-vista-dark text-vista-light border-vista-secondary/50 max-w-screen-lg w-[90vw] max-h-[90vh] overflow-hidden flex flex-col shadow-xl focus:outline-none focus:ring-0">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-vista-light text-lg">{t('exercisesModal.title')}</DialogTitle>
        </DialogHeader>
        {/* Фильтры */}
        <div className="space-y-2 mb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Поиск по названию */}
            <div className="relative col-span-1 sm:col-span-2 lg:col-span-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50" />
              <Input placeholder={t('exercisesModal.search_placeholder')}
                value={props.searchQuery}
                onChange={e => props.setSearchQuery(e.target.value)} autoComplete="off"
                className="pl-10 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0"
              />
              {props.searchQuery && (
                <button
                  onClick={() => props.setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-vista-light/50 hover:text-vista-light"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Фильтр по автору */}
            <div>
              <Select
                value={props.selectedAuthor !== null ? props.selectedAuthor : 'all'}
                onValueChange={value => props.setSelectedAuthor(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0">
                  <SelectValue placeholder={t('exercisesModal.author_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  <SelectItem value="all">{t('exercisesModal.all_authors')}</SelectItem>
                  {props.authors.map(author => (
                    <SelectItem key={author.id} value={author.id}>{author.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Фильтр по категории */}
            <div>
              <Select
                value={props.selectedCategory !== null ? props.selectedCategory : 'all'}
                onValueChange={value => props.setSelectedCategory(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0">
                  <SelectValue placeholder={t('exercisesModal.category_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  <SelectItem value="all">{t('exercisesModal.all_categories')}</SelectItem>
                  {props.categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Мультиселект тегов */}
            <div>
              <Select
                value={props.selectedTags.length > 0 ? 'selected' : 'all'}
                onValueChange={value => {
                  if (value === 'all') props.setSelectedTags([]);
                }}
              >
                <SelectTrigger className="w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0">
                  <SelectValue placeholder={t('exercisesModal.tags_placeholder')}>
                    {props.selectedTags.length > 0 ? t('exercisesModal.selected_tags', { count: props.selectedTags.length }) : t('exercisesModal.select_tags')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg max-h-[300px]">
                  <div className="p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => { e.preventDefault(); props.setSelectedTags([]); }}
                      className="mb-2 w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
                    >
                      {t('exercisesModal.clear_selection')}
                    </Button>
                    {props.tags.map(tag => (
                      <div key={tag.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={props.selectedTags.includes(tag.id)}
                          onCheckedChange={checked => {
                            if (checked) props.setSelectedTags([...props.selectedTags, tag.id]);
                            else props.setSelectedTags(props.selectedTags.filter(id => id !== tag.id));
                          }}
                          className="border-vista-secondary/50 data-[state=checked]:bg-vista-primary data-[state=checked]:border-vista-primary focus:outline-none focus:ring-0"
                        />
                        <label htmlFor={`tag-${tag.id}`} className="text-sm font-medium leading-none cursor-pointer">
                          {tag.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Активные фильтры */}
          {(props.searchQuery || props.selectedCategory || props.selectedAuthor || props.selectedTags.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-vista-light/70 text-sm">{t('exercisesModal.active_filters')}</span>
              {props.searchQuery && (
                <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                  {t('exercisesModal.search')}: {props.searchQuery}
                  <button onClick={() => props.setSearchQuery('')}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {props.selectedCategory && (
                <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                  {t('exercisesModal.category')}: {props.categories.find(c => c.id === props.selectedCategory)?.name}
                  <button onClick={() => props.setSelectedCategory(null)}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {props.selectedAuthor && (
                <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                  {t('exercisesModal.author')}: {props.authors.find(a => a.id === props.selectedAuthor)?.name}
                  <button onClick={() => props.setSelectedAuthor(null)}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              {props.selectedTags.length > 0 && (
                <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                  {t('exercisesModal.tags')}: {props.selectedTags.length}
                  <button onClick={() => props.setSelectedTags([])}><X className="h-3 w-3" /></button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={props.resetFilters}
                className="text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20 h-7 px-2 focus:outline-none focus:ring-0"
              >
                {t('exercisesModal.reset_all')}
              </Button>
            </div>
          )}
        </div>
        {/* Список упражнений */}
        <div className="overflow-y-auto flex-grow custom-scrollbar" style={{ maxHeight: 'calc(75vh - 200px)' }}>
          {props.isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
            </div>
          ) : props.error ? (
            <div className="text-center py-12 border border-dashed border-red-500/50 rounded-md">
              <p className="text-red-400">{props.error}</p>
            </div>
          ) : props.filteredExercises.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {props.filteredExercises
                .slice((props.currentPage - 1) * props.exercisesPerPage, props.currentPage * props.exercisesPerPage)
                .map(exercise => (
                  <div
                    key={exercise.id}
                    className={`
                      relative rounded-md border overflow-hidden transition cursor-pointer max-w-[260px] mx-auto w-full shadow-sm hover:shadow-md
                      ${props.selectedExercises.includes(exercise.id)
                        ? 'border-vista-primary ring-1 ring-vista-primary'
                        : 'border-vista-secondary/50'}
                      ${props.selectedExercises.includes(exercise.id)
                        ? 'bg-vista-primary/10'
                        : 'bg-vista-dark/50 hover:bg-vista-dark/70 shadow-sm'}
                    `}
                    onClick={() => props.onSelect(exercise.id)}
                  >
                    {/* Чекбокс выбора */}
                    <div className="absolute top-1 right-1 z-10 bg-vista-dark/70 shadow-sm rounded-full p-[2px]">
                      <div className={`
                        rounded-full h-5 w-5 flex items-center justify-center
                        ${props.selectedExercises.includes(exercise.id)
                          ? 'bg-vista-primary text-vista-dark'
                          : 'bg-vista-dark/80 text-vista-light/50'}
                      `}>
                        {props.selectedExercises.includes(exercise.id) && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                    {/* Медиа изображение */}
                    <div className="relative overflow-hidden bg-vista-dark/30" style={{ aspectRatio: '4/3' }}>
                      {exercise.mediaItems && exercise.mediaItems.length > 0 ? (
                        <img
                          src={exercise.mediaItems[0].publicUrl || exercise.mediaItems[0].url}
                          alt={exercise.title}
                          className="max-h-full max-w-full object-contain"
                          onError={e => {
                            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/ex${exercise.id}/300/200`;
                            (e.target as HTMLImageElement).onerror = null;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-vista-light/50">
                          <span>{t('exercisesModal.no_image')}</span>
                        </div>
                      )}
                    </div>
                    {/* Информация об упражнении */}
                    <div className="p-2">
                      <h4 className="font-medium text-vista-light truncate text-sm leading-tight" title={exercise.title}>
                        {exercise.title}
                      </h4>
                      <div className="mt-1 flex flex-wrap gap-1 justify-between">
                        <Badge className="bg-vista-primary/20 text-vista-primary text-xs h-5.5">
                          {exercise.category.name || t('exercisesModal.no_category')}
                        </Badge>
                        {exercise.tags.slice(0, 2).map(tag => (
                          <Badge key={tag.id} className="bg-vista-secondary/20 text-vista-light/90 text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                        {exercise.tags.length > 2 && (
                          <Badge className="bg-vista-secondary/10 text-vista-light/70 text-xs">
                            +{exercise.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-vista-secondary/50 rounded-md">
              <p className="text-vista-light/60">{t('exercisesModal.no_exercises_found')}</p>
              {(props.searchQuery || props.selectedCategory || props.selectedAuthor || props.selectedTags.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={props.resetFilters}
                  className="mt-4 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
                >
                  <X className="mr-2 h-4 w-4" /> {t('exercisesModal.reset_filters')}
                </Button>
              )}
            </div>
          )}
        </div>
        {/* Пагинация и действия */}
        <DialogFooter className="flex justify-between items-center gap-2 mt-3 py-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="text-vista-light/70 text-sm">
              {t('exercisesModal.selected_count')}: <span className="text-vista-primary font-medium">{props.selectedExercises.length}</span>
            </div>
            {props.filteredExercises.length > props.exercisesPerPage && (
              <nav className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
                  onClick={() => props.setCurrentPage(Math.max(1, props.currentPage - 1))}
                  disabled={props.currentPage === 1}
                >
                  <span className="sr-only">{t('exercisesModal.previous_page')}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
                </Button>
                {generatePaginationPages(props.currentPage, Math.ceil(props.filteredExercises.length / props.exercisesPerPage)).map((page) => {
                  if (isEllipsis(page)) {
                    return (
                      <span key={page} className="w-8 h-8 flex items-center justify-center text-vista-light/60">
                        ...
                      </span>
                    );
                  }
                  
                  return (
                    <Button
                      key={page}
                      variant={props.currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 w-8 p-0 ${props.currentPage === page ? 'bg-vista-primary text-vista-dark' : 'bg-vista-dark/70 text-vista-light border-vista-secondary/50'} focus:outline-none focus:ring-0`}
                      onClick={() => props.setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
                  onClick={() => props.setCurrentPage(Math.min(props.currentPage + 1, Math.ceil(props.filteredExercises.length / props.exercisesPerPage)))}
                  disabled={props.currentPage === Math.ceil(props.filteredExercises.length / props.exercisesPerPage)}
                >
                  <span className="sr-only">{t('exercisesModal.next_page')}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
                </Button>
              </nav>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
            >
              {t('exercisesModal.cancel')}
            </Button>
            <Button
              onClick={props.onAdd}
              className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
              disabled={props.selectedExercises.length === 0}
            >
              {t('exercisesModal.add_selected')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectExercisesModal; 