'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from 'next/navigation';
import { RPERatingTiles } from '@/components/surveys/RPERatingTiles';
import { Loader2 } from 'lucide-react';

export default function RPESurveyPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId');

  const [formData, setFormData] = useState({
    rpeScore: 0,
  });
  const [surveyStatus, setSurveyStatus] = useState<{ isActive: boolean | null, loading: boolean }>({ isActive: null, loading: true });

  useEffect(() => {
    async function fetchSurveyStatus() {
      if (!tenantId) return setSurveyStatus({ isActive: null, loading: false });
      setSurveyStatus({ isActive: null, loading: true });
      try {
        const res = await fetch(`/api/survey/active-id?tenantId=${tenantId}&type=rpe`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSurveyStatus({ isActive: !!data.isActive, loading: false });
      } catch {
        setSurveyStatus({ isActive: null, loading: false });
      }
    }
    fetchSurveyStatus();
  }, [tenantId]);

  const handleSubmit = async () => {
    if (!tenantId) {
      toast({
        title: "Ошибка",
        description: "Не указан ID клуба",
        variant: "destructive",
      });
      return;
    }

    if (formData.rpeScore === 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите оценку RPE",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/survey/rpe/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rpeScore: formData.rpeScore,
          surveyId: 'rpe',
          tenantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit survey');
      }

      toast({
        title: "Успешно!",
        description: "Ваша оценка RPE сохранена",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить ответ",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card className="p-6">
        {surveyStatus.loading ? (
          <div className="flex items-center gap-2 text-vista-light/70">
            <Loader2 className="animate-spin w-4 h-4" />
            Загрузка...
          </div>
        ) : surveyStatus.isActive === false ? (
          <div className="text-red-500 text-lg font-semibold text-center">
            Опросник неактивен. Обратитесь к администратору клуба.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-vista-light mb-4">
                Оценка воспринимаемой нагрузки (RPE)
              </h1>
              <p className="text-vista-light/70 mb-6">
                Оцените, насколько тяжелой была ваша тренировка по шкале от 1 до 10
              </p>
            </div>

            {/* RPE Оценка */}
            <div>
              <RPERatingTiles
                value={formData.rpeScore}
                onChange={(value) => setFormData(prev => ({ ...prev, rpeScore: value }))}
              />
            </div>

            {/* Кнопка отправки */}
            <div className="flex justify-center pt-6">
              <Button 
                onClick={handleSubmit}
                disabled={formData.rpeScore === 0}
                className="px-8 py-3 text-lg"
              >
                Отправить оценку
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 