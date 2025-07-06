import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RPERatingTiles } from '@/components/surveys/RPERatingTiles';

interface RPESurveyFormProps {
  player: any;
  surveyId: string;
  tenantId: string;
  onSubmit?: (data: any) => void;
  lang?: 'ru' | 'en';
}

export function RPESurveyForm({ player, surveyId, tenantId, onSubmit, lang = 'en' }: RPESurveyFormProps) {
  const [rpeScore, setRpeScore] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/survey/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rpeScore,
          surveyId,
          tenantId,
          playerId: player.id,
          type: 'rpe',
        }),
      });
      if (!response.ok) throw new Error('Failed to submit survey');
      setSuccess(true);
      onSubmit?.({ rpeScore });
    } catch (error) {
      // handle error (можно добавить toast)
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center p-8">
        <div className="text-green-500 text-2xl font-bold mb-2">Опрос успешно отправлен!</div>
        <div className="text-vista-light/70 mb-6">Ваши ответы сохранены в системе</div>
        <Button onClick={() => window.close()} className="w-full bg-vista-accent hover:bg-vista-accent/90 text-white">Закрыть опросник</Button>
      </div>
    );
  }

  return (
    <Card className="p-4 sm:p-6 shadow-lg mt-4">
      <div className="space-y-8">
        <div>
          <div className="text-vista-light text-lg font-semibold mb-4">Оцените, насколько тяжёлой была тренировка (RPE)</div>
          <RPERatingTiles value={rpeScore} onChange={setRpeScore} />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={rpeScore === 0 || submitting}
          className="w-full mt-6 py-4 text-lg"
        >
          {submitting ? 'Отправка...' : 'Отправить ответ'}
        </Button>
      </div>
    </Card>
  );
} 