'use client';

import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-vista-light">Настройки</h1>
      
      <div className="card p-6">
        <p className="text-vista-light/80">
          Добро пожаловать в раздел настроек. Выберите нужный подраздел в верхнем меню.
        </p>
      </div>
    </div>
  );
} 