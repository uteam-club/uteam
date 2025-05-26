'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeftIcon } from 'lucide-react';

export default function CreateTeamPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [teamData, setTeamData] = useState({
    name: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTeamData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Обработчик отправки формы создания команды
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка валидации
    if (!teamData.name.trim()) {
      setError('Название команды обязательно');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при создании команды');
      }
      
      const team = await response.json();
      
      // Перенаправление на страницу созданной команды
      router.push(`/dashboard/teams/${team.id}`);
    } catch (error: any) {
      console.error('Ошибка при создании команды:', error);
      setError(error.message || 'Не удалось создать команду');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик возврата к списку команд
  const handleBackToList = () => {
    router.push('/dashboard/teams');
  };

  return (
    <div className="space-y-6">
      {/* Шапка страницы с кнопкой возврата */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleBackToList}
          className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Назад к списку
        </Button>
        <h1 className="text-2xl font-bold text-vista-light">Создание новой команды</h1>
      </div>

      {/* Форма создания команды */}
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardHeader>
          <CardTitle className="text-vista-light">Информация о команде</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-500">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-vista-light">
                Название команды <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={teamData.name}
                onChange={handleChange}
                placeholder="Введите название команды"
                className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-vista-light">
                Описание
              </Label>
              <Textarea
                id="description"
                name="description"
                value={teamData.description}
                onChange={handleChange}
                placeholder="Введите описание команды (необязательно)"
                className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light resize-none min-h-[100px]"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackToList}
                disabled={isLoading}
                className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-vista-dark border-t-transparent rounded-full"></div>
                    Создание...
                  </>
                ) : (
                  'Создать команду'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 