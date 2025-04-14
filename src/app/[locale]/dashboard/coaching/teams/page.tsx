'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  UserGroupIcon, 
  ChevronRightIcon 
} from '@heroicons/react/24/outline';

type Team = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
};

export default function TeamsPage() {
  const { locale } = useParams() as { locale: string };
  const t = useTranslations('team');
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/teams');
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки списка команд');
        }
        
        const teamsData = await response.json();
        setTeams(teamsData);
      } catch (error) {
        console.error('Ошибка загрузки команд:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return (
      <div className="container-app py-6">
        <div className="flex items-center justify-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-vista-light">Команды</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => (
          <Link 
            key={team.id}
            href={`/${locale}/dashboard/coaching/teams/${team.id}`}
            className="bg-vista-secondary/50 rounded-lg p-4 hover:bg-vista-secondary/70 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-vista-primary/20 rounded-full flex items-center justify-center text-vista-primary">
                  <UserGroupIcon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-vista-light">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-vista-light/70 mt-1">{team.description}</p>
                  )}
                </div>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-vista-light/50" />
            </div>
          </Link>
        ))}
        {teams.length === 0 && (
          <div className="col-span-full">
            <p className="text-vista-light/60 text-center py-12">Нет доступных команд</p>
          </div>
        )}
      </div>
    </div>
  );
} 