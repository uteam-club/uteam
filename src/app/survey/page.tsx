'use client';

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useParams } from 'next/navigation';
import { BodyMap } from '@/components/surveys/BodyMap';
import { RatingTiles } from '@/components/surveys/RatingTiles';

interface PainArea {
  id: string;
  name: string;
}

export default function SurveyPage() {
  const { toast } = useToast();
  const params = useParams();
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

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/survey/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          surveyId: params.surveyId,
          tenantId: params.tenantId,
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
                      return {
                        ...prev,
                        painAreas: {
                          ...prev.painAreas,
                          [view]: [...currentAreas, { id: area, name: muscleName }]
                        }
                      };
                    }
                    
                    // В остальных случаях не меняем состояние
                    return prev;
                  });
                }}
              />
              {/* Отображение выбранных областей */}
              {formData.painAreas[view].length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Выбранные области:</h3>
                  <ul className="list-disc list-inside">
                    {formData.painAreas[view].map(area => (
                      <li key={area.id} className="flex items-center">
                        <span className="mr-2">•</span>
                        <span>{area.name || 'Без названия'}</span>
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
      </Card>
    </div>
  );
} 