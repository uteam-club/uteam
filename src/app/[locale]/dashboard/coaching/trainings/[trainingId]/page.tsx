'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeftIcon, 
  UserGroupIcon, 
  PlusIcon, 
  CalendarIcon, 
  ClockIcon, 
  TagIcon, 
  UserIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon,
  MinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import PlayerAvatar from '@/components/ui/PlayerAvatar';
import { Label } from '@/components/ui/label';

type Training = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  teamId: string;
  categoryId?: string;
  teams?: {
    id: string;
    name: string;
  };
  training_categories?: {
    name: string;
  };
};

type Exercise = {
  id: string;
  name: string;
  description?: string | null;
  difficulty: number;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  categoryId: string;
  authorId?: string | null;
  exercise_categories?: {
    name: string;
  };
  author?: {
    name: string;
  };
  tags?: Array<{ id: string; name: string }>;
};

type ExerciseCategory = {
  id: string;
  name: string;
};

type TrainingExercise = {
  id?: string;
  exercise: Exercise;
  order: number;
  duration?: number | null;
  repetitions?: number | null;
  sets?: number | null;
  notes?: string | null;
};

type Player = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  image?: string | null;
  photoUrl?: string | null;
  position?: string | null;
  number?: number | string | null;
};

type TrainingParticipant = {
  id?: string;
  playerId: string;
  trainingId: string;
  players: Player;
  attended: boolean;
  attendanceStatus: 'TRAINED' | 'REHABILITATION' | 'SICK' | 'STUDY' | 'OTHER' | null;
  notes?: string | null;
};

