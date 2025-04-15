'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
}

export const LoginForm = () => {
  const t = useTranslations('auth');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Схема валидации с улучшенными проверками
  const loginSchema = z.object({
    email: z.string()
      .email(t('errorMessages.emailInvalid'))
      .trim()
      .toLowerCase(),
    password: z.string()
      .min(1, t('errorMessages.passwordRequired')),
    remember: z.boolean().optional().default(false),
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      remember: false,
      email: '',
      password: '',
    },
  });

  // Мемоизируем функцию загрузки сохраненных данных
  const loadSavedCredentials = useCallback(() => {
    try {
      const lastEmail = localStorage.getItem('lastLoginEmail');
      if (lastEmail) {
        setValue('email', lastEmail);
        setValue('remember', true);
      }
    } catch (e) {
      console.error('Ошибка при загрузке сохраненных данных:', e);
    }
  }, [setValue]);

  // Загружаем сохраненные данные при монтировании компонента
  useEffect(() => {
    loadSavedCredentials();
  }, [loadSavedCredentials]);

  const onSubmit = async (data: LoginFormValues) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Сохраняем или удаляем email в localStorage в зависимости от выбора пользователя
      if (data.remember) {
        try {
          localStorage.setItem('lastLoginEmail', data.email.trim().toLowerCase());
        } catch (e) {
          console.error('Ошибка при сохранении данных:', e);
        }
      } else {
        try {
          localStorage.removeItem('lastLoginEmail');
        } catch (e) {
          console.error('Ошибка при удалении данных:', e);
        }
      }

      const result = await signIn('credentials', {
        redirect: false,
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      if (result?.error) {
        setError(t('errorMessages.invalidCredentials'));
        return;
      }

      router.push('/ru/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      setError(t('errorMessages.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-xl font-semibold text-vista-light text-center mb-6">
        {t('signIn')}
      </h2>
      
      {error && (
        <div className="bg-vista-error/10 text-vista-error p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email" className="form-label">
          {t('enterEmail')}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="form-input"
          disabled={isLoading}
          {...register('email')}
        />
        {errors.email && (
          <p className="form-error">{errors.email.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">
          {t('enterPassword')}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="form-input"
          disabled={isLoading}
          {...register('password')}
        />
        {errors.password && (
          <p className="form-error">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center">
        <input
          id="remember"
          type="checkbox"
          className="h-4 w-4 border-vista-secondary bg-vista-dark rounded text-vista-primary focus:ring-vista-primary"
          disabled={isLoading}
          {...register('remember')}
        />
        <label htmlFor="remember" className="ml-2 block text-sm text-vista-light cursor-pointer select-none">
          Запомнить меня
        </label>
      </div>

      <div>
        <button
          type="submit"
          className="btn-primary w-full flex justify-center items-center"
          disabled={isLoading || isSubmitting}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('loading')}
            </>
          ) : t('signIn')}
        </button>
      </div>
    </form>
  );
}; 