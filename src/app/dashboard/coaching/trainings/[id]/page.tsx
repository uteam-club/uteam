'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, Users, Trash, Save, CheckSquare, Plus, ArrowLeft, FileText, Tag, Search, Check, X, ClipboardCheck, Pencil, Share } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import AttendanceModal from '@/components/training/AttendanceModal';
import SelectExercisesModal from '@/components/training/SelectExercisesModal';
import { CreateTrainingModal } from '@/components/training/CreateTrainingModal';

interface Training {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location?: string;
  notes?: string;
  teamId: string;
  team: string;
  categoryId: string;
  category: string;
  isCompleted?: boolean;
  type: string;
}

interface Exercise {
  id: string;
  title: string;
  description: string;
  authorId: string;
  author: {
    id: string;
    name: string;
  };
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  tags: Array<{
    id: string;
    name: string;
  }>;
  mediaItems?: Array<{
    id: string;
    url: string;
    publicUrl?: string;
    type: string;
  }>;
  position?: number;
  trainingExerciseId?: string;
  notes?: string;
}

interface ExerciseCategory {
  id: string;
  name: string;
}

interface ExerciseTag {
  id: string;
  name: string;
  exerciseCategoryId: string;
}

interface Author {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

interface TrainingCategory {
  id: string;
  name: string;
}

export default function TrainingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPublicView = searchParams?.get('view') === 'public';
  const { data: session } = useSession();
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trainingId = params.id as string;
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Состояния для диалога выбора упражнений
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [modalExercises, setModalExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filteredTags, setFilteredTags] = useState<ExerciseTag[]>([]);
  
  // Состояние для пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const exercisesPerPage = 12;
  
  // Данные для фильтров
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [tags, setTags] = useState<ExerciseTag[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [exercisesError, setExercisesError] = useState<string | null>(null);
  
  // Состояние для управления модальным окном посещаемости
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTraining, setEditTraining] = useState<any>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  const [trainingCategories, setTrainingCategories] = useState<TrainingCategory[]>([]);
  const [isLoadingTrainingCategories, setIsLoadingTrainingCategories] = useState(false);

  const isSingleTeam = teams.length === 1;

