'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  ClipboardIcon,
  PlusIcon, 
  ChevronRightIcon,
  TagIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
  CheckIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  DocumentIcon,
  DocumentPlusIcon,
  ChevronUpDownIcon,
  ArrowUpTrayIcon
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

type TrainingCategory = {
  id: string;
  name: string;
  description?: string | null;
  _count?: {
    trainings: number;
    tags: number;
  };
};

type TrainingTag = {
  id: string;
  name: string;
  trainingCategoryId: string;
};

type Training = {
  id: string;
  title: string;
  name?: string;
  description?: string | null;
  difficulty?: number;
  categoryId?: string;
  authorId?: string | null;
  duration?: number | null;
  date?: string | null;
  startTime: string;
  endTime: string;
  category?: {
    name: string;
  };
  team?: {
    id: string;
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
};

type User = {
  id: string;
  name: string;
};

export default function TrainingsPage() {
  const { locale } = useParams() as { locale: string };
  const router = useRouter();
  const t = useTranslations('trainings');
  const common = useTranslations('common');
  
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [filteredTrainings, setFilteredTrainings] = useState<Training[]>([]);
  const [tags, setTags] = useState<TrainingTag[]>([]);
  const [availableTags, setAvailableTags] = useState<TrainingTag[]>([]);
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
  const [showAddTrainingDialog, setShowAddTrainingDialog] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  
  // Состояния для создания тренировки
  const [trainingName, setTrainingName] = useState('');
  const [trainingDuration, setTrainingDuration] = useState('');
  const [trainingDate, setTrainingDate] = useState('');
  const [trainingTime, setTrainingTime] = useState('');
  const [trainingCategoryId, setTrainingCategoryId] = useState('');
  const [trainingTagIds, setTrainingTagIds] = useState<string[]>([]);
  const [trainingCategoryDropdownOpen, setTrainingCategoryDropdownOpen] = useState(false);
  const [trainingTagsDropdownOpen, setTrainingTagsDropdownOpen] = useState(false);
  const [trainingFile, setTrainingFile] = useState<File | null>(null);
  const [trainingErrors, setTrainingErrors] = useState<{
    name?: string;
    categoryId?: string;
    tags?: string;
    duration?: string;
    date?: string;
    teamId?: string;
    time?: string;
  }>({});
  
  // Refs для выпадающих списков формы тренировки
  const trainingCategoryDropdownRef = useRef<HTMLDivElement>(null);
  const trainingTagsDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Состояние для выбора конкретной тренировки
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [showTrainingDetailsDialog, setShowTrainingDetailsDialog] = useState(false);
  
  // Новые состояния для управления удалением и редактированием
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTrainingName, setEditTrainingName] = useState('');
  const [editTrainingDescription, setEditTrainingDescription] = useState('');
  const [editTrainingDuration, setEditTrainingDuration] = useState('');
  const [editTrainingDate, setEditTrainingDate] = useState('');
  const [editTrainingCategoryId, setEditTrainingCategoryId] = useState('');
  const [editTrainingTagIds, setEditTrainingTagIds] = useState<string[]>([]);
  const [editTrainingFile, setEditTrainingFile] = useState<File | null>(null);
  const [editTrainingCategoryDropdownOpen, setEditTrainingCategoryDropdownOpen] = useState(false);
  const [editTrainingTagsDropdownOpen, setEditTrainingTagsDropdownOpen] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Добавляем новые состояния после других состояний
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  
  // Добавляем ref для выпадающего списка команд
  const teamDropdownRef = useRef<HTMLDivElement>(null);

  // Загрузка категорий тренировок
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/trainings/categories');
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки категорий тренировок');
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

  // Добавляем загрузку команд
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch('/api/teams');
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки команд');
        }
        
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        console.error('Ошибка загрузки команд:', error);
      }
    };

    fetchTeams();
  }, []);

  // Загрузка всех тренировок 
  useEffect(() => {
    const fetchTrainings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/trainings');
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки тренировок');
        }
        
        const data = await response.json();
        setTrainings(data);
        setFilteredTrainings(data);
      } catch (error) {
        console.error('Ошибка загрузки тренировок:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainings();
  }, []);

  // Загрузка всех тегов и авторов
  useEffect(() => {
    const fetchTagsAndAuthors = async () => {
      try {
        // Загрузка тегов
        const tagsResponse = await fetch('/api/trainings/tags');
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
      if (
        authorDropdownRef.current && 
        !authorDropdownRef.current.contains(event.target as Node)
      ) {
        setAuthorDropdownOpen(false);
      }
      
      if (
        categoryDropdownRef.current && 
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setCategoryDropdownOpen(false);
      }
      
      if (
        tagDropdownRef.current && 
        !tagDropdownRef.current.contains(event.target as Node)
      ) {
        setTagDropdownOpen(false);
      }
      
      if (
        trainingCategoryDropdownRef.current && 
        !trainingCategoryDropdownRef.current.contains(event.target as Node)
      ) {
        setTrainingCategoryDropdownOpen(false);
      }
      
      // Добавляем проверку для выпадающего списка команд
      if (
        teamDropdownRef.current && 
        !teamDropdownRef.current.contains(event.target as Node)
      ) {
        setTeamDropdownOpen(false);
      }
    }
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Фильтрация тренировок на основе поиска и фильтров
  useEffect(() => {
    if (!trainings) return;
    
    const filtered = trainings.filter(training => {
      // Фильтр по поисковому запросу - учитываем поле title вместо name
      const matchesSearch = !searchQuery 
        || training.title?.toLowerCase().includes(searchQuery.toLowerCase())
        || training.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Фильтр по категории
      const matchesCategory = selectedCategories.length === 0 || 
        (training.categoryId && selectedCategories.includes(training.categoryId));
      
      // Фильтр по автору
      const matchesAuthor = selectedAuthors.length === 0 || 
        (training.authorId && selectedAuthors.includes(training.authorId));
      
      // Фильтр по тегам - учитываем, что tags может быть undefined
      const matchesTag = selectedTags.length === 0 || 
        (training.tags && 
          Array.isArray(training.tags) && 
          training.tags.length > 0 && 
          selectedTags.every(tagId => 
            training.tags!.some(tag => tag.id === tagId)
          ));
      
      return matchesSearch && matchesCategory && matchesAuthor && matchesTag;
    });
    
    setFilteredTrainings(filtered);
  }, [searchQuery, selectedCategories, selectedAuthors, selectedTags, trainings]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-vista-light mb-4"></h1>
      
      {/* Фильтры и поиск */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            {/* 1. Строка поиска */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Поиск тренировок..."
                className="pl-9 w-[250px] bg-vista-dark/50 border-vista-secondary/40 text-vista-light/90"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <MagnifyingGlassIcon className="h-4 w-4 text-vista-light/60 absolute left-3 top-2.5" />
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
          
          {/* Кнопка добавления тренировки справа */}
          <Dialog open={showAddTrainingDialog} onOpenChange={(open) => {
            setShowAddTrainingDialog(open);
            if (!open) resetTrainingForm();
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                size="sm"
                className="h-9 bg-vista-primary text-vista-dark hover:bg-vista-primary/90"
              >
                <PlusIcon className="h-4 w-4 mr-1" /> Добавить тренировку
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-vista-dark border border-vista-secondary/70 sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Добавить тренировку</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Название тренировки */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="trainingName" className="text-right">
                    Название<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="trainingName"
                    value={trainingName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrainingName(e.target.value)}
                    className={`col-span-3 ${trainingErrors.name ? 'border-red-500' : ''}`}
                    placeholder="Введите название тренировки"
                  />
                  {trainingErrors.name && (
                    <div className="col-span-4 text-right text-red-500 text-xs">
                      {trainingErrors.name}
                    </div>
                  )}
                </div>
                
                {/* Выбор команды */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="teamSelect" className="text-right">
                    Команда<span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-3 relative" ref={teamDropdownRef}>
                    <Button 
                      type="button"
                      variant="outline" 
                      className={`w-full justify-between ${trainingErrors.teamId ? 'border-red-500' : ''}`}
                      onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                    >
                      <span>
                        {selectedTeamId 
                          ? teams.find(t => t.id === selectedTeamId)?.name 
                          : 'Выберите команду'}
                      </span>
                      <ChevronDownIcon className="h-4 w-4 opacity-50" />
                    </Button>
                    {trainingErrors.teamId && (
                      <div className="text-right text-red-500 text-xs mt-1">
                        {trainingErrors.teamId}
                      </div>
                    )}
                    
                    {teamDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 max-h-[200px] overflow-y-auto bg-vista-dark/95 border border-vista-secondary/50 rounded-md shadow-lg">
                        <div className="py-1">
                          {teams.length > 0 ? (
                            teams.map(team => (
                              <div 
                                key={team.id}
                                className={`flex items-center px-4 py-2 cursor-pointer ${selectedTeamId === team.id ? 'bg-vista-secondary/30 text-vista-primary' : 'text-vista-light hover:bg-vista-secondary/20'}`}
                                onClick={() => {
                                  setSelectedTeamId(team.id);
                                  setTeamDropdownOpen(false);
                                }}
                              >
                                <span>{team.name}</span>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-vista-light/50">
                              Нет доступных команд
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Дата и время начала тренировки */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="trainingDate" className="text-right">
                    Дата и время<span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-3 flex gap-2">
                    <div className="flex-1">
                      <Input
                        id="trainingDate"
                        value={trainingDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrainingDate(e.target.value)}
                        className={`w-full ${trainingErrors.date ? 'border-red-500' : ''}`}
                        placeholder="Дата"
                        type="date"
                      />
                      {trainingErrors.date && (
                        <div className="text-right text-red-500 text-xs mt-1">
                          {trainingErrors.date}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        id="trainingTime"
                        value={trainingTime}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrainingTime(e.target.value)}
                        className={`w-full ${trainingErrors.time ? 'border-red-500' : ''}`}
                        placeholder="Время начала"
                        type="time"
                      />
                      {trainingErrors.time && (
                        <div className="text-right text-red-500 text-xs mt-1">
                          {trainingErrors.time}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Категория тренировки */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="trainingCategory" className="text-right">
                    Категория<span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-3 relative" ref={trainingCategoryDropdownRef}>
                    <Button 
                      type="button"
                      variant="outline" 
                      className={`w-full justify-between ${trainingErrors.categoryId ? 'border-red-500' : ''}`}
                      onClick={() => setTrainingCategoryDropdownOpen(!trainingCategoryDropdownOpen)}
                    >
                      <span>
                        {trainingCategoryId 
                          ? categories.find(c => c.id === trainingCategoryId)?.name 
                          : 'Выберите категорию'}
                      </span>
                      <ChevronDownIcon className="h-4 w-4 opacity-50" />
                    </Button>
                    {trainingErrors.categoryId && (
                      <div className="text-right text-red-500 text-xs mt-1">
                        {trainingErrors.categoryId}
                      </div>
                    )}
                    
                    {trainingCategoryDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 max-h-[200px] overflow-y-auto bg-vista-dark/95 border border-vista-secondary/50 rounded-md shadow-lg">
                        <div className="py-1">
                          {categories.map(category => (
                            <div 
                              key={category.id}
                              className={`flex items-center px-4 py-2 cursor-pointer ${trainingCategoryId === category.id ? 'bg-vista-secondary/30 text-vista-primary' : 'text-vista-light hover:bg-vista-secondary/20'}`}
                              onClick={() => {
                                setTrainingCategoryId(category.id);
                                setTrainingCategoryDropdownOpen(false);
                              }}
                            >
                              <span>{category.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetTrainingForm();
                    setShowAddTrainingDialog(false);
                  }}
                >
                  Отмена
                </Button>
                <Button 
                  type="button" 
                  variant="default" 
                  onClick={handleAddTraining}
                >
                  Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Список тренировок */}
      {loading ? (
        <div className="text-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-vista-primary/50 border-t-vista-primary rounded-full mx-auto"></div>
          <p className="mt-4 text-vista-light/70">Загрузка тренировок...</p>
        </div>
      ) : filteredTrainings.length === 0 ? (
        <div className="bg-vista-secondary/20 rounded-lg p-8 text-center">
          <ClipboardIcon className="h-12 w-12 text-vista-primary/50 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-vista-light mb-2">Тренировки не найдены</h2>
          <p className="text-vista-light/70 mb-4">Создайте новую тренировку, нажав на кнопку "Добавить тренировку"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrainings.map(training => (
            <div 
              key={training.id} 
              className="bg-vista-secondary/20 rounded-lg p-5 hover:bg-vista-secondary/30 transition-colors cursor-pointer"
              onClick={() => {
                router.push(`/${locale}/dashboard/coaching/trainings/${training.id}`);
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-medium text-vista-light truncate pr-2 flex-1">{training.title}</h3>
                <div className="text-xs bg-vista-primary/20 text-vista-primary rounded-full px-2 py-0.5">
                  {training.category?.name || "Без категории"}
                </div>
              </div>
              
              <div className="flex items-center text-vista-light/70 text-sm mb-2">
                <CalendarIcon className="h-4 w-4 mr-1" />
                <span>{new Date(training.startTime).toLocaleDateString()}</span>
                <span className="mx-2">·</span>
                <ClockIcon className="h-4 w-4 mr-1" />
                <span>{new Date(training.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              
              <div className="flex items-center text-vista-light/70 text-sm mb-2">
                <UserIcon className="h-4 w-4 mr-1" />
                <span>{training.team?.name || "Без команды"}</span>
              </div>
              
              {training.description && (
                <p className="text-vista-light/60 text-sm mt-2 line-clamp-2">{training.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно для просмотра деталей тренировки */}
      <Dialog open={showTrainingDetailsDialog} onOpenChange={setShowTrainingDetailsDialog}>
        <DialogContent className="bg-vista-dark border border-vista-secondary/70 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="break-words">{selectedTraining?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {/* Категория */}
            <div className="flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-vista-secondary" />
              <span className="text-vista-light/70">Категория:</span>
              <span className="text-vista-light">{selectedTraining?.category?.name || 'Не указана'}</span>
            </div>
            
            {/* Команда */}
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-vista-secondary" />
              <span className="text-vista-light/70">Команда:</span>
              <span className="text-vista-light">{selectedTraining?.team?.name || 'Не указана'}</span>
            </div>
            
            {/* Дата и время */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-vista-secondary" />
              <span className="text-vista-light/70">Дата:</span>
              <span className="text-vista-light">
                {selectedTraining?.startTime ? new Date(selectedTraining.startTime).toLocaleDateString() : 'Не указана'}
              </span>
            </div>
            
            {/* Время начала и окончания */}
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-vista-secondary" />
              <span className="text-vista-light/70">Время:</span>
              <span className="text-vista-light">
                {selectedTraining?.startTime ? new Date(selectedTraining.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                {selectedTraining?.endTime ? ` - ${new Date(selectedTraining.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
              </span>
            </div>
            
            {/* Описание, если есть */}
            {selectedTraining?.description && (
              <div className="flex flex-col gap-2">
                <span className="text-vista-light/70">Описание:</span>
                <div className="bg-vista-dark/50 rounded p-3 text-vista-light/90 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {selectedTraining.description}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline"
              className="gap-1"
              onClick={() => {
                // В будущем здесь будет редактирование
                console.log('Редактирование тренировки', selectedTraining?.id);
              }}
            >
              <PencilIcon className="h-4 w-4" /> Редактировать
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              className="gap-1"
              onClick={() => {
                // В будущем здесь будет удаление
                console.log('Удаление тренировки', selectedTraining?.id);
              }}
            >
              <TrashIcon className="h-4 w-4" /> Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  
  // Вспомогательные функции (заглушки)
  function toggleAuthor(authorId: string) {
    setSelectedAuthors(prev => 
      prev.includes(authorId) 
        ? prev.filter(id => id !== authorId) 
        : [...prev, authorId]
    );
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  }

  function toggleTag(tagId: string) {
    setSelectedTags(prev => 
      prev.includes(tagId)
      ? prev.filter(id => id !== tagId)
      : [...prev, tagId]
    );
  }

  function toggleTrainingTag(tagId: string) {
    setTrainingTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId) 
        : [...prev, tagId]
    );
  }
  
  function getTagsForCategory() {
    if (!trainingCategoryId) return [];
    return tags.filter(tag => tag.trainingCategoryId === trainingCategoryId);
  }
  
  function resetTrainingForm() {
    setTrainingName('');
    setTrainingDuration('');
    setTrainingDate('');
    setTrainingTime('');
    setTrainingCategoryId('');
    setSelectedTeamId('');
    setTrainingErrors({});
  }
  
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setTrainingFile(e.target.files[0]);
    }
  }
  
  function openFileDialog() {
    fileInputRef.current?.click();
  }
  
  function resetFilters() {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedTags([]);
    setSelectedAuthors([]);
  }

  async function handleAddTraining() {
    // Проверяем обязательные поля
    const errors: any = {};
    
    if (!trainingName.trim()) {
      errors.name = 'Название обязательно';
    }
    
    if (!trainingDate) {
      errors.date = 'Дата тренировки обязательна';
    }

    if (!trainingTime) {
      errors.time = 'Время начала тренировки обязательно';
    }
    
    if (!trainingCategoryId) {
      errors.categoryId = 'Категория обязательна';
    }
    
    if (!selectedTeamId) {
      errors.teamId = 'Выбор команды обязателен';
    }
    
    if (Object.keys(errors).length > 0) {
      setTrainingErrors(errors);
      return;
    }

    try {
      // Формируем дату и время начала тренировки
      const startTimeString = `${trainingDate}T${trainingTime}:00`;
      
      // Формируем данные для отправки
      const trainingData = {
        title: trainingName,
        startTime: startTimeString,
        categoryId: trainingCategoryId,
        teamId: selectedTeamId
      };
      
      // Отправляем запрос на создание тренировки
      const response = await fetch('/api/trainings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trainingData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при создании тренировки');
      }
      
      // Получаем созданную тренировку
      const createdTraining = await response.json();
      console.log('Тренировка успешно создана:', createdTraining);
      
      // Обновляем список тренировок
      const trainingsResponse = await fetch('/api/trainings');
      if (trainingsResponse.ok) {
        const trainingsData = await trainingsResponse.json();
        setTrainings(trainingsData);
        setFilteredTrainings(trainingsData);
      }
      
      // Закрываем модальное окно и сбрасываем форму
      setShowAddTrainingDialog(false);
      resetTrainingForm();
    } catch (error) {
      console.error('Ошибка при добавлении тренировки:', error);
      // Можно добавить отображение ошибки пользователю
    }
  }
} 