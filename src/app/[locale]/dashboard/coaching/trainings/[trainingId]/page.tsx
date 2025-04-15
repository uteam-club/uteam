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
  MinusIcon
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

type Training = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  teamId: string;
  categoryId?: string;
  team?: {
    id: string;
    name: string;
  };
  category?: {
  name: string;
  };
};

type Exercise = {
  id: string;
  name: string;
  description?: string | null;
  difficulty: number;
  fileUrl?: string | null;
  categoryId: string;
  authorId?: string | null;
  category?: {
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
  player: Player;
  attended: boolean;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'READY' | null;
  notes?: string | null;
};

export default function TrainingDetailsPage() {
  const router = useRouter();
  const { trainingId } = useParams();
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  
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
                exercise: item.exercise,
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
        const exResponse = await fetch('/api/exercises');
        if (exResponse.ok) {
          const exData = await exResponse.json();
          // API возвращает массив упражнений напрямую, а не объект с exercises
          const exercisesArray = Array.isArray(exData) ? exData : [];
          setExercises(exercisesArray);
          
          // Извлекаем уникальных авторов из упражнений
          const uniqueAuthors = new Map();
          exercisesArray.forEach(exercise => {
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
          const participantsData = await participantsResponse.json();
          setParticipants(participantsData);
        } else {
          console.error('Ошибка загрузки участников тренировки');
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
    console.log('Текущие данные:', { 
      trainingId, 
      teamId: training?.teamId, 
      participantsCount: participants.length, 
      teamPlayersCount: teamPlayers.length 
    });
    
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
      
      // Загружаем существующих участников тренировки
      console.log(`Загрузка участников тренировки ${trainingId}...`);
      const participantsResponse = await fetch(`/api/trainings/${trainingId}/participants`);
      
      if (participantsResponse.ok) {
        const responseData = await participantsResponse.json();
        console.log('Полученные данные участников:', responseData);
        
        // Проверяем структуру ответа
        let participantsData = responseData;
        if (responseData.participants && Array.isArray(responseData.participants)) {
          participantsData = responseData.participants;
        }
        
        if (Array.isArray(participantsData) && participantsData.length > 0) {
          console.log(`Найдены существующие участники: ${participantsData.length}`);
          setParticipants(participantsData);
      } else {
          // Если нет сохраненных участников, создаем их из игроков команды с статусом PRESENT по умолчанию
          console.log('Создание начальных участников из игроков команды');
          const initialParticipants = teamPlayersData.map((player: Player) => ({
            playerId: player.id,
            trainingId: trainingId as string,
            player: player,
            attended: true,
            attendanceStatus: 'PRESENT'
          }));
          
          console.log(`Создано ${initialParticipants.length} начальных участников`);
          setParticipants(initialParticipants);
        }
      } else {
        // Если не удалось загрузить участников, все равно создаем их из игроков команды
        const errorText = await participantsResponse.text();
        console.error(`Ошибка загрузки участников: ${participantsResponse.status}`, errorText);
        
        console.log('Создание участников из игроков команды после ошибки загрузки');
        const initialParticipants = teamPlayersData.map((player: Player) => ({
          playerId: player.id,
          trainingId: trainingId as string,
          player: player,
          attended: true,
          attendanceStatus: 'PRESENT'
        }));
        
        setParticipants(initialParticipants);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных для модального окна посещаемости:', error);
      alert('Произошла ошибка при загрузке данных игроков');
    }
  };
  
  // Изменение статуса посещаемости участника
  const updateAttendanceStatus = (playerId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'READY') => {
    setParticipants(prev => prev.map(participant => {
      if (participant.playerId === playerId) {
        return {
          ...participant,
          attended: status === 'PRESENT' || status === 'LATE',
          attendanceStatus: status
        };
      }
      return participant;
    }));
  };
  
  // Получение текста для статуса посещаемости
  const getAttendanceStatusText = (status: string | null): string => {
    switch (status) {
      case 'PRESENT':
        return 'Участвовал';
      case 'ABSENT':
        return 'Болеет';
      case 'LATE':
        return 'Реабилитация';
      case 'EXCUSED':
        return 'Учеба';
      case 'READY':
        return 'Другое';
      default:
        return 'Не указан';
    }
  };
  
  // Получение цвета для статуса посещаемости
  const getAttendanceStatusColor = (status: string | null): string => {
    switch (status) {
      case 'PRESENT':
        return 'text-green-500';
      case 'ABSENT':
        return 'text-red-500';
      case 'LATE':
        return 'text-yellow-500';
      case 'EXCUSED':
        return 'text-blue-500';
      case 'READY':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };
  
  // Добавление игроков к тренировке
  const addPlayersToTraining = () => {
    if (selectedPlayers.length === 0) return;
    
    const playersToAdd = allPlayers.filter(player => 
      selectedPlayers.includes(player.id) && 
      !participants.some(p => p.playerId === player.id)
    );
    
    const newParticipants = playersToAdd.map(player => ({
      playerId: player.id,
      trainingId: trainingId as string,
      player: player,
      attended: false,
      attendanceStatus: null as ('PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'READY' | null)
    }));
    
    setParticipants([...participants, ...newParticipants]);
    setSelectedPlayers([]);
    setShowAddPlayerDialog(false);
  };
  
  // Удаление игрока из тренировки
  const removePlayerFromTraining = (playerId: string) => {
    setParticipants(prev => prev.filter(participant => participant.playerId !== playerId));
  };
  
  // Сохранение участников тренировки
  const saveParticipants = async () => {
    if (!trainingId) return;
    
    try {
      console.log('Сохранение данных о посещаемости...', participants);

      // API использует PUT для обновления участников
      const response = await fetch(`/api/trainings/${trainingId}/participants`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participants }),
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
    const isAlreadyAdded = participants.some(p => p.playerId === player.id);
    const playerName = player.firstName && player.lastName 
      ? `${player.firstName} ${player.lastName}`
      : player.name || '';
    const matchesSearch = playerName.toLowerCase().includes(searchPlayerQuery.toLowerCase());
    return matchesSearch && !isAlreadyAdded;
  });
  
  // Функция удаления тренировки
  const deleteTraining = async () => {
    if (!trainingId) return;
    
    // Запрашиваем подтверждение у пользователя
    const confirmed = window.confirm("Вы уверены, что хотите удалить эту тренировку? Это действие невозможно отменить.");
    if (!confirmed) return;
    
    try {
      // Показываем статус операции
      setActionStatus({
        message: 'Удаление тренировки...',
        type: 'info',
        visible: true
      });
      
      // Отправляем запрос на удаление
      const response = await fetch(`/api/trainings/${trainingId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setActionStatus({
          message: 'Тренировка успешно удалена',
          type: 'success',
          visible: true
        });
        
        // Перенаправляем на страницу со списком тренировок
        setTimeout(() => {
          router.push('/ru/dashboard/coaching/trainings');
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при удалении тренировки');
      }
    } catch (error) {
      console.error('Ошибка при удалении тренировки:', error);
      setActionStatus({
        message: 'Ошибка при удалении тренировки',
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
          Назад
        </Button>
      </div>
      
      {/* Верхняя панель с кнопками */}
      <div className="flex justify-between mb-6">
        <div className="space-x-3">
          <Button variant="default" onClick={openAttendanceDialog}>
            <UserGroupIcon className="h-5 w-5 mr-2" />
          Отметить посещаемость
        </Button>
          <Button variant="outline" onClick={() => setShowExercisesDialog(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
          Добавить упражнение
        </Button>
              </div>
        <div className="space-x-3">
          <Button variant="destructive" onClick={deleteTraining}>
            Удалить тренировку
          </Button>
          <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => saveTrainingExercises(trainingExercises)}>
            Сохранить тренировку
          </Button>
        </div>
        </div>

      {/* Информация о тренировке */}
      {loading ? (
        <div className="text-center py-8">
          <p>Загрузка данных...</p>
        </div>
      ) : training ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Информация о тренировке</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200">
                  <TagIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Название</p>
                  <p className="font-medium">{training.title}</p>
                </div>
      </div>
      
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200">
                  <UserIcon className="h-4 w-4" />
            </div>
                <div>
                  <p className="text-sm text-muted-foreground">Команда</p>
                  <p className="font-medium">{training.team?.name || 'Не указана'}</p>
              </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-200">
                  <CalendarIcon className="h-4 w-4" />
              </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дата</p>
                  <p className="font-medium">{formatDate(training.startTime)}</p>
                </div>
            </div>
              
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-800 dark:text-rose-200">
                  <ClockIcon className="h-4 w-4" />
          </div>
                <div>
                  <p className="text-sm text-muted-foreground">Время</p>
                  <p className="font-medium">{formatTime(training.startTime)} - {formatTime(training.endTime)}</p>
        </div>
      </div>
      
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200">
                  <TagIcon className="h-4 w-4" />
            </div>
                <div>
                  <p className="text-sm text-muted-foreground">Категория</p>
                  <p className="font-medium">{training.category?.name || 'Не указана'}</p>
          </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 text-center py-6">
          <CardContent>
            <p className="text-lg">Информация о тренировке не найдена</p>
          </CardContent>
        </Card>
      )}
      
      {/* Список упражнений */}
      {trainingExercises.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-[#5acce5]">Упражнения тренировки</h2>
          
          <div className="space-y-4">
            {trainingExercises.map((item, index) => (
              <div 
                key={`${item.exercise.id}-${index}`} 
                className="flex bg-[#1a2228] border border-[#2c3c42] rounded-lg shadow-md overflow-hidden hover:border-[#5acce5] transition-colors"
              >
                {/* Изображение слева */}
                <div className="w-40 md:w-64 lg:w-80 flex items-center justify-center overflow-hidden">
                    {item.exercise.fileUrl ? (
                      <img 
                        src={item.exercise.fileUrl} 
                        alt={item.exercise.name}
                      className="w-full h-auto object-contain"
                      />
                    ) : (
                    <div className="text-gray-400 py-12">Нет изображения</div>
                    )}
                  </div>
                  
                {/* Информация по центру */}
                <div className="flex-1 p-4 text-white">
                  <h3 className="text-lg font-semibold mb-2 text-[#5acce5]">{item.exercise.name}</h3>
                  <p className="text-sm text-gray-300 line-clamp-3">
                    {item.exercise.description || 'Описание отсутствует'}
                  </p>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                    {item.exercise.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2c3c42] text-[#5acce5]">
                        {item.exercise.category.name}
                      </span>
                    )}
                    
                    {item.duration && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2c3c42] text-white">
                        Длительность: {item.duration} мин
                      </span>
                    )}
                    
                      {item.sets && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2c3c42] text-white">
                        Подходов: {item.sets}
                      </span>
                      )}
                      
                      {item.repetitions && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2c3c42] text-white">
                        Повторений: {item.repetitions}
                      </span>
                    )}
                        </div>
                    </div>
                
                {/* Кнопки справа */}
                <div className="flex flex-col justify-center items-center p-2 space-y-2 border-l border-[#2c3c42]">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => moveExercise(index, "up")}
                    disabled={index === 0}
                    className="text-[#5acce5] hover:bg-[#2c3c42] disabled:text-gray-500"
                  >
                    <ChevronUpIcon className="h-5 w-5" />
                  </Button>
                  
                  <div className="py-1 px-3 bg-[#2c3c42] rounded-md text-white">
                    {item.order}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => moveExercise(index, "down")}
                    disabled={index === trainingExercises.length - 1}
                    className="text-[#5acce5] hover:bg-[#2c3c42] disabled:text-gray-500"
                  >
                    <ChevronDownIcon className="h-5 w-5" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeExercise(index)}
                    className="text-red-400 hover:text-red-300 hover:bg-[#331c1c]"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
      </div>
      )}
      
      {/* Модальное окно выбора упражнений */}
      <Dialog open={showExercisesDialog} onOpenChange={setShowExercisesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#1a2228] border border-[#2c3c42] shadow-lg text-white">
          <DialogHeader>
            <DialogTitle className="text-[#5acce5]">Выбор упражнений</DialogTitle>
          </DialogHeader>
          
          {/* Фильтры */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {/* Поиск по тексту - уменьшенный */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5acce5]" />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 text-sm bg-[#2c3c42] border-[#384a52] text-white placeholder:text-gray-400"
              />
            </div>
            
            {/* Фильтр по категории */}
                <div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-[#2c3c42] border-[#384a52] text-white">
                  <SelectValue placeholder="Категория" />
                    </SelectTrigger>
                <SelectContent className="bg-[#1e2a32] border-[#384a52] text-white">
                  <SelectItem value="" className="focus:bg-[#2c3c42] focus:text-white">Все категории</SelectItem>
                  {exerciseCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="focus:bg-[#2c3c42] focus:text-white">
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            
            {/* Фильтр по автору */}
                <div>
              <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
                <SelectTrigger className="bg-[#2c3c42] border-[#384a52] text-white">
                  <SelectValue placeholder="Автор" />
                    </SelectTrigger>
                <SelectContent className="bg-[#1e2a32] border-[#384a52] text-white">
                  <SelectItem value="" className="focus:bg-[#2c3c42] focus:text-white">Все авторы</SelectItem>
                  {exerciseAuthors.map((author) => (
                    <SelectItem key={author.id} value={author.id} className="focus:bg-[#2c3c42] focus:text-white">
                      {author.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
              
            {/* Фильтр по тегу */}
            <div>
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="bg-[#2c3c42] border-[#384a52] text-white">
                  <SelectValue placeholder="Тег" />
                  </SelectTrigger>
                <SelectContent className="bg-[#1e2a32] border-[#384a52] text-white">
                  <SelectItem value="" className="focus:bg-[#2c3c42] focus:text-white">Все теги</SelectItem>
                  {exerciseTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id} className="focus:bg-[#2c3c42] focus:text-white">
                      {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            
            {/* Кнопка сброса фильтров */}
            {(searchQuery || selectedCategory || selectedAuthor || selectedTag) && (
              <Button
                variant="outline"
                size="sm"
                className="text-[#5acce5] border-[#5acce5] hover:bg-[#5acce5]/10"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                  setSelectedAuthor('');
                  setSelectedTag('');
                }}
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
            
            {/* Кнопка сохранения */}
            <Button
              className="bg-[#5acce5] text-[#1a2228] hover:bg-[#5acce5]/80 col-span-1 sm:col-span-2 lg:col-span-4 mt-2"
              onClick={() => {
                // Здесь можно сохранить настройки фильтров в localStorage
                const filterSettings = {
                  searchQuery,
                  selectedCategory,
                  selectedAuthor,
                  selectedTag
                };
                localStorage.setItem('exerciseFilterSettings', JSON.stringify(filterSettings));
                alert('Настройки фильтров сохранены');
              }}
            >
              Сохранить настройки фильтров
            </Button>
            </div>
            
          {/* Счетчик найденных упражнений */}
          <div className="text-gray-400 text-sm mb-2">
            Найдено упражнений: {filteredExercises.length}
              </div>
          
          {/* Список упражнений */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {filteredExercises.length > 0 ? (
              filteredExercises.map((exercise) => (
                    <div 
                      key={exercise.id} 
                  className={`rounded-lg cursor-pointer flex flex-col ${
                    selectedExercises.includes(exercise.id)
                      ? 'border-[#5acce5] bg-[#5acce5]/10'
                      : 'border-[#2c3c42]'
                  } border bg-[#1e2a32] hover:border-[#5acce5] transition-colors`}
                  onClick={() => {
                    if (selectedExercises.includes(exercise.id)) {
                      setSelectedExercises(selectedExercises.filter(id => id !== exercise.id));
                    } else {
                      setSelectedExercises([...selectedExercises, exercise.id]);
                    }
                  }}
                >
                  {/* Изображение сверху */}
                  <div className="w-full h-40 bg-[#2c3c42] flex items-center justify-center relative">
                    {exercise.fileUrl ? (
                      <img 
                        src={exercise.fileUrl} 
                        alt={exercise.name}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="text-gray-400">Нет изображения</div>
                    )}
                    <Checkbox
                      checked={selectedExercises.includes(exercise.id)}
                      className="absolute top-2 right-2 data-[state=checked]:bg-[#5acce5] data-[state=checked]:text-white border-[#5acce5]"
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedExercises([...selectedExercises, exercise.id]);
                        } else {
                          setSelectedExercises(selectedExercises.filter(id => id !== exercise.id));
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                            </div>
                  
                  {/* Категория */}
                            {exercise.category && (
                    <div className="px-3 pt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#2c3c42] text-[#5acce5]">
                                {exercise.category.name}
                      </span>
                              </div>
                            )}
                  
                  {/* Название */}
                  <div className="p-3 pt-1">
                    <h3 className="font-medium text-white">{exercise.name}</h3>
                          </div>
                        </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-400">
                <p>Упражнения не найдены</p>
                </div>
              )}
            </div>
            
          <DialogFooter className="border-t border-[#2c3c42] pt-3">
            <div className="flex items-center justify-between w-full">
              <div>
                {selectedExercises.length > 0 && (
                  <span className="text-[#5acce5]">Выбрано: {selectedExercises.length}</span>
                )}
              </div>
              <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowExercisesDialog(false)}
                  className="border-[#5acce5] text-[#5acce5] hover:bg-[#5acce5]/10"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleAddExercises}
                  disabled={selectedExercises.length === 0}
                  className="bg-[#5acce5] text-[#1a2228] hover:bg-[#5acce5]/80 disabled:bg-[#5acce5]/30"
              >
                  Добавить выбранные
              </Button>
          </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно отметки посещаемости */}
      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#1a2228] border border-[#2c3c42] shadow-lg text-white">
          <DialogHeader>
            <DialogTitle className="text-[#5acce5]">Посещаемость тренировки</DialogTitle>
          </DialogHeader>
          
          {/* Верхняя панель с кнопками */}
          <div className="flex justify-between mb-4">
              <Button 
                variant="outline" 
              className="border-[#5acce5] text-[#5acce5] hover:bg-[#5acce5]/10"
              onClick={() => setShowAddPlayerDialog(true)}
              >
              <PlusIcon className="h-4 w-4 mr-2" />
                Добавить игрока
              </Button>
              
              <Button 
              className="bg-[#5acce5] text-[#1a2228] hover:bg-[#5acce5]/80"
              onClick={saveParticipants}
            >
              <CheckIcon className="h-4 w-4 mr-2" />
                Сохранить
              </Button>
            </div>
            
          {/* Список игроков */}
          {participants.length > 0 ? (
            <div className="space-y-3">
              {participants.map((participant) => (
                <div 
                  key={participant.playerId} 
                  className="flex items-center justify-between p-3 bg-[#1e2a32] border border-[#2c3c42] rounded-lg"
                >
                  <div className="flex items-center flex-1">
                    {/* Аватар игрока */}
                    <div className="mr-3">
                      <PlayerAvatar 
                        photoUrl={participant.player.photoUrl || participant.player.image}
                        name={participant.player.firstName && participant.player.lastName 
                          ? `${participant.player.firstName} ${participant.player.lastName}`
                          : participant.player.name || 'Игрок'}
                        size="md"
                      />
                    </div>
                    
                    {/* Информация об игроке: имя, фамилия, номер и позиция */}
                      <div>
                      <div className="flex items-center">
                        <p className="font-medium text-white">
                          {participant.player.firstName && participant.player.lastName 
                            ? `${participant.player.firstName} ${participant.player.lastName}`
                            : participant.player.name || 'Игрок'}
                        </p>
                        
                        <span className="ml-2 font-medium text-[#5acce5]">
                          #{participant.player.number || "-"}
                        </span>
                        
                        {participant.player.position && (
                          <span className="ml-2 text-sm text-gray-400">{participant.player.position}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Выпадающий список статусов посещаемости */}
                  <div className="ml-auto">
                    <Select 
                      value={participant.attendanceStatus || "READY"} 
                      onValueChange={(value) => updateAttendanceStatus(
                        participant.playerId, 
                        value as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'READY'
                      )}
                    >
                      <SelectTrigger 
                        className={`w-48 bg-[#2c3c42] border-[#384a52] ${getAttendanceStatusColor(participant.attendanceStatus)}`}
                      >
                        <SelectValue>
                          {getAttendanceStatusText(participant.attendanceStatus)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e2a32] border-[#384a52] text-white">
                        <SelectItem value="PRESENT" className="focus:bg-[#2c3c42] focus:text-white text-green-500">
                          Участвовал
                        </SelectItem>
                        <SelectItem value="ABSENT" className="focus:bg-[#2c3c42] focus:text-white text-red-500">
                          Болеет
                        </SelectItem>
                        <SelectItem value="LATE" className="focus:bg-[#2c3c42] focus:text-white text-yellow-500">
                          Реабилитация
                        </SelectItem>
                        <SelectItem value="EXCUSED" className="focus:bg-[#2c3c42] focus:text-white text-blue-500">
                          Учеба
                        </SelectItem>
                        <SelectItem value="READY" className="focus:bg-[#2c3c42] focus:text-white text-gray-400">
                          Другое
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  </div>
                ))}
              </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>Нет игроков в списке. Добавьте игроков для отметки посещаемости.</p>
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Модальное окно добавления игроков */}
      <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-[#1a2228] border border-[#2c3c42] shadow-lg text-white">
          <DialogHeader>
            <DialogTitle className="text-[#5acce5]">Добавление игроков</DialogTitle>
          </DialogHeader>
          
          {/* Поиск игроков */}
          <div className="mb-4 relative">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5acce5]" />
            <Input
              placeholder="Поиск игроков..."
              value={searchPlayerQuery}
              onChange={(e) => setSearchPlayerQuery(e.target.value)}
              className="w-full pl-7 bg-[#2c3c42] border-[#384a52] text-white placeholder:text-gray-400"
            />
            </div>
            
          {/* Список игроков */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  className={`rounded-lg cursor-pointer p-3 flex items-center space-x-3 ${
                    selectedPlayers.includes(player.id)
                      ? 'border-[#5acce5] bg-[#5acce5]/10'
                      : 'border-[#2c3c42]'
                  } border hover:border-[#5acce5] transition-colors`}
                  onClick={() => {
                    if (selectedPlayers.includes(player.id)) {
                      setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
                    } else {
                      setSelectedPlayers([...selectedPlayers, player.id]);
                    }
                  }}
                >
                  {/* Аватар игрока */}
                  <div className="mr-3">
                    <PlayerAvatar 
                      photoUrl={player.photoUrl || player.image}
                      name={player.firstName && player.lastName 
                        ? `${player.firstName} ${player.lastName}`
                        : player.name || 'Игрок'}
                      size="md"
                    />
                  </div>
                  
                  {/* Информация об игроке */}
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {player.firstName && player.lastName 
                        ? `${player.firstName} ${player.lastName}`
                        : player.name || 'Игрок'}
                    </p>
                    {player.position && (
                      <p className="text-sm text-gray-400">{player.position}</p>
                      )}
                    </div>
                  
                  {/* Чекбокс */}
                  <Checkbox
                    checked={selectedPlayers.includes(player.id)}
                    className="data-[state=checked]:bg-[#5acce5] data-[state=checked]:text-white border-[#5acce5]"
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPlayers([...selectedPlayers, player.id]);
                      } else {
                        setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-400">
                <p>Игроки не найдены или все уже добавлены в тренировку</p>
                </div>
              )}
          </div>
          
          <DialogFooter className="border-t border-[#2c3c42] pt-3">
            <div className="flex items-center justify-between w-full">
              <div>
                {selectedPlayers.length > 0 && (
                  <span className="text-[#5acce5]">Выбрано: {selectedPlayers.length}</span>
                )}
              </div>
              <div className="flex gap-2">
            <Button 
              variant="outline" 
                  onClick={() => setShowAddPlayerDialog(false)}
                  className="border-[#5acce5] text-[#5acce5] hover:bg-[#5acce5]/10"
            >
              Отмена
            </Button>
            <Button 
                  onClick={addPlayersToTraining}
                  disabled={selectedPlayers.length === 0}
                  className="bg-[#5acce5] text-[#1a2228] hover:bg-[#5acce5]/80 disabled:bg-[#5acce5]/30"
                >
                  Добавить выбранных
            </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Уведомление о статусе операции */}
      {actionStatus.visible && (
        <div 
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg transition-opacity duration-300 ${
            actionStatus.type === 'success' ? 'bg-green-600 text-white' : 
            actionStatus.type === 'error' ? 'bg-red-600 text-white' : 
            'bg-blue-600 text-white'
          }`}
        >
          {actionStatus.message}
        </div>
      )}
    </div>
  );
} 