  useEffect(() => {
    async function fetchTraining() {
      try {
        setLoading(true);
        const response = await fetch(`/api/trainings/${trainingId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Тренировка не найдена');
          }
          throw new Error('Не удалось загрузить данные тренировки');
        }
        const data = await response.json();
        setTraining(data);
        setIsCompleted(data.isCompleted || false);
        const savedData = localStorage.getItem(`training_data_${trainingId}`);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData.isCompleted !== undefined) {
            setIsCompleted(parsedData.isCompleted);
          }
        }
      } catch (err: any) {
        console.error('Ошибка при загрузке тренировки:', err);
        setError(err.message || 'Произошла ошибка при загрузке тренировки');
      } finally {
        setLoading(false);
      }
    }
    if (isPublicView || session?.user) {
      fetchTraining();
    }
  }, [trainingId, session, isPublicView]);
  
  // Загрузка упражнений для диалога
  const loadExercises = async () => {
    setIsLoadingExercises(true);
    setExercisesError(null);
    try {
      // Загрузка упражнений
      const response = await fetch('/api/exercises', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Не удалось загрузить упражнения');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Некорректный ответ API');
      // Защита: фильтруем невалидные элементы и подставляем дефолтные category/author
      const safeData = data.filter(Boolean).map(ex => ({
        ...ex,
        category: ex && ex.category && typeof ex.category === 'object' && ex.category.id ? ex.category : { id: 'none', name: 'Без категории' },
        author: ex && ex.author && typeof ex.author === 'object' && ex.author.id ? ex.author : { id: 'unknown', name: 'Неизвестно' },
      }));
      console.log('Упражнения из API (safe):', safeData);
      setModalExercises(safeData);
      setFilteredExercises(safeData);
      
      // Загрузка категорий
      const catResponse = await fetch('/api/exercise-categories', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (catResponse.ok) {
        const catData = await catResponse.json();
        setCategories(catData);
      } else {
        const errorData = await catResponse.json();
        console.error('Ошибка при загрузке категорий:', errorData);
      }
      
      // Загрузка тегов
      const tagResponse = await fetch('/api/exercise-tags', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (tagResponse.ok) {
        const tagData = await tagResponse.json();
        setTags(tagData);
      }
      
      // Формирование списка авторов из упражнений
      const uniqueAuthors = Array.from(
        new Map(safeData.map((ex: Exercise) => [ex.author.id, ex.author])).values()
      );
      setAuthors(uniqueAuthors as Author[]);
    } catch (error: any) {
      console.error('Ошибка при загрузке упражнений:', error);
      setExercises([]);
      setFilteredExercises([]);
      setExercisesError(error.message || 'Ошибка при загрузке упражнений');
    } finally {
      setIsLoadingExercises(false);
    }
  };
  
  // Генерация демо-данных для предварительного просмотра
  const generateDemoExercises = (): Exercise[] => {
    return Array(12).fill(0).map((_, index) => ({
      id: `ex-${index + 1}`,
      title: `Упражнение ${index + 1}`,
      description: `Описание упражнения ${index + 1}`,
      authorId: index % 3 === 0 ? 'author-1' : index % 3 === 1 ? 'author-2' : 'author-3',
      author: {
        id: index % 3 === 0 ? 'author-1' : index % 3 === 1 ? 'author-2' : 'author-3',
        name: index % 3 === 0 ? 'Иван Петров' : index % 3 === 1 ? 'Алексей Смирнов' : 'Сергей Иванов'
      },
      categoryId: index % 4 === 0 ? 'cat-1' : index % 4 === 1 ? 'cat-2' : index % 4 === 2 ? 'cat-3' : 'cat-4',
      category: {
        id: index % 4 === 0 ? 'cat-1' : index % 4 === 1 ? 'cat-2' : index % 4 === 2 ? 'cat-3' : 'cat-4',
        name: index % 4 === 0 ? 'Техника' : index % 4 === 1 ? 'Тактика' : index % 4 === 2 ? 'Физподготовка' : 'Разминка'
      },
      tags: [
        { id: `tag-${index % 5 + 1}`, name: `Тег ${index % 5 + 1}` },
        { id: `tag-${(index + 2) % 5 + 1}`, name: `Тег ${(index + 2) % 5 + 1}` }
      ],
      mediaItems: [
        { 
          id: `media-${index}`, 
          url: `https://picsum.photos/seed/exercise${index}/300/200`,
          publicUrl: `https://picsum.photos/seed/exercise${index}/300/200`,
          type: 'IMAGE'
        }
      ]
    }));
  };
  
  // Фильтрация упражнений
  useEffect(() => {
    let filtered = modalExercises;
    
    // Фильтр по поисковому запросу
    if (searchQuery) {
      filtered = filtered.filter(ex => 
        ex.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Фильтр по категории
    if (selectedCategory) {
      filtered = filtered.filter(ex => ex.category.id === selectedCategory);
    }
    
    // Фильтр по автору
    if (selectedAuthor) {
      filtered = filtered.filter(ex => ex.author.id === selectedAuthor);
    }
    
    // Фильтр по тегам (множественный выбор)
    if (selectedTags.length > 0) {
      filtered = filtered.filter(ex => 
        selectedTags.some(tagId => ex.tags.some(tag => tag.id === tagId))
      );
    }
    
    setFilteredExercises(filtered);
  }, [modalExercises, searchQuery, selectedCategory, selectedAuthor, selectedTags]);

  // Фильтрация тегов на основе выбранной категории
  useEffect(() => {
    if (selectedCategory) {
      const tagsForCategory = tags.filter(tag => 
        tag.exerciseCategoryId === selectedCategory
      );
      setFilteredTags(tagsForCategory);
      
      // Очищаем выбранные теги, которые не принадлежат этой категории
      setSelectedTags(prev => 
        prev.filter(tagId => 
          tagsForCategory.some(tag => tag.id === tagId)
        )
      );
    } else {
      setFilteredTags(tags);
    }
  }, [selectedCategory, tags]);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedAuthor, selectedTags]);

  // Открытие диалога выбора упражнений
  const handleOpenExerciseDialog = () => {
    setIsExerciseDialogOpen(true);
    loadExercises();
  };
  
  // Обработка выбора упражнения
  const toggleExerciseSelection = (exerciseId: string) => {
    setSelectedExercises(prevSelected => {
      if (prevSelected.includes(exerciseId)) {
        return prevSelected.filter(id => id !== exerciseId);
      } else {
        return [...prevSelected, exerciseId];
      }
    });
  };
  
  // Добавление выбранных упражнений к тренировке
  const handleAddSelectedExercises = async () => {
    const exercisesToAdd = modalExercises.filter(ex => selectedExercises.includes(ex.id));
    try {
      setLoading(true);
      const exerciseIds = exercisesToAdd.map(ex => ex.id);
      const response = await fetch(`/api/trainings/${trainingId}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseIds }),
      });
      if (!response.ok) throw new Error('Ошибка при добавлении упражнений');
      // После добавления — повторно загружаем упражнения тренировки
      const getResp = await fetch(`/api/trainings/${trainingId}/exercises`);
      const getData = await getResp.json();
      setExercises(Array.isArray(getData) ? getData : []);
      setIsExerciseDialogOpen(false);
      setSelectedExercises([]);
    } catch (error) {
      console.error('Ошибка при добавлении упражнений:', error);
      alert('Не удалось добавить упражнения. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };
  
  // Сброс фильтров
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedAuthor(null);
    setSelectedTags([]);
    setCurrentPage(1); // Сбрасываем страницу на первую
  };

  // Обработчик открытия модального окна посещаемости
  const handleAttendance = () => {
    setIsAttendanceModalOpen(true);
  };

  // Обработчик изменения состояния тренировки
  const handleCompletedChange = async (checked: boolean) => {
    try {
      setIsCompleted(checked);
      
      // Сначала обновляем статус в базе данных через API
      const response = await fetch(`/api/trainings/${trainingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: checked ? 'COMPLETED' : 'SCHEDULED' }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Ошибка при обновлении статуса тренировки:', errorData);
        throw new Error('Не удалось обновить статус тренировки');
      }
      
      // Затем сохраняем в localStorage для совместимости
      if (training) {
        const savedData = localStorage.getItem(`training_data_${trainingId}`) || '{}';
        const parsedData = JSON.parse(savedData);
        
        const updatedData = {
          ...parsedData,
          isCompleted: checked
        };
        
        localStorage.setItem(`training_data_${trainingId}`, JSON.stringify(updatedData));
      }
      
      console.log(`Статус тренировки обновлен: ${checked ? 'Завершена' : 'Запланирована'}`);
    } catch (error) {
      console.error('Ошибка при обновлении статуса тренировки:', error);
      // Возвращаем предыдущее состояние при ошибке
      setIsCompleted(!checked);
      alert('Не удалось обновить статус тренировки. Пожалуйста, попробуйте снова.');
    }
  };

  // Временно заменим handleSave на сохранение в localStorage
  const handleSave = async () => {
    if (!training) return;
    
    try {
      setLoading(true);
      
      // ВРЕМЕННО: сохраняем данные тренировки в localStorage
      const trainingData = {
        ...training,
        isCompleted
      };
      
      localStorage.setItem(`training_data_${trainingId}`, JSON.stringify(trainingData));
      localStorage.setItem(`training_exercises_${trainingId}`, JSON.stringify(exercises));
      
      console.log("Сохраняем тренировку:", trainingData);
      console.log("Сохраняем упражнения:", exercises);
      
      alert('Тренировка успешно сохранена');
    } catch (error) {
      console.error('Ошибка при сохранении тренировки:', error);
      alert('Не удалось сохранить тренировку. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  // Модифицируем обработчик удаления упражнения для обновления localStorage
  const handleDeleteExercise = (trainingExerciseId: string) => {
    setLoading(true);
    fetch(`/api/trainings/${trainingId}/exercises`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainingExerciseId }),
    })
      .then(res => res.json())
      .then(() => fetch(`/api/trainings/${trainingId}/exercises`))
      .then(res => res.json())
      .then(data => setExercises(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Ошибка при удалении упражнения:', err);
        alert('Не удалось удалить упражнение. Пожалуйста, попробуйте снова.');
      })
      .finally(() => setLoading(false));
  };
  
  const handleDelete = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить эту тренировку? Это действие необратимо.')) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/trainings/${trainingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при удалении тренировки');
      }
      // После успешного удаления — редирект на список тренировок
      router.push('/dashboard/coaching/trainings');
    } catch (error) {
      console.error('Ошибка при удалении тренировки:', error);
      alert('Не удалось удалить тренировку. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  // Обновление компонентов при изменении состояния фильтров
  useEffect(() => {
    if (selectedCategory) {
      // Код для обновления UI
    }
    
    if (selectedAuthor) {
      // Код для обновления UI
    }
    
    if (selectedTags.length > 0) {
      // Код для обновления UI
    }
  }, [selectedCategory, selectedAuthor, selectedTags]);

  // useEffect для загрузки упражнений тренировки при открытии страницы
  useEffect(() => {
    async function fetchTrainingExercises() {
      try {
        setLoading(true);
        const response = await fetch(`/api/trainings/${trainingId}/exercises`);
        if (!response.ok) throw new Error('Не удалось загрузить упражнения тренировки');
        const data = await response.json();
        setExercises(Array.isArray(data) ? data : []);
      } catch (err) {
        setExercises([]);
        console.error('Ошибка при загрузке упражнений тренировки:', err);
      } finally {
        setLoading(false);
      }
    }
    if (session?.user) {
      fetchTrainingExercises();
    }
  }, [trainingId, session]);

  // Функция для отправки нового порядка на сервер
  const updateExerciseOrder = async (newExercises: Exercise[]) => {
    const positions = newExercises.map((ex, idx) => ({
      trainingExerciseId: ex.trainingExerciseId,
      position: idx + 1,
    }));
    try {
      setLoading(true);
      await fetch(`/api/trainings/${trainingId}/exercises`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions }),
      });
      // После обновления — повторно загружаем упражнения тренировки
      const getResp = await fetch(`/api/trainings/${trainingId}/exercises`);
      const getData = await getResp.json();
      setExercises(Array.isArray(getData) ? getData : []);
    } catch (err) {
      console.error('Ошибка при обновлении порядка упражнений:', err);
      alert('Не удалось обновить порядок упражнений. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!training) return;
    setEditTraining({
      title: training.title || '',
      teamId: training.teamId || '',
      date: training.date || '',
      time: training.time || '',
      categoryId: training.categoryId || '',
      type: training.type || 'TRAINING',
    });
    setIsEditModalOpen(true);
  };

  const handleEditTrainingChange = (field: string, value: string) => {
    setEditTraining((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleEditTrainingSave = async () => {
    if (!editTraining) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/trainings/${trainingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTraining),
      });
      if (!response.ok) throw new Error('Ошибка при обновлении тренировки');
      const updated = await response.json();
      setTraining((prev: any) => ({ ...prev, ...updated }));
      setIsEditModalOpen(false);
    } catch (error) {
      alert('Не удалось обновить тренировку. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchTeams() {
      try {
        setIsLoadingTeams(true);
        const response = await fetch('/api/teams', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!response.ok) throw new Error('Не удалось загрузить команды');
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        setTeams([]);
      } finally {
        setIsLoadingTeams(false);
      }
    }
    if (session?.user) fetchTeams();
  }, [session]);

  useEffect(() => {
    async function fetchTrainingCategories() {
      try {
        setIsLoadingTrainingCategories(true);
        const response = await fetch('/api/training-categories', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!response.ok) throw new Error('Не удалось загрузить категории тренировок');
        const data = await response.json();
        setTrainingCategories(data);
      } catch (error) {
        setTrainingCategories([]);
      } finally {
        setIsLoadingTrainingCategories(false);
      }
    }
    if (session?.user) fetchTrainingCategories();
  }, [session]);

  // Функция для копирования публичной ссылки
  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=public`;
    navigator.clipboard.writeText(url);
    alert('Ссылка на тренировку скопирована!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="text-red-500 text-lg">{error}</div>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Вернуться назад
        </Button>
      </div>
    );
  }

  // Если API еще не реализован, используем временные данные
  const trainingData = training || {
    id: trainingId,
    title: 'Тренировка игровой тактики',
    description: 'Развитие тактических навыков и отработка командных взаимодействий',
    date: '2023-11-15',
    time: '16:00',
    location: 'Тренировочное поле №2',
    teamId: '1',
    team: 'Основной состав',
    categoryId: '2',
    category: 'Тактическая тренировка',
    notes: 'Обратить внимание на построение защитной линии и прессинг',
    type: 'TRAINING'
  };

  return (
    <div className={isPublicView ? 'min-h-screen bg-vista-dark text-vista-light flex flex-col items-center px-2 py-4' : ''}>
      {/* Верхний бар и кнопки только если не public */}
      {!isPublicView && (
        <div>
          <Link 
            href="/dashboard/coaching/trainings" 
            className="inline-flex items-center text-vista-light/70 hover:text-vista-light transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Назад к списку тренировок
          </Link>
        </div>
      )}
      <Card className={isPublicView ? 'w-full max-w-2xl mx-auto bg-vista-dark/80 border-vista-secondary/50 shadow-md' : 'bg-vista-dark/50 border-vista-secondary/50 shadow-md'}>
        {/* Кнопки действий только если не public */}
        {!isPublicView && (
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Button onClick={handleAttendance} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow-sm">
                <ClipboardCheck className="mr-2 h-4 w-4" /> Отметить посещаемость
              </Button>
              <Button onClick={handleOpenExerciseDialog} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> Добавить упражнение
              </Button>
              <div className={`flex items-center space-x-2 ml-1 rounded-md border px-3 py-2 transition-colors shadow-sm ${isCompleted ? 'bg-green-500/20 border-green-500/50' : 'bg-vista-primary/20 border-vista-primary/50'}`}>
                <Switch id="training-completed" checked={isCompleted} onCheckedChange={handleCompletedChange} className={`${isCompleted ? 'data-[state=checked]:bg-green-500' : 'data-[state=checked]:bg-vista-primary'}`}/>
                <Label htmlFor="training-completed" className={`${isCompleted ? 'text-green-400' : 'text-vista-primary'} font-medium`}>
                  {isCompleted ? 'Завершена' : 'Запланирована'}
                </Label>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Button variant="outline" onClick={handleSave} className="bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm">
                <Save className="mr-2 h-4 w-4" /> Сохранить
              </Button>
              <Button variant="secondary" onClick={handleOpenEditModal} className="bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-primary/20 flex items-center gap-2">
                <Pencil className="h-4 w-4 mr-2 text-vista-light" /> Редактировать
              </Button>
              <Button variant="destructive" onClick={handleDelete} className="bg-red-600/70 hover:bg-red-700/70 text-white shadow-sm">
                <Trash className="mr-2 h-4 w-4" /> Удалить
              </Button>
              {/* Кнопка поделиться */}
              <Button onClick={handleShare} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow-sm">
                <Share className="mr-2 h-4 w-4" /> Поделиться
              </Button>
            </div>
          </CardHeader>
        )}
        
        <CardContent>
          {/* Информационный блок тренировки */}
          <div className="mb-8">
            {/* Заголовок тренировки */}
            <h2 className="text-vista-light text-xl font-semibold mb-4">{trainingData.title}</h2>
            
            {/* Основная информация в виде сетки */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4">
              {/* Категория */}
              <div className="flex items-center bg-vista-dark/70 p-3 rounded-md border border-vista-secondary/50 shadow-md">
                <Tag className="h-5 w-5 mr-3 text-vista-primary" />
                <div>
                  <div className="text-vista-light/70 text-xs mb-1">Категория</div>
                  <div className="text-vista-light">{trainingData.category || { id: '', name: 'Без категории' }.name}</div>
                </div>
              </div>
              
              {/* Команда */}
              {!isSingleTeam && (
                <div className="flex items-center bg-vista-dark/70 p-3 rounded-md border border-vista-secondary/50 shadow-md">
                  <Users className="h-5 w-5 mr-3 text-vista-primary" />
                  <div>
                    <div className="text-vista-light/70 text-xs mb-1">Команда</div>
                    <div className="text-vista-light">{trainingData.team || 'Неизвестно'}</div>
                  </div>
                </div>
              )}
              
              {/* Дата */}
              <div className="flex items-center bg-vista-dark/70 p-3 rounded-md border border-vista-secondary/50 shadow-md">
                <Calendar className="h-5 w-5 mr-3 text-vista-primary" />
                <div>
                  <div className="text-vista-light/70 text-xs mb-1">Дата</div>
                  <div className="text-vista-light">{trainingData.date}</div>
                </div>
              </div>
              
              {/* Время */}
              <div className="flex items-center bg-vista-dark/70 p-3 rounded-md border border-vista-secondary/50 shadow-md">
                <Clock className="h-5 w-5 mr-3 text-vista-primary" />
                <div>
                  <div className="text-vista-light/70 text-xs mb-1">Время</div>
                  <div className="text-vista-light">{trainingData.time ? trainingData.time : 'Неизвестно'}</div>
                </div>
              </div>
              
              {/* Место проведения (если есть) на всю ширину */}
              {trainingData.location && (
                <div className="flex items-center bg-vista-dark/70 p-3 rounded-md border border-vista-secondary/50 shadow-md sm:col-span-2 md:col-span-4">
                  <MapPin className="h-5 w-5 mr-3 text-vista-primary" />
                  <div>
                    <div className="text-vista-light/70 text-xs mb-1">Место проведения</div>
                    <div className="text-vista-light">{trainingData.location || 'Неизвестно'}</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Описание и примечания */}
            {(trainingData.description || trainingData.notes) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {trainingData.description && (
                  <div className="bg-vista-dark/30 p-4 rounded-md border border-vista-secondary/30 shadow-md">
                    <div className="flex items-center mb-2">
                      <FileText className="h-5 w-5 mr-2 text-vista-primary" />
                      <h3 className="text-vista-light font-medium">Описание</h3>
                    </div>
                    <p className="text-vista-light/90">{trainingData.description || 'Без описания'}</p>
                  </div>
                )}
                
                {trainingData.notes && (
                  <div className="bg-vista-dark/30 p-4 rounded-md border border-vista-secondary/30 shadow-md">
                    <div className="flex items-center mb-2">
                      <FileText className="h-5 w-5 mr-2 text-vista-primary" />
                      <h3 className="text-vista-light font-medium">Примечания</h3>
                    </div>
                    <p className="text-vista-light/90 whitespace-pre-line">{trainingData.notes || 'Без примечаний'}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator className="border-vista-secondary/50 my-6" />

          {/* Упражнения для тренировки */}
          <div>
            <h3 className="text-vista-light text-lg mb-4">Упражнения</h3>
            
            {exercises.length > 0 ? (
              <div className="space-y-4">
                {exercises.map((exercise, index) => (
                  <div 
                    key={exercise.id} 
                    className="flex flex-col sm:flex-row rounded-md border overflow-hidden bg-vista-dark/50 border-vista-secondary/50 shadow-md"
                  >
                    {/* Медиа изображение (слева) */}
                    <div className="sm:w-[300px] overflow-hidden bg-vista-dark/30">
                      {exercise.mediaItems && exercise.mediaItems.length > 0 ? (
                        <>
                          {(() => {
                            const imageUrl = exercise.mediaItems[0].publicUrl || exercise.mediaItems[0].url || null;
                            return imageUrl ? (
                              <div className="w-full h-full flex items-center justify-center p-1">
                                <div className="relative w-full h-full flex items-center justify-center">
                                                                      <img 
                                      src={imageUrl}
                                      alt={exercise.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://picsum.photos/seed/ex${exercise.id}/400/300`;
                                        (e.target as HTMLImageElement).onerror = null;
                                      }}
                                    />
                                    
                                    {/* Кнопка воспроизведения видео (только для видео) */}
                                    {exercise.mediaItems && 
                                     exercise.mediaItems[0] && 
                                     exercise.mediaItems[0].type === "VIDEO" && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-vista-dark/40 rounded-full p-3 hover:bg-vista-primary/70 transition cursor-pointer">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                        </div>
                                      </div>
                                    )}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-vista-light/50 min-h-[200px]">
                                <span>Изображение недоступно</span>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-vista-light/50 min-h-[200px]">
                          <span>Нет изображения</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Информация об упражнении (в центре) */}
                    <div className="flex-grow p-4">
                      <h4 className="font-medium text-vista-primary text-lg">
                        {exercise.title}
                      </h4>
                      
                      <p className="text-vista-light/80 mt-1">
                        {exercise.description || "Без описания"}
                      </p>
                    </div>
                    
                    {/* Кнопки управления (справа) */}
                    <div className="flex sm:flex-col items-center gap-2 p-4 border-t sm:border-t-0 sm:border-l border-vista-secondary/50">
                      {/* Кнопка удаления */}
                                              <button 
                            className="bg-vista-dark/70 shadow-sm hover:bg-red-600/50 rounded-md p-2 text-vista-light"
                            onClick={(e) => {
                              e.stopPropagation();
                              // ВРЕМЕННО: удаление только из локального состояния
                              handleDeleteExercise(exercise.trainingExerciseId || '');
                            }}
                          >
                            <Trash className="h-[18px] w-[18px]" />
                          </button>
                      
                      {/* Кнопки перемещения вверх/вниз */}
                      {exercises.length > 1 && (
                        <>
                          <button 
                            className={`bg-vista-dark/70 shadow-sm hover:bg-vista-secondary/20 rounded-md p-2 text-vista-light ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (index > 0) {
                                const newExercises = [...exercises];
                                [newExercises[index], newExercises[index - 1]] = [newExercises[index - 1], newExercises[index]];
                                updateExerciseOrder(newExercises);
                              }
                            }}
                            disabled={index === 0}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6"></path></svg>
                          </button>
                          
                          <button 
                            className={`bg-vista-dark/70 shadow-sm hover:bg-vista-secondary/20 rounded-md p-2 text-vista-light ${index === exercises.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (index < exercises.length - 1) {
                                const newExercises = [...exercises];
                                [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
                                updateExerciseOrder(newExercises);
                              }
                            }}
                            disabled={index === exercises.length - 1}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-vista-secondary/50 rounded-md">
                <p className="text-vista-light/60">
                  Для этой тренировки пока не добавлены упражнения
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Модальное окно выбора упражнений */}
      <SelectExercisesModal
        open={isExerciseDialogOpen}
        onOpenChange={setIsExerciseDialogOpen}
        authors={authors}
        categories={categories}
        tags={tags}
        exercises={modalExercises}
        selectedExercises={selectedExercises}
        onSelect={toggleExerciseSelection}
        onAdd={handleAddSelectedExercises}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedAuthor={selectedAuthor}
        setSelectedAuthor={setSelectedAuthor}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        resetFilters={resetFilters}
        isLoading={isLoadingExercises}
        error={exercisesError || undefined}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        exercisesPerPage={exercisesPerPage}
        filteredExercises={filteredExercises}
      />

      {/* Модальное окно посещаемости */}
      <AttendanceModal 
        trainingId={trainingId}
        isOpen={isAttendanceModalOpen} 
        onClose={() => setIsAttendanceModalOpen(false)} 
      />

      {/* Модалка редактирования тренировки */}
      {isEditModalOpen && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-hidden backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-vista-light text-xl">Редактировать тренировку</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-vista-light/40 font-normal">Название</Label>
                <Input id="edit-title" value={editTraining.title} onChange={e => handleEditTrainingChange('title', e.target.value)} className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50" placeholder="Введите название тренировки" />
              </div>
              <div className="space-y-2">
                {!isSingleTeam && (
                  <>
                    <Label htmlFor="edit-team" className="text-vista-light/40 font-normal">Команда</Label>
                    <Select value={editTraining.teamId} onValueChange={v => handleEditTrainingChange('teamId', v)}>
                      <SelectTrigger id="edit-team" className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                        <SelectValue placeholder="Выберите команду" />
                      </SelectTrigger>
                      <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date" className="text-vista-light/40 font-normal">Дата и время</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Input id="edit-date" type="date" value={editTraining.date} onChange={e => handleEditTrainingChange('date', e.target.value)} className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden" onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch (error) {} }} />
                  </div>
                  <div className="relative">
                    <Input id="edit-time" type="time" value={editTraining.time} onChange={e => handleEditTrainingChange('time', e.target.value)} className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden" onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch (error) {} }} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category" className="text-vista-light/40 font-normal">Категория</Label>
                <Select value={editTraining.categoryId} onValueChange={v => handleEditTrainingChange('categoryId', v)}>
                  <SelectTrigger id="edit-category" className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                    {trainingCategories.map((category: TrainingCategory) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type" className="text-vista-light/40 font-normal">Тип</Label>
                <Select value={editTraining.type} onValueChange={v => handleEditTrainingChange('type', v)}>
                  <SelectTrigger id="edit-type" className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                    <SelectItem value="TRAINING">Тренировка</SelectItem>
                    <SelectItem value="GYM">Тренажерный зал</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="border-vista-secondary/30">Отмена</Button>
              <Button onClick={handleEditTrainingSave} className="bg-vista-primary hover:bg-vista-primary/90">Сохранить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 