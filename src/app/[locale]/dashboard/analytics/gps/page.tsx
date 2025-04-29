'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function GPSReportsPage() {
  const t = useTranslations('navigation');
  const router = useRouter();
  const { locale } = useParams();
  
  return (
    <div className="container mx-auto py-8">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => router.back()}
        className="mb-8"
      >
        <ArrowLeftIcon className="mr-2 h-4 w-4" />
        Назад
      </Button>
      
      <h1 className="text-3xl font-bold mb-8 text-vista-accent">{t('gps')}</h1>
      
      <div className="bg-vista-dark-secondary border border-vista-secondary rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4 text-vista-accent">Раздел в разработке</h2>
        <p className="text-vista-light mb-6">
          GPS-отчеты находятся в стадии разработки. Здесь будет отображаться статистика
          по физическим показателям игроков, включая пройденное расстояние, скорость, 
          количество рывков и другие метрики.
        </p>
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            className="border-vista-accent text-vista-accent hover:bg-vista-accent/10"
            onClick={() => router.push(`/${locale}/dashboard/analytics`)}
          >
            Вернуться к аналитике
          </Button>
        </div>
      </div>
    </div>
  );
} 