'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Team } from '@/generated/prisma/client';

export default function TeamsPage() {
  const { data: session } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTeams() {
      try {
        setIsLoading(true);
        // @ts-ignore - clubId существует в session.user благодаря типам из next-auth.d.ts
        const clubId = session?.user?.clubId;
        
        if (clubId) {
          const response = await fetch(`/api/teams?clubId=${clubId}`);
          if (response.ok) {
            const data = await response.json();
            setTeams(data);
          }
        }
      } catch (error) {
        console.error('Ошибка при получении команд:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (session) {
      fetchTeams();
    }
  }, [session]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-vista-light">Команды</h1>
        <Link href="/dashboard/teams/create" className="btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Создать команду
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-vista-primary"></div>
        </div>
      ) : teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Link key={team.id} href={`/dashboard/teams/${team.id}`}>
              <div className="card hover:bg-vista-secondary/20 transition-colors h-full">
                <div className="p-6 flex flex-col space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-vista-primary/20 flex items-center justify-center">
                      <UsersIcon className="w-8 h-8 text-vista-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-vista-light">{team.name}</h3>
                  </div>
                  {team.description && (
                    <p className="text-vista-light/70">{team.description}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <UsersIcon className="w-16 h-16 text-vista-light/30" />
            <h3 className="text-xl font-medium text-vista-light">У вас пока нет команд</h3>
            <p className="text-vista-light/70">
              Создайте свою первую команду, чтобы начать работу с платформой
            </p>
            <Link href="/dashboard/teams/create" className="btn-primary mt-4">
              <PlusIcon className="w-5 h-5 mr-2" />
              Создать команду
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 