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
import { X, Filter, Check, ChevronDown, Search, Plus, Upload, Play, Loader2 } from 'lucide-react';
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
import CreateExerciseModal from '@/components/training/CreateExerciseModal';
import PreviewExerciseModal from '@/components/training/PreviewExerciseModal';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useTranslation } from 'react-i18next';
import type { SupportedLang } from '@/types/i18n';

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
  const { t, i18n } = useTranslation();
  const lang: SupportedLang = i18n.language === 'en' ? 'en' : 'ru';
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
  const { tags: tagsData, isLoading: isLoadingTags, isError: isTagsError, mutate: mutateTags } = useTags();
  const { exercises, pagination, isLoading: exercisesLoading, mutate: mutateExercises } = useFilteredExercises(filterParams);
  
  // Объединяем флаг загрузки и эффективно храним данные
  const isLoading = usersLoading || categoriesLoading || isLoadingTags || exercisesLoading;
  
  // Мемоизированные данные для производительности
  const usersData = useMemo(() => users || [], [users]);
  const categoriesData = useMemo(() => categories || [], [categories]);

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
  const [filePreview, setFilePreview] = useState<string | undefined>(undefined);
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

  // Обработчик выбора тегов для создания
  const handleTagToggle = (tagId: string) => {
    if (tagId === 'clear') {
      setNewExercise((prev) => ({ ...prev, tags: [] }));
      return;
    }
    setNewExercise((prev) => {
      const isSelected = prev.tags.includes(tagId);
      return {
        ...prev,
        tags: isSelected
          ? prev.tags.filter((id: string) => id !== tagId)
          : [...prev.tags, tagId]
      };
    });
  };

  // Обработчик изменения полей формы редактирования
  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
      newErrors.title = t('exercisesPage.validation_title_required');
    }
    
    if (!editExerciseForm.description.trim()) {
      newErrors.description = t('exercisesPage.validation_description_required');
    }
    
    if (!editExerciseForm.categoryId) {
      newErrors.categoryId = t('exercisesPage.validation_category_required');
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
        throw new Error(t('exercisesPage.error_updating_exercise'));
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
      alert(t('exercisesPage.error_updating_exercise'));
      
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
    
    if (!window.confirm(t('exercisesPage.confirm_delete_exercise'))) {
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
        throw new Error(t('exercisesPage.error_deleting_exercise'));
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
      alert(t('exercisesPage.error_deleting_exercise'));
      
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

  // Обработчик ошибок загрузки тегов
  const handleTagsRefresh = async () => {
    try {
      await mutateTags();
    } catch (error) {
      console.error('Ошибка при обновлении тегов:', error);
    }
  };

  // Компонент для отображения тегов с состояниями загрузки и ошибок
  const TagsSection = () => {
    if (isLoadingTags) {
      return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-vista-primary" />
          <span className="ml-2">{t('exercisesPage.loading_tags')}</span>
        </div>
      );
    }

    if (isTagsError) {
      return (
        <div className="flex flex-col items-center justify-center p-4">
          <div className="text-red-500 mb-2">{t('exercisesPage.failed_to_load_tags')}</div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleTagsRefresh}
            className="flex items-center"
          >
            <Play className="h-4 w-4 mr-2" />
            {t('exercisesPage.retry_load')}
          </Button>
        </div>
      );
    }

    if (!tagsData || tagsData.length === 0) {
      return (
        <div className="text-center p-4 text-vista-secondary">{t('exercisesPage.no_tags_available')}</div>
      );
    }

    return (
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
    );
  };

  // Получение списка категорий упражнений
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/exercise-categories', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при загрузке категорий');
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при загрузке категорий:', error);
      return [];
    }
  };

  // Обработчик загрузки файла для создания
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewExercise((prev) => ({ ...prev, file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(undefined);
    }
  };

  // Валидация формы создания
  const validateCreateForm = () => {
    const validationErrors: { title?: string; description?: string; categoryId?: string } = {};
    if (!newExercise.title) validationErrors.title = t('exercisesPage.validation_title_required');
    if (!newExercise.description) validationErrors.description = t('exercisesPage.validation_description_required');
    if (!newExercise.categoryId) validationErrors.categoryId = t('exercisesPage.validation_category_required');
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  // Сохранение нового упражнения
  const saveExercise = async () => {
    if (!validateCreateForm()) return;
    try {
      const formData = new FormData();
      formData.append('title', newExercise.title);
      formData.append('description', newExercise.description);
      formData.append('categoryId', newExercise.categoryId);
      if (newExercise.length) formData.append('length', newExercise.length);
      if (newExercise.width) formData.append('width', newExercise.width);
      if (newExercise.file) formData.append('file', newExercise.file);
      newExercise.tags.forEach(tagId => formData.append('tags', tagId));
      const response = await fetch('/api/exercises', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(t('exercisesPage.error_creating_exercise'));
      }
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
      setFilePreview(undefined);
      setErrors({});
      mutate('/api/exercises', undefined, true);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/exercises/filter'), undefined, true);
    } catch (error) {
      setErrors({ title: t('exercisesPage.error_creating_exercise') });
      alert(t('exercisesPage.error_creating_exercise'));
      console.error('Ошибка при создании упражнения:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-vista-light">{t('exercisesPage.title')}</CardTitle>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('exercisesPage.add_exercise')}
          </Button>
        </CardHeader>
        <CardContent className="custom-scrollbar">
          {/* Блок с фильтрами */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Поисковый запрос */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50" />
                <Input 
                  placeholder={t('exercisesPage.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
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
                <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                  <SelectValue placeholder={t('exercisesPage.select_author_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light shadow-lg">
                  <SelectItem value="all">{t('exercisesPage.all_authors')}</SelectItem>
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
                <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                  <SelectValue placeholder={t('exercisesPage.select_category_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light shadow-lg">
                  <SelectItem value="all">{t('exercisesPage.all_categories')}</SelectItem>
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
                  className="w-full sm:w-[200px] justify-between bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
                  onClick={() => setTagsPopoverOpen(!tagsPopoverOpen)}
                >
                  {selectedTags.length > 0 ? `${selectedTags.length} ${t('exercisesPage.selected_tags')}` : `${t('exercisesPage.select_tags')}`}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                
                {tagsPopoverOpen && (
                  <div className="absolute z-50 w-full sm:w-[250px] mt-1 bg-vista-dark border border-vista-secondary/30 rounded-md shadow-lg">
                    <div className="p-2">
                      <div className="relative mb-2">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50" />
                        <Input 
                          placeholder={t('exercisesPage.search_tag_placeholder')} 
                          className="pl-8 pr-2 h-9 text-vista-light bg-vista-dark/30 border-vista-secondary/30"
                        />
                      </div>
                      
                      <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                        <TagsSection />
                      </div>
                      
                      <div className="flex justify-end mt-2 pt-2 border-t border-vista-secondary/30">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mr-2 text-xs border-vista-secondary/30"
                          onClick={() => setSelectedTags([])}
                        >
                          {t('exercisesPage.clear_tags')}
                        </Button>
                        <Button 
                          size="sm" 
                          className="text-xs bg-vista-primary text-vista-dark hover:bg-vista-primary/90"
                          onClick={() => setTagsPopoverOpen(false)}
                        >
                          {t('exercisesPage.done')}
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
                <span className="text-sm text-vista-light/70">{t('exercisesPage.active_filters')}:</span>
                
                {searchQuery && (
                  <Badge variant="secondary" className="bg-vista-secondary/20 text-vista-light">
                    {t('exercisesPage.search')}: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedAuthor && (
                  <Badge variant="secondary" className="bg-vista-secondary/20 text-vista-light">
                    {t('exercisesPage.author')}: {usersData.find((u: User) => u.id === selectedAuthor)?.name || t('exercisesPage.unknown')}
                    <button onClick={() => setSelectedAuthor(null)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedCategory && (
                  <Badge variant="secondary" className="bg-vista-secondary/20 text-vista-light">
                    {t('exercisesPage.category')}: {categoriesData.find((c: Category) => c.id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory(null)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedTagNames.map((tagName) => (
                  <Badge key={tagName} variant="secondary" className="bg-vista-secondary/20 text-vista-light">
                    {t('exercisesPage.tag')}: {tagName}
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
                  {t('exercisesPage.reset_all_filters')}
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
                          <OptimizedImage
                            src={exercise.mediaItems[0].publicUrl}
                            alt={exercise.title}
                            fill
                            className="w-full h-full"
                            objectFit="cover"
                            quality={85}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            showSkeleton={true}
                            fallbackSrc={`https://picsum.photos/seed/ex${exercise.id}/300/200`}
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
                          {exercise.category?.name || t('exercisesPage.no_category')}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-xs text-vista-light/70">
                        {t('exercisesPage.author')}: {exercise.author?.name || t('exercisesPage.unknown')}
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
                    {t('exercisesPage.back')}
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
                    {t('exercisesPage.forward')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-vista-secondary/30 rounded-md">
              <p className="text-vista-light/60">
                {hasActiveFilters
                  ? t('exercisesPage.no_exercises_filtered_message')
                  : t('exercisesPage.no_exercises_message')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно просмотра/редактирования упражнения */}
      <PreviewExerciseModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        exercise={previewExercise}
        isEditMode={isEditMode}
        onEdit={startEditExercise}
        onDelete={deleteExercise}
        onSave={saveEditedExercise}
        onCancel={() => setIsEditMode(false)}
        editForm={editExerciseForm}
        onEditChange={handleEditInputChange}
        editErrors={editErrors}
        loading={false}
        categories={categoriesData}
      />
      
      {/* Диалог создания нового упражнения */}
      <CreateExerciseModal
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        newExercise={newExercise}
        onChange={(e) => {
          const { name, value } = e.target;
          setNewExercise((prev) => ({ ...prev, [name]: value }));
        }}
        onFileChange={handleFileChange}
        filePreview={filePreview}
        filteredTags={filteredTags}
        onTagToggle={handleTagToggle}
        onSave={saveExercise}
        onCancel={() => {
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
          setFilePreview(undefined);
          setErrors({});
        }}
        errors={errors}
        loading={false}
        categories={categoriesData}
      />
    </div>
  );
} 