'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { TeamsManager } from '@/components/admin/TeamsManager';
import { TrainingCategoriesManager } from '@/components/admin/TrainingCategoriesManager';
import { ExerciseCategoriesManager } from '@/components/admin/ExerciseCategoriesManager';
import { ExerciseTagsManager } from '@/components/admin/ExerciseTagsManager';
import { UsersManager } from '@/components/admin/UsersManager';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const t = useTranslations('admin');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('teams');
  
  // Имитация проверки прав пользователя
  useEffect(() => {
    // В реальном приложении здесь должна быть проверка прав пользователя
    // через API или состояние авторизации
    const checkAdminRights = async () => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Имитация запроса
      // Для демонстрации просто разрешаем доступ
      setIsAdmin(true);
    };
    
    checkAdminRights();
  }, []);
  
  // Индикатор загрузки, пока проверяются права
  if (isAdmin === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-vista-primary mb-4" />
        <p className="text-vista-light">{t('loading')}</p>
      </div>
    );
  }
  
  // Если пользователь не имеет прав администратора
  if (isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-vista-error text-xl mb-2">
          {t('accessDenied')}
        </div>
        <p className="text-vista-light/70 text-center">
          {t('adminRightsRequired')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[99%] mx-auto py-6">
      <h1 className="text-2xl font-bold text-vista-light mb-6">
        {t('adminPanel')}
      </h1>
      
      <Card className="bg-vista-dark border-vista-secondary/20">
        <CardHeader>
          <CardTitle>{t('dataManagement')}</CardTitle>
          <CardDescription>
            {t('manageEntities')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 mb-8">
              <TabsTrigger value="users">
                Пользователи
              </TabsTrigger>
              <TabsTrigger value="teams">
                {t('teams')}
              </TabsTrigger>
              <TabsTrigger value="trainingCategories">
                {t('trainingCategories')}
              </TabsTrigger>
              <TabsTrigger value="exerciseCategories">
                {t('exerciseCategories')}
              </TabsTrigger>
              <TabsTrigger value="exerciseTags">
                {t('exerciseTags')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users">
              <UsersManager />
            </TabsContent>
            
            <TabsContent value="teams">
              <TeamsManager />
            </TabsContent>
            
            <TabsContent value="trainingCategories">
              <TrainingCategoriesManager />
            </TabsContent>
            
            <TabsContent value="exerciseCategories">
              <ExerciseCategoriesManager />
            </TabsContent>
            
            <TabsContent value="exerciseTags">
              <ExerciseTagsManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 