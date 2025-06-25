'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { useClub } from '@/providers/club-provider';
import { toast } from '@/components/ui/use-toast';
import { useState } from 'react';

export default function SurveysPage() {
  const router = useRouter();
  const { club } = useClub();
  const [loading, setLoading] = useState(false);

  const handleOpenSurvey = async () => {
    console.log('Клик по кнопке Открыть', club?.id);
    if (!club?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/survey/active-id?tenantId=${club.id}`);
      if (!res.ok) throw new Error('Не найден активный опросник');
      const data = await res.json();
      if (!data.surveyId) throw new Error('Нет surveyId');
      window.location.href = `/dashboard/survey/${data.surveyId}?tenantId=${club.id}`;
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message || 'Не удалось открыть опросник', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-vista-light">Опросники</h1>
      </div>

      <div className="grid gap-6">
        <Card className="bg-vista-dark/50 border-vista-secondary/50 shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-vista-light">Доступные опросники</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-vista-dark/30 rounded-lg">
              <div>
                <h3 className="text-lg font-medium text-vista-light">Утренний опросник</h3>
                <p className="text-sm text-vista-light/70 mt-1">
                  Опросник для ежедневного мониторинга состояния игроков
                </p>
              </div>
              {/* Временная ссылка для ручного теста перехода */}
              <a
                href={`/dashboard/survey/4965979b-0185-4e87-983e-95efa0b5a3b5?tenantId=4ce0dab3-9421-4669-9cd8-cc63ed9d9d63`}
                className="ml-4 underline text-vista-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть (тестовая ссылка)
              </a>
            </div>
          </div>
        </Card>
        <button
          onClick={handleOpenSurvey}
          className="bg-vista-primary hover:bg-vista-primary/90 px-4 py-2 rounded text-white font-semibold"
          disabled={loading}
        >
          {loading ? 'Открываю...' : 'Открыть'}
        </button>
      </div>
    </div>
  );
} 