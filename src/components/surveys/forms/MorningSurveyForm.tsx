import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BodyMap } from '@/components/surveys/BodyMap';
import { RatingTiles } from '@/components/surveys/RatingTiles';

interface PainArea {
  id: string;
  name: string;
  painLevel: number;
}

interface MorningSurveyFormProps {
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
    sleepDuration: 'Длительность сна (часов)',
    hours: 'часов',
    sleepQuality: 'Качество сна',
    recovery: 'Восстановление сил',
    mood: 'Настроение',
    muscleCondition: 'Мышечное состояние',
    hasPain: 'Есть ли выраженная боль?',
    yes: 'Да',
    no: 'Нет',
    front: 'Вид спереди',
    back: 'Вид сзади',
    selectedAreas: 'Выбранные области (всего):',
    unnamed: 'Без названия',
    remove: 'Удалить зону',
    submit: 'Отправить ответ',
    sending: 'Отправка...'
  },
  en: {
    successTitle: 'Survey submitted!',
    successDesc: 'Your answers have been saved',
    close: 'Close survey',
    sleepDuration: 'Sleep duration (hours)',
    hours: 'hours',
    sleepQuality: 'Sleep quality',
    recovery: 'Recovery',
    mood: 'Mood',
    muscleCondition: 'Muscle condition',
    hasPain: 'Do you have significant pain?',
    yes: 'Yes',
    no: 'No',
    front: 'Front view',
    back: 'Back view',
    selectedAreas: 'Selected areas (total):',
    unnamed: 'Unnamed',
    remove: 'Remove area',
    submit: 'Submit answer',
    sending: 'Sending...'
  }
};

