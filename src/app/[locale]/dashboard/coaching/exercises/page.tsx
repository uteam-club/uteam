'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  BookOpenIcon,
  PlusIcon, 
  ChevronRightIcon,
  TagIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
  CheckIcon,
  UserIcon,
  ArrowUpTrayIcon,
  ArrowsPointingOutIcon,
  PencilIcon,
  TrashIcon,
  DocumentIcon,
  DocumentPlusIcon,
  ChevronUpDownIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

// Отладочное сообщение при начале загрузки компонента
console.log('[DEBUG] Loading ExercisesPage component');

type ExerciseCategory = {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    exercises: number;
    tags: number;
  };
};

type ExerciseTag = {
  id: string;
  name: string;
  exerciseCategoryId: string;
};

type Exercise = {
  id: string;
  name: string;
  description?: string | null;
  difficulty: number;
  categoryId: string;
  authorId?: string | null;
  category?: {
    name: string;
  };
  author?: {
    name: string;
  };
  tags?: { id: string; name: string }[];
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  length?: number | null;
  width?: number | null;
};

type User = {
  id: string;
  name: string;
};

export default function ExercisesPage() {
  console.log('[DEBUG] Rendering ExercisesPage component');
  
  try {
    const { locale } = useParams() as { locale: string };
    console.log('[DEBUG] Locale:', locale);
    const t = useTranslations('exercises');
    const common = useTranslations('common');
    
    const [categories, setCategories] = useState<ExerciseCategory[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
    const [tags, setTags] = useState<ExerciseTag[]>([]);
    const [availableTags, setAvailableTags] = useState<ExerciseTag[]>([]);
    const [authors, setAuthors] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Фильтры
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
    
    // Состояния открытия выпадающих списков
    const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false);
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
    const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
    
    // Refs для выпадающих списков для определения кликов вне списка
    const authorDropdownRef = useRef<HTMLDivElement>(null);
    const categoryDropdownRef = useRef<HTMLDivElement>(null);
    const tagDropdownRef = useRef<HTMLDivElement>(null);
    
    // Диалоги
    const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
    const [showAddExerciseDialog, setShowAddExerciseDialog] = useState(false);
    const [categoryName, setCategoryName] = useState('');
    const [categoryDescription, setCategoryDescription] = useState('');
    
    // Состояния для создания упражнения
    const [exerciseName, setExerciseName] = useState('');
    const [exerciseDescription, setExerciseDescription] = useState('');
    const [exerciseLength, setExerciseLength] = useState('');
    const [exerciseWidth, setExerciseWidth] = useState('');
    const [exerciseCategoryId, setExerciseCategoryId] = useState('');
    const [exerciseTagIds, setExerciseTagIds] = useState<string[]>([]);
    const [exerciseCategoryDropdownOpen, setExerciseCategoryDropdownOpen] = useState(false);
    const [exerciseTagsDropdownOpen, setExerciseTagsDropdownOpen] = useState(false);
    const [exerciseFile, setExerciseFile] = useState<File | null>(null);
    const [exerciseErrors, setExerciseErrors] = useState<{
      name?: string;
      description?: string;
      categoryId?: string;
      tags?: string;
      length?: string;
      width?: string;
    }>({});
    
    // Refs для выпадающих списков формы упражнения
    const exerciseCategoryDropdownRef = useRef<HTMLDivElement>(null);
    const exerciseTagsDropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Состояние для выбора конкретного упражнения
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [showExerciseDetailsDialog, setShowExerciseDetailsDialog] = useState(false);
    
    // Новые состояния для управления удалением и редактированием
    const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editExerciseName, setEditExerciseName] = useState('');
    const [editExerciseDescription, setEditExerciseDescription] = useState('');
    const [editExerciseLength, setEditExerciseLength] = useState('');
    const [editExerciseWidth, setEditExerciseWidth] = useState('');
    const [editExerciseCategoryId, setEditExerciseCategoryId] = useState('');
    const [editExerciseTagIds, setEditExerciseTagIds] = useState<string[]>([]);
    const [editExerciseFile, setEditExerciseFile] = useState<File | null>(null);
    const [editExerciseCategoryDropdownOpen, setEditExerciseCategoryDropdownOpen] = useState(false);
    const [editExerciseTagsDropdownOpen, setEditExerciseTagsDropdownOpen] = useState(false);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    // Добавим состояния для пагинации после объявления других состояний
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);
    const [pagination, setPagination] = useState<{
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>({ total: 0, page: 1, limit: 12, totalPages: 1 });

    // Загрузка категорий упражнений
    useEffect(() => {
      const fetchCategories = async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/exercises/categories');
          
          if (!response.ok) {
            throw new Error('Ошибка загрузки категорий упражнений');
          }
          
          const data = await response.json();
          setCategories(data);
        } catch (error) {
          console.error('Ошибка загрузки категорий:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchCategories();
    }, []);

    // Загрузка всех упражнений 
    useEffect(() => {
      const fetchExercises = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/exercises?page=${currentPage}&limit=${itemsPerPage}`);
          
          if (!response.ok) {
            throw new Error('Ошибка загрузки упражнений');
          }
          
          const data = await response.json();
          setExercises(data.exercises);
          setFilteredExercises(data.exercises);
          setPagination(data.pagination);
        } catch (error) {
          console.error('Ошибка загрузки упражнений:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchExercises();
    }, [currentPage, itemsPerPage]);

    // Загрузка всех тегов и авторов
    useEffect(() => {
      const fetchTagsAndAuthors = async () => {
        try {
          // Загрузка тегов
          const tagsResponse = await fetch('/api/exercises/tags');
          if (tagsResponse.ok) {
            const tagsData = await tagsResponse.json();
            setTags(tagsData);
            setAvailableTags(tagsData);
          }
          
          // Загрузка всех пользователей, а затем фильтрация только авторов упражнений
          const authorsResponse = await fetch('/api/users?role=coach');
          if (authorsResponse.ok) {
            const allUsers = await authorsResponse.json();
            
            // Получаем уникальные ID авторов упражнений
            const uniqueAuthorIds = Array.from(new Set(
              exercises
                .filter(ex => ex.authorId)
                .map(ex => ex.authorId)
            ));
            
            // Фильтруем пользователей, оставляя только авторов упражнений
            const filteredAuthors = allUsers.filter((user: { id: string }) => 
              uniqueAuthorIds.includes(user.id)
            );
            
            setAuthors(filteredAuthors);
          }
        } catch (error) {
          console.error('Ошибка загрузки дополнительных данных:', error);
        }
      };
      
      fetchTagsAndAuthors();
    }, [exercises]);

    // Функция для обновления списка тегов
    const refreshTags = async () => {
      try {
        console.log('Обновление списка тегов...');
        const tagsResponse = await fetch('/api/exercises/tags');
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setTags(tagsData);
          setAvailableTags(tagsData);
          console.log('Список тегов обновлен:', tagsData);
        }
      } catch (error) {
        console.error('Ошибка обновления списка тегов:', error);
      }
    };

    // Обработчик клика вне выпадающих списков для их закрытия
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (authorDropdownRef.current && !authorDropdownRef.current.contains(event.target as Node)) {
          setAuthorDropdownOpen(false);
        }
        if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
          setCategoryDropdownOpen(false);
        }
        if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
          setTagDropdownOpen(false);
        }
        if (exerciseCategoryDropdownRef.current && !exerciseCategoryDropdownRef.current.contains(event.target as Node)) {
          setExerciseCategoryDropdownOpen(false);
        }
        if (exerciseTagsDropdownRef.current && !exerciseTagsDropdownRef.current.contains(event.target as Node)) {
          setExerciseTagsDropdownOpen(false);
        }
      }
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    // Обработка изменений фильтров
    useEffect(() => {
      // Фильтрация тегов по выбранным категориям
      if (selectedCategories.length > 0) {
        setAvailableTags(tags.filter(tag => selectedCategories.includes(tag.exerciseCategoryId)));
      } else {
        setAvailableTags(tags);
      }
      
      // Фильтрация упражнений
      const filtered = exercises.filter(exercise => {
        // Поиск по названию
        const matchesSearch = !searchQuery || 
          exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Фильтр по категориям
        const matchesCategory = selectedCategories.length === 0 || 
          selectedCategories.includes(exercise.categoryId);
        
        // Фильтр по авторам
        const matchesAuthor = selectedAuthors.length === 0 || 
          (exercise.authorId && selectedAuthors.includes(exercise.authorId));
        
        // Фильтр по тегам
        const matchesTag = selectedTags.length === 0 || 
          (Array.isArray(exercise.tags) && exercise.tags?.length > 0 && selectedTags.every(tagId => 
            exercise.tags!.some(tag => tag.id === tagId)
          ));
        
        return matchesSearch && matchesCategory && matchesAuthor && matchesTag;
      });
      
      setFilteredExercises(filtered);
    }, [searchQuery, selectedCategories, selectedAuthors, selectedTags, exercises, tags]);

    // Обработчик добавления категории
    const handleAddCategory = async () => {
      if (!categoryName.trim()) {
        alert('Пожалуйста, введите название категории');
        return;
      }

      try {
        const response = await fetch('/api/exercises/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: categoryName,
            description: categoryDescription,
          }),
        });

        if (!response.ok) {
          throw new Error('Ошибка при добавлении категории');
        }

        const newCategory = await response.json();
        setCategories([...categories, newCategory]);
        setCategoryName('');
        setCategoryDescription('');
        setShowAddCategoryDialog(false);
      } catch (error) {
        console.error('Ошибка добавления категории:', error);
        alert('Не удалось добавить категорию');
      }
    };

    // Переключение выбора автора (множественный выбор)
    const toggleAuthor = (authorId: string) => {
      setSelectedAuthors(prev => 
        prev.includes(authorId) 
          ? prev.filter(id => id !== authorId) 
          : [...prev, authorId]
      );
    };

    // Переключение выбора категории (множественный выбор)
    const toggleCategory = (categoryId: string) => {
      setSelectedCategories(prev => 
        prev.includes(categoryId) 
          ? prev.filter(id => id !== categoryId) 
          : [...prev, categoryId]
      );
    };

    // Переключение выбора тега (множественный выбор)
    const toggleTag = (tagId: string) => {
      setSelectedTags(prev => 
        prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
      );
    };

    // Переключение выбора тега для упражнения (множественный выбор)
    const toggleExerciseTag = (tagId: string) => {
      setExerciseTagIds(prev => 
        prev.includes(tagId) 
          ? prev.filter(id => id !== tagId) 
          : [...prev, tagId]
      );
    };
    
    // Получение тегов для выбранной категории упражнения
    const getTagsForCategory = () => {
      if (!exerciseCategoryId) return [];
      return tags.filter(tag => tag.exerciseCategoryId === exerciseCategoryId);
    };
    
    // Получение тегов для выбранной категории при редактировании упражнения
    const getTagsForEditCategory = () => {
      if (!editExerciseCategoryId) return [];
      return tags.filter(tag => tag.exerciseCategoryId === editExerciseCategoryId);
    };
    
    // Валидация формы упражнения
    const validateExerciseForm = () => {
      const errors: { 
        name?: string; 
        description?: string;
        categoryId?: string;
        tags?: string;
        length?: string;
        width?: string; 
      } = {};
      
      if (!exerciseName.trim()) {
        errors.name = 'Имя упражнения обязательно';
      }
      
      if (!exerciseCategoryId) {
        errors.categoryId = 'Необходимо выбрать категорию';
      }
      
      if (exerciseLength && !/^\d+$/.test(exerciseLength)) {
        errors.length = 'Длина должна быть числом';
      }
      
      if (exerciseWidth && !/^\d+$/.test(exerciseWidth)) {
        errors.width = 'Ширина должна быть числом';
      }
      
      setExerciseErrors(errors);
      return errors;
    };
    
    // Обработчик создания упражнения
    const handleAddExercise = async () => {
      try {
        const errors = validateExerciseForm();
        if (Object.keys(errors).length > 0) {
          setExerciseErrors(errors);
          return;
        }
        
        // Если есть файл, сначала загрузим его через API загрузки
        let fileData = null;
        if (exerciseFile) {
          const formData = new FormData();
          formData.append('file', exerciseFile);
          formData.append('fileType', 'exercise');
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Ошибка при загрузке файла');
          }
          
          fileData = await uploadResponse.json();
        }
        
        const exerciseData = {
          name: exerciseName.trim(),
          description: exerciseDescription.trim(),
          categoryId: exerciseCategoryId,
          tagIds: exerciseTagIds,
          length: exerciseLength ? parseInt(exerciseLength) : null,
          width: exerciseWidth ? parseInt(exerciseWidth) : null,
          fileUrl: fileData ? fileData.url : null,
          fileName: fileData ? fileData.fileName : null,
          fileType: fileData ? fileData.fileType : null,
          fileSize: fileData ? fileData.fileSize || exerciseFile?.size : null
        };
        
        console.log('Отправляем данные:', exerciseData);
        
        const response = await fetch('/api/exercises', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(exerciseData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Ошибка API:', errorData);
          throw new Error(errorData.error || 'Ошибка при добавлении упражнения');
        }
        
        const newExercise = await response.json();
        
        // Обновляем список упражнений и сбрасываем форму
        setExercises(prev => [...prev, newExercise]);
        setFilteredExercises(prev => [...prev, newExercise]);
        resetExerciseForm();
        setShowAddExerciseDialog(false);
      } catch (error: any) {
        console.error('Ошибка добавления упражнения:', error);
        alert(`Не удалось добавить упражнение: ${error.message || 'Неизвестная ошибка'}`);
      }
    };
    
    // Сброс формы упражнения
    const resetExerciseForm = () => {
      setExerciseName('');
      setExerciseDescription('');
      setExerciseLength('');
      setExerciseWidth('');
      setExerciseCategoryId('');
      setExerciseTagIds([]);
      setExerciseFile(null);
      setExerciseErrors({});
    };
    
    // Обработчик выбора файла
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        
        // Проверка типа файла
        if (!file.type.match(/^(image\/|video\/)/)) {
          toast.error('Пожалуйста, выберите изображение или видео');
          return;
        }
        
        // Проверка размера файла (ограничение 10 МБ)
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Размер файла не должен превышать 10 МБ');
          return;
        }
        
        console.log(`Выбран файл: ${file.name}, размер: ${file.size}, тип: ${file.type}`);
        setExerciseFile(file);
      }
    };
    
    // Открытие диалога выбора файла
    const openFileDialog = () => {
      fileInputRef.current?.click();
    };

    // Сброс всех фильтров
    const resetFilters = () => {
      setSearchQuery('');
      setSelectedCategories([]);
      setSelectedTags([]);
      setSelectedAuthors([]);
    };

    // Функция для открытия режима редактирования
    const handleEditExercise = () => {
      if (selectedExercise) {
        setEditExerciseName(selectedExercise.name);
        setEditExerciseDescription(selectedExercise.description || '');
        setEditExerciseLength(selectedExercise.length ? String(selectedExercise.length) : '');
        setEditExerciseWidth(selectedExercise.width ? String(selectedExercise.width) : '');
        setEditExerciseCategoryId(selectedExercise.categoryId);
        setEditExerciseTagIds(selectedExercise.tags?.map(tag => tag.id) || []);
        setEditExerciseFile(null);
        setIsEditing(true);
      }
    };

    // Функция для открытия диалога выбора файла при редактировании
    const openEditFileDialog = () => {
      editFileInputRef.current?.click();
    };
    
    // Обработчик выбора файла при редактировании
    const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        
        // Проверка типа файла
        if (!file.type.match(/^(image\/|video\/)/)) {
          toast.error('Пожалуйста, выберите изображение или видео');
          return;
        }
        
        // Проверка размера файла (ограничение 10 МБ)
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Размер файла не должен превышать 10 МБ');
          return;
        }
        
        console.log(`Выбран файл для редактирования: ${file.name}, размер: ${file.size}, тип: ${file.type}`);
        setEditExerciseFile(file);
      }
    };
    
    // Функция для сохранения изменений
    const handleSaveExercise = async () => {
      try {
        if (!selectedExercise) return;
        
        // Если есть файл, сначала загрузим его через API загрузки
        let fileData = null;
        if (editExerciseFile) {
          const formData = new FormData();
          formData.append('file', editExerciseFile);
          formData.append('fileType', 'exercise');
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || 'Ошибка при загрузке файла');
          }
          
          fileData = await uploadResponse.json();
        }
        
        const exerciseData: any = {
          name: editExerciseName,
          description: editExerciseDescription,
          categoryId: editExerciseCategoryId,
          tagIds: editExerciseTagIds,
        };
        
        if (editExerciseLength) {
          exerciseData.length = parseInt(editExerciseLength);
        }
        
        if (editExerciseWidth) {
          exerciseData.width = parseInt(editExerciseWidth);
        }
        
        if (fileData) {
          exerciseData.fileUrl = fileData.url;
          exerciseData.fileName = fileData.fileName;
          exerciseData.fileType = fileData.fileType;
          exerciseData.fileSize = fileData.fileSize || editExerciseFile?.size;
        }
        
        const response = await fetch(`/api/exercises/${selectedExercise.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(exerciseData),
        });
        
        if (!response.ok) {
          throw new Error('Ошибка при обновлении упражнения');
        }
        
        const updatedExercise = await response.json();
        
        // Обновляем в списке упражнений
        setExercises(prev => prev.map(ex => ex.id === updatedExercise.id ? updatedExercise : ex));
        setFilteredExercises(prev => prev.map(ex => ex.id === updatedExercise.id ? updatedExercise : ex));
        
        // Обновляем выбранное упражнение
        setSelectedExercise(updatedExercise);
        
        // Выходим из режима редактирования
        setIsEditing(false);
      } catch (error) {
        console.error('Ошибка обновления упражнения:', error);
        alert('Не удалось обновить упражнение');
      }
    };
    
    // Функция для удаления упражнения
    const handleDeleteExercise = async () => {
      try {
        if (!selectedExercise) return;
        
        const response = await fetch(`/api/exercises/${selectedExercise.id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Ошибка при удалении упражнения');
        }
        
        // Удаляем из списка упражнений
        setExercises(prev => prev.filter(ex => ex.id !== selectedExercise.id));
        setFilteredExercises(prev => prev.filter(ex => ex.id !== selectedExercise.id));
        
        // Закрываем все диалоги
        setShowDeleteConfirmDialog(false);
        setShowExerciseDetailsDialog(false);
      } catch (error) {
        console.error('Ошибка удаления упражнения:', error);
        alert('Не удалось удалить упражнение');
      }
    };
    
    // Функция для переключения тега при редактировании
    const toggleEditExerciseTag = (tagId: string) => {
      setEditExerciseTagIds(prev => 
        prev.includes(tagId) 
          ? prev.filter(id => id !== tagId) 
          : [...prev, tagId]
      );
    };

    // Добавим функцию для изменения страницы
    const handlePageChange = (page: number) => {
      setCurrentPage(page);
    };

    // Где-то внутри компонента добавим новую функцию для обработки выбора категории
    const handleCategorySelect = (categoryId: string) => {
      // Устанавливаем выбранную категорию
      setExerciseCategoryId(categoryId);
      
      // Если выбрана категория, обновляем список тегов
      if (categoryId) {
        refreshTags();
      }
      
      // Очищаем выбранные теги, так как они относятся к предыдущей категории
      setExerciseTagIds([]);
    };

    // Где-то внутри компонента после функции handleCategorySelect 
    // добавляем аналогичную функцию для редактирования
    const handleEditCategorySelect = (categoryId: string) => {
      // Устанавливаем выбранную категорию
      setEditExerciseCategoryId(categoryId);
      
      // Если выбрана категория, обновляем список тегов
      if (categoryId) {
        refreshTags();
      }
      
      // Очищаем выбранные теги, так как они относятся к предыдущей категории
      setEditExerciseTagIds([]);
    };

    // Отображение во время загрузки
    if (loading && exercises.length === 0) {
      return (
        <div className="py-6">
          <div className="flex items-center justify-center h-60">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="container-app py-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
          <div>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => {
                refreshTags(); // Обновляем список тегов перед открытием диалога
                setShowAddExerciseDialog(true);
              }}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('addExercise')}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          {/* Поисковая строка и фильтры */}
          <div className="flex flex-wrap gap-2 mb-6">
            {/* 1. Поиск по названию */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search')}
                className="h-9 w-64 px-3 py-2 bg-[#1a2228] border border-[#2c3c42] rounded-md text-vista-light placeholder-vista-light/50 focus:outline-none focus:border-vista-primary/60"
              />
              <MagnifyingGlassIcon className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-vista-light/50" />
            </div>
            
            {/* 2. Фильтр по автору */}
            <div className="relative" ref={authorDropdownRef}>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-9 px-3 text-vista-light/70 border border-[#2c3c42] w-[150px] justify-between ${selectedAuthors.length > 0 ? 'border-vista-primary/60' : ''}`}
                onClick={() => setAuthorDropdownOpen(!authorDropdownOpen)}
              >
                <span>{t('author')}{selectedAuthors.length > 0 ? ` (${selectedAuthors.length})` : ''}</span>
                <ChevronDownIcon className="h-3 w-3 ml-1" />
              </Button>
              
              {authorDropdownOpen && (
                <div className="absolute z-50 mt-1 min-w-[200px] max-h-[320px] overflow-y-auto bg-[#1a2228]/80 backdrop-blur-md border border-[#2c3c42] rounded-md shadow-lg">
                  <div className="py-1">
                    {authors.map(author => (
                      <div 
                        key={author.id}
                        className={`flex items-center px-4 py-2 cursor-pointer ${selectedAuthors.includes(author.id) ? 'bg-[#2c3c42]/50 text-vista-primary' : 'text-[#e6f0f0] hover:bg-[#2c3c42]/30'}`}
                        onClick={() => toggleAuthor(author.id)}
                      >
                        <div className="flex items-center flex-grow">
                          <span>{author.name}</span>
                        </div>
                        {selectedAuthors.includes(author.id) && 
                          <CheckIcon className="h-4 w-4 text-vista-primary" />
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* 3. Фильтр по категории */}
            <div className="relative" ref={categoryDropdownRef}>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-9 px-3 text-vista-light/70 border border-[#2c3c42] w-[150px] justify-between ${selectedCategories.length > 0 ? 'border-vista-primary/60' : ''}`}
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              >
                <span>{t('category')}{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ''}</span>
                <ChevronDownIcon className="h-3 w-3 ml-1" />
              </Button>
              
              {categoryDropdownOpen && (
                <div className="absolute z-50 mt-1 min-w-[200px] max-h-[320px] overflow-y-auto bg-[#1a2228]/80 backdrop-blur-md border border-[#2c3c42] rounded-md shadow-lg">
                  <div className="py-1">
                    {categories.map(category => (
                      <div 
                        key={category.id}
                        className={`flex items-center px-4 py-2 cursor-pointer ${
                          category.id === exerciseCategoryId 
                            ? 'bg-vista-secondary/40 text-vista-primary'
                            : 'text-vista-light hover:bg-vista-secondary/20'
                        }`}
                        onClick={() => {
                          handleCategorySelect(category.id);
                          setExerciseCategoryDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center flex-grow">
                          <span>{category.name}</span>
                        </div>
                        {selectedCategories.includes(category.id) && 
                          <CheckIcon className="h-4 w-4 text-vista-primary" />
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* 4. Фильтр по тегу */}
            <div className="relative" ref={tagDropdownRef}>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-9 px-3 text-vista-light/70 border border-[#2c3c42] w-[150px] justify-between ${selectedTags.length > 0 ? 'border-vista-primary/60' : ''}`}
                onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
              >
                <span>{t('tag')}{selectedTags.length > 0 ? ` (${selectedTags.length})` : ''}</span>
                <ChevronDownIcon className="h-3 w-3 ml-1" />
              </Button>
              
              {tagDropdownOpen && (
                <div className="absolute z-50 mt-1 min-w-[200px] max-h-[320px] overflow-y-auto bg-[#1a2228]/80 backdrop-blur-md border border-[#2c3c42] rounded-md shadow-lg">
                  <div className="py-1">
                    {availableTags.map(tag => (
                      <div 
                        key={tag.id}
                        className={`flex items-center px-4 py-2 cursor-pointer ${selectedTags.includes(tag.id) ? 'bg-[#2c3c42]/50 text-vista-primary' : 'text-[#e6f0f0] hover:bg-[#2c3c42]/30'}`}
                        onClick={() => toggleTag(tag.id)}
                      >
                        <div className="flex items-center flex-grow">
                          <span>{tag.name}</span>
                        </div>
                        {selectedTags.includes(tag.id) && 
                          <CheckIcon className="h-4 w-4 text-vista-primary" />
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {(searchQuery || selectedCategories.length > 0 || selectedTags.length > 0 || selectedAuthors.length > 0) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters}
                className="h-9 text-vista-light/70"
              >
                {t('resetFilters')}
              </Button>
            )}
          </div>
            
          {/* Диалоговое окно для добавления упражнения */}
          <Dialog open={showAddExerciseDialog} onOpenChange={(open) => {
            setShowAddExerciseDialog(open);
            if (!open) resetExerciseForm();
          }}>
            <DialogContent className="bg-vista-dark border border-vista-secondary/70 sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-vista-light">
                  {t('addExercise')}
                </DialogTitle>
              </DialogHeader>
              
              <div className="py-4 space-y-6">
                {/* Название */}
                <div>
                  <Label htmlFor="exercise-name" className="text-vista-light">
                    {t('name')}*
                  </Label>
                  <Input 
                    id="exercise-name"
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    className="bg-vista-dark/70 border-vista-secondary/50"
                    placeholder={`${t('name')}...`}
                  />
                  {exerciseErrors.name && (
                    <p className="text-sm text-red-400 mt-1">{exerciseErrors.name}</p>
                  )}
                </div>
                
                {/* Описание */}
                <div>
                  <Label htmlFor="exercise-description" className="text-vista-light">
                    {t('description')}*
                  </Label>
                  <Textarea 
                    id="exercise-description"
                    value={exerciseDescription}
                    onChange={(e) => setExerciseDescription(e.target.value)}
                    className="bg-vista-dark/70 border-vista-secondary/50 min-h-[100px]"
                    placeholder={`${t('description')}...`}
                  />
                  {exerciseErrors.description && (
                    <p className="text-sm text-red-400 mt-1">{exerciseErrors.description}</p>
                  )}
                </div>
                
                {/* Размеры */}
                <div>
                  <Label className="text-vista-light">
                    {t('dimensions')}
                  </Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="exercise-length" className="text-vista-light/80 text-sm">
                        {t('length')}
                      </Label>
                      <Input 
                        id="exercise-length"
                        type="number"
                        value={exerciseLength}
                        onChange={(e) => setExerciseLength(e.target.value)}
                        className="bg-vista-dark/70 border-vista-secondary/50"
                      />
                      {exerciseErrors.length && (
                        <p className="text-sm text-red-400 mt-1">{exerciseErrors.length}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="exercise-width" className="text-vista-light/80 text-sm">
                        {t('width')}
                      </Label>
                      <Input 
                        id="exercise-width"
                        type="number"
                        value={exerciseWidth}
                        onChange={(e) => setExerciseWidth(e.target.value)}
                        className="bg-vista-dark/70 border-vista-secondary/50"
                      />
                      {exerciseErrors.width && (
                        <p className="text-sm text-red-400 mt-1">{exerciseErrors.width}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Категория */}
                <div className="relative">
                  <Label className="text-vista-light">
                    {t('category')}*
                  </Label>
                  <div 
                    ref={exerciseCategoryDropdownRef}
                    className="relative"
                  >
                    <div
                      className="flex items-center justify-between bg-vista-dark/70 border border-vista-secondary/50 rounded-md px-3 py-2 cursor-pointer"
                      onClick={() => setExerciseCategoryDropdownOpen(!exerciseCategoryDropdownOpen)}
                    >
                      <span className="text-vista-light">
                        {categories.find(c => c.id === exerciseCategoryId)?.name || t('selectCategories')}
                      </span>
                      <ChevronUpDownIcon className="h-4 w-4 text-vista-light/70" />
                    </div>
                    
                    {exerciseCategoryDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto bg-vista-dark/95 border border-vista-secondary/50 rounded-md shadow-lg">
                        {categories.map((category) => (
                          <div
                            key={category.id}
                            className={`px-3 py-2 cursor-pointer ${
                              category.id === exerciseCategoryId 
                                ? 'bg-vista-secondary/40 text-vista-primary'
                                : 'text-vista-light hover:bg-vista-secondary/20'
                            }`}
                            onClick={() => {
                              handleCategorySelect(category.id);
                              setExerciseCategoryDropdownOpen(false);
                            }}
                          >
                            {category.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {exerciseErrors.categoryId && (
                    <p className="text-sm text-red-400 mt-1">{exerciseErrors.categoryId}</p>
                  )}
                </div>
                
                {/* Теги */}
                <div className="relative">
                  <Label className="text-vista-light">
                    {t('tags')}
                  </Label>
                  <div 
                    ref={exerciseTagsDropdownRef}
                    className="relative"
                  >
                    <div
                      className="flex items-center justify-between bg-vista-dark/70 border border-vista-secondary/50 rounded-md px-3 py-2 cursor-pointer"
                      onClick={() => setExerciseTagsDropdownOpen(!exerciseTagsDropdownOpen)}
                    >
                      <div className="flex flex-wrap gap-1">
                        {exerciseTagIds.length > 0 ? (
                          tags.filter(tag => exerciseTagIds.includes(tag.id)).map(tag => (
                            <span key={tag.id} className="bg-vista-secondary/50 px-2 py-0.5 rounded-full text-xs">
                              {tag.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-vista-light/70">{t('selectTags')}</span>
                        )}
                      </div>
                      <ChevronUpDownIcon className="h-4 w-4 text-vista-light/70 ml-2 flex-shrink-0" />
                    </div>
                    
                    {exerciseTagsDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto bg-vista-dark/95 border border-vista-secondary/50 rounded-md shadow-lg">
                        {getTagsForCategory().map((tag) => (
                          <div
                            key={tag.id}
                            className={`px-3 py-2 cursor-pointer ${
                              exerciseTagIds.includes(tag.id)
                                ? 'bg-vista-primary/20 text-vista-primary'
                                : 'text-vista-light hover:bg-vista-secondary/20'
                            }`}
                            onClick={() => toggleExerciseTag(tag.id)}
                          >
                            {tag.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {exerciseErrors.tags && (
                    <p className="text-sm text-red-400 mt-1">{exerciseErrors.tags}</p>
                  )}
                </div>
                
                {/* Файл */}
                <div>
                  <Label className="text-vista-light">
                    {t('file')}
                  </Label>
                  <div
                    className="mt-2 p-4 border border-dashed border-vista-secondary/50 rounded-md cursor-pointer text-center"
                    onClick={openFileDialog}
                  >
                    {exerciseFile ? (
                      <div className="flex items-center justify-center flex-col">
                        <DocumentIcon className="h-8 w-8 text-vista-primary mb-2" />
                        <p className="text-sm text-vista-light">{exerciseFile.name}</p>
                        <p className="text-xs text-vista-light/70 mt-1">
                          {(exerciseFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center flex-col">
                        <ArrowUpTrayIcon className="h-8 w-8 text-vista-light/50 mb-2" />
                        <p className="text-sm text-vista-light/70">{t('uploadFile')}</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowAddExerciseDialog(false);
                    resetExerciseForm();
                  }}
                  className="text-vista-light"
                >
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleAddExercise}
                  className="bg-vista-primary text-vista-dark hover:bg-vista-primary/90"
                >
                  {t('addExercise')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Отображение выбранных фильтров */}
        {(selectedCategories.length > 0 || selectedTags.length > 0 || selectedAuthors.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-2 mb-4">
            {selectedCategories.map(categoryId => {
              const category = categories.find(c => c.id === categoryId);
              return category ? (
                <div key={categoryId} className="flex items-center bg-vista-secondary/30 text-vista-light/80 text-xs px-2 py-1 rounded-full">
                  <span className="mr-1">Категория: {category.name}</span>
                  <XMarkIcon 
                    className="h-3 w-3 cursor-pointer hover:text-vista-primary" 
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
                    }}
                  />
                </div>
              ) : null;
            })}
            
            {selectedAuthors.map(authorId => {
              const author = authors.find(a => a.id === authorId);
              return author ? (
                <div key={authorId} className="flex items-center bg-vista-secondary/30 text-vista-light/80 text-xs px-2 py-1 rounded-full">
                  <span className="mr-1">Автор: {author.name}</span>
                  <XMarkIcon 
                    className="h-3 w-3 cursor-pointer hover:text-vista-primary" 
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setSelectedAuthors(prev => prev.filter(id => id !== authorId));
                    }}
                  />
                </div>
              ) : null;
            })}
            
            {selectedTags.map(tagId => {
              const tag = tags.find(t => t.id === tagId);
              return tag ? (
                <div key={tagId} className="flex items-center bg-vista-secondary/30 text-vista-light/80 text-xs px-2 py-1 rounded-full">
                  <span className="mr-1">Тег: {tag.name}</span>
                  <XMarkIcon 
                    className="h-3 w-3 cursor-pointer hover:text-vista-primary" 
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setSelectedTags(prev => prev.filter(id => id !== tagId));
                    }}
                  />
                </div>
              ) : null;
            })}
            
            <div 
              className="flex items-center bg-vista-primary/20 text-vista-primary text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-vista-primary/30"
              onClick={resetFilters}
            >
              <span>Очистить все</span>
            </div>
          </div>
        )}

        {/* Отображение результатов поиска */}
        {filteredExercises.length === 0 ? (
          <div className="bg-vista-secondary/20 rounded-lg p-8 text-center">
            <p className="text-vista-light/60 mb-4">Упражнения не найдены</p>
          </div>
        ) : (
          <>
            <div className="border-t-2 border-vista-secondary/70 mt-2 mb-6"></div>
            
            {/* Информация о результатах поиска */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-vista-light/70 text-sm">
                Найдено упражнений: {pagination.total}
              </div>
            </div>
            
            {/* Список упражнений */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredExercises.map(exercise => {
                // Находим связанные данные
                const category = categories.find(c => c.id === exercise.categoryId);
                const author = authors.find(a => a.id === exercise.authorId);
                
                return (
                  <div 
                    key={exercise.id}
                    className="bg-vista-secondary/30 rounded-lg overflow-hidden hover:bg-vista-secondary/50 transition-colors cursor-pointer shadow-md shadow-vista-dark/60 hover:shadow-vista-primary/40 transition-all duration-300"
                    onClick={() => {
                      // Открываем модальное окно с деталями упражнения
                      setSelectedExercise(exercise);
                      setShowExerciseDetailsDialog(true);
                    }}
                  >
                    {/* Изображение упражнения */}
                    <div className="h-48 relative bg-vista-dark/80">
                      {exercise.fileUrl ? (
                        <>
                          {(exercise.fileType?.includes('image/') || exercise.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                            <img 
                              src={exercise.fileUrl} 
                              alt={exercise.name} 
                              className="w-full h-full object-contain"
                            />
                          ) : (exercise.fileType?.includes('video/') || exercise.fileName?.match(/\.(mp4|webm|ogg|mov)$/i)) ? (
                            <div className="relative w-full h-full">
                              <video 
                                src={exercise.fileUrl}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-vista-dark/50 flex items-center justify-center">
                                <PlayIcon className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <BookOpenIcon className="h-16 w-16 text-vista-primary/50" />
                              <a 
                                href={exercise.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-vista-primary hover:underline mt-2"
                              >
                                Скачать файл {exercise.fileName}
                              </a>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <BookOpenIcon className="h-16 w-16 text-vista-primary/30" />
                        </div>
                      )}
                    </div>
                    
                    {/* Информация об упражнении */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-vista-light truncate">{exercise.name}</h3>
                      </div>
                      
                      {/* Категория */}
                      <div className="mt-2 flex items-center">
                        <TagIcon className="h-4 w-4 text-vista-primary/70 mr-1" />
                        <span className="text-sm text-vista-light/70">{category?.name || 'Без категории'}</span>
                      </div>
                      
                      {/* Автор */}
                      {author && (
                        <div className="mt-1 flex items-center">
                          <UserIcon className="h-4 w-4 text-vista-primary/70 mr-1" />
                          <span className="text-sm text-vista-light/70">{author.name}</span>
                        </div>
                      )}
                      
                      {/* Теги */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {exercise.tags?.map((tag, idx) => idx < 3 && (
                          <span 
                            key={tag.id} 
                            className="text-xs text-vista-light/80 bg-vista-secondary/50 px-2 py-0.5 rounded-full"
                          >
                            {tag.name}
                          </span>
                        ))}
                        {exercise.tags && exercise.tags.length > 3 && (
                          <span className="text-xs text-vista-light/60 px-1 py-0.5">
                            +{exercise.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        
        {/* Модальное окно для просмотра деталей упражнения */}
        <Dialog open={showExerciseDetailsDialog} onOpenChange={setShowExerciseDetailsDialog}>
          <DialogContent className="sm:max-w-3xl bg-vista-dark/95 border border-vista-secondary/70">
            <DialogHeader>
              <DialogTitle className="text-xl sr-only">{selectedExercise?.name}</DialogTitle>
            </DialogHeader>
            
            {selectedExercise && !isEditing ? (
              <div className="grid gap-4">
                {/* Изображение/медиа */}
                {selectedExercise.fileUrl && (
                  <div className="w-full rounded-lg overflow-hidden bg-vista-dark/50 h-[300px] flex items-center justify-center">
                    {(selectedExercise.fileType?.includes('image/') || selectedExercise.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                      <img 
                        src={selectedExercise.fileUrl} 
                        alt={selectedExercise.name} 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : selectedExercise.fileType?.includes('video/') || selectedExercise.fileName?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                      <video 
                        src={selectedExercise.fileUrl} 
                        controls
                        autoPlay
                        className="max-w-full max-h-full"
                      ></video>
                    ) : (
                      <div className="flex flex-col items-center">
                        <BookOpenIcon className="h-16 w-16 text-vista-primary/50" />
                        <a 
                          href={selectedExercise.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-vista-primary hover:underline mt-2"
                        >
                          Скачать файл {selectedExercise.fileName}
                        </a>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Заголовок упражнения */}
                <h2 className="text-2xl font-medium text-vista-light break-words break-all">{selectedExercise.name}</h2>
                
                {/* Описание */}
                <div className="mb-4">
                  <p className="text-vista-light/70 whitespace-pre-wrap font-light">{selectedExercise.description || 'Нет описания'}</p>
                </div>
                
                {/* Дополнительная информация */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Автор */}
                  <div className="p-3 bg-vista-dark/80 rounded-lg border border-vista-secondary/30 shadow-sm">
                    <h3 className="text-xs text-vista-light/60 mb-2 flex items-center">
                      <UserIcon className="h-3.5 w-3.5 text-vista-primary/70 mr-1" />
                      Автор
                    </h3>
                    <p className="text-vista-light text-sm truncate">
                      {authors.find(a => a.id === selectedExercise.authorId)?.name || 'Не указан'}
                    </p>
                  </div>
                  
                  {/* Категория */}
                  <div className="p-3 bg-vista-dark/80 rounded-lg border border-vista-secondary/30 shadow-sm">
                    <h3 className="text-xs text-vista-light/60 mb-2 flex items-center">
                      <TagIcon className="h-3.5 w-3.5 text-vista-primary/70 mr-1" />
                      Категория
                    </h3>
                    <p className="text-vista-light text-sm truncate">
                      {categories.find(c => c.id === selectedExercise.categoryId)?.name || 'Без категории'}
                    </p>
                  </div>
                  
                  {/* Размеры */}
                  {(selectedExercise.length || selectedExercise.width) && (
                    <div className="p-3 bg-vista-dark/80 rounded-lg border border-vista-secondary/30 shadow-sm">
                      <h3 className="text-xs text-vista-light/60 mb-2 flex items-center">
                        <ArrowsPointingOutIcon className="h-3.5 w-3.5 text-vista-primary/70 mr-1" />
                        Размеры
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedExercise.length && (
                          <p className="text-vista-light text-sm">
                            <span className="text-vista-light/80">Длина: </span>
                            {selectedExercise.length} м
                          </p>
                        )}
                        {selectedExercise.width && (
                          <p className="text-vista-light text-sm">
                            <span className="text-vista-light/80">Ширина: </span>
                            {selectedExercise.width} м
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Теги */}
                <div className="mt-2">
                  <h3 className="text-xs text-vista-light/60 mb-2">Теги</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.tags && selectedExercise.tags.length > 0 ? (
                      selectedExercise.tags.map(tag => (
                        <span 
                          key={tag.id} 
                          className="text-xs text-vista-light/80 bg-vista-secondary/50 px-2 py-0.5 rounded-full"
                        >
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-vista-light/60">Нет тегов</span>
                    )}
                  </div>
                </div>
              </div>
            ) : selectedExercise && isEditing ? (
              <div className="grid gap-4">
                {/* Форма редактирования */}
                <div className="space-y-4">
                  {/* Поле для загрузки файла */}
                  <div className="mb-4">
                    <div className="w-full rounded-lg overflow-hidden bg-vista-dark/50 h-[200px] flex items-center justify-center cursor-pointer hover:bg-vista-dark/70 transition-colors" onClick={openEditFileDialog}>
                      {editExerciseFile ? (
                        <div className="text-center">
                          <DocumentIcon className="h-10 w-10 text-vista-primary/70 mx-auto mb-2" />
                          <p className="text-vista-light">{editExerciseFile.name}</p>
                        </div>
                      ) : selectedExercise.fileUrl && (selectedExercise.fileType?.includes('image/') || selectedExercise.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={selectedExercise.fileUrl} 
                            alt={selectedExercise.name} 
                            className="max-w-full max-h-full object-contain absolute inset-0 m-auto"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-vista-dark/60 opacity-0 hover:opacity-100 transition-opacity">
                            <p className="text-vista-light text-center px-4">Нажмите, чтобы изменить изображение</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <DocumentPlusIcon className="h-10 w-10 text-vista-primary/70 mx-auto mb-2" />
                          <p className="text-vista-light">Нажмите, чтобы загрузить файл</p>
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={editFileInputRef} 
                      className="hidden" 
                      onChange={handleEditFileChange}
                    />
                  </div>
                  
                  {/* Название */}
                  <div>
                    <Label htmlFor="edit-exercise-name">Название</Label>
                    <Input 
                      id="edit-exercise-name"
                      value={editExerciseName}
                      onChange={(e) => setEditExerciseName(e.target.value)}
                      className="bg-vista-dark/70 border-vista-secondary/50"
                    />
                  </div>
                  
                  {/* Описание */}
                  <div>
                    <Label htmlFor="edit-exercise-description">Описание</Label>
                    <Textarea 
                      id="edit-exercise-description"
                      value={editExerciseDescription}
                      onChange={(e) => setEditExerciseDescription(e.target.value)}
                      className="bg-vista-dark/70 border-vista-secondary/50 min-h-[100px]"
                    />
                  </div>
                  
                  {/* Категория */}
                  <div className="relative">
                    <Label>Категория</Label>
                    <div 
                      ref={exerciseCategoryDropdownRef}
                      className="relative"
                    >
                      <div
                        className="flex items-center justify-between bg-vista-dark/70 border border-vista-secondary/50 rounded-md px-3 py-2 cursor-pointer"
                        onClick={() => setEditExerciseCategoryDropdownOpen(!editExerciseCategoryDropdownOpen)}
                      >
                        <span className="text-vista-light">
                          {categories.find(c => c.id === editExerciseCategoryId)?.name || 'Выберите категорию'}
                        </span>
                        <ChevronUpDownIcon className="h-4 w-4 text-vista-light/70" />
                      </div>
                      
                      {editExerciseCategoryDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-vista-dark border border-vista-secondary/50 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {categories.map(category => (
                            <div
                              key={category.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-vista-secondary/50 ${editExerciseCategoryId === category.id ? 'bg-vista-secondary/30' : ''}`}
                              onClick={() => {
                                handleEditCategorySelect(category.id);
                                setEditExerciseCategoryDropdownOpen(false);
                              }}
                            >
                              {category.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Теги */}
                  <div className="relative">
                    <Label>Теги</Label>
                    <div 
                      ref={exerciseTagsDropdownRef}
                      className="relative"
                    >
                      <div
                        className="flex items-center justify-between bg-vista-dark/70 border border-vista-secondary/50 rounded-md px-3 py-2 cursor-pointer"
                        onClick={() => setEditExerciseTagsDropdownOpen(!editExerciseTagsDropdownOpen)}
                      >
                        <div className="flex flex-wrap gap-1">
                          {editExerciseTagIds.length > 0 ? (
                            tags.filter(tag => editExerciseTagIds.includes(tag.id)).map(tag => (
                              <span key={tag.id} className="bg-vista-secondary/50 px-2 py-0.5 rounded-full text-xs">
                                {tag.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-vista-light/70">Выберите теги</span>
                          )}
                        </div>
                        <ChevronUpDownIcon className="h-4 w-4 text-vista-light/70 ml-2 flex-shrink-0" />
                      </div>
                      
                      {editExerciseTagsDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-vista-dark border border-vista-secondary/50 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {getTagsForEditCategory().map(tag => (
                            <div
                              key={tag.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-vista-secondary/50 ${editExerciseTagIds.includes(tag.id) ? 'bg-vista-secondary/30' : ''}`}
                              onClick={() => toggleEditExerciseTag(tag.id)}
                            >
                              <div className="flex items-center justify-between">
                                <span>{tag.name}</span>
                                {editExerciseTagIds.includes(tag.id) && (
                                  <CheckIcon className="h-4 w-4 text-vista-primary" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Размеры */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-exercise-length">Длина (м)</Label>
                      <Input 
                        id="edit-exercise-length"
                        type="number"
                        value={editExerciseLength}
                        onChange={(e) => setEditExerciseLength(e.target.value)}
                        className="bg-vista-dark/70 border-vista-secondary/50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-exercise-width">Ширина (м)</Label>
                      <Input 
                        id="edit-exercise-width"
                        type="number"
                        value={editExerciseWidth}
                        onChange={(e) => setEditExerciseWidth(e.target.value)}
                        className="bg-vista-dark/70 border-vista-secondary/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              {!isEditing ? (
                <>
                  <div className="flex-1 flex justify-start">
                    <Button 
                      type="button" 
                      variant="destructive"
                      onClick={() => setShowDeleteConfirmDialog(true)}
                      className="bg-red-700 hover:bg-red-800 h-8 px-3 text-xs"
                    >
                      <TrashIcon className="h-3.5 w-3.5 mr-1" />
                      Удалить
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleEditExercise}
                      className="h-8 px-3 text-xs"
                    >
                      <PencilIcon className="h-3.5 w-3.5 mr-1" />
                      Редактировать
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => setShowExerciseDetailsDialog(false)}
                      className="h-8 px-3 text-xs"
                    >
                      Закрыть
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2 w-full justify-end">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="h-8 px-3 text-xs"
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleSaveExercise}
                    className="bg-green-700 hover:bg-green-800 h-8 px-3 text-xs"
                  >
                    <CheckIcon className="h-3.5 w-3.5 mr-1" />
                    Сохранить
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Диалог подтверждения удаления */}
        <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <DialogContent className="bg-vista-dark/95 border border-vista-secondary/70 max-w-md">
            <DialogHeader>
              <DialogTitle>Подтверждение удаления</DialogTitle>
              <DialogDescription>
                Вы уверены, что хотите удалить упражнение "{selectedExercise?.name}"? Это действие нельзя отменить.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirmDialog(false)}
                className="h-8 px-3 text-xs"
              >
                Отмена
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteExercise} 
                className="bg-red-700 hover:bg-red-800 h-8 px-3 text-xs"
              >
                Удалить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Компонент пагинации внизу страницы */}
        <div className="flex justify-center mt-8 mb-4 gap-2">
          {/* Кнопка "Назад" */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePageChange(currentPage - 1)} 
            disabled={currentPage === 1}
          >
            &lt;
          </Button>

          {/* Номера страниц */}
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
            .filter(page => 
              page === 1 || 
              page === pagination.totalPages || 
              (page >= currentPage - 1 && page <= currentPage + 1)
            )
            .map((page, index, array) => (
              <React.Fragment key={page}>
                {index > 0 && array[index - 1] !== page - 1 && (
                  <Button variant="ghost" size="sm" disabled key={`ellipsis-${index}`}>
                    ...
                  </Button>
                )}
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              </React.Fragment>
            ))
          }

          {/* Кнопка "Вперёд" */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handlePageChange(currentPage + 1)} 
            disabled={currentPage === pagination.totalPages}
          >
            &gt;
          </Button>
        </div>
      </div>
    );
  } catch (error) {
    console.error('[DEBUG] Error in ExercisesPage component:', error);
    return <div>Произошла ошибка при загрузке страницы упражнений. Проверьте консоль.</div>;
  }
} 