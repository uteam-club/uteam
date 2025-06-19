'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clubLogo, setClubLogo] = useState('/vista.png'); // По умолчанию FDC VISTA

  useEffect(() => {
    // Определение клуба по домену (hostname)
    const hostname = window.location.hostname;
    if (hostname.includes('van')) {
      setClubLogo('/van.png');
    } else {
      setClubLogo('/vista.png');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('submit', email, password); // debug log
    
    if (!email || !password) {
      setError('Пожалуйста, заполните все поля');
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
        setError('Неверный email или пароль');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Произошла ошибка при входе');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vista-dark flex flex-col items-center justify-center">
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
                  Email
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
                  Пароль
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
                  Войти
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