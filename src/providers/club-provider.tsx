'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ClubProvider } from '@/context/club-context';
import { useSession } from 'next-auth/react';
import { Club } from '@/generated/prisma/client';

async function fetchClub(clubId: string): Promise<Club | null> {
  try {
    const response = await fetch(`/api/clubs/${clubId}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении данных клуба:', error);
    return null;
  }
}

export function ClubContextProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [club, setClub] = useState<Club | null>(null);
  const [isMainDomain, setIsMainDomain] = useState(true);

  useEffect(() => {
    // Получаем информацию о клубе из сессии пользователя
    const clubId = session?.user?.clubId;
    // @ts-ignore - игнорируем предупреждение о том, что clubId может не существовать
    if (clubId) {
      fetchClub(clubId).then(clubData => {
        setClub(clubData);
      });
    }

    // Проверяем, является ли текущий домен основным
    const host = window.location.hostname;
    setIsMainDomain(host === 'localhost' || host === 'fdcvista.localhost' || host === 'fdcvista.com');
  }, [session]);

  return (
    <ClubProvider club={club} isMainDomain={isMainDomain}>
      {children}
    </ClubProvider>
  );
} 