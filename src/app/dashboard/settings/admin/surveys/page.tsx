'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { useClub } from '@/providers/club-provider';

export default function SurveysPage() {
  const router = useRouter();
  const { club } = useClub();

  const handleOpenSurvey = (surveyId: string) => {
    if (!club?.id) return;
    
    // Открываем опросник в новом окне
    window.open(`/dashboard/survey/${surveyId}?tenantId=${club.id}`, '_blank');
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-vista-light">Опросники</h1>
      </div>

      <div className="grid gap-6">
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
          <h2 className="text-xl font-semibold mb-4 text-vista-light">Доступные опросники</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-vista-dark/30 rounded-lg">
              <div>
                <h3 className="text-lg font-medium text-vista-light">Утренний опросник</h3>
                <p className="text-sm text-vista-light/70 mt-1">
                  Опросник для ежедневного мониторинга состояния игроков
                </p>
              </div>
              <Button
                onClick={() => handleOpenSurvey('morning')}
                className="bg-vista-primary hover:bg-vista-primary/90"
              >
                Открыть
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 