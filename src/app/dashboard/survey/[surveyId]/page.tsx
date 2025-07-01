'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useParams, useSearchParams } from 'next/navigation';
import { BodyMap } from '@/components/surveys/BodyMap';
import { RatingTiles } from '@/components/surveys/RatingTiles';
import { Loader2 } from 'lucide-react';

interface PainArea {
  id: string;
  name: string;
  painLevel?: number;
}

const PAIN_LEVEL_COLORS = {
  1: 'bg-lime-300',  // желто-зеленый
  2: 'bg-lime-400',
  3: 'bg-yellow-300',
  4: 'bg-yellow-400',
  5: 'bg-yellow-500',
  6: 'bg-orange-400',
  7: 'bg-orange-500',
  8: 'bg-red-400',
  9: 'bg-red-500',
  10: 'bg-red-600',
} as const;

export default function SurveyPage() {
  const { toast } = useToast();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId');

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
  const [surveyStatus, setSurveyStatus] = useState<{ isActive: boolean | null, loading: boolean }>({ isActive: null, loading: true });

  useEffect(() => {
    const handleAreaClick = (event: CustomEvent<{ id: string, name: string }>) => {
      const { id, name } = event.detail;
      setFormData(prev => {
        const currentAreas = prev.painAreas[view];
        const newAreas = currentAreas.find(area => area.id === id)
          ? currentAreas.filter(area => area.id !== id)
          : [...currentAreas, { id, name }];
        
        return {
          ...prev,
          painAreas: {
            ...prev.painAreas,
            [view]: newAreas
          }
        };
      });
    };

    document.addEventListener('area-click', handleAreaClick as EventListener);
    return () => {
      document.removeEventListener('area-click', handleAreaClick as EventListener);
    };
  }, [view]);

  useEffect(() => {
    async function fetchSurveyStatus() {
      if (!tenantId || !params.surveyId) return setSurveyStatus({ isActive: null, loading: false });
      setSurveyStatus({ isActive: null, loading: true });
      try {
        const res = await fetch(`/api/survey/active-id?tenantId=${tenantId}&type=morning`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSurveyStatus({ isActive: !!data.isActive, loading: false });
      } catch {
        setSurveyStatus({ isActive: null, loading: false });
      }
    }
    fetchSurveyStatus();
  }, [tenantId, params.surveyId]);

  const handleSubmit = async () => {
    if (!tenantId) {
      toast({
        title: "Ошибка",
        description: "Не указан ID клуба",
        variant: "destructive",
      });
      return;
    }

    try {
      // Преобразуем painAreas в формат для базы данных
      const painAreasFormatted = [
        ...formData.painAreas.front,
        ...formData.painAreas.back
      ].map(area => ({
        areaName: area.name,
        painLevel: area.painLevel || 1
      }));

      const response = await fetch('/api/survey/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sleepDuration: formData.sleepDuration,
          sleepQuality: formData.sleepQuality,
          recovery: formData.recovery,
          mood: formData.mood,
          muscleCondition: formData.muscleCondition,
          painAreas: painAreasFormatted,
          surveyId: params.surveyId,
          tenantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit survey');
      }

      toast({
        title: "Успешно!",
        description: "Ваши ответы сохранены",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить ответы",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card className="p-6">
        {surveyStatus.loading ? (
          <div className="flex items-center gap-2 text-vista-light/70"><Loader2 className="animate-spin w-4 h-4" />Загрузка...</div>
        ) : surveyStatus.isActive === false ? (
          <div className="text-red-500 text-lg font-semibold text-center">Опросник неактивен. Обратитесь к администратору клуба.</div>
        ) : (
        <div className="space-y-8">
          {/* Длительность сна */}
          <div>
            <Label className="text-vista-light">Длительность сна (часов)</Label>
            <Slider
              value={[formData.sleepDuration]}
              onValueChange={([value]) => setFormData(prev => ({ ...prev, sleepDuration: value }))}
              min={0}
              max={12}
              step={0.5}
              className="mt-2"
            />
            <div className="text-vista-light mt-1">{formData.sleepDuration} часов</div>
          </div>

          {/* Качество сна */}
          <div>
            <Label className="text-vista-light">Качество сна</Label>
            <div className="mt-2">
              <RatingTiles
                value={formData.sleepQuality}
                onChange={(value) => setFormData(prev => ({ ...prev, sleepQuality: value }))}
              />
            </div>
          </div>

          {/* Восстановление сил */}
          <div>
            <Label className="text-vista-light">Восстановление сил</Label>
            <div className="mt-2">
              <RatingTiles
                value={formData.recovery}
                onChange={(value) => setFormData(prev => ({ ...prev, recovery: value }))}
              />
            </div>
          </div>

          {/* Настроение */}
          <div>
            <Label className="text-vista-light">Настроение</Label>
            <div className="mt-2">
              <RatingTiles
                value={formData.mood}
                onChange={(value) => setFormData(prev => ({ ...prev, mood: value }))}
              />
            </div>
          </div>

          {/* Мышечное состояние */}
          <div>
            <Label className="text-vista-light">Мышечное состояние</Label>
            <div className="mt-2">
              <RatingTiles
                value={formData.muscleCondition}
                onChange={(value) => setFormData(prev => ({ ...prev, muscleCondition: value }))}
              />
            </div>
          </div>

          {/* Боль */}
          <div>
            <Label className="text-vista-light">Есть ли выраженная боль?</Label>
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
                <Label htmlFor="pain-yes" className="text-vista-light">Да</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="pain-no" />
                <Label htmlFor="pain-no" className="text-vista-light">Нет</Label>
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
                  Вид спереди
                </Button>
                <Button
                  variant={view === 'back' ? 'default' : 'outline'}
                  onClick={() => setView('back')}
                >
                  Вид сзади
                </Button>
              </div>
              <BodyMap
                view={view}
                selectedAreas={formData.painAreas[view].map(area => area.id)}
                painLevels={Object.fromEntries(
                  formData.painAreas[view]
                    .filter(area => area.painLevel)
                    .map(area => [area.id, area.painLevel!])
                )}
                onAreaSelect={(area, muscleName, painLevel) => {
                  setFormData(prev => {
                    const currentAreas = prev.painAreas[view];
                    
                    // Если область уже выбрана, удаляем её
                    if (currentAreas.find(a => a.id === area)) {
                      return {
                        ...prev,
                        painAreas: {
                          ...prev.painAreas,
                          [view]: currentAreas.filter(a => a.id !== area)
                        }
                      };
                    }
                    
                    // Если область не выбрана и есть уровень боли, добавляем её
                    if (painLevel) {
                      const name = muscleName || (area === 'muscle-2' ? 'Голова' : '');
                      return {
                        ...prev,
                        painAreas: {
                          ...prev.painAreas,
                          [view]: [...currentAreas, { id: area, name, painLevel }]
                        }
                      };
                    }
                    
                    return prev;
                  });
                }}
              />
              {/* Отображение выбранных областей */}
              {(formData.painAreas.front.length > 0 || formData.painAreas.back.length > 0) && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2 text-vista-light">Выбранные области:</h3>
                  <ul className="space-y-2">
                    {[...formData.painAreas.front, ...formData.painAreas.back].map(area => (
                      <li key={area.id} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${area.painLevel ? PAIN_LEVEL_COLORS[area.painLevel as keyof typeof PAIN_LEVEL_COLORS] : 'bg-gray-400'}`} />
                        <span className="text-vista-light">{area.name || (area.id === 'muscle-2' ? 'Голова' : 'Без названия')}</span>
                        {area.painLevel && (
                          <span className="text-sm text-vista-light/70">(Уровень боли: {area.painLevel})</span>
                        )}
                        <button
                          type="button"
                          className="ml-2 px-2 py-0.5 rounded bg-red-700 text-white text-xs hover:bg-red-800 transition"
                          onClick={() => setFormData(prev => {
                            const isFront = prev.painAreas.front.some(a => a.id === area.id);
                            return {
                              ...prev,
                              painAreas: {
                                ...prev.painAreas,
                                front: isFront ? prev.painAreas.front.filter(a => a.id !== area.id) : prev.painAreas.front,
                                back: !isFront ? prev.painAreas.back.filter(a => a.id !== area.id) : prev.painAreas.back
                              }
                            };
                          })}
                          title="Удалить зону"
                        >✕</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Кнопка отправки */}
          <Button
            onClick={handleSubmit}
            disabled={formData.hasPain && formData.painAreas.front.length === 0 && formData.painAreas.back.length === 0}
            className="w-full mt-6"
          >
            Отправить ответ
          </Button>
        </div>
        )}
      </Card>
    </div>
  );
} 