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

const translations = {
  ru: {
    successTitle: 'Опрос успешно отправлен!',
    successDesc: 'Ваши ответы сохранены в системе',
    close: 'Закрыть опросник',
    rpeTitle: 'Оцените, насколько тяжёлой была тренировка (RPE)',
    submit: 'Отправить ответ',
    sending: 'Отправка...'
  },
  en: {
    successTitle: 'Survey submitted!',
    successDesc: 'Your answers have been saved',
    close: 'Close survey',
    rpeTitle: 'Rate how hard the training was (RPE)',
    submit: 'Submit answer',
    sending: 'Sending...'
  }
};

export function RPESurveyForm({ player, surveyId, tenantId, onSubmit, lang = 'en' }: RPESurveyFormProps) {
  const [rpeScore, setRpeScore] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const t = translations[lang] || translations.en;

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
        <div className="text-green-500 text-2xl font-bold mb-2">{t.successTitle}</div>
        <div className="text-vista-light/70 mb-6">{t.successDesc}</div>
        <Button onClick={() => window.close()} className="w-full bg-vista-accent hover:bg-vista-accent/90 text-white">{t.close}</Button>
      </div>
    );
  }

  return (
    <Card className="p-4 sm:p-6 shadow-lg mt-4">
      <div className="space-y-8">
        <div>
          <div className="text-vista-light text-lg font-semibold mb-4">{t.rpeTitle}</div>
          <RPERatingTiles value={rpeScore} onChange={setRpeScore} lang={lang} />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={rpeScore === undefined || submitting}
          className="w-full mt-6 py-4 text-lg"
        >
          {submitting ? t.sending : t.submit}
        </Button>
      </div>
    </Card>
  );
} 