'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clubLogo, setClubLogo] = useState('/light.svg');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Определение клуба по домену (hostname)
    const hostname = window.location.hostname;
    if (hostname.includes('alashkert')) {
      setClubLogo('/alashkert.white.png');
    } else if (hostname.includes('fdcvista')) {
      setClubLogo('/vista.png');
    } else {
      setClubLogo('/light.svg');
    }
  }, []);

  if (!isMounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError(t('login.fill_all_fields'));
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      
            const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
  
      if (result?.error) {
        setError(t('login.invalid_credentials'));
      } else {
        // Очищаем форму и переходим в дашборд
        setEmail('');
        setPassword('');
        // Используем полную перезагрузку страницы для гарантированной смены сессии
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(t('login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vista-dark flex flex-col items-center justify-center relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <div className="w-24 h-24 relative mb-8">
          <Image 
            src={clubLogo} 
            alt="Club logo" 
            width={96}
            height={96}
            className="object-contain"
          />
        </div>
        
        <div className="w-full">
          <div className="card">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 mb-3 text-sm text-white bg-vista-error rounded">
                  {error}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  {t('login.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  {t('login.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary flex justify-center items-center"
                >
                  {isLoading ? (
                    <span className="inline-block animate-spin mr-2">⟳</span>
                  ) : null}
                  {t('login.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <div className="w-48 h-48 relative">
          <Image 
            src="/big.svg" 
            alt="FDC Logo" 
            width={192}
            height={192}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
} 