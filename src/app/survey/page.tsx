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
import { Lock } from 'lucide-react';
import React from 'react';

interface PainArea {
  id: string;
  name: string;
}

class ErrorBoundary extends React.Component<any, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    // Можно логировать ошибку на сервер
    // console.error(error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#fff', color: 'red', padding: 24, fontSize: 20, fontWeight: 'bold' }}>
          Ошибка: {this.state.error?.message || String(this.state.error)}
        </div>
      );
    }
    return this.props.children;
  }
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

  const [surveyIdState, setSurveyIdState] = useState<string | null>(surveyId || null);
  const [surveyIdError, setSurveyIdError] = useState<string | null>(null);

  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [progress, setProgress] = useState<string>('Инициализация...');

  useEffect(() => {
    setProgress('Инициализация...');
    if (!surveyId && tenantId) {
      setLoadingSurvey(true);
      setProgress('Получаю surveyId...');
      fetch(`/api/survey/active-id?tenantId=${encodeURIComponent(tenantId)}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('Опросник не найден');
          const data = await res.json();
          setSurveyIdState(data.surveyId);
          setProgress('Получен surveyId, загружаю форму...');
        })
        .catch(() => {
          setSurveyIdError('Не удалось найти актуальный опросник для клуба. Обратитесь к тренеру.');
          setProgress('Ошибка при получении surveyId');
        })
        .finally(() => setLoadingSurvey(false));
    } else if (surveyId) {
      setProgress('surveyId уже есть, загружаю форму...');
    }
  }, [surveyId, tenantId]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerLoading(true);
    setLoading(true);
    setPinError('');
    setProgress('Загружаю игрока по пинкоду...');
    try {
      const res = await fetch(`/api/survey/player-by-pin?pinCode=${encodeURIComponent(pinCode)}&tenantId=${encodeURIComponent(tenantId || '')}`);
      if (!res.ok) throw new Error('Пинкод не найден');
      const data = await res.json();
      setPlayer(data.player);
      setProgress('Игрок найден, готов к заполнению опроса');
    } catch (err) {
      setPinError('Пинкод не найден. Проверьте правильность ввода.');
      setProgress('Ошибка при загрузке игрока');
    } finally {
      setLoading(false);
      setPlayerLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!player || !surveyIdState) return;
    try {
      const response = await fetch('/api/survey/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          surveyId: surveyIdState,
          tenantId,
          playerId: player.id,
        }),
      });
      if (!response.ok) throw new Error('Failed to submit survey');
      toast({ title: 'Успешно!', description: 'Ваши ответы сохранены' });
      setShowSuccessModal(true);
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
    )) &&
    !!surveyIdState && !surveyIdError;

  return (
    <ErrorBoundary>
    <div className="w-full min-h-screen flex flex-col justify-center items-center bg-vista-dark px-2 py-6">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl mx-auto">
          <div className="text-vista-light text-center text-xs mb-2">{progress}</div>
          {loadingSurvey && (
            <div className="text-vista-light text-center text-lg animate-fade-in mb-4">Загрузка опросника...</div>
          )}
        {surveyIdError && (
          <div className="text-red-500 text-center text-base animate-fade-in mb-4">{surveyIdError}</div>
        )}
          {!player && !loadingSurvey && !surveyIdError ? (
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
                  disabled={loading || loadingSurvey}
                placeholder="000000"
                  onFocus={() => setProgress('Готов к вводу пинкода')}
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
                  disabled={loading || pinCode.length !== 6 || loadingSurvey}
                  onClick={() => setProgress('Проверяю пинкод...')}
              >
                  {playerLoading ? 'Загрузка игрока...' : loading ? 'Проверка...' : 'Войти'}
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
                      <li key={area.id + '-front'} className="flex items-center gap-2">
                        <span className="mr-2">•</span>
                        <span>{area.name || 'Без названия'} — <span className="font-bold text-vista-accent">{area.painLevel}/10</span> <span className="text-xs text-vista-light/60">(спереди)</span></span>
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
                          title="Удалить зону"
                        >✕</button>
                      </li>
                    ))}
                    {formData.painAreas.back.map(area => (
                      <li key={area.id + '-back'} className="flex items-center gap-2">
                        <span className="mr-2">•</span>
                        <span>{area.name || 'Без названия'} — <span className="font-bold text-vista-accent">{area.painLevel}/10</span> <span className="text-xs text-vista-light/60">(сзади)</span></span>
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
                          title="Удалить зону"
                        >✕</button>
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

        {/* Модальное окно успешной отправки */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-vista-dark border border-vista-secondary/40 rounded-lg p-6 max-w-md w-full text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-vista-light mb-2">Опрос успешно отправлен!</h3>
              <p className="text-vista-light/70 mb-6">Ваши ответы сохранены в системе</p>
              <Button
                onClick={() => window.close()}
                className="w-full bg-vista-accent hover:bg-vista-accent/90 text-white"
              >
                Закрыть опросник
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
} 