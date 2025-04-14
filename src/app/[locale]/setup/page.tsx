'use client';

import { useState } from 'react';
import { unstable_setRequestLocale } from 'next-intl/server';
import { useRouter } from 'next/navigation';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return {
    title: 'Настройка VISTA UTEAM'
  };
}

export default function SetupPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    credentials?: {
      email: string;
      password: string;
    };
  } | null>(null);
  const router = useRouter();
  
  const handleCreateAdmin = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setResult(data);
      
      if (response.ok && data.success) {
        // Перейти на страницу входа через 3 секунды
        setTimeout(() => {
          router.push(`/${locale}/auth/login`);
        }, 3000);
      }
    } catch (error) {
      console.error('Ошибка при создании администратора:', error);
      setResult({
        success: false,
        message: 'Произошла ошибка при создании администратора'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-vista-dark text-vista-light">
      <div className="w-full max-w-md bg-vista-dark-secondary p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-vista-accent">Настройка VISTA UTEAM</h1>
        
        <div className="mb-8">
          <p className="mb-4">
            Нажмите кнопку ниже для создания учетной записи суперадминистратора:
          </p>
          <button
            onClick={handleCreateAdmin}
            disabled={loading}
            className="w-full py-3 bg-vista-accent hover:bg-vista-accent-dark text-vista-dark font-semibold rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать суперадмина'}
          </button>
        </div>
        
        {result && (
          <div className={`p-4 rounded mb-4 ${result.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <p className="font-medium mb-2">{result.message}</p>
            {result.credentials && (
              <div className="mt-4 p-4 bg-vista-dark rounded">
                <p className="font-bold mb-2">Данные для входа:</p>
                <p><span className="font-medium">Email:</span> {result.credentials.email}</p>
                <p><span className="font-medium">Пароль:</span> {result.credentials.password}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 