'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClub } from '@/providers/club-provider';
import { Button } from '@/components/ui/button';
import { PlusIcon, XMarkIcon, CheckIcon, TrashIcon, PencilIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { TimezoneSelect } from '@/components/ui/timezone-select';
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// Определение перечня ролей (используется для выпадающего списка)
const USER_ROLES = [
  { value: 'ADMIN', label: 'Администратор' },
  { value: 'COACH', label: 'Тренер' },
  { value: 'SCOUT', label: 'Скаут' },
  { value: 'DOCTOR', label: 'Доктор' },
  { value: 'DIRECTOR', label: 'Руководитель' },
  { value: 'MEMBER', label: 'Пользователь' },
];

// Определяем типы для пользователей
interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  clubId: string;
  password?: string;
}

// Определяем типы для команд
interface Team {
  id: string;
  name: string;
  clubId: string;
  order: number;
  description?: string;
  teamType: 'academy' | 'contract'; // новое поле
  timezone?: string;
}

// Определяем типы для категорий тренировок
interface TrainingCategory {
  id: string;
  name: string;
  clubId: string;
}

// Определяем типы для категорий упражнений
interface ExerciseCategory {
  id: string;
  name: string;
  clubId: string;
}

// Определяем типы для тегов упражнений
interface ExerciseTag {
  id: string;
  name: string;
  clubId: string;
  exerciseCategoryId: string;
  exerciseCategory?: {
    name: string;
  };
}

