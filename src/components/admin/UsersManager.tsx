'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
};

// Доступные роли пользователей
const USER_ROLES = [
  { id: 'MANAGER', name: 'Тренер' },
  { id: 'DOCTOR', name: 'Доктор' },
  { id: 'MANAGER', name: 'Руководитель' },
  { id: 'PRESS', name: 'Пресс-атташе' },
  { id: 'ADMIN', name: 'Администратор' }
];

export function UsersManager() {
  const t = useTranslations('admin');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUserToDelete, setCurrentUserToDelete] = useState<string | null>(null);
  // Новые состояния для диалога с учетными данными
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    // Загрузка данных с сервера через API
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/users');
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки пользователей: ' + response.statusText);
        }
        
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Имя и фамилия обязательны');
      return;
    }

    if (!role) {
      setErrorMessage('Необходимо выбрать роль пользователя');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          role: role
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания пользователя');
      }
      
      const responseData = await response.json();
      const newUser = responseData.user;
      const temporaryPassword = responseData.temporaryPassword;
      
      // Сохраняем пользователя в список
      setUsers(prev => [...prev, newUser]);
      
      // Сохраняем учетные данные и показываем диалог
      setNewUserCredentials({
        name: newUser.name,
        email: newUser.email,
        password: temporaryPassword
      });
      setShowCredentialsDialog(true);
      
      // Очищаем форму
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('');
      setIsDialogOpen(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Ошибка добавления пользователя:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Ошибка при добавлении пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser || !firstName.trim() || !lastName.trim()) {
      setErrorMessage('Имя и фамилия обязательны');
      return;
    }

    if (!role) {
      setErrorMessage('Необходимо выбрать роль пользователя');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingUser.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          role: role
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка обновления пользователя');
      }
      
      const updatedUser = await response.json();
      
      setUsers(prev => 
        prev.map(user => 
          user.id === editingUser.id ? updatedUser : user
        )
      );
      
      setFirstName('');
      setLastName('');
      setEmail('');
      setRole('');
      setEditingUser(null);
      setIsDialogOpen(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Ошибка редактирования пользователя:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Ошибка при редактировании пользователя');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка удаления пользователя');
      }
      
      setUsers(prev => prev.filter(user => user.id !== id));
      setIsDeleteDialogOpen(false);
      setCurrentUserToDelete(null);
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    const nameParts = user.name?.split(' ') || [];
    setEditingUser(user);
    setFirstName(nameParts[0] || '');
    setLastName(nameParts.slice(1).join(' ') || '');
    setEmail(user.email || '');
    setRole(user.role || '');
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (userId: string) => {
    setCurrentUserToDelete(userId);
    setIsDeleteDialogOpen(true);
  };

  // Функция для получения названия роли по её ID
  const getRoleName = (roleId: string): string => {
    const role = USER_ROLES.find(r => r.id === roleId);
    return role ? role.name : roleId;
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="w-8 h-8 animate-spin text-vista-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-vista-light">
          Управление пользователями
        </h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingUser(null);
                setFirstName('');
                setLastName('');
                setEmail('');
                setRole('');
                setErrorMessage('');
              }}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark">
              <Plus className="w-4 h-4 mr-2" />
              Добавить пользователя
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-vista-dark border-vista-secondary/20 text-vista-light">
            <DialogHeader>
              <DialogTitle className="text-vista-primary">
                {editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="firstName" className="text-right">
                  Имя:
                </label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="col-span-3 bg-vista-dark border-vista-secondary/30 text-vista-light"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="lastName" className="text-right">
                  Фамилия:
                </label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="col-span-3 bg-vista-dark border-vista-secondary/30 text-vista-light"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="text-right">
                  Email:
                </label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="col-span-3 bg-vista-dark border-vista-secondary/30 text-vista-light"
                  placeholder="Если не указан, будет сгенерирован автоматически"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="role" className="text-right">
                  Роль:
                </label>
                <Select
                  value={role}
                  onValueChange={setRole}
                >
                  <SelectTrigger className="col-span-3 bg-vista-dark border-vista-secondary/30 text-vista-light">
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent className="bg-vista-dark border-vista-secondary/20 text-vista-light">
                    {USER_ROLES.map((role) => (
                      <SelectItem 
                        key={`${role.id}-${role.name}`}
                        value={role.id}
                      >
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {errorMessage && (
                <div className="col-span-4 text-center text-red-500 mt-2">
                  {errorMessage}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="border-vista-secondary/30 hover:bg-vista-secondary/20 text-vista-light">
                  Отмена
                </Button>
              </DialogClose>
              
              <Button 
                onClick={editingUser ? handleEditUser : handleAddUser}
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingUser ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Таблица пользователей */}
      <div className="rounded-md border border-vista-secondary/20 overflow-hidden">
        <table className="min-w-full divide-y divide-vista-secondary/20">
          <thead className="bg-vista-secondary/10">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-vista-light tracking-wider">
                Имя и фамилия
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-vista-light tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-vista-light tracking-wider">
                Роль
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-vista-light tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-vista-dark divide-y divide-vista-secondary/10">
            {users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-vista-secondary/5">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-vista-light">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-vista-light/80">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-vista-light/80">{getRoleName(user.role)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      className="text-vista-primary hover:text-vista-primary/90 hover:bg-transparent"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(user.id)}
                      className="text-red-500 hover:text-red-400 hover:bg-transparent ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-vista-light/70">
                  Нет пользователей для отображения
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Диалог подтверждения удаления */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-vista-dark border-vista-secondary/20 text-vista-light">
          <DialogHeader>
            <DialogTitle className="text-vista-primary">
              Удалить пользователя
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-vista-light/90">
              Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.
            </p>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-vista-secondary/30 hover:bg-vista-secondary/20 text-vista-light">
                Отмена
              </Button>
            </DialogClose>
            
            <Button 
              variant="destructive"
              onClick={() => currentUserToDelete && handleDeleteUser(currentUserToDelete)}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог с учетными данными нового пользователя */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="bg-vista-dark border-vista-secondary/20 text-vista-light">
          <DialogHeader>
            <DialogTitle className="text-vista-primary">
              Учетные данные нового пользователя
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-vista-light/90 mb-4">
              Пользователь успешно создан. Запишите эти данные, они потребуются для входа:
            </p>
            
            <div className="bg-vista-secondary/10 p-4 rounded-lg font-mono">
              <div className="mb-2">
                <span className="text-gray-400">Имя:</span> 
                <span className="text-white ml-2">{newUserCredentials?.name}</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-400">Email:</span> 
                <span className="text-white ml-2">{newUserCredentials?.email}</span>
              </div>
              <div>
                <span className="text-gray-400">Пароль:</span> 
                <span className="text-vista-primary ml-2 font-bold">{newUserCredentials?.password}</span>
              </div>
            </div>
            
            <p className="text-amber-400 mt-4 text-sm">
              Важно: Сохраните эти данные, они больше не будут показаны!
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowCredentialsDialog(false)}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
            >
              Понятно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 