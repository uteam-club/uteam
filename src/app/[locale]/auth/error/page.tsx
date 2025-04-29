'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

// Компонент с бизнес-логикой, который использует useSearchParams
function ErrorContent() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const errorType = searchParams.get('error');
    
    if (errorType) {
      switch (errorType) {
        case 'CredentialsSignin':
          setError(t('errorMessages.invalidCredentials'));
          break;
        case 'AccessDenied':
          setError('Доступ запрещен');
          break;
        case 'Verification':
          setError('Ошибка верификации');
          break;
        default:
          setError('Произошла ошибка при входе в систему');
      }
    }
  }, [searchParams, t]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-vista-dark text-vista-light">
      <div className="w-full max-w-md bg-vista-dark-secondary p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-vista-accent">Ошибка аутентификации</h1>
        
        {error && (
          <div className="bg-vista-error/10 text-vista-error p-4 rounded-md mb-6">
            {error}
          </div>
        )}
        
        <p className="mb-6">
          Произошла ошибка при попытке аутентификации. Пожалуйста, попробуйте снова.
        </p>
        
        <div className="flex flex-col gap-3">
          <Link 
            href="/ru/auth/login" 
            className="bg-vista-accent hover:bg-vista-accent-dark text-vista-dark font-semibold py-3 px-4 rounded text-center"
          >
            Вернуться на страницу входа
          </Link>
          <Link 
            href="/ru" 
            className="bg-transparent border border-vista-light/20 hover:border-vista-light text-vista-light font-medium py-3 px-4 rounded text-center"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

// Главный компонент, который оборачивает бизнес-логику в Suspense
export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-vista-dark">
        <div className="animate-pulse text-vista-primary text-xl">Загрузка...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
} 