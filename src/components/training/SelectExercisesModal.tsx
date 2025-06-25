import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { X, Check, Search } from 'lucide-react';

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

const SelectExercisesModal: React.FC<SelectExercisesModalProps> = ({
  open,
  onOpenChange,
  authors,
  categories,
  tags,
  exercises,
  selectedExercises,
  onSelect,
  onAdd,
  searchQuery,
  setSearchQuery,
  selectedAuthor,
  setSelectedAuthor,
  selectedCategory,
  setSelectedCategory,
  selectedTags,
  setSelectedTags,
  resetFilters,
  isLoading,
  error,
  currentPage,
  setCurrentPage,
  exercisesPerPage,
  filteredExercises,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-vista-dark/90 text-vista-light border-vista-secondary/50 max-w-screen-lg w-[90vw] max-h-[90vh] overflow-hidden flex flex-col shadow-xl focus:outline-none focus:ring-0">
      <DialogHeader className="pb-2">
        <DialogTitle className="text-vista-light text-lg">Выбор упражнений</DialogTitle>
      </DialogHeader>
      {/* Фильтры */}
      <div className="space-y-2 mb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Поиск по названию */}
          <div className="relative col-span-1 sm:col-span-2 lg:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50" />
            <Input
              placeholder="Поиск по названию упражнения"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-vista-light/50 hover:text-vista-light"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Фильтр по автору */}
          <div>
            <Select
              value={selectedAuthor !== null ? selectedAuthor : 'all'}
              onValueChange={value => setSelectedAuthor(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0">
                <SelectValue placeholder="Автор" />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                <SelectItem value="all">Все авторы</SelectItem>
                {authors.map(author => (
                  <SelectItem key={author.id} value={author.id}>{author.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Фильтр по категории */}
          <div>
            <Select
              value={selectedCategory !== null ? selectedCategory : 'all'}
              onValueChange={value => setSelectedCategory(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Мультиселект тегов */}
          <div>
            <Select
              value={selectedTags.length > 0 ? 'selected' : 'all'}
              onValueChange={value => {
                if (value === 'all') setSelectedTags([]);
              }}
            >
              <SelectTrigger className="w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0">
                <SelectValue placeholder="Теги">
                  {selectedTags.length > 0 ? `Выбрано тегов: ${selectedTags.length}` : 'Выберите теги'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg max-h-[300px]">
                <div className="p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={e => { e.preventDefault(); setSelectedTags([]); }}
                    className="mb-2 w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
                  >
                    Очистить выбор
                  </Button>
                  {tags.map(tag => (
                    <div key={tag.id} className="flex items-center space-x-2 py-1">
                      <Checkbox
                        id={`tag-${tag.id}`}
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={checked => {
                          if (checked) setSelectedTags([...selectedTags, tag.id]);
                          else setSelectedTags(selectedTags.filter(id => id !== tag.id));
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
        {(searchQuery || selectedCategory || selectedAuthor || selectedTags.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-vista-light/70 text-sm">Активные фильтры:</span>
            {searchQuery && (
              <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                Поиск: {searchQuery}
                <button onClick={() => setSearchQuery('')}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {selectedCategory && (
              <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                Категория: {categories.find(c => c.id === selectedCategory)?.name}
                <button onClick={() => setSelectedCategory(null)}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {selectedAuthor && (
              <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                Автор: {authors.find(a => a.id === selectedAuthor)?.name}
                <button onClick={() => setSelectedAuthor(null)}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {selectedTags.length > 0 && (
              <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                Теги: {selectedTags.length}
                <button onClick={() => setSelectedTags([])}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20 h-7 px-2 focus:outline-none focus:ring-0"
            >
              Сбросить все
            </Button>
          </div>
        )}
      </div>
      {/* Список упражнений */}
      <div className="overflow-y-auto flex-grow" style={{ maxHeight: 'calc(75vh - 200px)' }}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 border border-dashed border-red-500/50 rounded-md">
            <p className="text-red-400">{error}</p>
          </div>
        ) : filteredExercises.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredExercises
              .slice((currentPage - 1) * exercisesPerPage, currentPage * exercisesPerPage)
              .map(exercise => (
                <div
                  key={exercise.id}
                  className={`
                    relative rounded-md border overflow-hidden transition cursor-pointer max-w-[260px] mx-auto w-full shadow-sm hover:shadow-md
                    ${selectedExercises.includes(exercise.id)
                      ? 'border-vista-primary ring-1 ring-vista-primary'
                      : 'border-vista-secondary/50'}
                    ${selectedExercises.includes(exercise.id)
                      ? 'bg-vista-primary/10'
                      : 'bg-vista-dark/50 hover:bg-vista-dark/70 shadow-sm'}
                  `}
                  onClick={() => onSelect(exercise.id)}
                >
                  {/* Чекбокс выбора */}
                  <div className="absolute top-1 right-1 z-10 bg-vista-dark/70 shadow-sm rounded-full p-[2px]">
                    <div className={`
                      rounded-full h-5 w-5 flex items-center justify-center
                      ${selectedExercises.includes(exercise.id)
                        ? 'bg-vista-primary text-vista-dark'
                        : 'bg-vista-dark/80 text-vista-light/50'}
                    `}>
                      {selectedExercises.includes(exercise.id) && <Check className="h-3 w-3" />}
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
                        <span>Нет изображения</span>
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
                        {exercise.category.name || 'Без категории'}
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
            <p className="text-vista-light/60">Упражнения не найдены</p>
            {(searchQuery || selectedCategory || selectedAuthor || selectedTags.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="mt-4 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
              >
                <X className="mr-2 h-4 w-4" /> Сбросить фильтры
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Пагинация и действия */}
      <DialogFooter className="flex justify-between items-center gap-2 mt-3 py-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3">
          <div className="text-vista-light/70 text-sm">
            Выбрано: <span className="text-vista-primary font-medium">{selectedExercises.length}</span>
          </div>
          {filteredExercises.length > exercisesPerPage && (
            <nav className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Предыдущая страница</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
              </Button>
              {Array.from({ length: Math.ceil(filteredExercises.length / exercisesPerPage) }).map((_, index) => (
                <Button
                  key={index}
                  variant={currentPage === index + 1 ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 w-8 p-0 ${currentPage === index + 1 ? 'bg-vista-primary text-vista-dark' : 'bg-vista-dark/70 text-vista-light border-vista-secondary/50'} focus:outline-none focus:ring-0`}
                  onClick={() => setCurrentPage(index + 1)}
                >
                  {index + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
                onClick={() => setCurrentPage(Math.min(currentPage + 1, Math.ceil(filteredExercises.length / exercisesPerPage)))}
                disabled={currentPage === Math.ceil(filteredExercises.length / exercisesPerPage)}
              >
                <span className="sr-only">Следующая страница</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
              </Button>
            </nav>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
          >
            Отмена
          </Button>
          <Button
            onClick={onAdd}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark focus:outline-none focus:ring-0"
            disabled={selectedExercises.length === 0}
          >
            Добавить выбранные
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default SelectExercisesModal; 