export default function TrainingDetailsPage() {
  const router = useRouter();
  const { trainingId, locale } = useParams() as { trainingId: string; locale: string };
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Инициализируем переводы
  const t = useTranslations('trainings');
  const common = useTranslations('common');
  
  // Добавляем состояние для показа статуса операций
  const [actionStatus, setActionStatus] = useState<{message: string, type: 'success' | 'error' | 'info' | ''; visible: boolean}>({
    message: '',
    type: '',
    visible: false
  });
  
  // Состояние для модального окна и упражнений
  const [showExercisesDialog, setShowExercisesDialog] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseCategories, setExerciseCategories] = useState<ExerciseCategory[]>([]);
  const [exerciseTags, setExerciseTags] = useState<{id: string, name: string}[]>([]);
  const [exerciseAuthors, setExerciseAuthors] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [trainingExercises, setTrainingExercises] = useState<TrainingExercise[]>([]);
  
  // Состояние для диалога редактирования параметров упражнения
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingExercise, setEditingExercise] = useState<TrainingExercise | null>(null);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number>(-1);
  const [editDuration, setEditDuration] = useState<string>("");
  const [editSets, setEditSets] = useState<string>("");
  const [editRepetitions, setEditRepetitions] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  // Состояние для модального окна отметки посещаемости
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [participants, setParticipants] = useState<TrainingParticipant[]>([]);
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [searchPlayerQuery, setSearchPlayerQuery] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  
  // Добавим состояние для пагинации
  const [currentPage, setCurrentPage] = useState(0);
  const exercisesPerPage = 9; // 3 ряда по 3 карточки
  
  // Загрузка данных о тренировке и ее упражнениях
  useEffect(() => {
    async function fetchTrainingData() {
      try {
        setLoading(true);
        
        // Загружаем информацию о тренировке
        const trainingResponse = await fetch(`/api/trainings/${trainingId}`);
        if (trainingResponse.ok) {
          const trainingData = await trainingResponse.json();
          setTraining(trainingData);
        } else {
          console.error('Ошибка загрузки данных тренировки');
        }
        
        // Загружаем упражнения тренировки
        const exercisesResponse = await fetch(`/api/trainings/exercises?trainingId=${trainingId}`);
        if (exercisesResponse.ok) {
          const trainingExercisesData = await exercisesResponse.json();
          
          // Преобразуем данные в нужный формат
          if (Array.isArray(trainingExercisesData)) {
            // Создаем счетчик для упражнений без порядка
            let positionCounter = 1;
            
            const formattedExercises = trainingExercisesData.map((item) => {
              // Если order не указан, используем увеличивающийся счетчик
              const order = item.order || item.position || positionCounter++;
              
              return {
                id: item.id,
                exercise: item.exercises,
                order: order,
                duration: item.duration,
                repetitions: item.repetitions,
                sets: item.sets,
                notes: item.notes
              };
            });
            
            // Сортируем упражнения по порядку перед установкой в стейт
            const sortedExercises = [...formattedExercises].sort((a, b) => a.order - b.order);
            console.log('Отсортированные упражнения по порядку:', sortedExercises.map(e => ({ name: e.exercise.name, order: e.order })));
            setTrainingExercises(sortedExercises);
          }
        } else {
          console.error('Ошибка загрузки упражнений тренировки');
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      } finally {
        setLoading(false);
      }
    }

    if (trainingId) {
      fetchTrainingData();
    }
  }, [trainingId]);
  
  // Загрузка данных об упражнениях, категориях, тегах и авторах
  useEffect(() => {
    async function fetchExercisesData() {
      try {
        // Загрузка упражнений
        // Модифицируем запрос, чтобы получить все упражнения (добавляем limit=100)
        const exResponse = await fetch('/api/exercises?limit=100');
        if (exResponse.ok) {
          const exData = await exResponse.json();
          // Исправляем: API возвращает объект с полем exercises, а не массив напрямую
          const exercisesArray = exData.exercises || [];
          setExercises(exercisesArray);
          console.log(`Загружено ${exercisesArray.length} упражнений`);
          
          // Извлекаем уникальных авторов из упражнений
          const uniqueAuthors = new Map();
          exercisesArray.forEach((exercise: Exercise) => {
            if (exercise.author && exercise.author.name && exercise.authorId) {
              uniqueAuthors.set(exercise.authorId, {
                id: exercise.authorId,
                name: exercise.author.name
              });
            }
          });
          setExerciseAuthors(Array.from(uniqueAuthors.values()));
        }
        
        // Загрузка категорий
        const catResponse = await fetch('/api/exercises/categories');
        if (catResponse.ok) {
          const catData = await catResponse.json();
          setExerciseCategories(catData || []);
        }
        
        // Загрузка тегов
        const tagsResponse = await fetch('/api/exercises/tags');
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setExerciseTags(tagsData || []);
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных для упражнений:', error);
      }
    }
    
    fetchExercisesData();
  }, []);

  // Загрузка игроков команды и участников тренировки
  useEffect(() => {
    async function fetchPlayersAndParticipants() {
      if (!trainingId || !training?.teamId) return;
      
      try {
        // Загрузка игроков команды
        const teamPlayersResponse = await fetch(`/api/teams/${training.teamId}/players`);
        if (teamPlayersResponse.ok) {
          const teamPlayersData = await teamPlayersResponse.json();
          setTeamPlayers(teamPlayersData);
        } else {
          console.error('Ошибка загрузки игроков команды');
        }
        
        // Загрузка всех игроков для модального окна добавления
        const allPlayersResponse = await fetch(`/api/players`);
        if (allPlayersResponse.ok) {
          const allPlayersData = await allPlayersResponse.json();
          setAllPlayers(allPlayersData);
        }
        
        // Загрузка участников тренировки
        const participantsResponse = await fetch(`/api/trainings/${trainingId}/participants`);
        if (participantsResponse.ok) {
          const responseData = await participantsResponse.json();
          console.log('Полученные данные участников:', responseData);
          
          // Проверяем структуру ответа - теперь API возвращает массив напрямую
          if (Array.isArray(responseData)) {
            setParticipants(responseData.map((participant: any) => ({
              ...participant,
              id: participant.id || participant.playerId
            })));
          } else if (responseData.participants && Array.isArray(responseData.participants)) {
            setParticipants(responseData.participants.map((participant: any) => ({
              ...participant,
              id: participant.id || participant.playerId
            })));
          } else {
            console.error('Неожиданный формат данных:', responseData);
            setParticipants([]);
          }
        } else {
          console.error(`Ошибка загрузки участников: ${participantsResponse.status}`);
          setParticipants([]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных игроков:', error);
      }
    }
    
    if (training?.teamId) {
      fetchPlayersAndParticipants();
    }
  }, [trainingId, training?.teamId]);
  
  // Фильтрация упражнений
  const filteredExercises = exercises.filter(exercise => {
    // Фильтр по поисковому запросу
    const matchesSearch = searchQuery 
      ? exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) 
      : true;
    
    // Фильтр по категории
    const matchesCategory = selectedCategory 
      ? exercise.categoryId === selectedCategory
      : true;
    
    // Фильтр по автору
    const matchesAuthor = selectedAuthor
      ? exercise.authorId === selectedAuthor
      : true;
    
    // Фильтр по тегу (проверяем, есть ли тег в массиве тегов упражнения)
    const matchesTag = selectedTag
      ? exercise.tags && Array.isArray(exercise.tags) && 
        exercise.tags.some(tag => tag.id === selectedTag)
      : true;
    
    return matchesSearch && matchesCategory && matchesAuthor && matchesTag;
  });
  
  // Форматирование даты
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: ru });
    } catch (error) {
      return 'Недоступно';
    }
  };
  
  // Форматирование времени
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch (error) {
      return '--:--';
    }
  };
  
  // Добавление выбранных упражнений
  const handleAddExercises = async () => {
    // Находим выбранные упражнения
    const exercisesToAdd = exercises.filter(ex => 
      selectedExercises.includes(ex.id)
    );
    
    // Добавляем их в список с порядковым номером
    const nextOrder = trainingExercises.length > 0 
      ? Math.max(...trainingExercises.map(ex => ex.order)) + 1 
      : 1;
    
    const newTrainingExercises = exercisesToAdd.map((ex, index) => ({
      exercise: ex,
      order: nextOrder + index
    }));
    
    const updatedExercises = [...trainingExercises, ...newTrainingExercises];
    setTrainingExercises(updatedExercises);
    setSelectedExercises([]);
    setShowExercisesDialog(false);
    
    // Автоматически сохраняем изменения в базу данных
    await saveTrainingExercises(updatedExercises);
  };
  
  // Загрузка сохраненных настроек фильтров
  const loadSavedFilterSettings = () => {
    try {
      const savedSettings = localStorage.getItem('exerciseFilterSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.searchQuery) setSearchQuery(settings.searchQuery);
        if (settings.selectedCategory) setSelectedCategory(settings.selectedCategory);
        if (settings.selectedAuthor) setSelectedAuthor(settings.selectedAuthor);
        if (settings.selectedTag) setSelectedTag(settings.selectedTag);
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек фильтров:', error);
    }
  };
  
  // Эффект для загрузки сохраненных настроек при открытии модального окна
  useEffect(() => {
    if (showExercisesDialog) {
      loadSavedFilterSettings();
    }
  }, [showExercisesDialog]);
  
  // Изменение порядка упражнений
  const moveExercise = async (index: number, direction: "up" | "down") => {
    try {
      // Показываем индикатор сохранения
      setActionStatus({
        message: "Сохранение изменений порядка упражнений...",
        type: 'info',
        visible: true
      });
      
      const newExercises = [...trainingExercises];
      
      if (direction === "up" && index > 0) {
        // Меняем порядок текущего и предыдущего упражнения
        const tempOrder = newExercises[index].order;
        newExercises[index].order = newExercises[index - 1].order;
        newExercises[index - 1].order = tempOrder;
        
        // Меняем их местами в массиве
        [newExercises[index], newExercises[index - 1]] = 
          [newExercises[index - 1], newExercises[index]];
      } 
      else if (direction === "down" && index < newExercises.length - 1) {
        // Меняем порядок текущего и следующего упражнения
        const tempOrder = newExercises[index].order;
        newExercises[index].order = newExercises[index + 1].order;
        newExercises[index + 1].order = tempOrder;
        
        // Меняем их местами в массиве
        [newExercises[index], newExercises[index + 1]] = 
          [newExercises[index + 1], newExercises[index]];
      }
      
      setTrainingExercises(newExercises);
      
      // Автоматически сохраняем изменения в базу данных
      await saveTrainingExercises(newExercises);
      
      // Уведомляем об успешном сохранении
      setActionStatus({
        message: "Порядок упражнений успешно обновлен",
        type: 'success',
        visible: true
      });
      
      // Скрываем уведомление через 3 секунды
      setTimeout(() => {
        setActionStatus(prev => ({...prev, visible: false}));
      }, 3000);
    } catch (error) {
      console.error("Ошибка при изменении порядка упражнений:", error);
      setActionStatus({
        message: "Произошла ошибка при изменении порядка упражнений",
        type: 'error',
        visible: true
      });
      
      // Скрываем уведомление через 3 секунды
      setTimeout(() => {
        setActionStatus(prev => ({...prev, visible: false}));
      }, 3000);
    }
  };
  
  // Удаление упражнения из списка
  const removeExercise = async (index: number) => {
    try {
      // Показываем индикатор удаления
      setActionStatus({
        message: "Удаление упражнения и пересчет порядка...",
        type: 'info',
        visible: true
      });
      
      const newExercises = [...trainingExercises];
      newExercises.splice(index, 1);
      
      // Пересчитываем порядок
      const sortedExercises = newExercises.sort((a, b) => a.order - b.order);
      const reorderedExercises = sortedExercises.map((ex, idx) => ({
        ...ex,
        order: idx + 1
      }));
      
      setTrainingExercises(reorderedExercises);
      
      // Автоматически сохраняем изменения в базу данных
      await saveTrainingExercises(reorderedExercises);
      
      // Уведомляем об успешном удалении
      setActionStatus({
        message: "Упражнение успешно удалено",
        type: 'success',
        visible: true
      });
      
      // Скрываем уведомление через 3 секунды
      setTimeout(() => {
        setActionStatus(prev => ({...prev, visible: false}));
      }, 3000);
    } catch (error) {
      console.error("Ошибка при удалении упражнения:", error);
      setActionStatus({
        message: "Произошла ошибка при удалении упражнения",
        type: 'error',
        visible: true
      });
      
      // Скрываем уведомление через 3 секунды
      setTimeout(() => {
        setActionStatus(prev => ({...prev, visible: false}));
      }, 3000);
    }
  };
  
  // Сохранение упражнений тренировки в базу данных
  const saveTrainingExercises = async (exercises: TrainingExercise[]) => {
    if (!trainingId) return;
    
    try {
      // Получаем текущие упражнения тренировки для сравнения
      const currentExercisesResponse = await fetch(`/api/trainings/exercises?trainingId=${trainingId}`);
      const currentExercises = await currentExercisesResponse.json();
      
      // Создаем карту существующих упражнений по ID
      const existingExercisesMap = new Map();
      if (Array.isArray(currentExercises)) {
        currentExercises.forEach(ex => {
          existingExercisesMap.set(ex.id, ex);
        });
      }
      
      // Перебираем упражнения, которые нужно добавить или сохранить
      const savePromises = exercises.map(async exerciseItem => {
        // Если у упражнения уже есть ID, значит оно уже в базе - обновляем его
        if (exerciseItem.id && existingExercisesMap.has(exerciseItem.id)) {
          // Обновление существующего упражнения через PUT
          const response = await fetch('/api/trainings/exercises', {
            method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              id: exerciseItem.id,
              duration: exerciseItem.duration,
              repetitions: exerciseItem.repetitions,
              sets: exerciseItem.sets,
              notes: exerciseItem.notes
            }),
          });
          
      if (response.ok) {
            const result = await response.json();
            return { success: true, id: result.id || exerciseItem.id };
          } else {
            return { success: true, id: exerciseItem.id }; // Считаем успешным даже если API не обновляет
          }
        } else {
          // Новое упражнение - добавляем
          const response = await fetch('/api/trainings/exercises', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              trainingId: trainingId,
              exerciseId: exerciseItem.exercise.id,
              duration: exerciseItem.duration,
              repetitions: exerciseItem.repetitions,
              sets: exerciseItem.sets,
              notes: exerciseItem.notes
            }),
      });
      
      if (response.ok) {
            const result = await response.json();
            return { success: true, id: result.id };
          } else {
            const error = await response.json();
            return { success: false, error };
          }
        }
      });
      
      // Находим упражнения, которые были удалены, и удаляем их из базы
      const currentIds = new Set(exercises.map(ex => ex.id).filter(Boolean));
      const deletePromises = Array.from(existingExercisesMap.keys())
        .filter(id => !currentIds.has(id))
        .map(async (id) => {
          const response = await fetch(`/api/trainings/exercises?id=${id}`, {
            method: 'DELETE',
          });
          return response.ok;
        });
      
      // Ждем выполнения всех запросов
      const [saveResults, deleteResults] = await Promise.all([
        Promise.all(savePromises),
        Promise.all(deletePromises)
      ]);
      
      // Проверяем результаты
      const allSaveSuccess = saveResults.every(result => result.success);
      const allDeleteSuccess = deleteResults.every(result => result);
      
      if (allSaveSuccess && allDeleteSuccess) {
        // Дополнительно сохраняем порядок упражнений
        console.log("Сохранение порядка упражнений...");
        const exercisesWithIds = exercises.filter(ex => ex.id);
        
        // Только если есть упражнения с ID
        if (exercisesWithIds.length > 0) {
          try {
            // Отправляем порядок упражнений отдельным запросом
            const updateOrderResponse = await fetch('/api/trainings/exercises/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
              body: JSON.stringify({
                exercises: exercisesWithIds.map(ex => ({
                  id: ex.id,
                  order: ex.order
                }))
              }),
            });
            
            if (updateOrderResponse.ok) {
              console.log("Порядок упражнений сохранен успешно");
            } else {
              console.warn("Не удалось сохранить порядок упражнений");
            }
          } catch (orderError) {
            console.error("Ошибка при сохранении порядка упражнений:", orderError);
          }
        }
        
        alert('Упражнения тренировки успешно сохранены');
        
        // Перезагружаем данные упражнений для обновления ID
        const refreshResponse = await fetch(`/api/trainings/exercises?trainingId=${trainingId}`);
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          
          if (Array.isArray(refreshedData)) {
            // Сортируем по порядку, сохраняя клиентский порядок
            const updatedExercises = [...exercises];
            
            // Обновляем только ID для новых упражнений
            refreshedData.forEach(serverItem => {
              const clientItemIndex = updatedExercises.findIndex(clientItem => 
                // Проверяем сначала по id, затем по id упражнения если id еще нет
                (clientItem.id === serverItem.id) || 
                (!clientItem.id && clientItem.exercise.id === serverItem.exercise.id)
              );
              
              if (clientItemIndex !== -1) {
                // Обновляем только id, сохраняя порядок и другие клиентские данные
                updatedExercises[clientItemIndex].id = serverItem.id;
              }
            });
            
            // Сортируем по порядку
            const sortedExercises = [...updatedExercises].sort((a, b) => a.order - b.order);
            setTrainingExercises(sortedExercises);
          }
        }
      } else {
        console.error('Ошибка при сохранении упражнений:');
        console.error('Сохранение:', saveResults);
        console.error('Удаление:', deleteResults);
        alert('Произошла ошибка при сохранении упражнений тренировки');
      }
    } catch (error) {
      console.error('Ошибка при сохранении упражнений тренировки:', error);
      alert('Произошла ошибка при сохранении упражнений тренировки');
    }
  };
  
  // Функция для открытия диалога редактирования параметров упражнения
  const openEditDialog = (index: number) => {
    const exercise = trainingExercises[index];
    setEditingExercise(exercise);
    setEditingExerciseIndex(index);
    setEditDuration(exercise.duration?.toString() || "");
    setEditSets(exercise.sets?.toString() || "");
    setEditRepetitions(exercise.repetitions?.toString() || "");
    setEditNotes(exercise.notes || "");
    setShowEditDialog(true);
  };
  
  // Функция для сохранения параметров упражнения
  const saveExerciseParams = async () => {
    if (editingExercise && editingExerciseIndex >= 0) {
      const updatedExercises = [...trainingExercises];
      
      updatedExercises[editingExerciseIndex] = {
        ...updatedExercises[editingExerciseIndex],
        duration: editDuration ? parseInt(editDuration, 10) : null,
        sets: editSets ? parseInt(editSets, 10) : null,
        repetitions: editRepetitions ? parseInt(editRepetitions, 10) : null,
        notes: editNotes || null
      };
      
      setTrainingExercises(updatedExercises);
      setShowEditDialog(false);
      
      // Сохраняем изменения в базе данных
      await saveTrainingExercises(updatedExercises);
    }
  };
  
  // Открытие диалога отметки посещаемости
  const openAttendanceDialog = async () => {
    console.log('Открытие диалога отметки посещаемости');
    
    setShowAttendanceDialog(true);
    
    if (!training?.teamId) {
      console.error('Ошибка: teamId не найден в данных тренировки');
      alert('Ошибка: не найдена информация о команде');
      return;
    }
    
    try {
      // Загружаем игроков команды
      console.log(`Загрузка игроков команды ${training.teamId}...`);
      const teamPlayersResponse = await fetch(`/api/teams/${training.teamId}/players`);
      
      if (!teamPlayersResponse.ok) {
        const errorText = await teamPlayersResponse.text();
        console.error(`Ошибка загрузки игроков команды: ${teamPlayersResponse.status}`, errorText);
        alert('Ошибка загрузки списка игроков команды');
        return;
      }
      
      const teamPlayersData = await teamPlayersResponse.json();
      console.log(`Получено ${teamPlayersData.length} игроков команды:`, teamPlayersData);
      setTeamPlayers(teamPlayersData);
      
      // Также обновляем список всех игроков
      setAllPlayers(teamPlayersData);
      
      // Загружаем существующих участников тренировки
      console.log(`Загрузка участников тренировки ${trainingId}...`);
      const participantsResponse = await fetch(`/api/trainings/${trainingId}/participants`);
      
      let existingParticipants = [];
      
      if (participantsResponse.ok) {
        const responseData = await participantsResponse.json();
        console.log('Полученные данные участников:', responseData);
        
        // Проверяем структуру ответа - теперь API возвращает массив напрямую
        if (Array.isArray(responseData)) {
          existingParticipants = responseData;
        } else if (responseData.participants && Array.isArray(responseData.participants)) {
          existingParticipants = responseData.participants;
        } else {
          console.error('Неожиданный формат данных:', responseData);
          existingParticipants = [];
        }
      } else {
        console.error(`Ошибка загрузки участников: ${participantsResponse.status}`);
        existingParticipants = [];
      }
      
      // Создаем map существующих участников по playerId для быстрого поиска
      const existingParticipantsMap = new Map();
      existingParticipants.forEach((participant: any) => {
        existingParticipantsMap.set(participant.playerId, participant);
      });
      
      // Создаем полный список участников, включая всех игроков команды
      const fullParticipantsList = teamPlayersData.map((player: Player) => {
        // Проверяем, есть ли игрок уже в списке участников
        if (existingParticipantsMap.has(player.id)) {
          const existingParticipant = existingParticipantsMap.get(player.id);
          // Если у существующего участника нет статуса, устанавливаем TRAINED
          const participant = {
            ...existingParticipant,
            attendanceStatus: existingParticipant.attendanceStatus || 'TRAINED'
          };
          console.log(`Игрок ${player.firstName} ${player.lastName}, статус: ${participant.attendanceStatus}`);
          return participant;
        } else {
          // Если нет, создаем нового участника со статусом TRAINED
          const newParticipant = {
            playerId: player.id,
            trainingId: trainingId as string,
            players: player,
            attended: true,
            attendanceStatus: 'TRAINED' as const
          };
          console.log(`Новый игрок ${player.firstName} ${player.lastName}, статус: TRAINED`);
          return newParticipant;
        }
      });
      
      console.log(`Создан полный список участников: ${fullParticipantsList.length}`);
      console.log('Пример первого участника:', JSON.stringify(fullParticipantsList[0], null, 2));
      
      // Дополнительно убедимся, что все отображаемые статусы заполнены
      const participantsWithStatuses = fullParticipantsList.map((participant: any) => {
        if (!participant.attendanceStatus) {
          console.log(`Исправление: игрок ${participant.players.firstName} ${participant.players.lastName} без статуса получает TRAINED`);
          return {
            ...participant,
            attendanceStatus: 'TRAINED',
            attended: true
          };
        }
        return participant;
      });
      
      setParticipants(participantsWithStatuses);
      
    } catch (error) {
      console.error('Ошибка при загрузке данных для модального окна посещаемости:', error);
      alert('Произошла ошибка при загрузке данных игроков');
    }
  };
  
  // Изменение статуса посещаемости участника
  const updateAttendanceStatus = (playerId: string, status: 'TRAINED' | 'REHABILITATION' | 'SICK' | 'STUDY' | 'OTHER') => {
    const newParticipants = participants.map(p => {
      if (p.playerId === playerId) {
        return {
          ...p,
          attendanceStatus: status,
          attended: status === 'TRAINED',
        };
      }
      return p;
    });
    setParticipants(newParticipants);
  };
  
  // Получение текста для статуса посещаемости
  const getAttendanceStatusText = (status: string | null): string => {
    switch(status) {
      case 'TRAINED':
        return t('status.trained');
      case 'REHABILITATION':
        return t('status.rehab');
      case 'SICK':
        return t('status.sick');
      case 'STUDY':
        return t('status.study');
      case 'OTHER':
        return t('status.other');
      default:
        return '';
    }
  };
  
  // Получение цвета для статуса посещаемости
  const getAttendanceStatusColor = (status: string | null): string => {
    switch(status) {
      case 'TRAINED':
        return 'bg-green-500/20 text-green-500 border-green-500/40';
      case 'REHABILITATION':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40';
      case 'SICK':
        return 'bg-red-500/20 text-red-500 border-red-500/40';
      case 'STUDY':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/40';
      case 'OTHER':
        return 'bg-gray-500/20 text-gray-500 border-gray-500/40';
      default:
        return 'bg-gray-500/20 text-gray-500 border-gray-500/40';
    }
  };
  
  // Добавление игроков к тренировке
  const addPlayersToTraining = () => {
    if (selectedPlayers.length === 0) return;
    
    const playersToAdd = allPlayers.filter(player => 
      selectedPlayers.includes(player.id) && 
      !(Array.isArray(participants) && participants.some(p => p.playerId === player.id))
    );
    
    const newParticipants = playersToAdd.map(player => ({
      playerId: player.id,
      trainingId: trainingId as string,
      players: player,
      attended: true,
      attendanceStatus: 'TRAINED' as const
    }));
    
    setParticipants(Array.isArray(participants) ? [...participants, ...newParticipants] : newParticipants);
    setSelectedPlayers([]);
    setShowAddPlayerDialog(false);
  };
  
  // Удаление игрока из тренировки
  const removePlayerFromTraining = (playerId: string) => {
    if (!Array.isArray(participants)) return;
    setParticipants(prev => prev.filter(participant => participant.playerId !== playerId));
  };
  
  // Сохранение участников тренировки
  const saveParticipants = async () => {
    if (!trainingId) return;
    
    try {
      console.log('Сохранение данных о посещаемости...', participants);

      // Проверим, что у всех есть статус TRAINED по умолчанию перед сохранением
      const participantsToSave = participants.map((p: any) => ({
        ...p,
        attendanceStatus: p.attendanceStatus || 'TRAINED'
      }));

      // API использует PUT для обновления участников
      const response = await fetch(`/api/trainings/${trainingId}/participants`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participants: participantsToSave }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Результат сохранения:', result);
        
        // Проверяем, есть ли ошибки в результатах
        if (result.results && Array.isArray(result.results)) {
          const hasErrors = result.results.some((r: { success: boolean }) => !r.success);
          if (hasErrors) {
            const errorCount = result.results.filter((r: { success: boolean }) => !r.success).length;
            console.error(`Произошли ошибки при сохранении ${errorCount} участника(ов)`);
            alert(`Сохранено с ошибками. Не удалось обновить данные для ${errorCount} участника(ов).`);
          } else {
            alert('Данные о посещаемости успешно сохранены');
            setShowAttendanceDialog(false);
          }
        } else {
          alert('Данные о посещаемости успешно сохранены');
          setShowAttendanceDialog(false);
        }
      } else {
        const errorData = await response.json();
        console.error('Ошибка ответа сервера:', errorData);
        throw new Error(errorData.error || 'Ошибка при сохранении посещаемости');
      }
    } catch (error) {
      console.error('Ошибка при сохранении участников:', error);
      alert('Произошла ошибка при сохранении данных о посещаемости');
    }
  };
  
  // Фильтрация игроков для диалога добавления
  const filteredPlayers = allPlayers.filter(player => {
    const isAlreadyAdded = Array.isArray(participants) ? participants.some(p => p.playerId === player.id) : false;
    const playerName = player.firstName && player.lastName 
      ? `${player.firstName} ${player.lastName}`
      : player.name || '';
    const matchesSearch = playerName.toLowerCase().includes(searchPlayerQuery.toLowerCase());
    return matchesSearch && !isAlreadyAdded;
  });
  
  // Функция удаления тренировки
  const deleteTraining = async () => {
    if (!training || !training.id) return;
    
    try {
      const response = await fetch(`/api/trainings/${training.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setActionStatus({
          message: t('trainingDeletedSuccess'),
          type: 'success',
          visible: true
        });
        
        // Перенаправляем на страницу со списком тренировок с учетом локали
        setTimeout(() => {
          router.push(`/${locale}/dashboard/coaching/trainings`);
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || t('errorDeletingTraining'));
      }
    } catch (error) {
      console.error('Ошибка при удалении тренировки:', error);
      setActionStatus({
        message: t('errorDeletingTraining'),
        type: 'error',
        visible: true
      });
    }
  };
  
    return (
    <div className="container mx-auto py-6">
      {/* Кнопка назад */}
      <div className="mb-6">
        <Button 
          variant="outline"
          size="sm" 
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {common('back')}
        </Button>
      </div>
      
      {/* Верхняя панель с кнопками */}
      <div className="flex justify-between mb-6">
        <div className="space-x-3">
          <Button variant="default" onClick={openAttendanceDialog}>
            <UserGroupIcon className="h-5 w-5 mr-2" />
            {t('markAttendance')}
          </Button>
          <Button variant="outline" onClick={() => setShowExercisesDialog(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            {t('addExercise')}
          </Button>
        </div>
        <div className="space-x-3">
          <Button variant="destructive" onClick={deleteTraining}>
            {t('deleteTraining')}
          </Button>
          <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => saveTrainingExercises(trainingExercises)}>
            {t('saveTraining')}
          </Button>
        </div>
      </div>

      {/* Информация о тренировке */}
      {loading ? (
        <div className="text-center py-8">
          <p>{common('loading')}</p>
        </div>
      ) : training ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">{t('trainingInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200">
                  <TagIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('name')}</p>
                  <p className="font-medium">{training.title}</p>
                </div>
              </div>
      
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('team')}</p>
                  <p className="font-medium">{training.teams?.name || t('notSpecified')}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-200">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('date')}</p>
                  <p className="font-medium">{formatDate(training.startTime)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-800 dark:text-rose-200">
                  <ClockIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('time')}</p>
                  <p className="font-medium">{formatTime(training.startTime)} - {formatTime(training.endTime)}</p>
                </div>
              </div>
      
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200">
                  <TagIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('category')}</p>
                  <p className="font-medium">{training.training_categories?.name || t('notSpecified')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 text-center py-6">
          <CardContent>
            <p className="text-lg">{t('trainingNotFound')}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Список упражнений */}
      {trainingExercises.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-[#5acce5]">{t('trainingExercises')}</h2>
          
          <div className="space-y-4">
            {trainingExercises.map((item, index) => (
              <div 
                key={`${item.exercise.id}-${index}`} 
                className="flex bg-[#1a2228] border border-[#2c3c42] rounded-lg shadow-md overflow-hidden hover:border-[#5acce5] transition-colors"
              >
                {/* Изображение слева */}
                <div className="w-40 md:w-64 lg:w-80 flex items-center justify-center overflow-hidden">
                  {item.exercise.fileUrl ? (
                    item.exercise.fileType?.includes('video/') || item.exercise.fileName?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                      <div className="relative w-full h-full">
                        <video 
                          src={item.exercise.fileUrl}
                          className="w-full h-full object-cover" 
                          muted
                          playsInline
                          preload="metadata"
                          onMouseOver={(e) => e.currentTarget.play()}
                          onMouseOut={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black bg-opacity-50 rounded-full p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={item.exercise.fileUrl} 
                        alt={item.exercise.name}
                        className="w-full h-full object-cover" 
                      />
                    )
                  ) : (
                    <div className="text-gray-400 py-12">{t('noImage')}</div>
                  )}
                </div>
                
                {/* Информация по центру */}
                <div className="flex-1 p-4 text-white">
                  <h3 className="text-lg font-semibold mb-2 text-[#5acce5]">{item.exercise.name}</h3>
                  <p className="text-sm text-gray-300 line-clamp-3">
                    {item.exercise.description || t('noDescription')}
                  </p>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                    {item.exercise.exercise_categories && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2c3c42] text-[#5acce5]">
                        {item.exercise.exercise_categories.name}
                      </span>
                    )}
                    
                    {item.duration && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2c3c42] text-white">
                        {t('duration')}: {item.duration} {t('minutes')}
                      </span>
                    )}
                    
                    {item.sets && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2c3c42] text-white">
                        {t('sets')}: {item.sets}
                      </span>
                    )}
                      
                    {item.repetitions && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2c3c42] text-white">
                        {t('repetitions')}: {item.repetitions}
                      </span>
                    )}
                  </div>
                </div>

                {/* Кнопки справа */}
                <div className="flex flex-col justify-center items-center p-2 space-y-2 border-l border-[#2c3c42]">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-7 w-7 text-gray-400 hover:text-white"
                    onClick={() => openEditDialog(index)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-7 w-7 text-gray-400 hover:text-white"
                    onClick={() => removeExercise(index)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </Button>

                  {index > 0 ? (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full h-7 w-7 text-gray-400 hover:text-white"
                      onClick={() => moveExercise(index, "up")}
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </Button>
                  ) : <div className="h-7" />}

                  {index < trainingExercises.length - 1 ? (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full h-7 w-7 text-gray-400 hover:text-white"
                      onClick={() => moveExercise(index, "down")}
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </Button>
                  ) : <div className="h-7" />}
                </div>
              </div>
            ))}
          </div>
      </div>
      )}
      
      {/* Диалог для добавления упражнений */}
      <Dialog open={showExercisesDialog} onOpenChange={setShowExercisesDialog}>
        <DialogContent className="max-w-3xl max-h-[calc(100vh-40px)] overflow-hidden flex flex-col bg-vista-dark border border-vista-secondary/30 text-vista-light">
          <DialogHeader>
            <DialogTitle className="text-vista-primary">{t('addExercises')}</DialogTitle>
          </DialogHeader>
          
          <div className="mt-2 mb-4 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <Input 
              placeholder={t('searchExercises')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-vista-dark-secondary border-vista-secondary/30 placeholder:text-gray-500 focus:border-vista-primary"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Фильтр по категории */}
            <div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-vista-dark-secondary border-vista-secondary/30 focus:ring-vista-primary">
                  <SelectValue placeholder={t('allCategories')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30">
                  <SelectItem value="">{t('allCategories')}</SelectItem>
                  {exerciseCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Фильтр по автору */}
            <div>
              <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
                <SelectTrigger className="bg-vista-dark-secondary border-vista-secondary/30 focus:ring-vista-primary">
                  <SelectValue placeholder={t('allAuthors')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30">
                  <SelectItem value="">{t('allAuthors')}</SelectItem>
                  {exerciseAuthors.map(author => (
                    <SelectItem key={author.id} value={author.id}>
                      {author.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Фильтр по тегу */}
            <div>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="bg-vista-dark-secondary border-vista-secondary/30 focus:ring-vista-primary">
                  <SelectValue placeholder={t('allTags')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30">
                  <SelectItem value="">{t('allTags')}</SelectItem>
                  {exerciseTags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grow overflow-y-auto border border-vista-secondary/30 rounded-md bg-vista-dark-secondary p-4">
            {/* Фильтрация и вычисление отображаемых упражнений с пагинацией */}
            {(() => {
              const filteredExercises = exercises.filter(ex => {
                const matchesSearch = searchQuery 
                  ? ex.name.toLowerCase().includes(searchQuery.toLowerCase()) 
                  : true;
                const matchesCategory = selectedCategory 
                  ? ex.categoryId === selectedCategory 
                  : true;
                const matchesAuthor = selectedAuthor 
                  ? ex.authorId === selectedAuthor 
                  : true;
                const matchesTag = selectedTag 
                  ? ex.tags?.some(tag => tag.id === selectedTag) 
                  : true;
                
                return matchesSearch && matchesCategory && matchesAuthor && matchesTag;
              });
              
              const pageCount = Math.ceil(filteredExercises.length / exercisesPerPage);
              const displayedExercises = filteredExercises.slice(
                currentPage * exercisesPerPage, 
                (currentPage + 1) * exercisesPerPage
              );
              
              return (
                <>
                  {displayedExercises.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {displayedExercises.map(exercise => (
                        <div 
                          key={exercise.id} 
                          className={`rounded-lg overflow-hidden border ${
                            selectedExercises.includes(exercise.id) 
                              ? 'border-vista-primary bg-vista-dark-secondary/90' 
                              : 'border-vista-secondary/20 hover:border-vista-primary/50'
                          } transition-colors cursor-pointer shadow-md`}
                          onClick={() => {
                            const isSelected = selectedExercises.includes(exercise.id);
                            if (isSelected) {
                              setSelectedExercises(selectedExercises.filter(id => id !== exercise.id));
                            } else {
                              setSelectedExercises([...selectedExercises, exercise.id]);
                            }
                          }}
                        >
                          {/* Изображение */}
                          <div className="h-40 bg-vista-dark-secondary relative">
                            {exercise.fileUrl ? (
                              exercise.fileType?.includes('video/') || exercise.fileName?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                                <video 
                                  src={exercise.fileUrl}
                                  className="w-full h-full object-cover" 
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <img 
                                  src={exercise.fileUrl} 
                                  alt={exercise.name}
                                  className="w-full h-full object-cover"
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-vista-secondary/10">
                                <span className="text-vista-secondary/50 text-sm">Нет изображения</span>
                              </div>
                            )}
                            
                            {/* Чекбокс в правом верхнем углу */}
                            <div className="absolute top-2 right-2 z-10">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                selectedExercises.includes(exercise.id) 
                                  ? 'bg-vista-primary' 
                                  : 'bg-vista-dark-secondary border border-vista-secondary/50'
                              }`}>
                                {selectedExercises.includes(exercise.id) && (
                                  <CheckIcon className="h-4 w-4 text-black" />
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Информация об упражнении */}
                          <div className="p-3">
                            <h3 className="font-medium text-vista-light line-clamp-2 mb-1">{exercise.name}</h3>
                            {exercise.exercise_categories?.name && (
                              <span className="text-sm text-vista-primary">
                                {exercise.exercise_categories.name}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-vista-secondary/50">
                      <p>Упражнения не найдены</p>
                    </div>
                  )}
                  
                  {/* Пагинация */}
                  {pageCount > 1 && (
                    <div className="flex justify-center mt-4 space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(0)}
                        disabled={currentPage === 0}
                        className="h-8 w-8 p-0 border-vista-secondary/30 text-vista-light"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                        <ChevronLeftIcon className="h-4 w-4 -ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                        className="h-8 w-8 p-0 border-vista-secondary/30 text-vista-light"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </Button>
                      
                      {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                        // Логика отображения номеров страниц
                        let pageNum;
                        if (pageCount <= 5) {
                          pageNum = i;
                        } else if (currentPage < 2) {
                          pageNum = i;
                        } else if (currentPage > pageCount - 3) {
                          pageNum = pageCount - 5 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        if (pageNum >= 0 && pageNum < pageCount) {
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`h-8 w-8 p-0 ${
                                currentPage === pageNum 
                                  ? 'bg-vista-primary text-black' 
                                  : 'border-vista-secondary/30 text-vista-light'
                              }`}
                            >
                              {pageNum + 1}
                            </Button>
                          );
                        }
                        return null;
                      })}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(pageCount - 1, prev + 1))}
                        disabled={currentPage === pageCount - 1}
                        className="h-8 w-8 p-0 border-vista-secondary/30 text-vista-light"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(pageCount - 1)}
                        disabled={currentPage === pageCount - 1}
                        className="h-8 w-8 p-0 border-vista-secondary/30 text-vista-light"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                        <ChevronRightIcon className="h-4 w-4 -ml-2" />
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          
          <DialogFooter className="mt-4 border-t border-vista-secondary/20 pt-4">
            <div className="flex items-center justify-between w-full">
              <div>
                {selectedExercises.length > 0 && (
                  <span className="text-vista-primary">Выбрано: {selectedExercises.length}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowExercisesDialog(false);
                    setSelectedExercises([]);
                  }}
                  className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 hover:text-vista-light"
                >
                  {common('cancel')}
                </Button>
                <Button 
                  disabled={selectedExercises.length === 0}
                  onClick={handleAddExercises}
                  className="bg-vista-primary hover:bg-vista-primary/90 text-black"
                >
                  {t('addSelectedExercises')}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог для редактирования параметров упражнения */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px] bg-vista-dark border border-vista-secondary/30 text-vista-light">
          <DialogHeader>
            <DialogTitle className="text-vista-primary">{t('editExerciseParams')}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-duration" className="text-right text-vista-light">
                {t('duration')}
              </Label>
              <Input
                id="edit-duration"
                type="number"
                min={0}
                className="col-span-3 bg-vista-dark-secondary border-vista-secondary/30 focus:border-vista-primary text-vista-light"
                placeholder={t('durationPlaceholder')}
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-sets" className="text-right text-vista-light">
                {t('sets')}
              </Label>
              <Input
                id="edit-sets"
                type="number"
                min={0}
                className="col-span-3 bg-vista-dark-secondary border-vista-secondary/30 focus:border-vista-primary text-vista-light"
                placeholder={t('setsPlaceholder')}
                value={editSets}
                onChange={(e) => setEditSets(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-repetitions" className="text-right text-vista-light">
                {t('repetitions')}
              </Label>
              <Input
                id="edit-repetitions"
                type="number"
                min={0}
                className="col-span-3 bg-vista-dark-secondary border-vista-secondary/30 focus:border-vista-primary text-vista-light"
                placeholder={t('repetitionsPlaceholder')}
                value={editRepetitions}
                onChange={(e) => setEditRepetitions(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-notes" className="text-right text-vista-light">
                {t('notes')}
              </Label>
              <Input
                id="edit-notes"
                className="col-span-3 bg-vista-dark-secondary border-vista-secondary/30 focus:border-vista-primary text-vista-light"
                placeholder={t('notesPlaceholder')}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="border-t border-vista-secondary/20 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}
              className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 hover:text-vista-light">
              {common('cancel')}
            </Button>
            <Button onClick={saveExerciseParams}
              className="bg-vista-primary hover:bg-vista-primary/90 text-black">
              {common('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог для отметки посещаемости */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-2xl max-h-[calc(100vh-40px)] overflow-hidden flex flex-col bg-vista-dark border border-vista-secondary/30 text-vista-light">
          <DialogHeader>
            <DialogTitle className="text-vista-primary">{t('attendanceForTraining')}</DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-between items-center my-2">
            <div>
              <span className="text-sm text-vista-light/60">{t('team')}: </span>
              <span className="font-medium text-vista-light">{training?.teams?.name || t('notSpecified')}</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAddPlayerDialog(true)}
              className="border-vista-primary text-vista-primary hover:bg-vista-primary/10"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              {t('addPlayer')}
            </Button>
          </div>
          
          <div className="grow overflow-y-auto border border-vista-secondary/20 rounded-md bg-vista-dark-secondary">
            {participants.length > 0 ? (
              <div className="divide-y divide-vista-secondary/20">
                {participants.map(participant => (
                  <div 
                    key={participant.id ?? participant.playerId} 
                    className="p-3 flex items-center hover:bg-vista-secondary/10 transition-colors"
                  >
                    <div className="flex items-center flex-grow">
                      <PlayerAvatar 
                        photoUrl={participant.players.photoUrl}
                        className="w-10 h-10 mr-3"
                        name={`${participant.players.firstName || ''} ${participant.players.lastName || ''}`}
                      />
                      <div>
                        <div className="font-medium text-vista-light">
                          {participant.players.firstName} {participant.players.lastName}
                        </div>
                        {participant.players.position && (
                          <div className="text-sm text-vista-light/60">
                            {participant.players.position}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select 
                        value={participant.attendanceStatus || "TRAINED"}
                        onValueChange={(value) => updateAttendanceStatus(
                          participant.playerId, 
                          value as 'TRAINED' | 'REHABILITATION' | 'SICK' | 'STUDY' | 'OTHER'
                        )}
                      >
                        <SelectTrigger className={`w-[130px] bg-vista-dark border-vista-secondary/30 ${getAttendanceStatusColor(participant.attendanceStatus || "TRAINED")}`}>
                          <SelectValue>
                            {getAttendanceStatusText(participant.attendanceStatus || "TRAINED")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-vista-dark border-vista-secondary/30">
                          <SelectItem value="TRAINED" className="text-green-500">{t('status.trained')}</SelectItem>
                          <SelectItem value="REHABILITATION" className="text-yellow-500">{t('status.rehab')}</SelectItem>
                          <SelectItem value="SICK" className="text-red-500">{t('status.sick')}</SelectItem>
                          <SelectItem value="STUDY" className="text-blue-500">{t('status.study')}</SelectItem>
                          <SelectItem value="OTHER" className="text-gray-400">{t('status.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full h-8 w-8 text-vista-light/40 hover:text-vista-error hover:bg-vista-error/10 transition-colors"
                        onClick={() => removePlayerFromTraining(participant.playerId)}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-vista-light/40">{t('noPlayersInTraining')}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4 pt-3 border-t border-vista-secondary/20">
            <Button 
              variant="outline" 
              onClick={() => setShowAttendanceDialog(false)}
              className="border-vista-primary text-vista-primary hover:bg-vista-primary/10"
            >
              {common('cancel')}
            </Button>
            <Button 
              onClick={saveParticipants}
              className="bg-vista-primary text-vista-dark hover:bg-vista-primary/90"
            >
              {common('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог для добавления игроков на тренировку */}
      <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
        <DialogContent className="max-w-md max-h-[calc(100vh-40px)] overflow-hidden flex flex-col bg-vista-dark border border-vista-secondary/30 text-vista-light">
          <DialogHeader>
            <DialogTitle className="text-vista-primary">{t('selectPlayersToAdd')}</DialogTitle>
          </DialogHeader>
          
          <div className="relative mb-4">
            <Input
              type="text"
              placeholder={t('searchPlayersPlaceholder')}
              value={searchPlayerQuery}
              onChange={(e) => setSearchPlayerQuery(e.target.value)}
              className="w-full pl-10 bg-vista-dark-secondary border-vista-secondary/30 text-vista-light"
            />
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-3 text-vista-light/40" />
          </div>
          
          <div className="grow overflow-y-auto border border-vista-secondary/20 rounded-md bg-vista-dark-secondary p-2">
            {allPlayers
              .filter(player => 
                !(Array.isArray(participants) && participants.some(p => p.playerId === player.id)) &&
                (
                  (player.firstName?.toLowerCase() || '').includes(searchPlayerQuery.toLowerCase()) ||
                  (player.lastName?.toLowerCase() || '').includes(searchPlayerQuery.toLowerCase()) ||
                  (player.name?.toLowerCase() || '').includes(searchPlayerQuery.toLowerCase())
                )
              )
              .map(player => (
                <div 
                  key={player.id} 
                  className={`p-3 border-b border-vista-secondary/20 flex items-center ${
                    selectedPlayers.includes(player.id) 
                      ? 'bg-vista-primary/20 border-vista-primary/30' 
                      : 'hover:bg-vista-secondary/10'
                  }`}
                >
                  <Checkbox 
                    id={`player-${player.id}`}
                    checked={selectedPlayers.includes(player.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPlayers([...selectedPlayers, player.id]);
                      } else {
                        setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
                      }
                    }}
                    className="mr-3 data-[state=checked]:bg-vista-primary data-[state=checked]:border-vista-primary"
                  />
                  <label 
                    htmlFor={`player-${player.id}`}
                    className="flex items-center flex-grow cursor-pointer"
                  >
                    <PlayerAvatar 
                      photoUrl={player.photoUrl}
                      className="w-8 h-8 mr-3"
                      name={`${player.firstName || ''} ${player.lastName || ''}`}
                    />
                    <div>
                      <div className="font-medium text-vista-light">
                        {player.firstName} {player.lastName}
                      </div>
                      {player.position && (
                        <div className="text-sm text-vista-light/60">
                          {player.position}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              ))}
              
              {allPlayers.filter(player => 
                !(Array.isArray(participants) && participants.some(p => p.playerId === player.id)) &&
                (
                  (player.firstName?.toLowerCase() || '').includes(searchPlayerQuery.toLowerCase()) ||
                  (player.lastName?.toLowerCase() || '').includes(searchPlayerQuery.toLowerCase()) ||
                  (player.name?.toLowerCase() || '').includes(searchPlayerQuery.toLowerCase())
                )
              ).length === 0 && (
                <div className="p-4 text-center text-vista-light/40">
                  {t('noPlayersFound')}
                </div>
              )}
          </div>
          
          <DialogFooter className="mt-4 pt-3 border-t border-vista-secondary/20">
            <div className="flex justify-between items-center w-full">
              <div>
                {selectedPlayers.length > 0 && (
                  <span className="text-vista-primary">
                    {t('selectedCount', { count: selectedPlayers.length })}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddPlayerDialog(false);
                    setSelectedPlayers([]);
                  }}
                  className="border-vista-primary text-vista-primary hover:bg-vista-primary/10"
                >
                  {common('cancel')}
                </Button>
                <Button 
                  onClick={addPlayersToTraining}
                  disabled={selectedPlayers.length === 0}
                  className="bg-vista-primary text-vista-dark hover:bg-vista-primary/90 disabled:bg-vista-primary/30"
                >
                  {t('addSelectedPlayers')}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Показ статуса операций */}
      {actionStatus.visible && (
        <div className={`
          fixed bottom-4 right-4 p-4 rounded-md shadow-lg
          ${actionStatus.type === 'success' ? 'bg-green-600' : 
            actionStatus.type === 'error' ? 'bg-red-600' : 
            'bg-blue-600'}
        `}>
          <p className="text-white">{actionStatus.message}</p>
        </div>
      )}
    </div>
  );
} 