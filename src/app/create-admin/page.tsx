'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CreateAdminForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Получаем параметры из URL если они есть
  const prefilledClubName = searchParams.get('clubName') || '';
  const prefilledSubdomain = searchParams.get('subdomain') || '';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    clubName: prefilledClubName,
    clubSubdomain: prefilledSubdomain,
    secret: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || !formData.clubName || !formData.clubSubdomain || !formData.secret) {
      setError('Все поля обязательны для заполнения');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setIsLoading(true);
      
      const response = await fetch('/api/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Произошла ошибка при создании администратора');
        return;
      }

      setSuccess(data.message || 'Администратор успешно создан');
      setFormData({
        name: '',
        email: '',
        password: '',
        clubName: '',
        clubSubdomain: '',
        secret: ''
      });
      
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      console.error('Error creating admin:', error);
      setError('Произошла ошибка при отправке запроса');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vista-dark flex flex-col py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold text-vista-primary">
          Создание администратора
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 mb-3 text-sm text-white bg-vista-error rounded">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 mb-3 text-sm text-white bg-vista-success rounded">
                {success}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Имя
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
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
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clubName" className="form-label">
                Название клуба
              </label>
              <input
                id="clubName"
                name="clubName"
                type="text"
                value={formData.clubName}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="clubSubdomain" className="form-label">
                Поддомен клуба
              </label>
              <input
                id="clubSubdomain"
                name="clubSubdomain"
                type="text"
                value={formData.clubSubdomain}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="secret" className="form-label">
                Секретный ключ
              </label>
              <input
                id="secret"
                name="secret"
                type="password"
                value={formData.secret}
                onChange={handleChange}
                className="form-input"
                required
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
                Создать администратора
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="btn-link">
              Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 

export default function CreateAdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-vista-dark flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-vista-primary"></div>
      </div>
    }>
      <CreateAdminForm />
    </Suspense>
  );
}