const SURVEY_TEMPLATES = [
  {
    key: 'morning',
    title: 'Состояние утро',
    description: 'Опросник для ежедневного мониторинга состояния игроков',
  },
  {
    key: 'rpe',
    title: 'Оценка RPE',
    description: 'Опросник для оценки воспринимаемой нагрузки (RPE)',
  },
  // В будущем можно добавить другие шаблоны
];

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { club } = useClub();
  
  // Состояния для работы с пользователями
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Состояния для модальных окон
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showCreationSuccess, setShowCreationSuccess] = useState(false);
  
  // Состояния для форм
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'MEMBER',
  });
  
  // Состояния для редактирования и удаления
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editedUser, setEditedUser] = useState({
    firstName: '',
    lastName: '',
    role: '',
  });
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  
  // Состояния для работы с командами
  const [teams, setTeams] = useState<Team[]>([]);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [isDeleteTeamModalOpen, setIsDeleteTeamModalOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', teamType: 'academy', timezone: '' });
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [editedTeam, setEditedTeam] = useState({ name: '', teamType: 'academy', timezone: '' });
  
  // Состояния для работы с категориями тренировок
  const [trainingCategories, setTrainingCategories] = useState<TrainingCategory[]>([]);
  const [isAddTrainingCategoryModalOpen, setIsAddTrainingCategoryModalOpen] = useState(false);
  const [isEditTrainingCategoryModalOpen, setIsEditTrainingCategoryModalOpen] = useState(false);
  const [isDeleteTrainingCategoryModalOpen, setIsDeleteTrainingCategoryModalOpen] = useState(false);
  const [newTrainingCategory, setNewTrainingCategory] = useState({ name: '' });
  const [selectedTrainingCategory, setSelectedTrainingCategory] = useState<TrainingCategory | null>(null);
  const [editedTrainingCategory, setEditedTrainingCategory] = useState({ name: '' });
  
  // Состояния для работы с категориями упражнений
  const [exerciseCategories, setExerciseCategories] = useState<ExerciseCategory[]>([]);
  const [isAddExerciseCategoryModalOpen, setIsAddExerciseCategoryModalOpen] = useState(false);
  const [isEditExerciseCategoryModalOpen, setIsEditExerciseCategoryModalOpen] = useState(false);
  const [isDeleteExerciseCategoryModalOpen, setIsDeleteExerciseCategoryModalOpen] = useState(false);
  const [newExerciseCategory, setNewExerciseCategory] = useState({ name: '' });
  const [selectedExerciseCategory, setSelectedExerciseCategory] = useState<ExerciseCategory | null>(null);
  const [editedExerciseCategory, setEditedExerciseCategory] = useState({ name: '' });
  
  // Состояния для работы с тегами упражнений
  const [exerciseTags, setExerciseTags] = useState<ExerciseTag[]>([]);
  const [isAddExerciseTagModalOpen, setIsAddExerciseTagModalOpen] = useState(false);
  const [isEditExerciseTagModalOpen, setIsEditExerciseTagModalOpen] = useState(false);
  const [isDeleteExerciseTagModalOpen, setIsDeleteExerciseTagModalOpen] = useState(false);
  const [newExerciseTag, setNewExerciseTag] = useState({ name: '', exerciseCategoryId: '' });
  const [selectedExerciseTag, setSelectedExerciseTag] = useState<ExerciseTag | null>(null);
  const [editedExerciseTag, setEditedExerciseTag] = useState({ name: '', exerciseCategoryId: '' });
  
  // Проверяем права доступа при загрузке страницы
  useEffect(() => {
    if (
      session?.user?.role !== 'ADMIN' &&
      session?.user?.role !== 'SUPER_ADMIN' &&
      session?.user?.role !== 'COACH'
    ) {
      router.push('/dashboard');
    }
  }, [session, router]);

  // Загружаем пользователей при загрузке страницы
  useEffect(() => {
    if (session?.user) {
      fetchUsers();
      fetchTeams();
      fetchTrainingCategories();
      fetchExerciseCategories();
      fetchExerciseTags();
    }
  }, [session]);

  // Если нет сессии или роль не подходит, показываем заглушку загрузки
  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPER_ADMIN' && session.user?.role !== 'COACH')) {
    return <div className="p-8 flex justify-center"><p className="text-vista-light/50">Загрузка...</p></div>;
  }

  // Функция для получения списка пользователей
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке пользователей');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      console.error('Ошибка при загрузке пользователей:', error);
      setError('Не удалось загрузить список пользователей');
    }
  };

  // Функция для получения списка команд
  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке команд');
      }
      const data = await response.json();
      setTeams(data);
    } catch (error: any) {
      console.error('Ошибка при загрузке команд:', error);
      setError('Не удалось загрузить список команд');
    }
  };

  // Функция для получения списка категорий тренировок
  const fetchTrainingCategories = async () => {
    try {
      const response = await fetch('/api/training-categories');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке категорий тренировок');
      }
      const data = await response.json();
      setTrainingCategories(data);
    } catch (error: any) {
      console.error('Ошибка при загрузке категорий тренировок:', error);
      setError('Не удалось загрузить список категорий тренировок');
    }
  };

  // Функция для получения списка категорий упражнений
  const fetchExerciseCategories = async () => {
    try {
      const response = await fetch('/api/exercise-categories', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при загрузке категорий упражнений');
      }

      const data = await response.json();
      setExerciseCategories(data);
    } catch (error: any) {
      console.error('Ошибка при загрузке категорий упражнений:', error);
      setError('Не удалось загрузить список категорий упражнений');
    }
  };

  // Функция для получения списка тегов упражнений
  const fetchExerciseTags = async () => {
    try {
      const response = await fetch('/api/exercise-tags');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке тегов упражнений');
      }
      const data = await response.json();
      setExerciseTags(data);
    } catch (error: any) {
      console.error('Ошибка при загрузке тегов упражнений:', error);
      setError('Не удалось загрузить список тегов упражнений');
    }
  };

  // Обработчик изменения полей формы при добавлении
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };
  
  // Обработчик изменения полей формы при редактировании
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({ ...prev, [name]: value }));
  };

  // Функция для добавления нового пользователя
  const handleAddUser = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Проверка email
      if (!newUser.email || !newUser.email.includes('@')) {
        setError('Пожалуйста, укажите корректный email');
        setIsLoading(false);
        return;
      }
      
      // Отправляем запрос на создание пользователя
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании пользователя');
      }
      
      // Обновляем список пользователей
      await fetchUsers();
      
      // Сохраняем данные созданного пользователя для отображения
      setCreatedUser(data);
      
      // Закрываем модальное окно добавления
      setIsAddModalOpen(false);
      
      // Показываем окно с данными созданного пользователя
      setShowCreationSuccess(true);
      
      // Сбрасываем форму
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        role: 'MEMBER',
      });
    } catch (error: any) {
      console.error('Ошибка при создании пользователя:', error);
      setError(error.message || 'Не удалось создать пользователя');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для открытия модального окна редактирования
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    
    // Разделяем имя пользователя на имя и фамилию (при наличии)
    let firstName = '';
    let lastName = '';
    
    if (user.name) {
      const nameParts = user.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    setEditedUser({
      firstName,
      lastName,
      role: user.role,
    });
    
    setIsEditModalOpen(true);
  };
  
  // Функция для обновления пользователя
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedUser),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при обновлении пользователя');
      }
      
      // Обновляем список пользователей
      await fetchUsers();
      
      // Закрываем модальное окно редактирования
      setIsEditModalOpen(false);
      
      // Сбрасываем выбранного пользователя
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Ошибка при обновлении пользователя:', error);
      setError(error.message || 'Не удалось обновить пользователя');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для открытия модального окна удаления
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };
  
  // Функция для удаления пользователя
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при удалении пользователя');
      }
      
      // Обновляем список пользователей
      await fetchUsers();
      
      // Закрываем модальное окно удаления
      setIsDeleteModalOpen(false);
      
      // Сбрасываем выбранного пользователя
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Ошибка при удалении пользователя:', error);
      setError(error.message || 'Не удалось удалить пользователя');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик изменения полей формы при добавлении команды
  const handleTeamInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTeam(prev => ({ ...prev, [name]: value }));
  };
  
  // Обработчик изменения полей формы при редактировании команды
  const handleEditTeamInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedTeam(prev => ({ ...prev, [name]: value }));
  };
  
  // Функция для добавления новой команды
  const handleAddTeam = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (!newTeam.name.trim()) {
        setError('Введите название команды');
        setIsLoading(false);
        return;
      }
      if (!newTeam.timezone) {
        setError('Выберите часовой пояс');
        setIsLoading(false);
        return;
      }
      
      // Отправляем запрос на создание команды
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTeam),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании команды');
      }
      
      // Обновляем список команд
      await fetchTeams();
      
      // Закрываем модальное окно добавления
      setIsAddTeamModalOpen(false);
      
      // Сбрасываем форму
      setNewTeam({ name: '', teamType: 'academy', timezone: '' });
    } catch (error: any) {
      console.error('Ошибка при создании команды:', error);
      setError(error.message || 'Не удалось создать команду');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для открытия модального окна редактирования команды
  const handleEditTeamClick = (team: Team) => {
    setSelectedTeam(team);
    setEditedTeam({ name: team.name, teamType: team.teamType, timezone: team.timezone || '' });
    setIsEditTeamModalOpen(true);
  };
  
  // Функция для обновления команды
  const handleUpdateTeam = async () => {
    if (!selectedTeam) return;
    setIsLoading(true);
    setError('');
    try {
      if (!editedTeam.name.trim()) {
        setError('Введите название команды');
        setIsLoading(false);
        return;
      }
      if (!editedTeam.timezone) {
        setError('Выберите часовой пояс');
        setIsLoading(false);
        return;
      }
      const response = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: 'PATCH', // исправлено с PUT на PATCH
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedTeam),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при обновлении команды');
      }
      await fetchTeams();
      setIsEditTeamModalOpen(false);
      setSelectedTeam(null);
    } catch (error: any) {
      setError(error.message || 'Не удалось обновить команду');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для открытия модального окна удаления команды
  const handleDeleteTeamClick = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteTeamModalOpen(true);
  };
  
  // Функция для удаления команды
  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при удалении команды');
      }
      
      // Обновляем список команд
      await fetchTeams();
      
      // Закрываем модальное окно удаления
      setIsDeleteTeamModalOpen(false);
      
      // Сбрасываем выбранную команду
      setSelectedTeam(null);
    } catch (error: any) {
      console.error('Ошибка при удалении команды:', error);
      setError(error.message || 'Не удалось удалить команду');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик изменения полей формы при добавлении категории тренировок
  const handleTrainingCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTrainingCategory(prev => ({ ...prev, [name]: value }));
  };
  
  // Обработчик изменения полей формы при редактировании категории тренировок
  const handleEditTrainingCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedTrainingCategory(prev => ({ ...prev, [name]: value }));
  };
  
  // Функция для добавления новой категории тренировок
  const handleAddTrainingCategory = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Проверка названия
      if (!newTrainingCategory.name.trim()) {
        setError('Введите название категории');
        setIsLoading(false);
        return;
      }
      
      // Отправляем запрос на создание категории
      const response = await fetch('/api/training-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTrainingCategory),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании категории тренировок');
      }
      
      // Обновляем список категорий
      await fetchTrainingCategories();
      
      // Закрываем модальное окно добавления
      setIsAddTrainingCategoryModalOpen(false);
      
      // Сбрасываем форму
      setNewTrainingCategory({ name: '' });
    } catch (error: any) {
      console.error('Ошибка при создании категории тренировок:', error);
      setError(error.message || 'Не удалось создать категорию тренировок');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для открытия модального окна редактирования категории тренировок
  const handleEditTrainingCategoryClick = (category: TrainingCategory) => {
    setSelectedTrainingCategory(category);
    setEditedTrainingCategory({ name: category.name });
    setIsEditTrainingCategoryModalOpen(true);
  };
  
  // Функция для обновления категории тренировок
  const handleUpdateTrainingCategory = async () => {
    if (!selectedTrainingCategory) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Проверка названия
      if (!editedTrainingCategory.name.trim()) {
        setError('Введите название категории');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`/api/training-categories/${selectedTrainingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedTrainingCategory),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при обновлении категории тренировок');
      }
      
      // Обновляем список категорий
      await fetchTrainingCategories();
      
      // Закрываем модальное окно редактирования
      setIsEditTrainingCategoryModalOpen(false);
      
      // Сбрасываем выбранную категорию
      setSelectedTrainingCategory(null);
    } catch (error: any) {
      console.error('Ошибка при обновлении категории тренировок:', error);
      setError(error.message || 'Не удалось обновить категорию тренировок');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для открытия модального окна удаления категории тренировок
  const handleDeleteTrainingCategoryClick = (category: TrainingCategory) => {
    setSelectedTrainingCategory(category);
    setIsDeleteTrainingCategoryModalOpen(true);
  };
  
  // Функция для удаления категории тренировок
  const handleDeleteTrainingCategory = async () => {
    if (!selectedTrainingCategory) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/training-categories/${selectedTrainingCategory.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при удалении категории тренировок');
      }
      
      // Обновляем список категорий
      await fetchTrainingCategories();
      
      // Закрываем модальное окно удаления
      setIsDeleteTrainingCategoryModalOpen(false);
      
      // Сбрасываем выбранную категорию
      setSelectedTrainingCategory(null);
    } catch (error: any) {
      console.error('Ошибка при удалении категории тренировок:', error);
      setError(error.message || 'Не удалось удалить категорию тренировок');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик изменения полей формы при добавлении категории упражнений
  const handleExerciseCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewExerciseCategory(prev => ({ ...prev, [name]: value }));
  };
  
  // Обработчик изменения полей формы при редактировании категории упражнений
  const handleEditExerciseCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedExerciseCategory(prev => ({ ...prev, [name]: value }));
  };
  
  // Функция для добавления новой категории упражнений
  const handleAddExerciseCategory = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Проверка названия
      if (!newExerciseCategory.name.trim()) {
        setError('Введите название категории');
        setIsLoading(false);
        return;
      }
      
      // Отправляем запрос на создание категории
      const response = await fetch('/api/exercise-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExerciseCategory),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании категории упражнений');
      }
      
      // Обновляем список категорий
      await fetchExerciseCategories();
      
      // Закрываем модальное окно добавления
      setIsAddExerciseCategoryModalOpen(false);
      
      // Сбрасываем форму
      setNewExerciseCategory({ name: '' });
    } catch (error: any) {
      console.error('Ошибка при создании категории упражнений:', error);
      setError(error.message || 'Не удалось создать категорию упражнений');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для открытия модального окна редактирования категории упражнений
  const handleEditExerciseCategoryClick = (category: ExerciseCategory) => {
    setSelectedExerciseCategory(category);
    setEditedExerciseCategory({ name: category.name });
    setIsEditExerciseCategoryModalOpen(true);
  };
  
  // Функция для обновления категории упражнений
  const handleUpdateExerciseCategory = async () => {
    if (!selectedExerciseCategory) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Проверка названия
      if (!editedExerciseCategory.name.trim()) {
        setError('Введите название категории');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`/api/exercise-categories/${selectedExerciseCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedExerciseCategory),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при обновлении категории упражнений');
      }
      
      // Обновляем список категорий
      await fetchExerciseCategories();
      
      // Закрываем модальное окно редактирования
      setIsEditExerciseCategoryModalOpen(false);
      
      // Сбрасываем выбранную категорию
      setSelectedExerciseCategory(null);
    } catch (error: any) {
      console.error('Ошибка при обновлении категории упражнений:', error);
      setError(error.message || 'Не удалось обновить категорию упражнений');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для открытия модального окна удаления категории упражнений
  const handleDeleteExerciseCategoryClick = (category: ExerciseCategory) => {
    setSelectedExerciseCategory(category);
    setIsDeleteExerciseCategoryModalOpen(true);
  };
  
  // Функция для удаления категории упражнений
  const handleDeleteExerciseCategory = async () => {
    if (!selectedExerciseCategory) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/exercise-categories/${selectedExerciseCategory.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при удалении категории упражнений');
      }
      
      // Обновляем список категорий
      await fetchExerciseCategories();
      
      // Закрываем модальное окно удаления
      setIsDeleteExerciseCategoryModalOpen(false);
      
      // Сбрасываем выбранную категорию
      setSelectedExerciseCategory(null);
    } catch (error: any) {
      console.error('Ошибка при удалении категории упражнений:', error);
      setError(error.message || 'Не удалось удалить категорию упражнений');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик изменения полей формы при добавлении тега упражнений
  const handleExerciseTagInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewExerciseTag(prev => ({ ...prev, [name]: value }));
  };

  // Обработчик изменения полей формы при редактировании тега упражнений
  const handleEditExerciseTagInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedExerciseTag(prev => ({ ...prev, [name]: value }));
  };

  // Функция для добавления нового тега упражнений
  const handleAddExerciseTag = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Проверка названия и категории
      if (!newExerciseTag.name.trim()) {
        setError('Введите название тега');
        setIsLoading(false);
        return;
      }
      
      if (!newExerciseTag.exerciseCategoryId) {
        setError('Выберите категорию');
        setIsLoading(false);
        return;
      }
      
      // Отправляем запрос на создание тега
      const response = await fetch('/api/exercise-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExerciseTag),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании тега упражнений');
      }
      
      // Обновляем список тегов
      await fetchExerciseTags();
      
      // Закрываем модальное окно добавления
      setIsAddExerciseTagModalOpen(false);
      
      // Сбрасываем форму
      setNewExerciseTag({ name: '', exerciseCategoryId: '' });
    } catch (error: any) {
      console.error('Ошибка при создании тега упражнений:', error);
      setError(error.message || 'Не удалось создать тег упражнений');
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для открытия модального окна редактирования тега упражнений
  const handleEditExerciseTagClick = (tag: ExerciseTag) => {
    setSelectedExerciseTag(tag);
    setEditedExerciseTag({ 
      name: tag.name, 
      exerciseCategoryId: tag.exerciseCategoryId 
    });
    setIsEditExerciseTagModalOpen(true);
  };

  // Функция для обновления тега упражнений
  const handleUpdateExerciseTag = async () => {
    if (!selectedExerciseTag) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Проверка названия и категории
      if (!editedExerciseTag.name.trim()) {
        setError('Введите название тега');
        setIsLoading(false);
        return;
      }
      
      if (!editedExerciseTag.exerciseCategoryId) {
        setError('Выберите категорию');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`/api/exercise-tags/${selectedExerciseTag.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedExerciseTag),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при обновлении тега упражнений');
      }
      
      // Обновляем список тегов
      await fetchExerciseTags();
      
      // Закрываем модальное окно редактирования
      setIsEditExerciseTagModalOpen(false);
      
      // Сбрасываем выбранный тег
      setSelectedExerciseTag(null);
    } catch (error: any) {
      console.error('Ошибка при обновлении тега упражнений:', error);
      setError(error.message || 'Не удалось обновить тег упражнений');
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для открытия модального окна удаления тега упражнений
  const handleDeleteExerciseTagClick = (tag: ExerciseTag) => {
    setSelectedExerciseTag(tag);
    setIsDeleteExerciseTagModalOpen(true);
  };

  // Функция для удаления тега упражнений
  const handleDeleteExerciseTag = async () => {
    if (!selectedExerciseTag) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/exercise-tags/${selectedExerciseTag.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при удалении тега упражнений');
      }
      
      // Обновляем список тегов
      await fetchExerciseTags();
      
      // Закрываем модальное окно удаления
      setIsDeleteExerciseTagModalOpen(false);
      
      // Сбрасываем выбранный тег
      setSelectedExerciseTag(null);
    } catch (error: any) {
      console.error('Ошибка при удалении тега упражнений:', error);
      setError(error.message || 'Не удалось удалить тег упражнений');
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для обновления порядка команд
  const handleMoveTeam = async (team: Team, direction: 'up' | 'down') => {
    setIsLoading(true);
    setError('');
    
    try {
      const teamIndex = teams.findIndex(t => t.id === team.id);
      
      // Если пытаемся переместить первую команду вверх или последнюю вниз, ничего не делаем
      if ((direction === 'up' && teamIndex === 0) || 
          (direction === 'down' && teamIndex === teams.length - 1)) {
        setIsLoading(false);
        return;
      }
      
      // Находим соседнюю команду
      const adjacentIndex = direction === 'up' ? teamIndex - 1 : teamIndex + 1;
      const adjacentTeam = teams[adjacentIndex];
      
      // Меняем порядок команд
      const updatedTeam = { ...team, order: adjacentTeam.order };
      const updatedAdjacentTeam = { ...adjacentTeam, order: team.order };
      
      // Отправляем запрос на обновление порядка первой команды
      const teamResponse = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: updatedTeam.order }),
      });
      
      if (!teamResponse.ok) {
        throw new Error('Ошибка при обновлении порядка команды');
      }
      
      // Отправляем запрос на обновление порядка второй команды
      const adjacentTeamResponse = await fetch(`/api/teams/${adjacentTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: updatedAdjacentTeam.order }),
      });
      
      if (!adjacentTeamResponse.ok) {
        throw new Error('Ошибка при обновлении порядка команды');
      }
      
      // Обновляем список команд
      await fetchTeams();
    } catch (error: any) {
      console.error('Ошибка при изменении порядка команд:', error);
      setError(error.message || 'Не удалось изменить порядок команд');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-vista-dark/30 border border-vista-secondary/30">
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="teams">Команды</TabsTrigger>
          <TabsTrigger value="training-categories">Категории тренировок</TabsTrigger>
          <TabsTrigger value="exercise-categories">Категории упражнений</TabsTrigger>
          <TabsTrigger value="exercise-tags">Теги упражнений</TabsTrigger>
          <TabsTrigger value="surveys">Опросники</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-6">
          <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-vista-light">Управление пользователями</CardTitle>
              <Button 
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                onClick={() => setIsAddModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Добавить пользователя
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-vista-light/80 mb-4">
                Здесь вы можете управлять пользователями клуба {club?.name || ''}.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
                  {error}
                </div>
              )}
              
              {users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-vista-secondary/30">
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">Имя</th>
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">Email</th>
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">Роль</th>
                        <th className="px-4 py-3 text-right text-sm text-vista-light/70">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                          <td className="px-4 py-3 text-vista-light">{user.name || '-'}</td>
                          <td className="px-4 py-3 text-vista-light">{user.email}</td>
                          <td className="px-4 py-3 text-vista-light">
                            {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                              onClick={() => handleEditClick(user)}
                            >
                              <PencilIcon className="w-4 h-4 mr-1" />
                              Редактировать
                            </Button>
                            
                            {/* Не показываем кнопку удаления для своего аккаунта */}
                            {user.id !== session.user.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                onClick={() => handleDeleteClick(user)}
                              >
                                <TrashIcon className="w-4 h-4 mr-1" />
                                Удалить
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-vista-secondary/30 rounded-md text-center">
                  <p className="text-vista-light/60">Нет пользователей. Добавьте первого пользователя.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Модальное окно для добавления пользователя */}
          {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Добавить пользователя</h3>
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Имя
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={newUser.firstName}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Имя пользователя"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Фамилия
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={newUser.lastName}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Фамилия пользователя"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newUser.email}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Роль
                    </label>
                    <select
                      name="role"
                      value={newUser.role}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                    >
                      {USER_ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleAddUser}
                      disabled={isLoading || !newUser.email}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? 'Создание...' : 'Добавить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно для редактирования пользователя */}
          {isEditModalOpen && selectedUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Редактировать пользователя</h3>
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={selectedUser.email}
                      disabled
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light/50"
                    />
                    <p className="text-xs text-vista-light/50 mt-1">Email нельзя изменить</p>
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Имя
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={editedUser.firstName}
                      onChange={handleEditInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Имя пользователя"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Фамилия
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={editedUser.lastName}
                      onChange={handleEditInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Фамилия пользователя"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Роль
                    </label>
                    <select
                      name="role"
                      value={editedUser.role}
                      onChange={handleEditInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                    >
                      {USER_ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleUpdateUser}
                      disabled={isLoading}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно для удаления пользователя */}
          {isDeleteModalOpen && selectedUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Удаление пользователя</h3>
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <p className="text-vista-light">
                    Вы уверены, что хотите удалить пользователя <span className="font-semibold">{selectedUser.name || selectedUser.email}</span>?
                  </p>
                  
                  <p className="text-red-500/70 text-sm">
                    Это действие нельзя отменить. Все данные пользователя будут безвозвратно удалены.
                  </p>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleDeleteUser}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading ? 'Удаление...' : 'Удалить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно с данными созданного пользователя */}
          {showCreationSuccess && createdUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl max-w-md w-full border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Пользователь создан успешно</h3>
                  <button 
                    onClick={() => setShowCreationSuccess(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="bg-vista-dark/30 p-4 rounded-md border border-vista-secondary/30 mb-6">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-vista-light/60">Имя:</div>
                    <div className="text-vista-light col-span-2">{createdUser.name || '-'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-vista-light/60">Email:</div>
                    <div className="text-vista-light col-span-2">{createdUser.email}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-vista-light/60">Роль:</div>
                    <div className="text-vista-light col-span-2">
                      {USER_ROLES.find(r => r.value === createdUser.role)?.label || createdUser.role}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-vista-light/60">Пароль:</div>
                    <div className="text-vista-primary font-bold col-span-2">{createdUser.password}</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-vista-light/70 text-sm mb-4">
                    Эти данные будут показаны только один раз. Сохраните их в надежном месте.
                  </p>
                  <Button
                    onClick={() => setShowCreationSuccess(false)}
                    className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                  >
                    Понятно
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="teams" className="mt-6">
          <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-vista-light">Управление командами</CardTitle>
              <Button 
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                onClick={() => setIsAddTeamModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Добавить команду
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-vista-light/80 mb-4">
                Управление командами клуба {club?.name || ''}.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
                  {error}
                </div>
              )}
              
              {teams.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-vista-secondary/30">
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">Название</th>
                        <th className="px-4 py-3 text-right text-sm text-vista-light/70">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team) => (
                        <tr key={team.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                          <td className="px-4 py-3 text-vista-light">{team.name}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                              onClick={() => handleMoveTeam(team, 'up')}
                              disabled={teams.indexOf(team) === 0}
                            >
                              <ArrowUpIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                              onClick={() => handleMoveTeam(team, 'down')}
                              disabled={teams.indexOf(team) === teams.length - 1}
                            >
                              <ArrowDownIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                              onClick={() => handleEditTeamClick(team)}
                            >
                              <PencilIcon className="w-4 h-4 mr-1" />
                              Редактировать
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleDeleteTeamClick(team)}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Удалить
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-vista-secondary/30 rounded-md text-center">
                  <p className="text-vista-light/60">Нет команд. Добавьте первую команду.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Модальное окно для добавления команды */}
          {isAddTeamModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Добавить команду</h3>
                  <button 
                    onClick={() => setIsAddTeamModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Название команды
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newTeam.name}
                      onChange={handleTeamInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Название команды"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Тип команды
                    </label>
                    <select
                      name="teamType"
                      value={newTeam.teamType}
                      onChange={handleTeamInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                    >
                      <option value="academy">Академия</option>
                      <option value="contract">Контракт</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">Часовой пояс</label>
                    <TimezoneSelect
                      value={newTeam.timezone}
                      onChange={(tz: string) => setNewTeam(prev => ({ ...prev, timezone: tz }))}
                      label="Часовой пояс команды"
                      placeholder="Выберите часовой пояс"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddTeamModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleAddTeam}
                      disabled={isLoading || !newTeam.name.trim() || !newTeam.timezone}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? 'Создание...' : 'Добавить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно для редактирования команды */}
          {isEditTeamModalOpen && selectedTeam && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Редактировать команду</h3>
                  <button 
                    onClick={() => setIsEditTeamModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Название команды
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editedTeam.name}
                      onChange={handleEditTeamInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Название команды"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Тип команды
                    </label>
                    <select
                      name="teamType"
                      value={editedTeam.teamType}
                      onChange={handleEditTeamInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                    >
                      <option value="academy">Академия</option>
                      <option value="contract">Контракт</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">Часовой пояс</label>
                    <TimezoneSelect
                      value={editedTeam.timezone}
                      onChange={(tz: string) => setEditedTeam(prev => ({ ...prev, timezone: tz }))}
                      label="Часовой пояс команды"
                      placeholder="Выберите часовой пояс"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditTeamModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleUpdateTeam}
                      disabled={isLoading || !editedTeam.name.trim() || !editedTeam.timezone}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно для удаления команды */}
          {isDeleteTeamModalOpen && selectedTeam && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Удаление команды</h3>
                  <button 
                    onClick={() => setIsDeleteTeamModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <p className="text-vista-light">
                    Вы уверены, что хотите удалить команду <span className="font-semibold">{selectedTeam.name}</span>?
                  </p>
                  
                  <p className="text-red-500/70 text-sm">
                    Это действие нельзя отменить. Все данные команды будут безвозвратно удалены.
                  </p>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteTeamModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleDeleteTeam}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading ? 'Удаление...' : 'Удалить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="training-categories" className="mt-6">
          <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-vista-light">Категории тренировок</CardTitle>
              <Button 
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                onClick={() => setIsAddTrainingCategoryModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Добавить категорию
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-vista-light/80 mb-4">
                Управление категориями тренировок для клуба {club?.name || ''}.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
                  {error}
                </div>
              )}
              
              {trainingCategories.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-vista-secondary/30">
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">Название</th>
                        <th className="px-4 py-3 text-right text-sm text-vista-light/70">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainingCategories.map((category) => (
                        <tr key={category.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                          <td className="px-4 py-3 text-vista-light">{category.name}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                              onClick={() => handleEditTrainingCategoryClick(category)}
                            >
                              <PencilIcon className="w-4 h-4 mr-1" />
                              Редактировать
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleDeleteTrainingCategoryClick(category)}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Удалить
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-vista-secondary/30 rounded-md text-center">
                  <p className="text-vista-light/60">Нет категорий тренировок. Добавьте первую категорию.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Модальное окно для добавления категории тренировок */}
          {isAddTrainingCategoryModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Добавить категорию тренировок</h3>
                  <button 
                    onClick={() => setIsAddTrainingCategoryModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Название категории
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newTrainingCategory.name}
                      onChange={handleTrainingCategoryInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Название категории"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddTrainingCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleAddTrainingCategory}
                      disabled={isLoading || !newTrainingCategory.name.trim()}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? 'Создание...' : 'Добавить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно для редактирования категории тренировок */}
          {isEditTrainingCategoryModalOpen && selectedTrainingCategory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Редактировать категорию тренировок</h3>
                  <button 
                    onClick={() => setIsEditTrainingCategoryModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Название категории
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editedTrainingCategory.name}
                      onChange={handleEditTrainingCategoryInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Название категории"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditTrainingCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleUpdateTrainingCategory}
                      disabled={isLoading || !editedTrainingCategory.name.trim()}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно для удаления категории тренировок */}
          {isDeleteTrainingCategoryModalOpen && selectedTrainingCategory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Удаление категории тренировок</h3>
                  <button 
                    onClick={() => setIsDeleteTrainingCategoryModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <p className="text-vista-light">
                    Вы уверены, что хотите удалить категорию <span className="font-semibold">{selectedTrainingCategory.name}</span>?
                  </p>
                  
                  <p className="text-red-500/70 text-sm">
                    Это действие нельзя отменить. Все данные категории будут безвозвратно удалены.
                  </p>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteTrainingCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleDeleteTrainingCategory}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading ? 'Удаление...' : 'Удалить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="exercise-categories" className="mt-6">
          <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-vista-light">Категории упражнений</CardTitle>
              <Button 
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                onClick={() => setIsAddExerciseCategoryModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Добавить категорию
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-vista-light/80 mb-4">
                Управление категориями упражнений для клуба {club?.name || ''}.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
                  {error}
                </div>
              )}
              
              {exerciseCategories.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-vista-secondary/30">
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">Название</th>
                        <th className="px-4 py-3 text-right text-sm text-vista-light/70">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exerciseCategories.map((category) => (
                        <tr key={category.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                          <td className="px-4 py-3 text-vista-light">{category.name}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                              onClick={() => handleEditExerciseCategoryClick(category)}
                            >
                              <PencilIcon className="w-4 h-4 mr-1" />
                              Редактировать
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleDeleteExerciseCategoryClick(category)}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Удалить
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-vista-secondary/30 rounded-md text-center">
                  <p className="text-vista-light/60">Нет категорий упражнений. Добавьте первую категорию.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Модальное окно для добавления категории упражнений */}
          {isAddExerciseCategoryModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Добавить категорию упражнений</h3>
                  <button 
                    onClick={() => setIsAddExerciseCategoryModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Название категории
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newExerciseCategory.name}
                      onChange={handleExerciseCategoryInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Название категории"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddExerciseCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleAddExerciseCategory}
                      disabled={isLoading || !newExerciseCategory.name.trim()}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? 'Создание...' : 'Добавить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно для редактирования категории упражнений */}
          {isEditExerciseCategoryModalOpen && selectedExerciseCategory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Редактировать категорию упражнений</h3>
                  <button 
                    onClick={() => setIsEditExerciseCategoryModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Название категории
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editedExerciseCategory.name}
                      onChange={handleEditExerciseCategoryInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Название категории"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditExerciseCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleUpdateExerciseCategory}
                      disabled={isLoading || !editedExerciseCategory.name.trim()}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно для удаления категории упражнений */}
          {isDeleteExerciseCategoryModalOpen && selectedExerciseCategory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Удаление категории упражнений</h3>
                  <button 
                    onClick={() => setIsDeleteExerciseCategoryModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <p className="text-vista-light">
                    Вы уверены, что хотите удалить категорию <span className="font-semibold">{selectedExerciseCategory.name}</span>?
                  </p>
                  
                  <p className="text-red-500/70 text-sm">
                    Это действие нельзя отменить. Все данные категории будут безвозвратно удалены.
                  </p>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteExerciseCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleDeleteExerciseCategory}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading ? 'Удаление...' : 'Удалить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="exercise-tags" className="mt-6">
          <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-vista-light">Теги упражнений</CardTitle>
              <Button 
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                onClick={() => setIsAddExerciseTagModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Добавить тег
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-vista-light/80 mb-4">
                Управление тегами упражнений для клуба {club?.name || ''}.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
                  {error}
                </div>
              )}
              
              {exerciseTags.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-vista-secondary/30">
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">Название</th>
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">Категория</th>
                        <th className="px-4 py-3 text-right text-sm text-vista-light/70">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exerciseTags.map((tag) => (
                        <tr key={tag.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                          <td className="px-4 py-3 text-vista-light">{tag.name}</td>
                          <td className="px-4 py-3 text-vista-light">{tag.exerciseCategory?.name || '-'}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                              onClick={() => handleEditExerciseTagClick(tag)}
                            >
                              <PencilIcon className="w-4 h-4 mr-1" />
                              Редактировать
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleDeleteExerciseTagClick(tag)}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Удалить
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-vista-secondary/30 rounded-md text-center">
                  <p className="text-vista-light/60">Нет тегов упражнений. Добавьте первый тег.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Модальное окно для добавления тега упражнений */}
          {isAddExerciseTagModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Добавить тег упражнений</h3>
                  <button 
                    onClick={() => setIsAddExerciseTagModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Название тега
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newExerciseTag.name}
                      onChange={handleExerciseTagInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Название тега"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Категория
                    </label>
                    <select
                      name="exerciseCategoryId"
                      value={newExerciseTag.exerciseCategoryId}
                      onChange={handleExerciseTagInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                    >
                      <option value="">Выберите категорию</option>
                      {exerciseCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddExerciseTagModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleAddExerciseTag}
                      disabled={isLoading || !newExerciseTag.name.trim() || !newExerciseTag.exerciseCategoryId}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? 'Создание...' : 'Добавить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно для редактирования тега упражнений */}
          {isEditExerciseTagModalOpen && selectedExerciseTag && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Редактировать тег упражнений</h3>
                  <button 
                    onClick={() => setIsEditExerciseTagModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Название тега
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editedExerciseTag.name}
                      onChange={handleEditExerciseTagInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder="Название тега"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      Категория
                    </label>
                    <select
                      name="exerciseCategoryId"
                      value={editedExerciseTag.exerciseCategoryId}
                      onChange={handleEditExerciseTagInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                    >
                      <option value="">Выберите категорию</option>
                      {exerciseCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditExerciseTagModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleUpdateExerciseTag}
                      disabled={isLoading || !editedExerciseTag.name.trim() || !editedExerciseTag.exerciseCategoryId}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Модальное окно для удаления тега упражнений */}
          {isDeleteExerciseTagModalOpen && selectedExerciseTag && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">Удаление тега упражнений</h3>
                  <button 
                    onClick={() => setIsDeleteExerciseTagModalOpen(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  <p className="text-vista-light">
                    Вы уверены, что хотите удалить тег <span className="font-semibold">{selectedExerciseTag.name}</span>?
                  </p>
                  
                  <p className="text-red-500/70 text-sm">
                    Это действие нельзя отменить. Все данные тега будут безвозвратно удалены.
                  </p>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteExerciseTagModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      Отмена
                    </Button>
                    <Button
                      onClick={handleDeleteExerciseTag}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading ? 'Удаление...' : 'Удалить'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="surveys" className="mt-6">
          {/* Управление подключением опросников для клуба */}
          <SurveyClubManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
} 

// В самом низу файла добавляю компонент управления опросниками клуба
function SurveyClubManagement() {
  const { club } = useClub();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [surveys, setSurveys] = useState<Record<string, any>>({});

  // Получить все survey для клуба
  const fetchSurveys = async () => {
    if (!club?.id) return;
    setFetching(true);
    try {
      const result: Record<string, any> = {};
      for (const tmpl of SURVEY_TEMPLATES) {
        const res = await fetch(`/api/survey/active-id?tenantId=${club.id}&type=${tmpl.key}`);
        if (res.ok) {
          const data = await res.json();
          result[tmpl.key] = { exists: true, ...data };
        } else {
          result[tmpl.key] = { exists: false };
        }
      }
      setSurveys(result);
    } finally {
      setFetching(false);
    }
  };

  // Подключить (создать) survey
  const handleCreateSurvey = async (type: string) => {
    if (!club?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/survey/active-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: club.id, type }),
      });
      if (!res.ok) throw new Error('Ошибка при создании опросника');
      toast({ title: 'Опросник подключён', variant: 'default' });
      await fetchSurveys();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Активировать/деактивировать survey
  const handleToggleActive = async (type: string, isActive: boolean) => {
    if (!club?.id) return;
    setToggleLoading(true);
    try {
      const res = await fetch('/api/survey/active-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: club.id, isActive, type }),
      });
      if (!res.ok) throw new Error('Ошибка при обновлении статуса');
      toast({ title: isActive ? 'Опросник активирован' : 'Опросник деактивирован', variant: 'default' });
      await fetchSurveys();
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setToggleLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSurveys();
    // eslint-disable-next-line
  }, [club?.id]);

  return (
    <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-vista-light">Опросники клуба</CardTitle>
        <div style={{ width: 140 }} />
      </CardHeader>
      <CardContent>
        <p className="text-vista-light/80 mb-4">Управление опросниками для клуба {club?.name || ''}.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-vista-secondary/30">
                <th className="py-3 text-left text-sm text-vista-light/70">Название</th>
                <th className="py-3 text-left text-sm text-vista-light/70">Описание</th>
                <th className="py-3 text-left text-sm text-vista-light/70">Статус</th>
                <th className="py-3 text-left text-sm text-vista-light/70">Действия</th>
              </tr>
            </thead>
            <tbody>
              {SURVEY_TEMPLATES.map(tmpl => {
                const survey = surveys[tmpl.key];
                return (
                  <tr key={tmpl.key} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                    <td className="py-3 text-vista-light font-medium">{tmpl.title}</td>
                    <td className="py-3 text-vista-light/80">{tmpl.description}</td>
                    <td className="py-3">
                      {fetching ? (
                        <span className="flex items-center gap-2 text-vista-light/70"><Loader2 className="animate-spin w-4 h-4" />Загрузка...</span>
                      ) : survey?.exists ? (
                        <span className={survey.isActive ? 'text-green-400' : 'text-red-400'}>
                          {survey.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      ) : (
                        <span className="text-red-400">Не подключён</span>
                      )}
                    </td>
                    <td className="py-3">
                      {survey?.exists ? (
                        <Switch
                          checked={!!survey.isActive}
                          disabled={toggleLoading}
                          onCheckedChange={val => handleToggleActive(tmpl.key, val)}
                        />
                      ) : !fetching ? (
                        <Button onClick={() => handleCreateSurvey(tmpl.key)} disabled={loading} size="sm">
                          {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                          Подключить
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
} 