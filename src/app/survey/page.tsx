'use client';

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useParams, useSearchParams } from 'next/navigation';
import { BodyMap } from '@/components/surveys/BodyMap';
import { RatingTiles } from '@/components/surveys/RatingTiles';
import { Lock } from 'lucide-react';

interface PainArea {
  id: string;
  name: string;
}

export default function SurveyPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  const surveyId = searchParams.get('surveyId');

  const [pinCode, setPinCode] = useState('');
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState('');

  const [formData, setFormData] = useState({
    sleepDuration: 8,
    sleepQuality: 3,
    recovery: 3,
    mood: 3,
    muscleCondition: 3,
    hasPain: false,
    painAreas: {
      front: [] as { id: string; name: string; painLevel: number }[],
      back: [] as { id: string; name: string; painLevel: number }[]
    }
  });
  const [showPainAreas, setShowPainAreas] = useState(false);
  const [view, setView] = useState<'front' | 'back'>('front');

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPinError('');
    try {
      const res = await fetch(`/api/survey/player-by-pin?pinCode=${encodeURIComponent(pinCode)}&tenantId=${encodeURIComponent(tenantId || '')}`);
      if (!res.ok) throw new Error('Пинкод не найден');
      const data = await res.json();
      setPlayer(data.player);
    } catch (err) {
      setPinError('Пинкод не найден. Проверьте правильность ввода.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!player) return;
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
      toast({ title: 'Успешно!', description: 'Ваши ответы сохранены' });
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить ответы', variant: 'destructive' });
    }
  };

  // Проверка валидности формы
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

  return (
    <div className="w-full min-h-screen flex flex-col justify-center items-center bg-vista-dark px-2 py-6">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl mx-auto">
        {!player ? (
          <Card className="p-6 shadow-lg bg-vista-dark/80 border-vista-secondary/40">
            <form onSubmit={handlePinSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-vista-accent/20 mb-2">
                  <Lock className="w-7 h-7 text-vista-accent" />
                </div>
                <Label htmlFor="pinCode" className="text-xl text-vista-light text-center font-semibold">Введите ваш 6-значный пинкод</Label>
                <span className="text-vista-light/60 text-sm text-center">Пинкод выдается тренером или в личном кабинете</span>
              </div>
              <input
                id="pinCode"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                minLength={6}
                autoFocus
                className={`text-center tracking-widest text-3xl p-4 rounded-xl border-2 border-vista-accent/40 bg-vista-dark/60 text-vista-accent font-mono outline-none focus:border-vista-accent focus:ring-2 focus:ring-vista-accent transition-all duration-200 ${pinError ? 'animate-shake border-red-500' : ''}`}
                value={pinCode}
                onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                placeholder="000000"
              />
              {pinError && <div className="text-red-500 text-center text-base animate-fade-in">{pinError}</div>}
              <Button
                type="submit"
                className={`w-full py-4 text-lg bg-vista-accent hover:bg-vista-accent/90 transition ${loading || pinCode.length !== 6 ? 'opacity-70 text-white' : 'text-white'}`}
                style={{
                  backgroundColor: loading || pinCode.length !== 6 ? 'rgba(90, 204, 229, 0.7)' : '#5acce5',
                  color: '#fff',
                  cursor: loading || pinCode.length !== 6 ? 'not-allowed' : 'pointer',
                }}
                disabled={loading || pinCode.length !== 6}
              >
                {loading ? 'Проверка...' : 'Войти'}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-4 sm:p-6 shadow-lg mt-4">
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
                    painLevels={Object.fromEntries(formData.painAreas[view].map(area => [area.id, area.painLevel]))}
                    onAreaSelect={(area, muscleName, painLevel) => {
                      setFormData(prev => {
                        const currentAreas = prev.painAreas[view];
                        // Если область уже выбрана — удаляем её
                        if (currentAreas.find(a => a.id === area)) {
                          return {
                            ...prev,
                            painAreas: {
                              ...prev.painAreas,
                              [view]: currentAreas.filter(a => a.id !== area)
                            }
                          };
                        }
                        // Если область не выбрана и есть уровень боли — добавляем её
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
                  />
                </div>
              )}

              {/* Общий список выбранных областей боли */}
              {(formData.painAreas.front.length > 0 || formData.painAreas.back.length > 0) && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Выбранные области (всего):</h3>
                  <ul className="list-disc list-inside">
                    {formData.painAreas.front.map(area => (
                      <li key={area.id + '-front'} className="flex items-center">
                        <span className="mr-2">•</span>
                        <span>{area.name || 'Без названия'} — <span className="font-bold text-vista-accent">{area.painLevel}/10</span> <span className="text-xs text-vista-light/60">(спереди)</span></span>
                      </li>
                    ))}
                    {formData.painAreas.back.map(area => (
                      <li key={area.id + '-back'} className="flex items-center">
                        <span className="mr-2">•</span>
                        <span>{area.name || 'Без названия'} — <span className="font-bold text-vista-accent">{area.painLevel}/10</span> <span className="text-xs text-vista-light/60">(сзади)</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Кнопка отправки */}
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid}
                className="w-full mt-6 py-4 text-lg"
              >
                Отправить ответ
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
} 