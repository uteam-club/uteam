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
import { useTranslation } from 'react-i18next';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TFunction } from 'i18next';
import RolesPermissionsTable from '@/components/admin/RolesPermissionsTable';
import UserPermissionsModal from '@/components/admin/UserPermissionsModal';
import { usePermissions } from '@/context/PermissionsContext';
import { hasPermission } from '@/lib/permissions';

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
    getTitle: (t: TFunction) => t('adminPage.survey_morning_title'),
    getDescription: (t: TFunction) => t('adminPage.survey_morning_desc'),
  },
  {
    key: 'rpe',
    getTitle: (t: TFunction) => t('adminPage.survey_rpe_title'),
    getDescription: (t: TFunction) => t('adminPage.survey_rpe_desc'),
  },
];

export default function AdminPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const router = useRouter();
  const { club } = useClub();
  const permissions = usePermissions();
  
  // Состояния для работы с пользователями
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Состояния для модальных окон
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showCreationSuccess, setShowCreationSuccess] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Состояния для форм
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'MEMBER',
  });
  
  // Состояния для редактирования и удаления
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
  if (!permissions || !hasPermission(permissions, 'adminPanel.read')) {
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
      const response = await fetch('/api/training-categories', { credentials: 'include' });
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
        <TabsList className="mb-4">
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="teams">Команды</TabsTrigger>
          <TabsTrigger value="trainingCategories">Категории тренировок</TabsTrigger>
          <TabsTrigger value="exerciseCategories">Категории упражнений</TabsTrigger>
          <TabsTrigger value="exerciseTags">Теги упражнений</TabsTrigger>
          <TabsTrigger value="surveys">Опросники</TabsTrigger>
          <TabsTrigger value="roles">Роли</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-6">
          <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-vista-light">{t('adminPage.users')}</CardTitle>
              {permissions && hasPermission(permissions, 'adminPanel.update') && (
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                >
                  + Добавить пользователя
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-vista-light/80 mb-4">
                {t('adminPage.users_description')}
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
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">{t('adminPage.name')}</th>
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">{t('adminPage.email')}</th>
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">{t('adminPage.role')}</th>
                        <th className="px-4 py-3 text-right text-sm text-vista-light/70">{t('adminPage.actions')}</th>
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
                            {permissions && hasPermission(permissions, 'adminPanel.update') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                                onClick={() => handleEditClick(user)}
                              >
                                <PencilIcon className="w-4 h-4 mr-1" />
                                {t('adminPage.edit')}
                              </Button>
                            )}
                            {session?.user?.id && user.id !== session.user.id && permissions && hasPermission(permissions, 'adminPanel.update') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-vista-error/50 text-vista-error hover:bg-vista-error/10"
                                onClick={() => handleDeleteClick(user)}
                              >
                                <TrashIcon className="w-4 h-4 mr-1" />
                                {t('adminPage.delete')}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setPermissionsModalOpen(true);
                              }}
                            >
                              Индивидуальные права
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-vista-secondary/30 rounded-md text-center">
                  <p className="text-vista-light/60">{t('adminPage.no_users')}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Модальное окно для добавления пользователя */}
          {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.add_user')}</h3>
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
                      {t('adminPage.name')}
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={newUser.firstName}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_name')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.lastName')}
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={newUser.lastName}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_lastName')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.email')} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newUser.email}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_email')}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.role')}
                    </label>
                    <Select value={newUser.role} onValueChange={value => setNewUser(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary">
                        <SelectValue placeholder={t('adminPage.role')} />
                      </SelectTrigger>
                      <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                        <SelectItem value="ADMIN">{t('adminPage.role_admin')}</SelectItem>
                        <SelectItem value="COACH">{t('adminPage.role_coach')}</SelectItem>
                        <SelectItem value="SCOUT">{t('adminPage.role_scout')}</SelectItem>
                        <SelectItem value="DOCTOR">{t('adminPage.role_doctor')}</SelectItem>
                        <SelectItem value="DIRECTOR">{t('adminPage.role_director')}</SelectItem>
                        <SelectItem value="MEMBER">{t('adminPage.role_member')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleAddUser}
                      disabled={isLoading || !newUser.email}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? t('adminPage.loading') : t('adminPage.add')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.edit_user')}</h3>
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
                      {t('adminPage.email')}
                    </label>
                    <input
                      type="email"
                      value={selectedUser.email}
                      disabled
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light/50"
                    />
                    <p className="text-xs text-vista-light/50 mt-1">{t('adminPage.email_note')}</p>
                  </div>
                
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.name')}
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={editedUser.firstName}
                      onChange={handleEditInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_name')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.lastName')}
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={editedUser.lastName}
                      onChange={handleEditInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_lastName')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.role')}
                    </label>
                    <Select value={editedUser.role} onValueChange={value => setEditedUser(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary">
                        <SelectValue placeholder={t('adminPage.role')} />
                      </SelectTrigger>
                      <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                        <SelectItem value="ADMIN">{t('adminPage.role_admin')}</SelectItem>
                        <SelectItem value="COACH">{t('adminPage.role_coach')}</SelectItem>
                        <SelectItem value="SCOUT">{t('adminPage.role_scout')}</SelectItem>
                        <SelectItem value="DOCTOR">{t('adminPage.role_doctor')}</SelectItem>
                        <SelectItem value="DIRECTOR">{t('adminPage.role_director')}</SelectItem>
                        <SelectItem value="MEMBER">{t('adminPage.role_member')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleUpdateUser}
                      disabled={isLoading}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? t('adminPage.saving') : t('adminPage.save')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.delete_user')}</h3>
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
                    {t('adminPage.confirm_delete_user', { name: selectedUser.name || selectedUser.email })}
                  </p>
                  
                  <p className="text-red-500/70 text-sm">
                    {t('adminPage.irreversible_action')}
                  </p>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleDeleteUser}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading ? t('adminPage.deleting') : t('adminPage.delete')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.user_created')}</h3>
                  <button 
                    onClick={() => setShowCreationSuccess(false)}
                    className="text-vista-light/70 hover:text-vista-light"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="bg-vista-dark/30 p-4 rounded-md border border-vista-secondary/30 mb-6">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-vista-light/60">{t('adminPage.name')}:</div>
                    <div className="text-vista-light col-span-2">{createdUser.name || '-'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-vista-light/60">{t('adminPage.email')}:</div>
                    <div className="text-vista-light col-span-2">{createdUser.email}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-vista-light/60">{t('adminPage.role')}:</div>
                    <div className="text-vista-light col-span-2">
                      {USER_ROLES.find(r => r.value === createdUser.role)?.label || createdUser.role}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-vista-light/60">{t('adminPage.password')}:</div>
                    <div className="text-vista-primary font-bold col-span-2">{createdUser.password}</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-vista-light/70 text-sm mb-4">
                    {t('adminPage.data_shown_once')}
                  </p>
                  <Button
                    onClick={() => setShowCreationSuccess(false)}
                    className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                  >
                    {t('adminPage.ok')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="teams" className="mt-6">
          <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-vista-light">{t('adminPage.teams')}</CardTitle>
              <Button 
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                onClick={() => setIsAddTeamModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                {t('adminPage.add_team')}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-vista-light/80 mb-4">
                {t('adminPage.teams_description')}
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
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">{t('adminPage.name')}</th>
                        <th className="px-4 py-3 text-right text-sm text-vista-light/70">{t('adminPage.actions')}</th>
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
                              {t('adminPage.edit')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-vista-error/50 text-vista-error hover:bg-vista-error/10"
                              onClick={() => handleDeleteTeamClick(team)}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              {t('adminPage.delete')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-vista-secondary/30 rounded-md text-center">
                  <p className="text-vista-light/60">{t('adminPage.no_teams')}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Модальное окно для добавления команды */}
          {isAddTeamModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.add_team')}</h3>
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
                      {t('adminPage.team_name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newTeam.name}
                      onChange={handleTeamInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_teamName')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.team_type')}
                    </label>
                    <Select
                      value={newTeam.teamType}
                      onValueChange={value => setNewTeam(prev => ({ ...prev, teamType: value }))}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary">
                        <SelectValue placeholder={t('adminPage.team_type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academy">{t('adminPage.academy')}</SelectItem>
                        <SelectItem value="contract">{t('adminPage.contract')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.timezone')}
                    </label>
                    <TimezoneSelect
                      value={newTeam.timezone}
                      onChange={(tz: string) => setNewTeam(prev => ({ ...prev, timezone: tz }))}
                      label={t('adminPage.timezone_label')}
                      placeholder={t('adminPage.select_timezone')}
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
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleAddTeam}
                      disabled={isLoading || !newTeam.name.trim() || !newTeam.timezone}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? t('adminPage.loading') : t('adminPage.add')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.edit_team')}</h3>
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
                      {t('adminPage.team_name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editedTeam.name}
                      onChange={handleEditTeamInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_teamName')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.team_type')}
                    </label>
                    <Select
                      value={editedTeam.teamType}
                      onValueChange={value => setEditedTeam(prev => ({ ...prev, teamType: value }))}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary">
                        <SelectValue placeholder={t('adminPage.team_type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academy">{t('adminPage.academy')}</SelectItem>
                        <SelectItem value="contract">{t('adminPage.contract')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.timezone')}
                    </label>
                    <TimezoneSelect
                      value={editedTeam.timezone}
                      onChange={(tz: string) => setEditedTeam(prev => ({ ...prev, timezone: tz }))}
                      label={t('adminPage.timezone_label')}
                      placeholder={t('adminPage.select_timezone')}
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
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleUpdateTeam}
                      disabled={isLoading || !editedTeam.name.trim() || !editedTeam.timezone}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? t('adminPage.saving') : t('adminPage.save')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.delete_team')}</h3>
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
                    {t('adminPage.confirm_delete_team', { name: selectedTeam.name })}
                  </p>
                  
                  <p className="text-red-500/70 text-sm">
                    {t('adminPage.irreversible_action')}
                  </p>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteTeamModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleDeleteTeam}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading ? t('adminPage.deleting') : t('adminPage.delete')}
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
              <CardTitle className="text-vista-light">{t('adminPage.training_categories')}</CardTitle>
              <Button 
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                onClick={() => setIsAddTrainingCategoryModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                {t('adminPage.add_category')}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-vista-light/80 mb-4">
                {t('adminPage.training_categories_description')}
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
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">{t('adminPage.name')}</th>
                        <th className="px-4 py-3 text-right text-sm text-vista-light/70">{t('adminPage.actions')}</th>
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
                              {t('adminPage.edit')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleDeleteTrainingCategoryClick(category)}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              {t('adminPage.delete')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-vista-secondary/30 rounded-md text-center">
                  <p className="text-vista-light/60">{t('adminPage.no_categories')}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Модальное окно для добавления категории тренировок */}
          {isAddTrainingCategoryModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.add_category')}</h3>
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
                      {t('adminPage.category_name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newTrainingCategory.name}
                      onChange={handleTrainingCategoryInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_categoryName')}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddTrainingCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleAddTrainingCategory}
                      disabled={isLoading || !newTrainingCategory.name.trim()}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? t('adminPage.loading') : t('adminPage.add')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.edit_category')}</h3>
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
                      {t('adminPage.category_name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editedTrainingCategory.name}
                      onChange={handleEditTrainingCategoryInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_categoryName')}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditTrainingCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleUpdateTrainingCategory}
                      disabled={isLoading || !editedTrainingCategory.name.trim()}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? t('adminPage.saving') : t('adminPage.save')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.delete_category')}</h3>
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
                    {t('adminPage.confirm_delete_category', { name: selectedTrainingCategory.name })}
                  </p>
                  
                  <p className="text-red-500/70 text-sm">
                    {t('adminPage.irreversible_action')}
                  </p>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteTrainingCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleDeleteTrainingCategory}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading ? t('adminPage.deleting') : t('adminPage.delete')}
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
              <CardTitle className="text-vista-light">{t('adminPage.exercise_categories')}</CardTitle>
              <Button 
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                onClick={() => setIsAddExerciseCategoryModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                {t('adminPage.add_category')}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-vista-light/80 mb-4">
                {t('adminPage.exercise_categories_description')}
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
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">{t('adminPage.name')}</th>
                        <th className="px-4 py-3 text-right text-sm text-vista-light/70">{t('adminPage.actions')}</th>
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
                              {t('adminPage.edit')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleDeleteExerciseCategoryClick(category)}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              {t('adminPage.delete')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-vista-secondary/30 rounded-md text-center">
                  <p className="text-vista-light/60">{t('adminPage.no_categories')}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Модальное окно для добавления категории упражнений */}
          {isAddExerciseCategoryModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.add_category')}</h3>
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
                      {t('adminPage.category_name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newExerciseCategory.name}
                      onChange={handleExerciseCategoryInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_categoryName')}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddExerciseCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleAddExerciseCategory}
                      disabled={isLoading || !newExerciseCategory.name.trim()}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? t('adminPage.loading') : t('adminPage.add')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.edit_category')}</h3>
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
                      {t('adminPage.category_name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editedExerciseCategory.name}
                      onChange={handleEditExerciseCategoryInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_categoryName')}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditExerciseCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleUpdateExerciseCategory}
                      disabled={isLoading || !editedExerciseCategory.name.trim()}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? t('adminPage.saving') : t('adminPage.save')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.delete_category')}</h3>
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
                    {t('adminPage.confirm_delete_category', { name: selectedExerciseCategory.name })}
                  </p>
                  
                  <p className="text-red-500/70 text-sm">
                    {t('adminPage.irreversible_action')}
                  </p>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteExerciseCategoryModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleDeleteExerciseCategory}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading ? t('adminPage.deleting') : t('adminPage.delete')}
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
              <CardTitle className="text-vista-light">{t('adminPage.exercise_tags')}</CardTitle>
              <Button 
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                onClick={() => setIsAddExerciseTagModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                {t('adminPage.add_tag')}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-vista-light/80 mb-4">
                {t('adminPage.exercise_tags_description')}
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
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">{t('adminPage.name')}</th>
                        <th className="px-4 py-3 text-left text-sm text-vista-light/70">{t('adminPage.category')}</th>
                        <th className="px-4 py-3 text-right text-sm text-vista-light/70">{t('adminPage.actions')}</th>
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
                              {t('adminPage.edit')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleDeleteExerciseTagClick(tag)}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              {t('adminPage.delete')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-vista-secondary/30 rounded-md text-center">
                  <p className="text-vista-light/60">{t('adminPage.no_tags')}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Модальное окно для добавления тега упражнений */}
          {isAddExerciseTagModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-vista-dark p-6 rounded-lg shadow-xl w-full max-w-md border border-vista-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.add_tag')}</h3>
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
                      {t('adminPage.tag_name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newExerciseTag.name}
                      onChange={handleExerciseTagInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_tagName')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.category')}
                    </label>
                    <Select
                      value={newExerciseTag.exerciseCategoryId}
                      onValueChange={value => setNewExerciseTag(prev => ({ ...prev, exerciseCategoryId: value }))}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                        <SelectValue placeholder={t('adminPage.select_category')} />
                      </SelectTrigger>
                      <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                        {exerciseCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddExerciseTagModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleAddExerciseTag}
                      disabled={isLoading || !newExerciseTag.name.trim() || !newExerciseTag.exerciseCategoryId}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? t('adminPage.loading') : t('adminPage.add')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.edit_tag')}</h3>
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
                      {t('adminPage.tag_name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editedExerciseTag.name}
                      onChange={handleEditExerciseTagInputChange}
                      className="w-full p-2 bg-vista-dark/70 border border-vista-secondary/30 rounded text-vista-light focus:ring-1 focus:ring-vista-primary focus:border-vista-primary"
                      placeholder={t('adminPage.placeholder_tagName')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-vista-light/80 mb-1">
                      {t('adminPage.category')}
                    </label>
                    <Select
                      value={editedExerciseTag.exerciseCategoryId}
                      onValueChange={value => setEditedExerciseTag(prev => ({ ...prev, exerciseCategoryId: value }))}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                        <SelectValue placeholder={t('adminPage.select_category')} />
                      </SelectTrigger>
                      <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                        {exerciseCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditExerciseTagModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleUpdateExerciseTag}
                      disabled={isLoading || !editedExerciseTag.name.trim() || !editedExerciseTag.exerciseCategoryId}
                      className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                    >
                      {isLoading ? t('adminPage.saving') : t('adminPage.save')}
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
                  <h3 className="text-xl font-semibold text-vista-light">{t('adminPage.delete_tag')}</h3>
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
                    {t('adminPage.confirm_delete_tag', { name: selectedExerciseTag.name })}
                  </p>
                  
                  <p className="text-red-500/70 text-sm">
                    {t('adminPage.irreversible_action')}
                  </p>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteExerciseTagModalOpen(false)}
                      disabled={isLoading}
                      className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
                    >
                      {t('adminPage.cancel')}
                    </Button>
                    <Button
                      onClick={handleDeleteExerciseTag}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading ? t('adminPage.deleting') : t('adminPage.delete')}
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

        <TabsContent value="roles">
          <RolesPermissionsTable />
        </TabsContent>
      </Tabs>
      {selectedUser && (
        <UserPermissionsModal
          userId={selectedUser.id}
          userName={selectedUser.name}
          open={permissionsModalOpen}
          onClose={() => setPermissionsModalOpen(false)}
        />
      )}
    </div>
  );
} 

// В самом низу файла добавляю компонент управления опросниками клуба
function SurveyClubManagement() {
  const { t } = useTranslation();
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
      toast({ title: t('adminPage.survey_connected'), variant: 'default' });
      await fetchSurveys();
    } catch (e: any) {
      toast({ title: t('adminPage.error'), description: e.message, variant: 'destructive' });
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
      toast({ title: isActive ? t('adminPage.survey_activated') : t('adminPage.survey_deactivated'), variant: 'default' });
      await fetchSurveys();
    } catch (e: any) {
      toast({ title: t('adminPage.error'), description: e.message, variant: 'destructive' });
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
        <CardTitle className="text-vista-light">{t('adminPage.surveys')}</CardTitle>
        <div style={{ width: 140 }} />
      </CardHeader>
      <CardContent>
        <p className="text-vista-light/80 mb-4">{t('adminPage.surveys_description')}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-vista-secondary/30">
                <th className="py-3 text-left text-sm text-vista-light/70">{t('adminPage.name')}</th>
                <th className="py-3 text-left text-sm text-vista-light/70">{t('adminPage.description')}</th>
                <th className="py-3 text-left text-sm text-vista-light/70">{t('adminPage.status')}</th>
                <th className="py-3 text-left text-sm text-vista-light/70">{t('adminPage.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {SURVEY_TEMPLATES.map(tmpl => {
                const survey = surveys[tmpl.key];
                return (
                  <tr key={tmpl.key} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                    <td className="py-3 text-vista-light font-medium">{tmpl.getTitle(t)}</td>
                    <td className="py-3 text-vista-light/80">{tmpl.getDescription(t)}</td>
                    <td className="py-3">
                      {fetching ? (
                        <span className="flex items-center gap-2 text-vista-light/70"><Loader2 className="animate-spin w-4 h-4" />{t('adminPage.loading')}</span>
                      ) : survey?.exists ? (
                        <span className={survey.isActive ? 'text-green-400' : 'text-red-400'}>
                          {survey.isActive ? t('adminPage.active') : t('adminPage.inactive')}
                        </span>
                      ) : (
                        <span className="text-red-400">{t('adminPage.not_connected')}</span>
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
                          {t('adminPage.connect')}
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