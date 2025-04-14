import { unstable_setRequestLocale } from 'next-intl/server';
import { Metadata } from 'next';

// Определяем метаданные как экспорт без использования функции generateMetadata
export const metadata: Metadata = {
  title: 'Настройка VISTA UTEAM'
};

export default function SetupPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-vista-dark p-6">
      <div className="max-w-md w-full bg-vista-dark-secondary rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-vista-light mb-6 text-center">
          Настройка VISTA UTEAM
        </h1>
        
        <p className="text-vista-light/70 mb-4 text-center">
          Добро пожаловать в процесс настройки. Следуйте инструкциям, чтобы начать работу с приложением.
        </p>
        
        <div className="text-center">
          <a 
            href={`/${params.locale}/auth/login`}
            className="inline-block px-4 py-2 bg-vista-primary text-vista-dark font-medium rounded hover:bg-vista-primary/90 mt-4"
          >
            Перейти к входу
          </a>
        </div>
      </div>
    </div>
  );
} 