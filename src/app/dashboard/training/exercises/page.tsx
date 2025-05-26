'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Filter, Check, ChevronDown, Search, Plus, Upload, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useExercises, 
  useUsers, 
  useCategories, 
  useTags,
  useFilteredExercises,
  FilterParams
} from '@/hooks/useExerciseData';
import { mutate } from 'swr';

interface User {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  exerciseCategoryId: string;
}

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
  mediaItems?: {
    id: string;
    name: string;
    type: string;
    url: string;
    publicUrl: string;
  }[];
}

export default function ExercisesPage() {
  const { data: session } = useSession();
  
  // Состояние для фильтров
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState(false);
  const [createTagsPopoverOpen, setCreateTagsPopoverOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Создаем параметры для серверной фильтрации с мемоизацией
  const filterParams = useMemo<FilterParams>(() => {
    const params: FilterParams = {
      page: currentPage,
      limit: 12 // Меняем limit с 20 на 12 для отображения ровно 12 упражнений на странице
    };
    
    if (searchQuery) {
      params.search = searchQuery;
    }
    
    if (selectedAuthor) {
      params.authorId = selectedAuthor;
    }
    
    if (selectedCategory) {
      params.categoryId = selectedCategory;
    }
    
    if (selectedTags.length > 0) {
      params.tags = selectedTags;
    }
    
    return params;
  }, [searchQuery, selectedAuthor, selectedCategory, selectedTags, currentPage]);
  
  // Используем хуки для получения данных
  const { users, isLoading: usersLoading } = useUsers();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { tags, isLoading: tagsLoading } = useTags();
  const { exercises, pagination, isLoading: exercisesLoading, mutate: mutateExercises } = useFilteredExercises(filterParams);
  
  // Объединяем флаг загрузки и эффективно храним данные
  const isLoading = usersLoading || categoriesLoading || tagsLoading || exercisesLoading;
  
  // Мемоизированные данные для производительности
  const usersData = useMemo(() => users || [], [users]);
  const categoriesData = useMemo(() => categories || [], [categories]);
  const tagsData = useMemo(() => tags || [], [tags]);

  // Состояние для просмотра упражнения
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editExerciseForm, setEditExerciseForm] = useState<{
    title: string;
    description: string;
    length: string;
    width: string;
    categoryId: string;
    tags: string[];
    file: File | null;
  }>({
    title: '',
    description: '',
    length: '',
    width: '',
    categoryId: '',
    tags: [],
    file: null
  });
  const [editTagsPopoverOpen, setEditTagsPopoverOpen] = useState(false);
  const [filePreviewEdit, setFilePreviewEdit] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<{
    title?: string;
    description?: string;
    categoryId?: string;
  }>({});
  
  // Состояния для диалога создания
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newExercise, setNewExercise] = useState<{
    title: string;
    description: string;
    length: string;
    width: string;
    categoryId: string;
    tags: string[];
    file: File | null;
  }>({
    title: '',
    description: '',
    length: '',
    width: '',
    categoryId: '',
    tags: [],
    file: null
  });
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    categoryId?: string;
  }>({});

  // Получение данных при загрузке страницы
  useEffect(() => {
    if (session?.user) {
      // Просто вызываем хуки, которые будут автоматически загружать данные
      // Убираем неиспользуемую функцию fetchData
    }
  }, [session]);

  // Расчетные значения для оптимизации взаимодействия с интерфейсом
  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise: Exercise) => {
      // Фильтр по поисковому запросу
      if (searchQuery && !exercise.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Фильтр по автору
      if (selectedAuthor && exercise.authorId !== selectedAuthor) {
        return false;
      }
      
      // Фильтр по категории
      if (selectedCategory && exercise.categoryId !== selectedCategory) {
        return false;
      }
      
      // Фильтр по тегам
      if (selectedTags.length > 0) {
        const exerciseTagIds = exercise.tags.map((tag: Tag) => tag.id);
        const hasAllSelectedTags = selectedTags.every(tagId => exerciseTagIds.includes(tagId));
        if (!hasAllSelectedTags) {
          return false;
        }
      }
      
      return true;
    });
  }, [exercises, searchQuery, selectedAuthor, selectedCategory, selectedTags]);

  // Проверка наличия активных фильтров
  const hasActiveFilters = searchQuery || selectedAuthor || selectedCategory || selectedTags.length > 0;

  // Получение выбранных имен тегов для отображения
  const selectedTagNames = useMemo(() => {
    return selectedTags.map(tagId => {
      const tag = tagsData.find((t: Tag) => t.id === tagId);
      return tag ? tag.name : '';
    }).filter(Boolean);
  }, [selectedTags, tagsData]);

  // Фильтрация тегов для формы создания по выбранной категории
  const filteredTags = useMemo(() => {
    return newExercise.categoryId
      ? tagsData.filter((tag: Tag) => tag.exerciseCategoryId === newExercise.categoryId)
      : [];
  }, [newExercise.categoryId, tagsData]);

  // Обработчик изменения полей формы редактирования
  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditExerciseForm((prev) => ({ ...prev, [name]: value }));
    
    // Очистка ошибки при вводе
    if (name in editErrors) {
      setEditErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Обработчик выбора категории для редактирования
  const handleEditCategoryChange = (value: string) => {
    setEditExerciseForm((prev) => ({ 
      ...prev, 
      categoryId: value,
      // Сбрасываем теги при смене категории
      tags: []
    }));
    
    // Очистка ошибки при выборе
    setEditErrors((prev) => ({ ...prev, categoryId: undefined }));
  };

  // Обработчик выбора тегов для редактирования
  const handleEditTagToggle = (tagId: string) => {
    setEditExerciseForm((prev) => {
      const isSelected = prev.tags.includes(tagId);
      return {
        ...prev,
        tags: isSelected
          ? prev.tags.filter((id) => id !== tagId)
          : [...prev.tags, tagId]
      };
    });
  };

  // Обработчик загрузки файла для редактирования
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEditExerciseForm((prev) => ({ ...prev, file }));
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviewEdit(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Функция для начала редактирования упражнения
  const startEditExercise = () => {
    if (!previewExercise) return;
    
    setEditExerciseForm({
      title: previewExercise.title,
      description: previewExercise.description,
      length: previewExercise.length?.toString() || '',
      width: previewExercise.width?.toString() || '',
      categoryId: previewExercise.categoryId,
      tags: previewExercise.tags.map(tag => tag.id),
      file: null
    });
    
    // Если есть изображение, устанавливаем его превью
    if (previewExercise.mediaItems && previewExercise.mediaItems.length > 0) {
      setFilePreviewEdit(previewExercise.mediaItems[0].publicUrl);
    } else {
      setFilePreviewEdit(null);
    }
    
    setIsEditMode(true);
  };

  // Валидация формы редактирования
  const validateEditForm = () => {
    const newErrors: {
      title?: string;
      description?: string;
      categoryId?: string;
    } = {};
    
    if (!editExerciseForm.title.trim()) {
      newErrors.title = 'Название упражнения обязательно';
    }
    
    if (!editExerciseForm.description.trim()) {
      newErrors.description = 'Описание упражнения обязательно';
    }
    
    if (!editExerciseForm.categoryId) {
      newErrors.categoryId = 'Категория упражнения обязательна';
    }
    
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Сохранение отредактированного упражнения
  const saveEditedExercise = async () => {
    if (!previewExercise || !validateEditForm()) return;
    
    try {
      // Сохраняем оригинальные данные для возможного отката
      const originalExercise = { ...previewExercise };
      
      // Формируем данные для отправки
      const formData = new FormData();
      formData.append('title', editExerciseForm.title);
      formData.append('description', editExerciseForm.description);
      formData.append('categoryId', editExerciseForm.categoryId);
      
      if (editExerciseForm.length) {
        formData.append('length', editExerciseForm.length);
      }
      
      if (editExerciseForm.width) {
        formData.append('width', editExerciseForm.width);
      }
      
      editExerciseForm.tags.forEach(tagId => {
        formData.append('tags', tagId);
      });
      
      if (editExerciseForm.file) {
        formData.append('file', editExerciseForm.file);
      }
      
      // Создаем "предполагаемое" обновленное упражнение для оптимистичного обновления
      const optimisticExercise = {
        ...previewExercise,
        title: editExerciseForm.title,
        description: editExerciseForm.description,
        categoryId: editExerciseForm.categoryId,
        category: categoriesData.find((c: Category) => c.id === editExerciseForm.categoryId) || previewExercise.category,
        tags: editExerciseForm.tags.map(tagId => 
          tagsData.find((t: Tag) => t.id === tagId)
        ).filter(Boolean) as Tag[],
        length: editExerciseForm.length ? parseFloat(editExerciseForm.length) : previewExercise.length,
        width: editExerciseForm.width ? parseFloat(editExerciseForm.width) : previewExercise.width,
      };
      
      // Закрываем режим редактирования сразу
      setIsEditMode(false);
      
      // Обновляем UI оптимистично
      setPreviewExercise(optimisticExercise);
      
      // Оптимистично обновляем список упражнений
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/exercises/filter'),
        (currentData: any) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            exercises: currentData.exercises.map((ex: Exercise) => 
              ex.id === previewExercise.id ? optimisticExercise : ex
            ),
          };
        },
        false // не делаем ревалидацию сразу
      );
      
      // Отправляем запрос на обновление
      const response = await fetch(`/api/exercises/${previewExercise.id}`, {
        method: 'PUT',
        body: formData,
        cache: 'no-store' // Предотвращаем кеширование запроса
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при обновлении упражнения');
      }
      
      // Получаем обновленные данные
      const updatedExercise = await response.json();
      
      // Используем временную метку для предотвращения кеширования
      const timestamp = Date.now();
      
      // Формируем URL с текущими фильтрами и временной меткой против кеширования
      const filterUrl = `/api/exercises/filter?${new URLSearchParams({
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(selectedAuthor ? { authorId: selectedAuthor } : {}),
        ...(selectedCategory ? { categoryId: selectedCategory } : {}),
        ...(selectedTags.length > 0 ? { tags: selectedTags.join(',') } : {}),
        page: currentPage.toString(),
        limit: '20',
        t: timestamp.toString(), // Добавляем временную метку
      }).toString()}`;
      
      // Принудительно запрашиваем свежие данные
      const freshData = await fetch(filterUrl, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      }).then(res => res.json());
      
      // Обновляем данные в SWR принудительно
      mutate('/api/exercises', undefined, true);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/exercises/filter'), freshData, false);
      
      // Обновляем текущее отображаемое упражнение с данными с сервера
      setPreviewExercise(prevState => {
        if (prevState) {
          // Создаем новый объект с обновленными данными
          return {
            ...updatedExercise,
            // Добавляем данные, которые могут отсутствовать в ответе API
            author: prevState.author,
            category: categoriesData.find((c: Category) => c.id === updatedExercise.categoryId) || prevState.category,
            tags: updatedExercise.tags || prevState.tags
          };
        }
        return null;
      });
      
    } catch (error) {
      console.error('Ошибка при обновлении упражнения:', error);
      alert('Произошла ошибка при обновлении упражнения');
      
      // Восстанавливаем данные в случае ошибки
      mutate('/api/exercises', undefined, true);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/exercises/filter'), undefined, true);
      
      // Возвращаем режим редактирования
      setIsEditMode(true);
    }
  };

  // Функция удаления упражнения
  const deleteExercise = async () => {
    if (!previewExercise) return;
    
    if (!window.confirm('Вы уверены, что хотите удалить это упражнение?')) {
      return;
    }
    
    try {
      // Сохраняем текущий список и ID удаляемого упражнения
      const exerciseIdToDelete = previewExercise.id;
      
      // Оптимистично обновляем UI - удаляем упражнение из списка до ответа сервера
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/exercises/filter'),
        (currentData: any) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            exercises: currentData.exercises.filter(
              (ex: Exercise) => ex.id !== exerciseIdToDelete
            ),
          };
        },
        false // не делаем ревалидацию сразу
      );
      
      // Закрываем модальное окно сразу
      setIsPreviewOpen(false);
      
      // Отправляем запрос на удаление
      const response = await fetch(`/api/exercises/${exerciseIdToDelete}`, {
        method: 'DELETE',
        cache: 'no-store' // Предотвращаем кеширование запроса
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при удалении упражнения');
      }
      
      // После успешного удаления принудительно обновляем данные
      const timestamp = Date.now(); // Используем временную метку для предотвращения кеширования
      
      // Принудительно обновляем все кеши данных с временной меткой
      await fetch(`/api/exercises?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      // Формируем URL с текущими фильтрами и временной меткой против кеширования
      const filterUrl = `/api/exercises/filter?${new URLSearchParams({
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(selectedAuthor ? { authorId: selectedAuthor } : {}),
        ...(selectedCategory ? { categoryId: selectedCategory } : {}),
        ...(selectedTags.length > 0 ? { tags: selectedTags.join(',') } : {}),
        page: currentPage.toString(),
        limit: '20',
        t: timestamp.toString(), // Добавляем временную метку
      }).toString()}`;
      
      // Принудительно запрашиваем свежие данные
      const freshData = await fetch(filterUrl, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      }).then(res => res.json());
      
      // Обновляем данные в SWR принудительно
      mutate('/api/exercises', undefined, true);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/exercises/filter'), freshData, false);
      
    } catch (error) {
      console.error('Ошибка при удалении упражнения:', error);
      alert('Произошла ошибка при удалении упражнения');
      
      // В случае ошибки, восстанавливаем данные
      mutate('/api/exercises', undefined, true);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/exercises/filter'), undefined, true);
    }
  };

  // Фильтрация тегов для формы редактирования по выбранной категории
  const filteredEditTags = useMemo(() => {
    return editExerciseForm.categoryId
      ? tagsData.filter((tag: Tag) => tag.exerciseCategoryId === editExerciseForm.categoryId)
      : [];
  }, [editExerciseForm.categoryId, tagsData]);

  // Функции для пагинации
  const goToNextPage = () => {
    if (pagination.hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (pagination.hasPreviousPage) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  // Функция сброса фильтров
  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedAuthor(null);
    setSelectedCategory(null);
    setSelectedTags([]);
    setCurrentPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-vista-light">Упражнения</CardTitle>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить упражнение
          </Button>
        </CardHeader>
        <CardContent>
          {/* Блок с фильтрами */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Поисковый запрос */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50" />
                <Input 
                  placeholder="Поиск упражнений..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:border-vista-primary"
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
              <Select
                value={selectedAuthor === null ? 'all' : selectedAuthor}
                onValueChange={(value) => setSelectedAuthor(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark/70 border-vista-secondary/30 text-vista-light">
                  <SelectValue placeholder="Выберите автора" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light shadow-lg backdrop-blur-lg">
                  <SelectItem value="all">Все авторы</SelectItem>
                  {usersData.map((user: User) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Фильтр по категории */}
              <Select
                value={selectedCategory === null ? 'all' : selectedCategory}
                onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark/70 border-vista-secondary/30 text-vista-light">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light shadow-lg backdrop-blur-lg">
                  <SelectItem value="all">Все категории</SelectItem>
                  {categoriesData.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Фильтр по тегам (множественный выбор) */}
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-[200px] justify-between bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                  onClick={() => setTagsPopoverOpen(!tagsPopoverOpen)}
                >
                  {selectedTags.length > 0 ? `${selectedTags.length} тегов` : "Выберите теги"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                
                {tagsPopoverOpen && (
                  <div className="absolute z-50 w-full sm:w-[250px] mt-1 bg-vista-dark border border-vista-secondary/30 rounded-md shadow-lg">
                    <div className="p-2">
                      <div className="relative mb-2">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50" />
                        <Input 
                          placeholder="Поиск тега..." 
                          className="pl-8 pr-2 h-9 text-vista-light bg-vista-dark/30 border-vista-secondary/30"
                        />
                      </div>
                      
                      <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                        {tagsData.map((tag: Tag) => {
                          const isSelected = selectedTags.includes(tag.id);
                          return (
                            <div 
                              key={tag.id}
                              className={`flex items-center space-x-2 rounded-md p-2 cursor-pointer hover:bg-vista-secondary/20 ${
                                isSelected ? 'bg-vista-primary/20' : ''
                              }`}
                              onClick={() => {
                                setSelectedTags(
                                  isSelected
                                    ? selectedTags.filter(id => id !== tag.id)
                                    : [...selectedTags, tag.id]
                                );
                              }}
                            >
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTags(
                                    isSelected
                                      ? selectedTags.filter(id => id !== tag.id)
                                      : [...selectedTags, tag.id]
                                  );
                                }}
                                className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                                  isSelected
                                    ? 'border-vista-primary bg-vista-primary' 
                                    : 'border-vista-secondary/50'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3 text-vista-dark" />}
                              </div>
                              <span className="text-vista-light">{tag.name}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-end mt-2 pt-2 border-t border-vista-secondary/30">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mr-2 text-xs border-vista-secondary/30"
                          onClick={() => setSelectedTags([])}
                        >
                          Очистить
                        </Button>
                        <Button 
                          size="sm" 
                          className="text-xs bg-vista-primary text-vista-dark hover:bg-vista-primary/90"
                          onClick={() => setTagsPopoverOpen(false)}
                        >
                          Готово
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          
            {/* Отображение выбранных фильтров */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-sm text-vista-light/70">Активные фильтры:</span>
                
                {searchQuery && (
                  <Badge variant="secondary" className="bg-vista-secondary/20 text-vista-light">
                    Поиск: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedAuthor && (
                  <Badge variant="secondary" className="bg-vista-secondary/20 text-vista-light">
                    Автор: {usersData.find((u: User) => u.id === selectedAuthor)?.name}
                    <button onClick={() => setSelectedAuthor(null)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedCategory && (
                  <Badge variant="secondary" className="bg-vista-secondary/20 text-vista-light">
                    Категория: {categoriesData.find((c: Category) => c.id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory(null)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedTagNames.map((tagName) => (
                  <Badge key={tagName} variant="secondary" className="bg-vista-secondary/20 text-vista-light">
                    Тег: {tagName}
                    <button 
                      onClick={() => {
                        const tagId = tagsData.find((t: Tag) => t.name === tagName)?.id;
                        if (tagId) {
                          setSelectedTags(selectedTags.filter(id => id !== tagId));
                        }
                      }} 
                      className="ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="ml-auto text-vista-light/70 hover:text-vista-light border-vista-secondary/30"
                >
                  Сбросить все
                </Button>
              </div>
            )}
          </div>

          {/* Содержимое - список упражнений */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
            </div>
          ) : filteredExercises.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredExercises.map((exercise: Exercise) => (
                  <div 
                    key={exercise.id} 
                    className="rounded-md border border-vista-secondary/30 bg-vista-dark/70 hover:bg-vista-dark/90 transition overflow-hidden flex flex-col cursor-pointer hover:ring-1 hover:ring-vista-primary hover:ring-offset-0 hover:ring-offset-gray-800/20 shadow-md hover:shadow-xl"
                    onClick={() => {
                      setPreviewExercise(exercise);
                      setIsPreviewOpen(true);
                    }}
                  >
                    {/* Медиа файл с оптимизацией загрузки */}
                    <div className="h-48 relative bg-vista-secondary/10">
                      {exercise.mediaItems && exercise.mediaItems.length > 0 ? (
                        exercise.mediaItems[0].type === 'IMAGE' ? (
                          <img 
                            src={exercise.mediaItems[0].publicUrl} 
                            alt={exercise.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            width={300} 
                            height={200}
                          />
                        ) : exercise.mediaItems[0].type === 'VIDEO' ? (
                          <div className="relative w-full h-full">
                            <div className="w-full h-full bg-vista-dark/20">
                              <video 
                                src={exercise.mediaItems[0].publicUrl}
                                className="w-full h-full object-cover"
                                preload="none"
                                muted
                                playsInline
                                poster={exercise.mediaItems[0].publicUrl + '?poster=true'}
                              />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-vista-dark/40">
                              <div className="bg-vista-primary/80 rounded-full p-3">
                                <Play className="h-8 w-8 text-vista-dark fill-vista-dark" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-vista-light/30">
                            <Upload className="h-10 w-10" />
                          </div>
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-vista-light/30">
                          <Upload className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    
                    {/* Информация */}
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-lg font-medium text-vista-light mb-1 line-clamp-1">{exercise.title}</h3>
                      
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 text-xs rounded-md bg-vista-primary/20 text-vista-primary">
                          {exercise.category.name}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-xs text-vista-light/70">
                        Автор: {exercise.author.name}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {exercise.tags.slice(0, 3).map((tag: Tag) => (
                          <span 
                            key={tag.id} 
                            className="px-2 py-1 text-xs rounded-md bg-vista-secondary/20 text-vista-light/80"
                          >
                            {tag.name}
                          </span>
                        ))}
                        {exercise.tags.length > 3 && (
                          <span className="px-2 py-1 text-xs rounded-md bg-vista-secondary/20 text-vista-light/80">
                            +{exercise.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Улучшенная пагинация */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={!pagination.hasPreviousPage}
                    className="border-vista-secondary/30 text-vista-light"
                  >
                    Назад
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {(() => {
                      // Создаем массив страниц для отображения
                      const pages = [];
                      const totalPages = pagination.totalPages;
                      
                      // Всегда показываем первую страницу
                      if (currentPage > 3) {
                        pages.push(1);
                      }
                      
                      // Показываем многоточие, если текущая страница больше 4
                      if (currentPage > 4) {
                        pages.push('ellipsis1');
                      }
                      
                      // Показываем соседние страницы
                      for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
                        pages.push(i);
                      }
                      
                      // Показываем многоточие, если до последней страницы больше 2 страниц
                      if (currentPage < totalPages - 3) {
                        pages.push('ellipsis2');
                      }
                      
                      // Всегда показываем последнюю страницу, если она не совпадает с соседними
                      if (currentPage < totalPages - 2) {
                        pages.push(totalPages);
                      }
                      
                      // Удаляем дубликаты
                      return [...new Set(pages)].map((page) => {
                        if (page === 'ellipsis1' || page === 'ellipsis2') {
                          return (
                            <span key={page} className="w-9 h-9 flex items-center justify-center text-vista-light/60">
                              ...
                            </span>
                          );
                        }
                        
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page as number)}
                            className={cn(
                              "w-9 h-9 p-0",
                              currentPage === page 
                                ? "bg-vista-primary text-vista-dark" 
                                : "border-vista-secondary/30 text-vista-light"
                            )}
                          >
                            {page}
                          </Button>
                        );
                      });
                    })()}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={!pagination.hasNextPage}
                    className="border-vista-secondary/30 text-vista-light"
                  >
                    Вперед
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-vista-secondary/30 rounded-md">
              <p className="text-vista-light/60">
                {hasActiveFilters
                  ? "Упражнения по заданным фильтрам не найдены"
                  : "Упражнения не найдены"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно просмотра упражнения */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="bg-vista-dark border-vista-secondary/30 text-vista-light max-w-3xl max-h-[90vh] overflow-y-auto">
          {previewExercise && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl text-vista-light">
                  {isEditMode ? 'Редактирование упражнения' : previewExercise.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-2">
                {isEditMode ? (
                  // Форма редактирования
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title" className="text-vista-light">Название</Label>
                      <Input
                        id="edit-title"
                        name="title"
                        value={editExerciseForm.title}
                        onChange={handleEditInputChange}
                        className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                      />
                      {editErrors.title && (
                        <p className="text-red-400 text-sm">{editErrors.title}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-description" className="text-vista-light">Описание</Label>
                      <Textarea
                        id="edit-description"
                        name="description"
                        value={editExerciseForm.description}
                        onChange={handleEditInputChange}
                        className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light min-h-[120px]"
                      />
                      {editErrors.description && (
                        <p className="text-red-400 text-sm">{editErrors.description}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-width" className="text-vista-light">Ширина (м)</Label>
                        <Input
                          id="edit-width"
                          name="width"
                          type="number"
                          value={editExerciseForm.width}
                          onChange={handleEditInputChange}
                          className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-length" className="text-vista-light">Длина (м)</Label>
                        <Input
                          id="edit-length"
                          name="length"
                          type="number"
                          value={editExerciseForm.length}
                          onChange={handleEditInputChange}
                          className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-category" className="text-vista-light">Категория <span className="text-vista-primary/80">*</span></Label>
                      <Select
                        value={editExerciseForm.categoryId}
                        onValueChange={(value) => {
                          handleEditCategoryChange(value);
                          
                          // Подсказка пользователю с выбором тегов
                          if (value && tagsData.filter((tag: Tag) => tag.exerciseCategoryId === value).length > 0) {
                            setTimeout(() => {
                              // Открываем выбор тегов через небольшую задержку
                              setEditTagsPopoverOpen(true);
                            }, 300);
                          }
                        }}
                      >
                        <SelectTrigger 
                          id="edit-category"
                          className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                        >
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                          {categoriesData.map((category: Category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {editErrors.categoryId && (
                        <p className="text-red-400 text-sm">{editErrors.categoryId}</p>
                      )}
                      {editExerciseForm.categoryId && (
                        <p className="text-xs text-vista-light/60">
                          Теперь вы можете выбрать теги для этой категории.
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-vista-light">Теги</Label>
                      
                      {editExerciseForm.categoryId ? (
                        filteredEditTags.length > 0 ? (
                          <>
                            <div className="border border-vista-secondary/30 rounded-md">
                              <div style={{ maxHeight: '180px', overflowY: 'auto' }} className="space-y-1 p-1">
                                {filteredEditTags.map((tag: Tag) => {
                                  const isSelected = editExerciseForm.tags.includes(tag.id);
                                  return (
                                    <div
                                      key={tag.id}
                                      className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-vista-secondary/20 ${
                                        isSelected ? 'bg-vista-primary/20' : ''
                                      }`}
                                      onClick={() => {
                                        setEditExerciseForm((prev) => ({
                                          ...prev,
                                          tags: isSelected
                                            ? prev.tags.filter(id => id !== tag.id)
                                            : [...prev.tags, tag.id]
                                        }));
                                      }}
                                    >
                                      <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                                        isSelected
                                          ? 'border-vista-primary bg-vista-primary' 
                                          : 'border-vista-secondary/50'
                                      }`}>
                                        {isSelected && <Check className="h-3 w-3 text-vista-dark" />}
                                      </div>
                                      <span>{tag.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {editExerciseForm.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {editExerciseForm.tags.map(tagId => {
                                  const tag = tagsData.find((t: Tag) => t.id === tagId);
                                  return tag ? (
                                    <Badge 
                                      key={tag.id} 
                                      className="bg-vista-primary/20 text-vista-primary"
                                    >
                                      {tag.name}
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditExerciseForm(prev => ({
                                            ...prev,
                                            tags: prev.tags.filter(id => id !== tag.id)
                                          }));
                                        }}
                                        className="ml-1 hover:text-vista-light"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ) : null;
                                })}
                                
                                {editExerciseForm.tags.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setEditExerciseForm(prev => ({ ...prev, tags: [] }))}
                                    className="text-xs text-vista-light/70 hover:text-vista-light"
                                  >
                                    Очистить все
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="py-2 px-2 border border-vista-secondary/30 rounded-md text-center text-vista-light/60">
                            Нет доступных тегов для этой категории
                          </div>
                        )
                      ) : (
                        <div className="py-2 px-2 border border-vista-secondary/30 rounded-md text-center text-vista-light/60">
                          Сначала выберите категорию
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-file" className="text-vista-light">Медиафайл</Label>
                      <div className="flex flex-col items-center border-2 border-dashed border-vista-secondary/30 rounded-md p-4 text-center">
                        {filePreviewEdit ? (
                          <div className="relative w-full">
                            <img 
                              src={filePreviewEdit} 
                              alt="Preview" 
                              className="max-h-[200px] mx-auto object-contain rounded-md"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFilePreviewEdit(null);
                                setEditExerciseForm({
                                  ...editExerciseForm,
                                  file: null
                                });
                              }}
                              className="absolute top-2 right-2 rounded-full bg-vista-dark/70 p-1"
                            >
                              <X className="h-4 w-4 text-vista-light" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-10 w-10 text-vista-light/50 mb-2" />
                            <p className="text-sm text-vista-light/70">
                              Перетащите файл сюда или нажмите для загрузки
                            </p>
                          </>
                        )}
                        <Input
                          id="edit-file"
                          type="file"
                          onChange={handleEditFileChange}
                          className={`mt-2 ${filePreviewEdit ? 'hidden' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Просмотр упражнения
                  <>
                    {/* Медиафайл в модальном окне */}
                    {previewExercise.mediaItems && previewExercise.mediaItems.length > 0 && (
                      <div className="relative bg-vista-secondary/10 rounded-md overflow-hidden" style={{ maxHeight: '400px' }}>
                        {previewExercise.mediaItems[0].type === 'IMAGE' ? (
                          <img 
                            src={previewExercise.mediaItems[0].publicUrl} 
                            alt={previewExercise.title}
                            className="w-full h-full object-contain max-h-[400px] mx-auto"
                          />
                        ) : previewExercise.mediaItems[0].type === 'VIDEO' ? (
                          <video 
                            src={previewExercise.mediaItems[0].publicUrl}
                            className="w-full h-full object-contain max-h-[400px] mx-auto"
                            controls
                          />
                        ) : null}
                      </div>
                    )}
                    
                    {/* Информация об упражнении */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 rounded-full bg-vista-primary/20 text-vista-primary text-sm">
                        {previewExercise.category.name}
                      </span>
                      
                      {previewExercise.tags.map((tag: Tag) => (
                        <span 
                          key={tag.id} 
                          className="px-3 py-1 rounded-full bg-vista-secondary/20 text-vista-light/80 text-sm"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    
                    {/* Детали упражнения */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-vista-light/70 mb-1">Описание:</h4>
                        <p className="text-vista-light whitespace-pre-wrap">{previewExercise.description}</p>
                      </div>
                      
                      {(previewExercise.width || previewExercise.length) && (
                        <div className="flex gap-4">
                          {previewExercise.width && (
                            <div>
                              <h4 className="text-sm font-medium text-vista-light/70 mb-1">Ширина:</h4>
                              <p className="text-vista-light">{previewExercise.width} м</p>
                            </div>
                          )}
                          
                          {previewExercise.length && (
                            <div>
                              <h4 className="text-sm font-medium text-vista-light/70 mb-1">Длина:</h4>
                              <p className="text-vista-light">{previewExercise.length} м</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-sm font-medium text-vista-light/70 mb-1">Автор:</h4>
                        <p className="text-vista-light">{previewExercise.author.name}</p>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Кнопки управления */}
                <div className="flex justify-end gap-2 mt-4">
                  {!isEditMode ? (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={startEditExercise}
                        className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                      >
                        Редактировать
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={deleteExercise}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300"
                      >
                        Удалить
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditMode(false)}
                        className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                      >
                        Отмена
                      </Button>
                      <Button 
                        onClick={saveEditedExercise}
                        className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                      >
                        Сохранить
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Диалог создания нового упражнения */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-vista-dark/95 border-vista-secondary/30 text-vista-light backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl">Новое упражнение</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-title" className="text-vista-light">Название</Label>
              <Input
                id="new-title"
                name="title"
                value={newExercise.title}
                onChange={(e) => {
                  setNewExercise({
                    ...newExercise,
                    title: e.target.value
                  });
                }}
                className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
              />
              {errors.title && (
                <p className="text-red-400 text-sm">{errors.title}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-description" className="text-vista-light">Описание</Label>
              <Textarea
                id="new-description"
                name="description"
                value={newExercise.description}
                onChange={(e) => {
                  setNewExercise({
                    ...newExercise,
                    description: e.target.value
                  });
                }}
                className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light min-h-[120px]"
              />
              {errors.description && (
                <p className="text-red-400 text-sm">{errors.description}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-width" className="text-vista-light">Ширина (м)</Label>
                <Input
                  id="new-width"
                  name="width"
                  type="number"
                  value={newExercise.width}
                  onChange={(e) => {
                    setNewExercise({
                      ...newExercise,
                      width: e.target.value
                    });
                  }}
                  className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-length" className="text-vista-light">Длина (м)</Label>
                <Input
                  id="new-length"
                  name="length"
                  type="number"
                  value={newExercise.length}
                  onChange={(e) => {
                    setNewExercise({
                      ...newExercise,
                      length: e.target.value
                    });
                  }}
                  className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-category" className="text-vista-light">Категория <span className="text-vista-primary/80">*</span></Label>
              <Select
                value={newExercise.categoryId}
                onValueChange={(value) => {
                  setNewExercise({
                    ...newExercise,
                    categoryId: value,
                    tags: [] // Сбрасываем теги при смене категории
                  });
                  
                  // Подсказка пользователю с выбором тегов
                  if (value && tagsData.filter((tag: Tag) => tag.exerciseCategoryId === value).length > 0) {
                    setTimeout(() => {
                      // Открываем выбор тегов через небольшую задержку
                      setCreateTagsPopoverOpen(true);
                    }, 300);
                  }
                }}
              >
                <SelectTrigger 
                  id="new-category"
                  className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                >
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                  {categoriesData.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-red-400 text-sm">{errors.categoryId}</p>
              )}
              {newExercise.categoryId && (
                <p className="text-xs text-vista-light/60">
                  Теперь вы можете выбрать теги для этой категории.
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-vista-light">Теги</Label>
              
              {newExercise.categoryId ? (
                filteredTags.length > 0 ? (
                  <>
                    <div className="border border-vista-secondary/30 rounded-md">
                      <div style={{ maxHeight: '180px', overflowY: 'auto' }} className="space-y-1 p-1">
                        {filteredTags.map((tag: Tag) => {
                          const isSelected = newExercise.tags.includes(tag.id);
                          return (
                            <div
                              key={tag.id}
                              className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-vista-secondary/20 ${
                                isSelected ? 'bg-vista-primary/20' : ''
                              }`}
                              onClick={() => {
                                setNewExercise((prev) => ({
                                  ...prev,
                                  tags: isSelected
                                    ? prev.tags.filter(id => id !== tag.id)
                                    : [...prev.tags, tag.id]
                                }));
                              }}
                            >
                              <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                                isSelected
                                  ? 'border-vista-primary bg-vista-primary' 
                                  : 'border-vista-secondary/50'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-vista-dark" />}
                              </div>
                              <span>{tag.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {newExercise.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newExercise.tags.map(tagId => {
                          const tag = tagsData.find((t: Tag) => t.id === tagId);
                          return tag ? (
                            <Badge 
                              key={tag.id} 
                              className="bg-vista-primary/20 text-vista-primary"
                            >
                              {tag.name}
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewExercise(prev => ({
                                    ...prev,
                                    tags: prev.tags.filter(id => id !== tag.id)
                                  }));
                                }}
                                className="ml-1 hover:text-vista-light"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ) : null;
                        })}
                        
                        {newExercise.tags.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewExercise(prev => ({ ...prev, tags: [] }))}
                            className="text-xs text-vista-light/70 hover:text-vista-light"
                          >
                            Очистить все
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-2 px-2 border border-vista-secondary/30 rounded-md text-center text-vista-light/60">
                    Нет доступных тегов для этой категории
                  </div>
                )
              ) : (
                <div className="py-2 px-2 border border-vista-secondary/30 rounded-md text-center text-vista-light/60">
                  Сначала выберите категорию
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-file" className="text-vista-light">Медиафайл</Label>
              <div className="flex flex-col items-center border-2 border-dashed border-vista-secondary/30 rounded-md p-4 text-center">
                {filePreview ? (
                  <div className="relative w-full">
                    <img 
                      src={filePreview} 
                      alt="Preview" 
                      className="max-h-[200px] mx-auto object-contain rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFilePreview(null);
                        setNewExercise({
                          ...newExercise,
                          file: null
                        });
                      }}
                      className="absolute top-2 right-2 rounded-full bg-vista-dark/70 p-1"
                    >
                      <X className="h-4 w-4 text-vista-light" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-vista-light/50 mb-2" />
                    <p className="text-sm text-vista-light/70">
                      Перетащите файл сюда или нажмите для загрузки
                    </p>
                  </>
                )}
                <Input
                  id="new-file"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files ? e.target.files[0] : null;
                    if (file) {
                      setNewExercise({
                        ...newExercise,
                        file
                      });
                      
                      // Предпросмотр файла
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFilePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className={`mt-2 ${filePreview ? 'hidden' : ''}`}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewExercise({
                  title: '',
                  description: '',
                  length: '',
                  width: '',
                  categoryId: '',
                  tags: [],
                  file: null
                });
                setFilePreview(null);
                setErrors({});
              }}
              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
            >
              Отмена
            </Button>
            <Button 
              onClick={async () => {
                // Валидация формы
                const validationErrors: {
                  title?: string;
                  description?: string;
                  categoryId?: string;
                } = {};
                
                if (!newExercise.title) {
                  validationErrors.title = 'Введите название упражнения';
                }
                
                if (!newExercise.description) {
                  validationErrors.description = 'Введите описание упражнения';
                }
                
                if (!newExercise.categoryId) {
                  validationErrors.categoryId = 'Выберите категорию';
                }
                
                if (Object.keys(validationErrors).length > 0) {
                  setErrors(validationErrors);
                  return;
                }
                
                // Отправка данных на сервер
                try {
                  const formData = new FormData();
                  formData.append('title', newExercise.title);
                  formData.append('description', newExercise.description);
                  formData.append('categoryId', newExercise.categoryId);
                  
                  if (newExercise.width) {
                    formData.append('width', newExercise.width);
                  }
                  
                  if (newExercise.length) {
                    formData.append('length', newExercise.length);
                  }
                  
                  newExercise.tags.forEach(tagId => {
                    formData.append('tags', tagId);
                  });
                  
                  if (newExercise.file) {
                    formData.append('file', newExercise.file);
                  }
                  
                  const response = await fetch('/api/exercises', {
                    method: 'POST',
                    body: formData
                  });
                  
                  if (!response.ok) {
                    throw new Error('Ошибка при создании упражнения');
                  }
                  
                  // Обновляем данные после успешного создания
                  const timestamp = Date.now();
                  mutateExercises();
                  
                  // Сбрасываем форму и закрываем диалог
                  setNewExercise({
                    title: '',
                    description: '',
                    length: '',
                    width: '',
                    categoryId: '',
                    tags: [],
                    file: null
                  });
                  setFilePreview(null);
                  setErrors({});
                  setIsCreateDialogOpen(false);
                  
                } catch (error) {
                  console.error('Ошибка при создании упражнения:', error);
                  alert('Произошла ошибка при создании упражнения');
                }
              }}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 