export function MorningSurveyForm({ player, surveyId, tenantId, onSubmit, lang = 'en' }: MorningSurveyFormProps) {
  const t = translations[lang] || translations.en;
  const [formData, setFormData] = useState({
    sleepDuration: 8,
    sleepQuality: 3,
    recovery: 3,
    mood: 3,
    muscleCondition: 3,
    hasPain: false,
    painAreas: {
      front: [] as PainArea[],
      back: [] as PainArea[]
    }
  });
  const [showPainAreas, setShowPainAreas] = useState(false);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/survey/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          surveyId,
          tenantId,
          playerId: player.id,
        }),
      });
      if (!response.ok) throw new Error('Failed to submit survey');
      setSuccess(true);
      onSubmit?.(formData);
    } catch (error) {
      // handle error (можно добавить toast)
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    formData.sleepDuration > 0 &&
    formData.sleepQuality > 0 &&
    formData.recovery > 0 &&
    formData.mood > 0 &&
    formData.muscleCondition > 0 &&
    (!formData.hasPain || (
      (formData.painAreas.front.length > 0 || formData.painAreas.back.length > 0) &&
      [...formData.painAreas.front, ...formData.painAreas.back].every(area => area.painLevel > 0)
    ));

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
        {/* Длительность сна */}
        <div>
          <Label className="text-vista-light">{t.sleepDuration}</Label>
          <Slider
            value={[formData.sleepDuration]}
            onValueChange={([value]) => setFormData(prev => ({ ...prev, sleepDuration: value }))}
            min={0}
            max={12}
            step={0.5}
            className="mt-2"
          />
          <div className="text-vista-light mt-1">{formData.sleepDuration} {t.hours}</div>
        </div>
        {/* Качество сна */}
        <div>
          <Label className="text-vista-light">{t.sleepQuality}</Label>
          <div className="mt-2">
            <RatingTiles
              value={formData.sleepQuality}
              onChange={(value) => setFormData(prev => ({ ...prev, sleepQuality: value }))}
            />
          </div>
        </div>
        {/* Восстановление сил */}
        <div>
          <Label className="text-vista-light">{t.recovery}</Label>
          <div className="mt-2">
            <RatingTiles
              value={formData.recovery}
              onChange={(value) => setFormData(prev => ({ ...prev, recovery: value }))}
            />
          </div>
        </div>
        {/* Настроение */}
        <div>
          <Label className="text-vista-light">{t.mood}</Label>
          <div className="mt-2">
            <RatingTiles
              value={formData.mood}
              onChange={(value) => setFormData(prev => ({ ...prev, mood: value }))}
            />
          </div>
        </div>
        {/* Мышечное состояние */}
        <div>
          <Label className="text-vista-light">{t.muscleCondition}</Label>
          <div className="mt-2">
            <RatingTiles
              value={formData.muscleCondition}
              onChange={(value) => setFormData(prev => ({ ...prev, muscleCondition: value }))}
            />
          </div>
        </div>
        {/* Боль */}
        <div>
          <Label className="text-vista-light">{t.hasPain}</Label>
          <RadioGroup
            value={formData.hasPain ? "yes" : "no"}
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, hasPain: value === "yes" }));
              setShowPainAreas(value === "yes");
            }}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="pain-yes" />
              <Label htmlFor="pain-yes" className="text-vista-light">{t.yes}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="pain-no" />
              <Label htmlFor="pain-no" className="text-vista-light">{t.no}</Label>
            </div>
          </RadioGroup>
        </div>
        {/* Области боли */}
        {showPainAreas && (
          <div className="mt-4">
            <div className="flex space-x-4 mb-4">
              <Button
                variant={view === 'front' ? 'default' : 'outline'}
                onClick={() => setView('front')}
              >
                {t.front}
              </Button>
              <Button
                variant={view === 'back' ? 'default' : 'outline'}
                onClick={() => setView('back')}
              >
                {t.back}
              </Button>
            </div>
            <BodyMap
              view={view}
              selectedAreas={formData.painAreas[view].map(area => area.id)}
              painLevels={Object.fromEntries(formData.painAreas[view].map(area => [area.id, area.painLevel]))}
              onAreaSelect={(area, muscleName, painLevel) => {
                setFormData(prev => {
                  const currentAreas = prev.painAreas[view];
                  if (currentAreas.find(a => a.id === area)) {
                    return {
                      ...prev,
                      painAreas: {
                        ...prev.painAreas,
                        [view]: currentAreas.filter(a => a.id !== area)
                      }
                    };
                  }
                  if (painLevel) {
                    return {
                      ...prev,
                      painAreas: {
                        ...prev.painAreas,
                        [view]: [...currentAreas, { id: area, name: muscleName, painLevel }]
                      }
                    };
                  }
                  return prev;
                });
              }}
              lang={lang}
            />
          </div>
        )}
        {/* Общий список выбранных областей боли */}
        {(formData.painAreas.front.length > 0 || formData.painAreas.back.length > 0) && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">{t.selectedAreas}</h3>
            <ul className="list-disc list-inside">
              {formData.painAreas.front.map(area => (
                <li key={area.id + '-front'} className="flex items-center gap-2">
                  <span className="mr-2">•</span>
                  <span>{area.name || t.unnamed} — <span className="font-bold text-vista-accent">{area.painLevel}/10</span> <span className="text-xs text-vista-light/60">({t.front.toLowerCase()})</span></span>
                  <button
                    type="button"
                    className="ml-2 px-2 py-0.5 rounded bg-red-700 text-white text-xs hover:bg-red-800 transition"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      painAreas: {
                        ...prev.painAreas,
                        front: prev.painAreas.front.filter(a => a.id !== area.id)
                      }
                    }))}
                    title={t.remove}
                  >✕</button>
                </li>
              ))}
              {formData.painAreas.back.map(area => (
                <li key={area.id + '-back'} className="flex items-center gap-2">
                  <span className="mr-2">•</span>
                  <span>{area.name || t.unnamed} — <span className="font-bold text-vista-accent">{area.painLevel}/10</span> <span className="text-xs text-vista-light/60">({t.back.toLowerCase()})</span></span>
                  <button
                    type="button"
                    className="ml-2 px-2 py-0.5 rounded bg-red-700 text-white text-xs hover:bg-red-800 transition"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      painAreas: {
                        ...prev.painAreas,
                        back: prev.painAreas.back.filter(a => a.id !== area.id)
                      }
                    }))}
                    title={t.remove}
                  >✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Кнопка отправки */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || submitting}
          className="w-full mt-6 py-4 text-lg"
        >
          {submitting ? t.sending : t.submit}
        </Button>
      </div>
    </Card>
  );
} 