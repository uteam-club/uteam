'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  ChevronUpDownIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '../../../../../components/ui/textarea';

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
  const { locale } = useParams() as { locale: string };
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
        const response = await fetch('/api/exercises');
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки упражнений');
        }
        
        const data = await response.json();
        setExercises(data);
        setFilteredExercises(data);
      } catch (error) {
        console.error('Ошибка загрузки упражнений:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

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
        
        // Загрузка авторов
        const authorsResponse = await fetch('/api/users?role=coach');
        if (authorsResponse.ok) {
          const authorsData = await authorsResponse.json();
          setAuthors(authorsData);
        }
      } catch (error) {
        console.error('Ошибка загрузки дополнительных данных:', error);
      }
    };
    
    fetchTagsAndAuthors();
  }, []);

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
        (Array.isArray(exercise.tags) && exercise.tags.length > 0 && selectedTags.every(tagId => 
          exercise.tags.some(tag => tag.id === tagId)
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
    
    // Проверяем обязательные поля
    if (!exerciseName.trim()) {
      errors.name = 'Название упражнения обязательно';
    }
    
    if (!exerciseCategoryId) {
      errors.categoryId = 'Выберите категорию';
    }
    
    // Проверка числовых полей на корректный формат
    if (exerciseLength && !/^\d+$/.test(exerciseLength.trim())) {
      errors.length = 'Длина должна быть целым числом';
    }
    
    if (exerciseWidth && !/^\d+$/.test(exerciseWidth.trim())) {
      errors.width = 'Ширина должна быть целым числом';
    }
    
    // Для полей ввода размеров, заменяем запятые на точки и убираем пробелы
    if (exerciseLength) {
      setExerciseLength(exerciseLength.replace(/,/g, '.').trim());
    }
    
    if (exerciseWidth) {
      setExerciseWidth(exerciseWidth.replace(/,/g, '.').trim());
    }
    
    setExerciseErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Обработчик создания упражнения
  const handleAddExercise = async () => {
    if (!validateExerciseForm()) {
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('name', exerciseName.trim());
      formData.append('description', exerciseDescription.trim());
      formData.append('categoryId', exerciseCategoryId);
      
      // Обрабатываем теги как массив
      if (exerciseTagIds.length > 0) {
        exerciseTagIds.forEach(tagId => {
          formData.append('tagIds', tagId);
        });
      }
      
      // Обрабатываем числовые поля, преобразуя их в числа
      if (exerciseLength && exerciseLength.trim() !== '') {
        const length = parseInt(exerciseLength.trim());
        if (!isNaN(length)) {
          formData.append('length', length.toString());
        }
      }
      
      if (exerciseWidth && exerciseWidth.trim() !== '') {
        const width = parseInt(exerciseWidth.trim());
        if (!isNaN(width)) {
          formData.append('width', width.toString());
        }
      }
      
      // Добавляем файл, если он есть
      if (exerciseFile) {
        formData.append('file', exerciseFile);
      }
      
      console.log('Отправляем данные:', {
        name: exerciseName.trim(),
        description: exerciseDescription.trim(),
        categoryId: exerciseCategoryId,
        tagIds: exerciseTagIds,
        length: exerciseLength ? parseInt(exerciseLength) : null,
        width: exerciseWidth ? parseInt(exerciseWidth) : null,
        file: exerciseFile ? `${exerciseFile.name} (${exerciseFile.size} bytes)` : null
      });
      
      const response = await fetch('/api/exercises', {
        method: 'POST',
        body: formData,
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
  
  // Обработчик файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExerciseFile(e.target.files[0]);
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
    if (e.target.files && e.target.files[0]) {
      setEditExerciseFile(e.target.files[0]);
    }
  };
  
  // Функция для сохранения изменений
  const handleSaveExercise = async () => {
    try {
      if (!selectedExercise) return;
      
      const formData = new FormData();
      formData.append('name', editExerciseName);
      formData.append('description', editExerciseDescription);
      formData.append('categoryId', editExerciseCategoryId);
      
      editExerciseTagIds.forEach(tagId => {
        formData.append('tagIds', tagId);
      });
      
      if (editExerciseLength) {
        formData.append('length', editExerciseLength);
      }
      
      if (editExerciseWidth) {
        formData.append('width', editExerciseWidth);
      }
      
      if (editExerciseFile) {
        formData.append('file', editExerciseFile);
      }
      
      const response = await fetch(`/api/exercises/${selectedExercise.id}`, {
        method: 'PUT',
        body: formData,
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
    <div className="py-6">
      <div className="flex items-center justify-between mb-4">
        {/* Фильтры слева */}
        <div className="flex items-center space-x-2">
          {/* 1. Поле поиска */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <MagnifyingGlassIcon className="h-4 w-4 text-vista-light/50" />
            </div>
            <Input
              type="text"
              placeholder="Поиск упражнений..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 h-9 w-64 rounded-md bg-vista-dark text-vista-light border border-vista-secondary/50 focus:border-vista-primary"
            />
          </div>
          
          {/* 2. Фильтр по автору */}
          <div className="relative" ref={authorDropdownRef}>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-9 px-3 text-vista-light/70 border border-[#2c3c42] w-[150px] justify-between ${selectedAuthors.length > 0 ? 'border-vista-primary/60' : ''}`}
              onClick={() => setAuthorDropdownOpen(!authorDropdownOpen)}
            >
              <span>Автор{selectedAuthors.length > 0 ? ` (${selectedAuthors.length})` : ''}</span>
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
              <span>Категория{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ''}</span>
              <ChevronDownIcon className="h-3 w-3 ml-1" />
            </Button>
            
            {categoryDropdownOpen && (
              <div className="absolute z-50 mt-1 min-w-[200px] max-h-[320px] overflow-y-auto bg-[#1a2228]/80 backdrop-blur-md border border-[#2c3c42] rounded-md shadow-lg">
                <div className="py-1">
                  {categories.map(category => (
                    <div 
                      key={category.id}
                      className={`flex items-center px-4 py-2 cursor-pointer ${selectedCategories.includes(category.id) ? 'bg-[#2c3c42]/50 text-vista-primary' : 'text-[#e6f0f0] hover:bg-[#2c3c42]/30'}`}
                      onClick={() => toggleCategory(category.id)}
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
              <span>Тег{selectedTags.length > 0 ? ` (${selectedTags.length})` : ''}</span>
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
          
          {/* Кнопка сброса фильтров, если активны */}
          {(searchQuery || selectedCategories.length > 0 || selectedTags.length > 0 || selectedAuthors.length > 0) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetFilters}
              className="h-9 text-vista-light/70"
            >
              Сбросить фильтры
            </Button>
          )}
        </div>
          
        {/* Кнопка добавления упражнения справа */}
        <Dialog open={showAddExerciseDialog} onOpenChange={(open) => {
          setShowAddExerciseDialog(open);
          if (!open) resetExerciseForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              variant="default" 
              size="sm"
              className="h-9 bg-vista-primary text-vista-dark hover:bg-vista-primary/90"
            >
              <PlusIcon className="h-4 w-4 mr-1" /> Добавить упражнение
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-vista-dark border border-vista-secondary/70 sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Добавить упражнение</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Название упражнения */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="exerciseName" className="text-right">
                  Название<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="exerciseName"
                  value={exerciseName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExerciseName(e.target.value)}
                  className={`col-span-3 ${exerciseErrors.name ? 'border-red-500' : ''}`}
                  placeholder="Введите название упражнения"
                />
                {exerciseErrors.name && (
                  <div className="col-span-4 text-right text-red-500 text-xs">
                    {exerciseErrors.name}
                  </div>
                )}
              </div>
              
              {/* Описание упражнения */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="exerciseDescription" className="text-right pt-2">
                  Описание<span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="exerciseDescription"
                  value={exerciseDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExerciseDescription(e.target.value)}
                  className={`col-span-3 h-20 ${exerciseErrors.description ? 'border-red-500' : ''}`}
                  placeholder="Введите описание упражнения"
                />
                {exerciseErrors.description && (
                  <div className="col-span-4 text-right text-red-500 text-xs">
                    {exerciseErrors.description}
                  </div>
                )}
              </div>
              
              {/* Длина и ширина */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="exerciseDimensions" className="text-right">
                  Размеры
                </Label>
                <div className="col-span-3 flex gap-2">
                  <div className="flex-1">
                    <Input
                      id="exerciseLength"
                      value={exerciseLength}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExerciseLength(e.target.value)}
                      className="w-full"
                      placeholder="Длина"
                      type="number"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      id="exerciseWidth"
                      value={exerciseWidth}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExerciseWidth(e.target.value)}
                      className="w-full"
                      placeholder="Ширина"
                      type="number"
                    />
                  </div>
                </div>
              </div>
              
              {/* Категория упражнения */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="exerciseCategory" className="text-right">
                  Категория<span className="text-red-500">*</span>
                </Label>
                <div className="col-span-3 relative" ref={exerciseCategoryDropdownRef}>
                  <Button 
                    type="button"
                    variant="outline" 
                    className={`w-full justify-between ${exerciseErrors.categoryId ? 'border-red-500' : ''}`}
                    onClick={() => setExerciseCategoryDropdownOpen(!exerciseCategoryDropdownOpen)}
                  >
                    <span>
                      {exerciseCategoryId 
                        ? categories.find(c => c.id === exerciseCategoryId)?.name 
                        : 'Выберите категорию'}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 ml-1" />
                  </Button>
                  
                  {exerciseCategoryDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-[#1a2228]/80 backdrop-blur-md border border-[#2c3c42] rounded-md shadow-lg">
                      <div className="py-1">
                        {categories.map(category => (
                          <div 
                            key={category.id}
                            className={`flex items-center px-4 py-2 cursor-pointer ${exerciseCategoryId === category.id ? 'bg-[#2c3c42]/50 text-vista-primary' : 'text-[#e6f0f0] hover:bg-[#2c3c42]/30'}`}
                            onClick={() => {
                              setExerciseCategoryId(category.id);
                              setExerciseTagIds([]);
                              setExerciseCategoryDropdownOpen(false);
                            }}
                          >
                            <div className="flex items-center flex-grow">
                              <span>{category.name}</span>
                            </div>
                            {exerciseCategoryId === category.id && 
                              <CheckIcon className="h-4 w-4 text-vista-primary" />
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {exerciseErrors.categoryId && (
                  <div className="col-span-4 text-right text-red-500 text-xs">
                    {exerciseErrors.categoryId}
                  </div>
                )}
              </div>
              
              {/* Теги упражнения */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="exerciseTags" className="text-right">
                  Теги<span className="text-red-500">*</span>
                </Label>
                <div className="col-span-3 relative" ref={exerciseTagsDropdownRef}>
                  <Button 
                    type="button"
                    variant="outline" 
                    className={`w-full justify-between ${exerciseErrors.tags ? 'border-red-500' : ''}`}
                    disabled={!exerciseCategoryId}
                    onClick={() => setExerciseTagsDropdownOpen(!exerciseTagsDropdownOpen)}
                  >
                    <span>
                      {exerciseTagIds.length > 0 
                        ? `Выбрано ${exerciseTagIds.length} ${exerciseTagIds.length === 1 ? 'тег' : 'тегов'}` 
                        : 'Выберите теги'}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 ml-1" />
                  </Button>
                  
                  {exerciseTagsDropdownOpen && exerciseCategoryId && (
                    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-[#1a2228]/80 backdrop-blur-md border border-[#2c3c42] rounded-md shadow-lg">
                      <div className="py-1">
                        {getTagsForCategory().length > 0 ? (
                          getTagsForCategory().map(tag => (
                            <div 
                              key={tag.id}
                              className={`flex items-center px-4 py-2 cursor-pointer ${exerciseTagIds.includes(tag.id) ? 'bg-[#2c3c42]/50 text-vista-primary' : 'text-[#e6f0f0] hover:bg-[#2c3c42]/30'}`}
                              onClick={() => toggleExerciseTag(tag.id)}
                            >
                              <div className="flex items-center flex-grow">
                                <span>{tag.name}</span>
                              </div>
                              {exerciseTagIds.includes(tag.id) && 
                                <CheckIcon className="h-4 w-4 text-vista-primary" />
                              }
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-[#e6f0f0]/50">
                            Нет доступных тегов для этой категории
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {exerciseErrors.tags && (
                  <div className="col-span-4 text-right text-red-500 text-xs">
                    {exerciseErrors.tags}
                  </div>
                )}
              </div>
              
              {/* Загрузка файла */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="exerciseFile" className="text-right">
                  Файл
                </Label>
                <div className="col-span-3">
                  <div 
                    className="border border-dashed border-vista-secondary/50 rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-vista-secondary/10 transition-colors"
                    onClick={openFileDialog}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*,video/*" 
                    />
                    <ArrowUpTrayIcon className="h-8 w-8 text-vista-light/50 mb-2" />
                    {exerciseFile ? (
                      <div className="text-center">
                        <p className="text-vista-primary text-sm">{exerciseFile.name}</p>
                        <p className="text-vista-light/50 text-xs">{(exerciseFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <p className="text-vista-light/50 text-sm">Нажмите здесь для загрузки изображения или видео</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetExerciseForm();
                  setShowAddExerciseDialog(false);
                }}
              >
                Отмена
              </Button>
              <Button 
                type="button" 
                onClick={handleAddExercise}
              >
                Добавить
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
              Найдено упражнений: {filteredExercises.length}
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
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <BookOpenIcon className="h-16 w-16 text-vista-primary/30" />
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
                  ) : selectedExercise.fileType?.includes('video/') ? (
                    <video 
                      src={selectedExercise.fileUrl} 
                      controls
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
                              setEditExerciseCategoryId(category.id);
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
                        {tags.map(tag => (
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
    </div>
  );
} 