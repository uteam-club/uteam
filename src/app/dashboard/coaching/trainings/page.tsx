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
import { X, Search, Plus, Calendar, Filter, CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTrainingCategories } from '@/hooks/useExerciseData';
import { CreateTrainingModal } from '@/components/training/CreateTrainingModal';
import { useTranslation } from 'react-i18next';

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
  const trainingsPerPage = 15;
  
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
        
        const trainingsWithData = data.map((training: Training) => {
          const isCompleted = training.status === 'COMPLETED';
          return {
            ...training,
            isCompleted
          };
        });
        
        const sortedTrainings = trainingsWithData.sort((a: Training, b: Training) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        
        setTrainings(sortedTrainings);
      } catch (error) {
        console.error('Ошибка при загрузке тренировок:', error);
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
      if (searchQuery && !training.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      if (selectedTeam && training.teamId !== selectedTeam) {
        return false;
      }
      
      if (selectedCategory && training.categoryId !== selectedCategory) {
        return false;
      }
      
      if (startDate && training.date < startDate) {
        return false;
      }
      
      if (endDate && training.date > endDate) {
        return false;
      }
      
      return true;
    });
  }, [trainings, searchQuery, selectedTeam, selectedCategory, startDate, endDate]);

  // Пагинация
  const totalPages = Math.ceil(filteredTrainings.length / trainingsPerPage);
  const startIndex = (currentPage - 1) * trainingsPerPage;
  const endIndex = startIndex + trainingsPerPage;
  const paginatedTrainings = filteredTrainings.slice(startIndex, endIndex);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
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
  const getTrainingTypeDisplay = (type: string) => {
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(trainingData)
      });
      
      if (!response.ok) {
        throw new Error(t('trainingsPage.error_creating_training'));
      }
      
      const createdTraining = await response.json();
      
      setTrainings(prev => [...prev, {
        ...createdTraining,
        team: teams.find(t => t.id === createdTraining.teamId)?.name || '',
        category: categories.find((c: Category) => c.id === createdTraining.categoryId)?.name || ''
      }]);
      
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
      console.error(t('trainingsPage.error_creating_training'), error);
      alert(t('trainingsPage.error_creating_training_alert'));
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
  
  // Проверка: одна команда или несколько
  const isSingleTeam = teams.length === 1;

  return (
    <div className="space-y-6">
      <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-vista-light">{t('trainingsPage.title')}</CardTitle>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark shadow-sm"
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary focus:ring-vista-primary/50"
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
                  onValueChange={(value) => setSelectedTeam(value === "all" ? null : value)}
                  disabled={isLoadingTeams}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                    <SelectValue placeholder={isLoadingTeams ? t('trainingsPage.loading') : t('trainingsPage.select_team_placeholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
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
                onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
                disabled={isLoadingCategories}
              >
                <SelectTrigger className="w-full sm:w-[200px] bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                  <SelectValue placeholder={isLoadingCategories ? t('trainingsPage.loading') : t('trainingsPage.select_category_placeholder')} />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
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
                    {t('trainingsPage.search_filter')}: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedTeam && (
                  <Badge variant="secondary" className="bg-vista-secondary/30 text-vista-light">
                    {t('trainingsPage.team_filter')}: {teams.find(t => t.id === selectedTeam)?.name}
                    <button onClick={() => setSelectedTeam(null)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedCategory && (
                  <Badge variant="secondary" className="bg-vista-secondary/30 text-vista-light">
                    {t('trainingsPage.category_filter')}: {categories.find((c: Category) => c.id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory(null)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {(startDate || endDate) && (
                  <Badge variant="secondary" className="bg-vista-secondary/30 text-vista-light">
                    {t('trainingsPage.date_filter')}: {startDate ? new Date(startDate).toLocaleDateString() : ''}
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
                  {t('trainingsPage.reset_all_filters')}
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
            ) : paginatedTrainings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedTrainings.map((training) => (
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
                        <h3 className="text-lg font-medium text-vista-light">{training.name}</h3>
                        <Badge className={`${training.isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-vista-primary/20 text-vista-primary'}`}>
                          {training.isCompleted ? t('trainingsPage.completed_status') : t('trainingsPage.planned_status')}
                        </Badge>
                      </div>
                      
                      {/* Дата и время */}
                      <div className="flex items-center mb-4 text-vista-light/80">
                        <Calendar className="h-4 w-4 mr-2 text-vista-primary" />
                        <span>{training.time}</span>
                      </div>
                      
                      {/* Теги в нижней части */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className="bg-vista-secondary/20 text-vista-light border border-vista-secondary/50 shadow-md font-normal">
                          {!isSingleTeam && training.team}
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
                      className="bg-vista-dark border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`${
                            currentPage === page 
                              ? 'bg-vista-primary text-vista-dark' 
                              : 'bg-vista-dark border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20'
                          }`}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="bg-vista-dark border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
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