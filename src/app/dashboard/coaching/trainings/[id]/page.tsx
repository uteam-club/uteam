'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, Users, Trash, Save, CheckSquare, Plus, ArrowLeft, FileText, Tag, Search, Check, X, ClipboardCheck } from 'lucide-react';
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

export default function TrainingPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trainingId = params.id as string;
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Состояния для диалога выбора упражнений
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
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
  
  // Состояние для хранения добавленных к тренировке упражнений
  const [trainingExercises, setTrainingExercises] = useState<Exercise[]>([]);
  
  // Состояние для управления модальным окном посещаемости
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  // Загрузка упражнений тренировки
  const loadTrainingExercises = async () => {
    try {
      // Сначала пробуем загрузить из localStorage (временное решение)
      const savedExercises = localStorage.getItem(`training_exercises_${trainingId}`);
      if (savedExercises) {
        const parsedExercises = JSON.parse(savedExercises);
        console.log('Загружены упражнения из localStorage:', parsedExercises);
        setTrainingExercises(parsedExercises);
        return true;
      }
      
      // Затем пробуем API
      const response = await fetch(`/api/trainings/${trainingId}/exercises`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // Преобразуем данные в нужный формат, если необходимо
          const formattedExercises = data.map(ex => ({
            id: ex.id,
            title: ex.title,
            description: ex.description,
            authorId: ex.authorId,
            author: {
              id: ex.authorId,
              name: ex.authorName || 'Неизвестный автор'
            },
            categoryId: ex.categoryId,
            category: {
              id: ex.categoryId,
              name: ex.categoryName || 'Без категории'
            },
            tags: Array.isArray(ex.tags) ? ex.tags : [],
            mediaItems: Array.isArray(ex.mediaItems) ? ex.mediaItems : [],
            position: ex.position,
            trainingExerciseId: ex.trainingExerciseId,
            notes: ex.notes
          }));
          
          console.log('Загружены упражнения из API:', formattedExercises);
          setTrainingExercises(formattedExercises);
          // Сохраняем в localStorage для последующего использования
          localStorage.setItem(`training_exercises_${trainingId}`, JSON.stringify(formattedExercises));
          return true;
        }
      } else {
        const errorData = await response.json();
        console.error('Ошибка загрузки упражнений:', errorData);
      }
      return false;
    } catch (error) {
      console.error('Ошибка при загрузке упражнений тренировки:', error);
      return false;
    }
  };

  // Обновление порядка упражнений на сервере
  // ВРЕМЕННО: закомментировано для локального режима
  /*
  const updateExercisesOrder = async (exercises: Exercise[]) => {
    try {
      const response = await fetch(`/api/trainings/${trainingId}/exercises`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exercises: exercises.map((ex, index) => ({
            trainingExerciseId: ex.trainingExerciseId,
            position: index + 1,
            notes: ex.notes
          }))
        }),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось обновить порядок упражнений');
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при обновлении порядка упражнений:', error);
      return false;
    }
  };
  */

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
        
        // Устанавливаем состояние завершения тренировки
        setIsCompleted(data.isCompleted || false);
        
        // Проверяем, есть ли сохраненное состояние в localStorage
        const savedData = localStorage.getItem(`training_data_${trainingId}`);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData.isCompleted !== undefined) {
            setIsCompleted(parsedData.isCompleted);
          }
        }
        
        // Загрузка упражнений тренировки
        await loadTrainingExercises();
        
        // Примечание: больше не используем демо-данные, только localStorage
      } catch (err: any) {
        console.error('Ошибка при загрузке тренировки:', err);
        setError(err.message || 'Произошла ошибка при загрузке тренировки');
      } finally {
        setLoading(false);
      }
    }
    
    if (session?.user) {
      fetchTraining();
    }
  }, [trainingId, session]);
  
  // Загрузка упражнений для диалога
  const loadExercises = async () => {
    setIsLoadingExercises(true);
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
      
      // Логирование информации об изображениях для отладки
      console.log('Loaded exercises:', data);
      if (data && data.length > 0) {
        data.forEach((ex: Exercise, index: number) => {
          console.log(`Exercise ${index} (${ex.title}):`, 
            ex.mediaItems ? 
            `имеет ${ex.mediaItems.length} медиа, первый URL: ${ex.mediaItems[0]?.url || 'нет URL'}` : 
            'нет медиа');
        });
      }
      
      setExercises(data);
      setFilteredExercises(data);
      
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
        new Map(data.map((ex: Exercise) => [ex.author.id, ex.author])).values()
      );
      setAuthors(uniqueAuthors as Author[]);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      // Если API еще не готово, используем демо-данные
      const demoExercises = generateDemoExercises();
      setExercises(demoExercises);
      setFilteredExercises(demoExercises);
      
      // Извлечение категорий, тегов и авторов из демо-данных
      const uniqueCategories = Array.from(
        new Map(demoExercises.map(ex => [ex.category.id, ex.category])).values()
      );
      setCategories(uniqueCategories as ExerciseCategory[]);
      
      const uniqueTags = Array.from(
        new Map(
          demoExercises.flatMap(ex => ex.tags.map(tag => [tag.id, tag]))
        ).values()
      );
      setTags(uniqueTags as ExerciseTag[]);
      
      const uniqueAuthors = Array.from(
        new Map(demoExercises.map(ex => [ex.author.id, ex.author])).values()
      );
      setAuthors(uniqueAuthors as Author[]);
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
    let filtered = exercises;
    
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
  }, [exercises, searchQuery, selectedCategory, selectedAuthor, selectedTags]);

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
    // Найдем выбранные упражнения из общего списка
    const exercisesToAdd = exercises.filter(ex => selectedExercises.includes(ex.id));
    
    try {
      setLoading(true);
      
      // ВРЕМЕННО: добавляем упражнения только локально для проверки интерфейса
      // Назначаем позиции и id для записей связи
      const exercisesWithPosition = exercisesToAdd.map((ex, index) => ({
        ...ex,
        position: (trainingExercises.length > 0 ? Math.max(...trainingExercises.map(e => e.position || 0)) : 0) + index + 1,
        trainingExerciseId: `temp-${Date.now()}-${index}`, // Временный ID
      }));
      
      // Добавляем новые упражнения к существующим
      setTrainingExercises(prev => {
        const updated = [...prev, ...exercisesWithPosition];
        // Сохраняем в localStorage
        localStorage.setItem(`training_exercises_${trainingId}`, JSON.stringify(updated));
        return updated;
      });
      
      // В боевом режиме раскомментировать код ниже:
      /*
      const response = await fetch(`/api/trainings/${trainingId}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exerciseIds: selectedExercises
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Ошибка API:', errorData);
        throw new Error(`Не удалось добавить упражнения: ${errorData.error || response.statusText}`);
      }
      
      // Обновляем список упражнений тренировки из сервера
      const success = await loadTrainingExercises();
      
      if (!success) {
        // Если не удалось загрузить с сервера, добавим локально
        setTrainingExercises(prev => [...prev, ...exercisesToAdd]);
      }
      */
      
      console.log(`Добавлено упражнений: ${exercisesToAdd.length}`);
      
      // Закрываем диалог и сбрасываем выбор
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
      localStorage.setItem(`training_exercises_${trainingId}`, JSON.stringify(trainingExercises));
      
      console.log("Сохраняем тренировку:", trainingData);
      console.log("Сохраняем упражнения:", trainingExercises);
      
      // В боевом режиме раскомментировать код ниже:
      /*
      // Сохраняем информацию о тренировке
      const response = await fetch(`/api/trainings/${trainingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: training.title,
          description: training.description,
          date: training.date,
          time: training.time,
          location: training.location,
          notes: training.notes,
          teamId: training.teamId,
          categoryId: training.categoryId,
          isCompleted: isCompleted
        }),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось сохранить данные тренировки');
      }
      
      // Если есть упражнения, обновляем их порядок
      if (trainingExercises.length > 0) {
        await updateExercisesOrder(trainingExercises);
      }
      */
      
      alert('Тренировка успешно сохранена');
    } catch (error) {
      console.error('Ошибка при сохранении тренировки:', error);
      alert('Не удалось сохранить тренировку. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  // Модифицируем обработчик удаления упражнения для обновления localStorage
  const handleDeleteExercise = (exerciseId: string) => {
    setTrainingExercises(prev => {
      const updated = prev.filter(ex => ex.id !== exerciseId);
      localStorage.setItem(`training_exercises_${trainingId}`, JSON.stringify(updated));
      return updated;
    });
  };
  
  const handleDelete = () => {
    alert('Функция удаления тренировки будет реализована в будущем');
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
          className="bg-vista-dark/70 shadow-sm border-vista-secondary/50 shadow-md text-vista-light"
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
    notes: 'Обратить внимание на построение защитной линии и прессинг'
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Кнопка возврата */}
      <div>
        <Link 
          href="/dashboard/coaching/trainings" 
          className="inline-flex items-center text-vista-light/70 hover:text-vista-light transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Назад к списку тренировок
        </Link>
      </div>
      
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Кнопки действий */}
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Button
              onClick={handleAttendance}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow-sm"
            >
              <ClipboardCheck className="mr-2 h-4 w-4" /> Отметить посещаемость
            </Button>
            
            <Button 
              onClick={handleOpenExerciseDialog}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" /> Добавить упражнение
            </Button>
            
            {/* Переключатель состояния тренировки */}
            <div className={`flex items-center space-x-2 ml-1 rounded-md border px-3 py-2 transition-colors shadow-sm ${isCompleted ? 'bg-green-500/20 border-green-500/50' : 'bg-vista-primary/20 border-vista-primary/50'}`}>
              <Switch
                id="training-completed" 
                checked={isCompleted}
                onCheckedChange={handleCompletedChange}
                className={`${isCompleted ? 'data-[state=checked]:bg-green-500' : 'data-[state=checked]:bg-vista-primary'}`}
              />
              <Label htmlFor="training-completed" className={`${isCompleted ? 'text-green-400' : 'text-vista-primary'} font-medium`}>
                {isCompleted ? 'Завершена' : 'Запланирована'}
              </Label>
            </div>
          </div>
          
          {/* Правые кнопки */}
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Button 
              variant="outline" 
              onClick={handleSave}
              className="bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm"
            >
              <Save className="mr-2 h-4 w-4" /> Сохранить
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="bg-red-600/70 hover:bg-red-700/70 text-white shadow-sm"
            >
              <Trash className="mr-2 h-4 w-4" /> Удалить
            </Button>
          </div>
        </CardHeader>
        
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
                  <div className="text-vista-light">{trainingData.category}</div>
                </div>
              </div>
              
              {/* Команда */}
              <div className="flex items-center bg-vista-dark/70 p-3 rounded-md border border-vista-secondary/50 shadow-md">
                <Users className="h-5 w-5 mr-3 text-vista-primary" />
                <div>
                  <div className="text-vista-light/70 text-xs mb-1">Команда</div>
                  <div className="text-vista-light">{trainingData.team}</div>
                </div>
              </div>
              
              {/* Дата */}
              <div className="flex items-center bg-vista-dark/70 p-3 rounded-md border border-vista-secondary/50 shadow-md">
                <Calendar className="h-5 w-5 mr-3 text-vista-primary" />
                <div>
                  <div className="text-vista-light/70 text-xs mb-1">Дата</div>
                  <div className="text-vista-light">
                    {new Date(trainingData.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
              
              {/* Время */}
              <div className="flex items-center bg-vista-dark/70 p-3 rounded-md border border-vista-secondary/50 shadow-md">
                <Clock className="h-5 w-5 mr-3 text-vista-primary" />
                <div>
                  <div className="text-vista-light/70 text-xs mb-1">Время</div>
                  <div className="text-vista-light">{trainingData.time}</div>
                </div>
              </div>
              
              {/* Место проведения (если есть) на всю ширину */}
              {trainingData.location && (
                <div className="flex items-center bg-vista-dark/70 p-3 rounded-md border border-vista-secondary/50 shadow-md sm:col-span-2 md:col-span-4">
                  <MapPin className="h-5 w-5 mr-3 text-vista-primary" />
                  <div>
                    <div className="text-vista-light/70 text-xs mb-1">Место проведения</div>
                    <div className="text-vista-light">{trainingData.location}</div>
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
                    <p className="text-vista-light/90">{trainingData.description}</p>
                  </div>
                )}
                
                {trainingData.notes && (
                  <div className="bg-vista-dark/30 p-4 rounded-md border border-vista-secondary/30 shadow-md">
                    <div className="flex items-center mb-2">
                      <FileText className="h-5 w-5 mr-2 text-vista-primary" />
                      <h3 className="text-vista-light font-medium">Примечания</h3>
                    </div>
                    <p className="text-vista-light/90 whitespace-pre-line">{trainingData.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator className="border-vista-secondary/50 my-6" />

          {/* Упражнения для тренировки */}
          <div>
            <h3 className="text-vista-light text-lg mb-4">Упражнения</h3>
            
            {trainingExercises.length > 0 ? (
              <div className="space-y-4">
                {trainingExercises.map((exercise, index) => (
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
                              handleDeleteExercise(exercise.id);
                              
                              // В боевом режиме раскомментировать код ниже:
                              /*
                              try {
                                // Удаление упражнения через API
                                const response = await fetch(`/api/trainings/${trainingId}/exercises?exerciseId=${exercise.id}`, {
                                  method: 'DELETE'
                                });
                                
                                if (response.ok) {
                                  // После успешного удаления на сервере, обновляем локальный список
                                  handleDeleteExercise(exercise.id);
                                } else {
                                  throw new Error('Не удалось удалить упражнение');
                                }
                              } catch (error) {
                                console.error('Ошибка при удалении упражнения:', error);
                                alert('Не удалось удалить упражнение. Пожалуйста, попробуйте снова.');
                              }
                              */
                            }}
                          >
                            <Trash className="h-[18px] w-[18px]" />
                          </button>
                      
                      {/* Кнопки перемещения вверх/вниз */}
                      {trainingExercises.length > 1 && (
                        <>
                          <button 
                            className={`bg-vista-dark/70 shadow-sm hover:bg-vista-secondary/20 rounded-md p-2 text-vista-light ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (index > 0) {
                                // ВРЕМЕННО: перемещение только в локальном состоянии
                                const newExercises = [...trainingExercises];
                                [newExercises[index], newExercises[index - 1]] = [newExercises[index - 1], newExercises[index]];
                                
                                // Обновляем позиции
                                newExercises[index].position = index;
                                newExercises[index - 1].position = index - 1;
                                
                                setTrainingExercises(newExercises);
                                
                                // Синхронизируем с localStorage
                                localStorage.setItem(`training_exercises_${trainingId}`, JSON.stringify(newExercises));
                                
                                // В боевом режиме раскомментировать код ниже:
                                /*
                                try {
                                  // Обновляем локально для быстрой обратной связи
                                  const newExercises = [...trainingExercises];
                                  [newExercises[index], newExercises[index - 1]] = [newExercises[index - 1], newExercises[index]];
                                  setTrainingExercises(newExercises);
                                  
                                  // Отправляем обновленный порядок на сервер
                                  await updateExercisesOrder(newExercises);
                                } catch (error) {
                                  console.error('Ошибка при перемещении упражнения:', error);
                                  await loadTrainingExercises(); // Перезагружаем исходный порядок в случае ошибки
                                }
                                */
                              }
                            }}
                            disabled={index === 0}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6"></path></svg>
                          </button>
                          
                          <button 
                            className={`bg-vista-dark/70 shadow-sm hover:bg-vista-secondary/20 rounded-md p-2 text-vista-light ${index === trainingExercises.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (index < trainingExercises.length - 1) {
                                // ВРЕМЕННО: перемещение только в локальном состоянии
                                const newExercises = [...trainingExercises];
                                [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
                                
                                // Обновляем позиции
                                newExercises[index].position = index;
                                newExercises[index + 1].position = index + 1;
                                
                                setTrainingExercises(newExercises);
                                
                                // Синхронизируем с localStorage
                                localStorage.setItem(`training_exercises_${trainingId}`, JSON.stringify(newExercises));
                                
                                // В боевом режиме раскомментировать код ниже:
                                /*
                                try {
                                  // Обновляем локально для быстрой обратной связи
                                  const newExercises = [...trainingExercises];
                                  [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
                                  setTrainingExercises(newExercises);
                                  
                                  // Отправляем обновленный порядок на сервер
                                  await updateExercisesOrder(newExercises);
                                } catch (error) {
                                  console.error('Ошибка при перемещении упражнения:', error);
                                  await loadTrainingExercises(); // Перезагружаем исходный порядок в случае ошибки
                                }
                                */
                              }
                            }}
                            disabled={index === trainingExercises.length - 1}
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
      <Dialog open={isExerciseDialogOpen} onOpenChange={setIsExerciseDialogOpen}>
        <DialogContent className="bg-vista-dark/90 text-vista-light border-vista-secondary/50 max-w-screen-lg w-[90vw] max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
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
                  value={selectedAuthor !== null ? selectedAuthor : "all"}
                  onValueChange={value => setSelectedAuthor(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light shadow-sm">
                    <SelectValue placeholder="Автор" />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                    <SelectItem value="all">Все авторы</SelectItem>
                    {authors.map(author => (
                      <SelectItem key={author.id} value={author.id}>
                        {author.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Фильтр по категории */}
              <div>
                <Select
                  value={selectedCategory !== null ? selectedCategory : "all"}
                  onValueChange={value => setSelectedCategory(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light shadow-sm">
                    <SelectValue placeholder="Категория" />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                    <SelectItem value="all">Все категории</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Мультиселект тегов */}
              <div>
                <Select
                  value={selectedTags.length > 0 ? "selected" : "all"}
                  onValueChange={(value) => {
                    if (value === "all") {
                      setSelectedTags([]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light shadow-sm">
                    <SelectValue placeholder="Теги">
                      {selectedTags.length > 0 
                        ? `Выбрано тегов: ${selectedTags.length}` 
                        : "Выберите теги"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg max-h-[300px]">
                    <div className="p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedTags([]);
                        }}
                        className="mb-2 w-full bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm"
                      >
                        Очистить выбор
                      </Button>
                      
                      {filteredTags.map(tag => (
                        <div key={tag.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`tag-${tag.id}`}
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTags(prev => [...prev, tag.id]);
                              } else {
                                setSelectedTags(prev => prev.filter(id => id !== tag.id));
                              }
                            }}
                            className="border-vista-secondary/50 data-[state=checked]:bg-vista-primary data-[state=checked]:border-vista-primary"
                          />
                          <label
                            htmlFor={`tag-${tag.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {tag.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Отображение активных фильтров и кнопка сброса */}
            {(searchQuery || selectedCategory || selectedAuthor || selectedTags.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-vista-light/70 text-sm">Активные фильтры:</span>
                
                {searchQuery && (
                  <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                    Поиск: {searchQuery}
                    <button onClick={() => setSearchQuery('')}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedCategory && (
                  <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                    Категория: {categories.find(c => c.id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory(null)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedAuthor && (
                  <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                    Автор: {authors.find(a => a.id === selectedAuthor)?.name}
                    <button onClick={() => setSelectedAuthor(null)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedTags.length > 0 && (
                  <Badge className="bg-vista-primary/20 text-vista-primary gap-1 shadow-sm">
                    Теги: {selectedTags.length}
                    <button onClick={() => setSelectedTags([])}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetFilters}
                  className="text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20 h-7 px-2"
                >
                  Сбросить все
                </Button>
              </div>
            )}
          </div>
          
          {/* Список упражнений */}
          <div className="overflow-y-auto flex-grow" style={{ maxHeight: 'calc(75vh - 200px)' }}>
            {isLoadingExercises ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
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
                    onClick={() => toggleExerciseSelection(exercise.id)}
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
                        <>
                          {/* Используем публичный URL, если он доступен, иначе пробуем обычный URL */}
                          {(() => {
                            const imageUrl = exercise.mediaItems[0].publicUrl || exercise.mediaItems[0].url || null;
                            return imageUrl ? (
                              <>
                                <div className="w-full h-full flex items-center justify-center p-1">
                                  <div className="relative w-full h-full flex items-center justify-center">
                                    <img 
                                      src={imageUrl}
                                      alt={exercise.title}
                                      className="max-h-full max-w-full object-contain"
                                      onError={(e) => {
                                        // При ошибке переходим на плейсхолдер
                                        (e.target as HTMLImageElement).src = `https://picsum.photos/seed/ex${exercise.id}/300/200`;
                                        (e.target as HTMLImageElement).onerror = null; // Предотвращаем бесконечную рекурсию
                                      }}
                                    />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-vista-light/50">
                                <span>Изображение недоступно</span>
                              </div>
                            );
                          })()}
                        </>
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
                          {exercise.category.name}
                        </Badge>
                        
                        {exercise.tags.slice(0, 2).map(tag => (
                          <Badge 
                            key={tag.id} 
                            className="bg-vista-secondary/20 text-vista-light/90 text-xs"
                          >
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
                <p className="text-vista-light/60">
                  Упражнения не найдены
                </p>
                {(searchQuery || selectedCategory || selectedAuthor || selectedTags.length > 0) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetFilters}
                    className="mt-4 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm"
                  >
                    <X className="mr-2 h-4 w-4" /> Сбросить фильтры
                  </Button>
                )}
              </div>
            )}
          </div>
          
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
                    className="h-8 w-8 p-0 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Предыдущая страница</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
                  </Button>
                  
                  {Array.from({ length: Math.ceil(filteredExercises.length / exercisesPerPage) }).map((_, index) => {
                    const pageNumber = index + 1;
                    const isCurrentPage = pageNumber === currentPage;
                    const isNearCurrent = Math.abs(pageNumber - currentPage) <= 1 || 
                      pageNumber === 1 || 
                      pageNumber === Math.ceil(filteredExercises.length / exercisesPerPage);
                    
                    if (!isNearCurrent && pageNumber !== 1 && pageNumber !== Math.ceil(filteredExercises.length / exercisesPerPage)) {
                      // Если страница не рядом с текущей и не первая/последняя, показываем многоточие
                      if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                        return (
                          <span key={pageNumber} className="w-8 h-8 flex items-center justify-center text-vista-light/50">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={isCurrentPage ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 p-0 ${
                          isCurrentPage 
                            ? "bg-vista-primary text-vista-dark" 
                            : "bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                        }`}
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        <span className="sr-only">Страница {pageNumber}</span>
                        {pageNumber}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredExercises.length / exercisesPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(filteredExercises.length / exercisesPerPage)}
                  >
                    <span className="sr-only">Следующая страница</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
                  </Button>
                </nav>
              )}
              
              {filteredExercises.length > 0 && (
                <div className="text-vista-light/70 text-sm hidden sm:inline-block">
                  Найдено: {filteredExercises.length}
                  {filteredExercises.length > exercisesPerPage && (
                    <span> (стр. {currentPage} из {Math.ceil(filteredExercises.length / exercisesPerPage)})</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="default"
                onClick={() => {
                  setIsExerciseDialogOpen(false);
                  setSelectedExercises([]);
                }}
                className="bg-vista-dark/70 shadow-sm border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 shadow-sm"
              >
                Отмена
              </Button>
              <Button 
                size="default"
                onClick={handleAddSelectedExercises}
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow-sm"
                disabled={selectedExercises.length === 0}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Добавить ({selectedExercises.length})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно посещаемости */}
      <AttendanceModal 
        trainingId={trainingId}
        isOpen={isAttendanceModalOpen} 
        onClose={() => setIsAttendanceModalOpen(false)} 
      />
    </div>
  );
} 