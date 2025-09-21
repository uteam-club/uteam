'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Users, Eye, Edit, Trash2 } from 'lucide-react';

export function GpsProfilesTabSimple() {
  const [profiles] = useState([
    {
      id: '1',
      name: 'Основной профиль',
      description: 'Стандартный набор метрик для анализа',
      teamCount: 2,
      columnCount: 8,
      isActive: true,
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Детальный анализ',
      description: 'Расширенный набор метрик для глубокого анализа',
      teamCount: 1,
      columnCount: 15,
      isActive: true,
      createdAt: '2024-01-20',
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка создания */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Профили визуализации</h2>
          <p className="text-muted-foreground">
            Управляйте профилями отображения GPS данных для команд
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Создать профиль
        </Button>
      </div>

      {/* Список профилей */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{profile.name}</CardTitle>
                <Badge variant={profile.isActive ? 'default' : 'secondary'}>
                  {profile.isActive ? 'Активен' : 'Неактивен'}
                </Badge>
              </div>
              <CardDescription>{profile.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  {profile.teamCount} команд
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Settings className="mr-2 h-4 w-4" />
                  {profile.columnCount} колонок
                </div>
                <div className="text-xs text-muted-foreground">
                  Создан: {profile.createdAt}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <Button variant="outline" size="sm">
                  <Eye className="mr-1 h-3 w-3" />
                  Просмотр
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="mr-1 h-3 w-3" />
                  Редактировать
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="mr-1 h-3 w-3" />
                  Удалить
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Пустое состояние */}
      {profiles.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет профилей</h3>
            <p className="text-muted-foreground text-center mb-4">
              Создайте первый профиль визуализации для отображения GPS данных
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Создать профиль
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GpsProfilesTabSimple;
