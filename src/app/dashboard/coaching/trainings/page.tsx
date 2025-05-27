'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Search, Plus, Calendar, Filter, CalendarIcon, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTrainingCategories } from '@/hooks/useExerciseData';

// Типы данных
interface Team {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Training {
  id: string;
  title: string;
  teamId: string;
  team: string;
  date: string;
  time: string;
  categoryId: string;
  category: string;
  isCompleted?: boolean;
  status?: string;
  type: string;
}

export default function TrainingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { categories, isLoading: isLoadingCategories, isError: categoriesError } = useTrainingCategories();
  
  // Состояние для фильтров
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Состояние для данных
  const [teams, setTeams] = useState<Team[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  
  // Состояние для модального окна создания тренировки
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTraining, setNewTraining] = useState({
    title: '',
    teamId: '',
    date: '',
    time: '',
    categoryId: '',
    type: 'TRAINING'
  });
  
  // Состояние для ошибок валидации
  const [errors, setErrors] = useState({
    title: '',
    teamId: '',
    date: '',
    categoryId: ''
  });
  
  // Получение данных команд
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
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Не удалось загрузить команды');
        }
        
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        console.error('Ошибка при загрузке команд:', error);
        // Можно добавить toast или другое уведомление для пользователя
      } finally {
        setIsLoadingTeams(false);
      }
    }
    
    if (session?.user) {
      fetchTeams();
    }
  }, [session]);
  
  // Получение данных тренировок
  useEffect(() => {
    async function fetchTrainings() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/trainings');
        if (!response.ok) throw new Error('Не удалось загрузить тренировки');
        const data = await response.json();
        
        // Используем статус из API вместо localStorage
        const trainingsWithData = data.map((training: Training) => {
          // Проверяем, является ли тренировка завершенной по статусу из API
          const isCompleted = training.status === 'COMPLETED';
          
          return {
            ...training,
            isCompleted
          };
        });
        
        // Сортируем тренировки по дате в порядке убывания (самые новые сверху)
        const sortedTrainings = trainingsWithData.sort((a: Training, b: Training) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        
        setTrainings(sortedTrainings);
      } catch (error) {
        console.error('Ошибка при загрузке тренировок:', error);
        // Если API еще не реализован, продолжаем работать с пустым массивом
        setTrainings([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (session?.user) {
      fetchTrainings();
    }
  }, [session]);
  
  // Фильтрация тренировок
  const filteredTrainings = useMemo(() => {
    return trainings.filter(training => {
      // Фильтр по поисковому запросу
      if (searchQuery && !training.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Фильтр по команде
      if (selectedTeam && training.teamId !== selectedTeam) {
        return false;
      }
      
      // Фильтр по категории
      if (selectedCategory && training.categoryId !== selectedCategory) {
        return false;
      }
      
      // Фильтр по дате начала
      if (startDate) {
        const trainingDate = new Date(training.date);
        const filterStartDate = new Date(startDate);
        if (trainingDate < filterStartDate) {
          return false;
        }
      }
      
      // Фильтр по дате окончания
      if (endDate) {
        const trainingDate = new Date(training.date);
        const filterEndDate = new Date(endDate);
        // Добавляем один день к дате окончания, чтобы включить весь день
        filterEndDate.setDate(filterEndDate.getDate() + 1);
        if (trainingDate >= filterEndDate) {
          return false;
        }
      }
      
      return true;
    });
  }, [trainings, searchQuery, selectedTeam, selectedCategory, startDate, endDate]);
  
  // Проверка наличия активных фильтров
  const hasActiveFilters = searchQuery || selectedTeam || selectedCategory || startDate || endDate;
  
  // Обработчик изменения значений полей формы
  const handleInputChange = (field: string, value: string) => {
    setNewTraining(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Очищаем ошибку для поля при вводе
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  // Функция для определения отображаемого названия тренировки в зависимости от типа
  const getTrainingTypeDisplay = (type: string) => {
    switch(type) {
      case 'GYM':
        return 'Тренажерный зал';
      case 'TRAINING':
      default:
        return 'Тренировка';
    }
  };
  
  // Обработчик отправки формы
  const handleSubmit = async () => {
    // Валидация
    const newErrors = {
      title: !newTraining.title ? 'Введите название тренировки' : '',
      teamId: !newTraining.teamId ? 'Выберите команду' : '',
      date: !newTraining.date ? 'Выберите дату' : '',
      categoryId: !newTraining.categoryId ? 'Выберите категорию' : ''
    };
    
    setErrors(newErrors);
    
    // Проверка наличия ошибок
    const hasErrors = Object.values(newErrors).some(error => error !== '');
    if (hasErrors) return;
    
    try {
      // Формируем данные для отправки
      const trainingData = {
        title: newTraining.title,
        teamId: newTraining.teamId,
        date: newTraining.date,
        time: newTraining.time,
        categoryId: newTraining.categoryId,
        type: newTraining.type
      };
      
      // Отправляем запрос на создание тренировки
      const response = await fetch('/api/trainings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(trainingData)
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при создании тренировки');
      }
      
      // Получаем созданную тренировку
      const createdTraining = await response.json();
      
      // Добавляем созданную тренировку в список
      setTrainings(prev => [...prev, {
        ...createdTraining,
        team: teams.find(t => t.id === createdTraining.teamId)?.name || '',
        category: categories.find((c: Category) => c.id === createdTraining.categoryId)?.name || ''
      }]);
      
      // Сбрасываем форму и закрываем диалог
      setNewTraining({
        title: '',
        teamId: '',
        date: '',
        time: '',
        categoryId: '',
        type: 'TRAINING'
      });
      setIsCreateDialogOpen(false);
      
    } catch (error) {
      console.error('Ошибка при создании тренировки:', error);
      alert('Произошла ошибка при создании тренировки. Пожалуйста, попробуйте еще раз.');
    }
  };
  
  // Функция сброса фильтров
  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTeam(null);
    setSelectedCategory(null);
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  }, []);
  
  return (
    <div className="space-y-6">
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-vista-light">Тренировки</CardTitle>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать тренировку
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
                  placeholder="Поиск тренировок..."
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
              
              {/* Фильтр по команде */}
              <Select
                value={selectedTeam === null ? 'all' : selectedTeam}
                onValueChange={(value) => setSelectedTeam(value === "all" ? null : value)}
                disabled={isLoadingTeams}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                  <SelectValue placeholder={isLoadingTeams ? "Загрузка..." : "Выберите команду"} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  <SelectItem value="all">Все команды</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Фильтр по категории */}
              <Select
                value={selectedCategory === null ? 'all' : selectedCategory}
                onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
                disabled={isLoadingCategories}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                  <SelectValue placeholder={isLoadingCategories ? "Загрузка..." : "Выберите категорию"} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  <SelectItem value="all">Все категории</SelectItem>
                  {categories.map((c: Category) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Фильтр по дате */}
              <div className="flex gap-2 items-center">
                <div className="relative w-full sm:w-[150px]">
                  <div 
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-primary cursor-pointer z-10"
                    onClick={() => {
                      const dateInput = document.getElementById('filter-start-date') as HTMLInputElement;
                      if (dateInput) {
                        try {
                          dateInput.showPicker();
                        } catch (error) {
                          console.error('Failed to show date picker:', error);
                        }
                      }
                    }}
                  >
                    <CalendarIcon size={16} />
                  </div>
                  <Input
                    id="filter-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10 bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    placeholder="С"
                    onClick={(e) => {
                      try {
                        (e.target as HTMLInputElement).showPicker();
                      } catch (error) {
                        console.error('Failed to show date picker:', error);
                      }
                    }}
                  />
                </div>
                <span className="text-vista-light/70">—</span>
                <div className="relative w-full sm:w-[150px]">
                  <div 
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-primary cursor-pointer z-10"
                    onClick={() => {
                      const dateInput = document.getElementById('filter-end-date') as HTMLInputElement;
                      if (dateInput) {
                        try {
                          dateInput.showPicker();
                        } catch (error) {
                          console.error('Failed to show date picker:', error);
                        }
                      }
                    }}
                  >
                    <CalendarIcon size={16} />
                  </div>
                  <Input
                    id="filter-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10 bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    placeholder="По"
                    onClick={(e) => {
                      try {
                        (e.target as HTMLInputElement).showPicker();
                      } catch (error) {
                        console.error('Failed to show date picker:', error);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Отображение выбранных фильтров */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-sm text-vista-light/70">Активные фильтры:</span>
                
                {searchQuery && (
                  <Badge variant="secondary" className="bg-vista-secondary/30 text-vista-light">
                    Поиск: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedTeam && (
                  <Badge variant="secondary" className="bg-vista-secondary/30 text-vista-light">
                    Команда: {teams.find(t => t.id === selectedTeam)?.name}
                    <button onClick={() => setSelectedTeam(null)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedCategory && (
                  <Badge variant="secondary" className="bg-vista-secondary/30 text-vista-light">
                    Категория: {categories.find((c: Category) => c.id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory(null)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {(startDate || endDate) && (
                  <Badge variant="secondary" className="bg-vista-secondary/30 text-vista-light">
                    Дата: {startDate ? new Date(startDate).toLocaleDateString() : ''}
                    {endDate ? ` - ${new Date(endDate).toLocaleDateString()}` : ''}
                    <button onClick={() => { setStartDate(''); setEndDate(''); }} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="ml-auto text-vista-light/70 hover:text-vista-light border-vista-secondary/50"
                >
                  Сбросить все
                </Button>
              </div>
            )}
          </div>
          
          {/* Список тренировок */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
              </div>
            ) : filteredTrainings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTrainings.map((training) => (
                  <div 
                    key={training.id} 
                    className="rounded-lg border border-vista-secondary/50 bg-vista-dark/70 hover:bg-vista-dark/90 transition-all overflow-hidden flex flex-col cursor-pointer shadow-md hover:shadow-xl hover:ring-1 hover:ring-vista-primary hover:ring-offset-0 hover:ring-offset-gray-800/20"
                    onClick={() => {
                      router.push(`/dashboard/coaching/trainings/${training.id}`);
                    }}
                  >
                    {/* Статус тренировки - полоса сверху */}
                    <div className={`h-1 w-full ${training.isCompleted ? 'bg-green-500' : 'bg-vista-primary'}`}></div>
                    
                    <div className="p-5">
                      {/* Заголовок и статус */}
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-medium text-vista-light">{training.title}</h3>
                        <Badge className={`${training.isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-vista-primary/20 text-vista-primary'}`}>
                          {training.isCompleted ? 'Завершена' : 'Запланирована'}
                        </Badge>
                      </div>
                      
                      {/* Дата и время */}
                      <div className="flex items-center mb-4 text-vista-light/80">
                        <Calendar className="h-4 w-4 mr-2 text-vista-primary" />
                        <span>
                          {new Date(training.date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}, {training.time}
                        </span>
                      </div>
                      
                      {/* Теги в нижней части */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className="bg-vista-secondary/20 text-vista-light border border-vista-secondary/50 shadow-md font-normal">
                          {training.team}
                        </Badge>
                        <Badge className="bg-vista-dark text-vista-primary border border-vista-primary/30 font-normal">
                          {training.category}
                        </Badge>
                        <Badge className={`${training.type === 'GYM' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'} border font-normal`}>
                          {getTrainingTypeDisplay(training.type)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-vista-secondary/50 shadow-md rounded-md">
                <p className="text-vista-light/60">
                  {hasActiveFilters
                    ? "Тренировки по заданным фильтрам не найдены"
                    : "Тренировки не найдены"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Модальное окно создания тренировки */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-vista-dark border-vista-secondary/50 text-vista-light max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl">Новая тренировка</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Название тренировки */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-vista-light">Название тренировки</Label>
              <Input
                id="title"
                value={newTraining.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
                placeholder="Введите название тренировки"
              />
              {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
            </div>
            
            {/* Выбор команды */}
            <div className="space-y-2">
              <Label htmlFor="team" className="text-vista-light">Команда</Label>
              <Select
                value={newTraining.teamId}
                onValueChange={(value) => handleInputChange('teamId', value)}
                disabled={isLoadingTeams}
              >
                <SelectTrigger 
                  id="team"
                  className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
                >
                  <SelectValue placeholder={isLoadingTeams ? "Загрузка..." : "Выберите команду"} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.teamId && <p className="text-red-500 text-sm">{errors.teamId}</p>}
            </div>
            
            {/* Дата и время на одной строке */}
            <div className="space-y-2">
              <Label className="text-vista-light">Дата и время тренировки</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Input
                    id="modal-training-date"
                    type="date"
                    value={newTraining.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    onClick={(e) => {
                      try {
                        (e.target as HTMLInputElement).showPicker();
                      } catch (error) {
                        console.error('Failed to show date picker:', error);
                      }
                    }}
                  />
                  {errors.date && <p className="text-red-500 text-sm">{errors.date}</p>}
                </div>
                <div className="relative">
                  <Input
                    id="modal-training-time"
                    type="time"
                    value={newTraining.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                    onClick={(e) => {
                      try {
                        (e.target as HTMLInputElement).showPicker();
                      } catch (error) {
                        console.error('Failed to show time picker:', error);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            
            {/* Выбор категории */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-vista-light">Категория тренировки</Label>
              <Select
                value={newTraining.categoryId}
                onValueChange={(value) => handleInputChange('categoryId', value)}
                disabled={isLoadingCategories}
              >
                <SelectTrigger 
                  id="category"
                  className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
                >
                  <SelectValue placeholder={isLoadingCategories ? "Загрузка..." : "Выберите категорию"} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-red-500 text-sm">{errors.categoryId}</p>}
            </div>
            
            {/* Выбор типа тренировки */}
            <div className="space-y-2">
              <Label htmlFor="training-type" className="text-vista-light">Тип тренировки</Label>
              <Select
                value={newTraining.type}
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger 
                  id="training-type"
                  className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
                >
                  <SelectValue placeholder="Выберите тип тренировки" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                  <SelectItem value="TRAINING">Тренировка</SelectItem>
                  <SelectItem value="GYM">Тренажерный зал</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
            >
              Отмена
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow-sm"
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 