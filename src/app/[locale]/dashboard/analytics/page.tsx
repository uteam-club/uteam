'use client';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartBarIcon, MapPinIcon } from '@heroicons/react/24/outline';

export default function AnalyticsPage() {
  const t = useTranslations('navigation');
  const router = useRouter();
  const { locale } = useParams();
  
  const analyticsOptions = [
    {
      title: t('gps'),
      description: 'Анализ GPS-данных игроков и команд',
      icon: <MapPinIcon className="h-12 w-12 text-vista-accent" />,
      href: `/${locale}/dashboard/analytics/gps`,
    },
    {
      title: t('attendance'),
      description: 'Статистика посещаемости тренировок',
      icon: <ChartBarIcon className="h-12 w-12 text-vista-accent" />,
      href: `/${locale}/dashboard/analytics/attendance`,
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-vista-accent">{t('analytics')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analyticsOptions.map((option, index) => (
          <Card 
            key={index}
            className="bg-vista-dark-secondary border-vista-secondary hover:border-vista-accent transition-colors cursor-pointer"
            onClick={() => router.push(option.href)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-center mb-4">
                {option.icon}
              </div>
              <CardTitle className="text-xl text-center text-vista-accent">
                {option.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-vista-light text-center mb-4">
                {option.description}
              </CardDescription>
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  className="border-vista-accent text-vista-accent hover:bg-vista-accent/10"
                >
                  Перейти
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 