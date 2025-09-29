'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { X, Search, Plus, Calendar, Filter, CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTrainingCategories } from '@/hooks/useExerciseData';
import { CreateTrainingModal } from '@/components/training/CreateTrainingModal';
import { generatePaginationPages, isEllipsis } from '@/lib/pagination';
import { cn } from '@/lib/utils';

import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

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
  name: string;
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
  const { t } = useTranslation();
  const { data: session } = useSession();
  const router = useRouter();
  const { categories, isLoading: isLoadingCategories, isError: categoriesError } = useTrainingCategories();
  
  // Состояние для фильтров
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Состояние для пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const trainingsPerPage = 10;
  
  // Состояние для данных
  const [teams, setTeams] = useState<Team[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  
  // Refs для предотвращения дублирования запросов
  const trainingsLoadingRef = useRef(false);
  const teamsLoadingRef = useRef(false);
  
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
      if (teamsLoadingRef.current) return; // Предотвращаем дублирование запросов
      
      try {
        teamsLoadingRef.current = true;
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
        console.log('🔍 Загруженные команды:', data);
        setTeams(data);
      } catch (error) {
        console.error('Ошибка при загрузке команд:', error);
      } finally {
        setIsLoadingTeams(false);
        teamsLoadingRef.current = false;
      }
    }
    
    if (session?.user) {
      fetchTeams();
    }
  }, [session]);
  
  // Получение данных тренировок
  useEffect(() => {
    async function fetchTrainings() {
      if (trainingsLoadingRef.current) return; // Предотвращаем дублирование запросов
      
      try {
        trainingsLoadingRef.current = true;
        setIsLoading(true);
        const response = await fetch('/api/trainings');
        if (!response.ok) throw new Error('Не удалось загрузить тренировки');
        const data = await response.json();
        
        // Проверим типы тренировок из API
        const apiTypes = data.reduce((acc: Record<string, number>, t: any) => {
          acc[t.type] = (acc[t.type] || 0) + 1;
          return acc;
        }, {});
        // API работает правильно
        
        const trainingsWithData = data.map((training: any) => {
          const isCompleted = training.status === 'COMPLETED';
          // Находим команду и категорию по ID
          const team = teams.find((t: Team) => t.id === training.teamId);
          const category = categories.find((c: Category) => c.id === training.categoryId);
          
          
          const processedTraining = {
            ...training,
            name: training.title, // маппинг title -> name
            team: team?.name || 'Неизвестная команда',
            category: category?.name || 'Без категории',
            isCompleted
          };
          
          // console.log(`🔍 Обработанная тренировка ${training.id}:`, {
          //   title: training.title,
          //   originalType: training.type,
          //   processedType: processedTraining.type,
          //   displayType: getTrainingTypeDisplay(processedTraining.type)
          // });
          
          return processedTraining;
        });
        
        // Проверим типы после обработки
        const processedTypes = trainingsWithData.reduce((acc: Record<string, number>, t: Training) => {
          acc[t.type] = (acc[t.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        // Обработка данных работает правильно
        
        const sortedTrainings = trainingsWithData.sort((a: Training, b: Training) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        
        setTrainings(sortedTrainings);
      } catch (error) {
        console.error('Ошибка при загрузке тренировок:', error);
        setTrainings([]);
      } finally {
        setIsLoading(false);
        trainingsLoadingRef.current = false;
      }
    }
    
    if (session?.user && teams.length > 0 && categories.length > 0) {
      fetchTrainings();
    }
  }, [session, teams, categories]);
  
  // Фильтрация тренировок
  const filteredTrainings = useMemo(() => {
    // Фильтрация тренировок
    
    const filtered = trainings.filter(training => {
      
      if (searchQuery && !training.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      if (selectedTeam) {
        // Находим команду по ID и сравниваем название
        const selectedTeamName = teams.find(t => t.id === selectedTeam)?.name;
        if (selectedTeamName && training.team !== selectedTeamName) {
          return false;
        }
      }
      
      if (selectedCategory) {
        // Находим категорию по ID и сравниваем название
        const selectedCategoryName = categories.find((c: Category) => c.id === selectedCategory)?.name;
        if (selectedCategoryName && training.category !== selectedCategoryName) {
          return false;
        }
      }
      
      if (startDate && training.date < startDate) {
        return false;
      }
      
      if (endDate && training.date > endDate) {
        return false;
      }
      
      return true;
    });
    
    // Фильтрация завершена
    
    return filtered;
  }, [trainings, searchQuery, selectedTeam, selectedCategory, startDate, endDate, teams, categories]);

  // Пагинация
  const totalPages = Math.ceil(filteredTrainings.length / trainingsPerPage);
  const startIndex = (currentPage - 1) * trainingsPerPage;
  const endIndex = startIndex + trainingsPerPage;
  const paginatedTrainings = filteredTrainings.slice(startIndex, endIndex);
  
  // Пагинация работает

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    // Сброс страницы при изменении фильтров
    setCurrentPage(1);
  }, [searchQuery, selectedTeam, selectedCategory, startDate, endDate]);
  
  // Проверка наличия активных фильтров
  const hasActiveFilters = searchQuery || selectedTeam || selectedCategory || startDate || endDate;
  
  // Обработчик изменения значений полей формы
  const handleInputChange = (field: string, value: string) => {
    setNewTraining(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  // Функция для определения отображаемого названия тренировки в зависимости от типа
  const getTrainingTypeDisplay = (type: string | null | undefined) => {
    switch(type) {
      case 'GYM':
        return t('trainingsPage.type_gym');
      case 'TRAINING':
      default:
        return t('trainingsPage.type_training');
    }
  };
  
  // Обработчик отправки формы
  const handleSubmit = async () => {
    const newErrors = {
      title: !newTraining.title ? t('trainingsPage.validation_title_required') : '',
      teamId: !newTraining.teamId ? t('trainingsPage.validation_team_required') : '',
      date: !newTraining.date ? t('trainingsPage.validation_date_required') : '',
      categoryId: !newTraining.categoryId ? t('trainingsPage.validation_category_required') : ''
    };
    
    setErrors(newErrors);
    
    const hasErrors = Object.values(newErrors).some(error => error !== '');
    if (hasErrors) return;
    
    try {
      const trainingData = {
        title: newTraining.title,
        teamId: newTraining.teamId,
        date: newTraining.date,
        time: newTraining.time,
        categoryId: newTraining.categoryId,
        type: newTraining.type
      };
      
      const response = await fetch('/api/trainings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trainingData),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось создать тренировку');
      }
      
      // Сброс формы и закрытие модального окна
      setNewTraining({
        title: '',
        teamId: '',
        date: '',
        time: '',
        categoryId: '',
        type: 'TRAINING'
      });
      setErrors({
        title: '',
        teamId: '',
        date: '',
        categoryId: ''
      });
      setIsCreateDialogOpen(false);
      
      // Обновление списка тренировок
      window.location.reload();
    } catch (error) {
      console.error('Ошибка при создании тренировки:', error);
    }
  };
  
  // Сброс всех фильтров
  const resetFilters = useCallback(() => {
    console.log('🔍 Сброс всех фильтров');
    setSearchQuery('');
    setSelectedTeam(null);
    setSelectedCategory(null);
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  }, []);
  
  // Проверка: одна команда или несколько
  const isSingleTeam = teams.length === 1;

  return (
    <div className="space-y-6">
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-vista-light">{t('trainingsPage.title')}</CardTitle>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            variant="outline"
            className="bg-vista-dark/30 backdrop-blur-sm border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal shadow-lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('trainingsPage.create_training_btn')}
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
                  placeholder={t('trainingsPage.search_placeholder')}
                  value={searchQuery}
                  onChange={e => {
                    console.log('🔍 Изменение поиска:', e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  className="pl-10 bg-vista-dark/30 border-vista-light/20 text-vista-light/90 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 font-normal shadow-lg"
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
              {!isSingleTeam && (
                <Select
                  value={selectedTeam === null ? 'all' : selectedTeam}
                  onValueChange={(value) => {
                    console.log('🔍 Изменение фильтра команды:', {
                      value: value,
                      willSetTo: value === "all" ? null : value,
                      currentSelectedTeam: selectedTeam,
                      availableTeams: teams.map(t => ({ id: t.id, name: t.name })),
                      selectedTeamName: value === "all" ? null : teams.find(t => t.id === value)?.name
                    });
                    setSelectedTeam(value === "all" ? null : value);
                  }}
                  disabled={isLoadingTeams}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-primary/50 focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/30 h-9 px-3 font-normal shadow-lg data-[value]:text-vista-light transition-all duration-200 group">
                    <SelectValue placeholder={isLoadingTeams ? t('trainingsPage.loading') : t('trainingsPage.select_team_placeholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border border-vista-light/20 text-vista-light shadow-2xl rounded-lg custom-scrollbar">
                    <SelectItem value="all">{t('trainingsPage.all_teams')}</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Фильтр по категории */}
              <Select
                value={selectedCategory === null ? 'all' : selectedCategory}
                onValueChange={(value) => {
                  console.log('🔍 Изменение фильтра категории:', value);
                  setSelectedCategory(value === "all" ? null : value);
                }}
                disabled={isLoadingCategories}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-primary/50 focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/30 h-9 px-3 font-normal shadow-lg data-[value]:text-vista-light transition-all duration-200 group">
                  <SelectValue placeholder={isLoadingCategories ? t('trainingsPage.loading') : t('trainingsPage.select_category_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border border-vista-light/20 text-vista-light shadow-2xl rounded-lg custom-scrollbar">
                  <SelectItem value="all">{t('trainingsPage.all_categories')}</SelectItem>
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
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50 cursor-pointer z-10"
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
                    onChange={e => {
                      console.log('🔍 Изменение даты начала:', e.target.value);
                      setStartDate(e.target.value);
                    }}
                    className="pl-10 bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 font-normal shadow-lg cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
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
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vista-light/50 cursor-pointer z-10"
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
                    onChange={e => {
                      console.log('🔍 Изменение даты окончания:', e.target.value);
                      setEndDate(e.target.value);
                    }}
                    className="pl-10 bg-vista-dark/30 border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 font-normal shadow-lg cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
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
              <div className="bg-vista-dark/20 backdrop-blur-sm border border-vista-light/10 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-vista-light/60" />
                      <span className="text-sm font-medium text-vista-light/80">Активные фильтры</span>
                      <span className="text-xs text-vista-light/50 bg-vista-light/10 px-2 py-1 rounded-full">
                        {[
                          searchQuery ? 1 : 0,
                          selectedTeam ? 1 : 0,
                          selectedCategory ? 1 : 0,
                          (startDate || endDate) ? 1 : 0
                        ].reduce((a, b) => a + b, 0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {searchQuery && (
                        <Badge variant="secondary" className="bg-vista-primary/20 border-vista-primary/30 text-vista-primary hover:bg-vista-primary/30 transition-colors">
                          <Search className="h-3 w-3 mr-1" />
                          {searchQuery}
                          <button 
                            onClick={() => setSearchQuery('')} 
                            className="ml-2 hover:bg-vista-primary/30 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      
                      {selectedTeam && (
                        <Badge variant="secondary" className="bg-vista-secondary/30 border-vista-secondary/40 text-vista-light hover:bg-vista-secondary/40 transition-colors">
                          <span className="mr-1 text-vista-light/70">•</span>
                          {teams.find(t => t.id === selectedTeam)?.name}
                          <button 
                            onClick={() => setSelectedTeam(null)} 
                            className="ml-2 hover:bg-vista-secondary/40 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      
                      {selectedCategory && (
                        <Badge variant="secondary" className="bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors">
                          <span className="mr-1 text-blue-400">•</span>
                          {categories.find((c: Category) => c.id === selectedCategory)?.name}
                          <button 
                            onClick={() => setSelectedCategory(null)} 
                            className="ml-2 hover:bg-blue-500/30 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      
                      {(startDate || endDate) && (
                        <Badge variant="secondary" className="bg-vista-primary/20 border-vista-primary/30 text-vista-primary hover:bg-vista-primary/30 transition-colors">
                          <span className="mr-1 text-vista-primary">•</span>
                          {startDate ? new Date(startDate).toLocaleDateString() : ''}
                          {endDate ? ` - ${new Date(endDate).toLocaleDateString()}` : ''}
                          <button 
                            onClick={() => { setStartDate(''); setEndDate(''); }} 
                            className="ml-2 hover:bg-vista-primary/30 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="h-7 px-3 text-xs bg-vista-dark/50 backdrop-blur-sm border-vista-light/20 text-vista-light/70 hover:bg-vista-light/10 hover:border-vista-light/40 hover:text-vista-light focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 font-normal shadow-lg"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t('trainingsPage.reset_all_filters')}
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Список тренировок */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
              </div>
            ) : paginatedTrainings.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {paginatedTrainings.map((training) => (
                  <div 
                    key={training.id} 
                    className="rounded-lg border border-vista-secondary/50 bg-vista-dark/70 hover:bg-vista-dark/90 transition-all overflow-hidden flex flex-col shadow-md hover:shadow-xl"
                  >

                    
                    <div 
                      className="p-5 cursor-pointer flex-1"
                      onClick={() => {
                        router.push(`/dashboard/coaching/trainings/${training.id}`);
                      }}
                    >
                      {/* Заголовок и статус в одну строку */}
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-vista-light">{training.name}</h3>
                        <Badge className={`${training.isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-vista-primary/20 text-vista-primary'}`}>
                          {training.isCompleted ? t('trainingsPage.completed_status') : t('trainingsPage.planned_status')}
                        </Badge>
                      </div>
                      
                      {/* Дата, время и теги в одну строку */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Дата и время */}
                        <div className="flex items-center text-vista-light/80">
                          <Calendar className="h-4 w-4 mr-2 text-vista-primary" />
                          <span className="mr-4">{training.date ? dayjs(training.date).format('DD.MM.YYYY') : 'Дата не указана'}</span>
                          <Clock className="h-4 w-4 mr-2 text-vista-primary" />
                          <span>{training.time}</span>
                        </div>
                        
                        {/* Теги в правой части */}
                        <div className="flex items-center gap-2">
                          {!isSingleTeam && (
                            <Badge className="bg-vista-secondary/20 text-vista-light border border-vista-secondary/50 shadow-md font-normal">
                              {training.team}
                            </Badge>
                          )}
                          <Badge className="bg-vista-dark text-vista-primary border border-vista-primary/30 font-normal">
                            {training.category}
                          </Badge>
                          <Badge className={`${training.type === 'GYM' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'} border font-normal`}>
                            {getTrainingTypeDisplay(training.type)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-vista-secondary/50 shadow-md rounded-md">
                <p className="text-vista-light/60">
                  {hasActiveFilters
                    ? t('trainingsPage.no_trainings_found_filters')
                    : t('trainingsPage.no_trainings_found')}
                </p>
              </div>
            )}
            
            {/* Информация о количестве и пагинация */}
            {paginatedTrainings.length > 0 && (
              <div className="flex flex-col items-center gap-4 mt-6">
                {/* Информация о количестве */}
                <div className="text-vista-light/70 text-sm">
                  Показано {startIndex + 1}-{Math.min(endIndex, filteredTrainings.length)} из {filteredTrainings.length} тренировок
                </div>
                
                {/* Пагинация */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="border-vista-secondary/30 text-vista-light"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {generatePaginationPages(currentPage, totalPages).map((page) => {
                        if (isEllipsis(page)) {
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
                            onClick={() => setCurrentPage(page)}
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
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="border-vista-secondary/30 text-vista-light"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Модальное окно создания тренировки */}
      <CreateTrainingModal
        isOpen={isCreateDialogOpen}
        initialDate={null}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={() => {
          // Можно обновить список тренировок или показать toast
        }}
      />


    </div>
  );
}
