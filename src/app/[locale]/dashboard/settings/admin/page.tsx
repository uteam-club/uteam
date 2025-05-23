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
import { Loader2, Settings, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
      
      <Card className="bg-vista-dark border-vista-secondary/20 mb-8">
        <CardHeader>
          <CardTitle>{t('dataManagement')}</CardTitle>
          <CardDescription>
            {t('manageEntities')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-6 mb-8">
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
              <TabsTrigger value="questionnaires">
                Опросники
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
            
            <TabsContent value="questionnaires">
              <div className="space-y-6">
                <div className="bg-vista-dark border border-vista-secondary/30 shadow-sm rounded-lg p-6 transition-all hover:shadow-vista hover:border-vista-primary/30">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-medium text-vista-light">Состояние утро</h3>
                      <p className="text-vista-light/70 mt-1">
                        Опросник для утренней оценки состояния игроков. Оценка сна, физического состояния и готовности к тренировкам.
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <Button asChild variant="outline" size="sm" className="flex items-center">
                        <Link href="/ru/dashboard/settings/admin/questionnaires/view/morning-state">
                          <Smartphone className="h-4 w-4 mr-2" />
                          Страница прохождения
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-vista-secondary/20">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-vista-success"></span>
                      <span className="text-sm text-vista-light/70">Активен</span>
                    </div>
                    <div className="text-sm text-vista-light/50">
                      Последнее обновление: 28.04.2024 · 0 ответов
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 