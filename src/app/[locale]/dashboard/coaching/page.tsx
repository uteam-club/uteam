import { unstable_setRequestLocale } from 'next-intl/server';
import { AcademicCapIcon } from '@heroicons/react/24/outline';

export default async function CoachingPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <AcademicCapIcon className="w-8 h-8 text-vista-accent" />
        <h1 className="text-3xl font-bold text-vista-light">Тренерская</h1>
      </div>
      
      <div className="bg-vista-dark-secondary rounded-lg p-6">
        <p className="text-vista-light mb-4">
          Добро пожаловать в раздел тренерской. Здесь вы можете управлять тренировками, упражнениями и планами занятий.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="border border-vista-accent/30 rounded-lg p-4 hover:border-vista-accent transition-colors">
            <h3 className="text-vista-accent text-lg font-semibold mb-2">Тренировки</h3>
            <p className="text-vista-light/70">Управление тренировками и расписанием занятий</p>
          </div>
          
          <div className="border border-vista-accent/30 rounded-lg p-4 hover:border-vista-accent transition-colors">
            <h3 className="text-vista-accent text-lg font-semibold mb-2">Упражнения</h3>
            <p className="text-vista-light/70">Каталог упражнений и тренировочных методик</p>
          </div>
          
          <div className="border border-vista-accent/30 rounded-lg p-4 hover:border-vista-accent transition-colors">
            <h3 className="text-vista-accent text-lg font-semibold mb-2">Планы</h3>
            <p className="text-vista-light/70">Составление и управление планами тренировок</p>
          </div>
        </div>
      </div>
    </div>
  );
} 