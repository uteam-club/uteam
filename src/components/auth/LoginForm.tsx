'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface LoginFormValues {
  email: string;
  password: string;
}

export const LoginForm = () => {
  const t = useTranslations('auth');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t('errorMessages.emailInvalid')),
    password: z.string().min(1, t('errorMessages.passwordRequired')),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        setError(t('errorMessages.invalidCredentials'));
        return;
      }

      router.push('/ru/dashboard');
      router.refresh();
    } catch (error) {
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
          {...register('password')}
        />
        {errors.password && (
          <p className="form-error">{errors.password.message}</p>
        )}
      </div>

      <div>
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? t('loading') : t('signIn')}
        </button>
      </div>
    </form>
  );
}; 