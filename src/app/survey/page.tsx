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
import { MorningSurveyForm } from '@/components/surveys/forms/MorningSurveyForm';
import { RPESurveyForm } from '@/components/surveys/forms/RPESurveyForm';

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

// Переводы
const translations = {
  ru: {
    init: 'Инициализация...',
    loadingSurvey: 'Загрузка опросника...',
    notFound: 'Не удалось найти актуальный опросник для клуба. Обратитесь к тренеру.',
    pinLabel: 'Введите ваш 6-значный пинкод',
    pinHint: 'Пинкод выдается тренером или в личном кабинете',
    pinError: 'Пинкод не найден. Проверьте правильность ввода.',
    pinButton: 'Войти',
    pinLoading: 'Загрузка игрока...',
    pinChecking: 'Проверка...',
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
    successTitle: 'Опрос успешно отправлен!',
    successDesc: 'Ваши ответы сохранены в системе',
    close: 'Закрыть опросник',
  },
  en: {
    init: 'Initialization...',
    loadingSurvey: 'Loading survey...',
    notFound: 'No active survey found for your club. Contact your coach.',
    pinLabel: 'Enter your 6-digit pin code',
    pinHint: 'Pin code is provided by your coach or in your account',
    pinError: 'Pin code not found. Please check your input.',
    pinButton: 'Login',
    pinLoading: 'Loading player...',
    pinChecking: 'Checking...',
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
    successTitle: 'Survey submitted!',
    successDesc: 'Your answers have been saved',
    close: 'Close survey',
  }
};

const SURVEY_FORMS = {
  morning: MorningSurveyForm,
  rpe: RPESurveyForm,
};

type SurveyType = keyof typeof SURVEY_FORMS;

export default function SurveyPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  const surveyIdParam = searchParams.get('surveyId');
  const typeParam = searchParams.get('type') as SurveyType | null;
  const type: SurveyType = typeParam && typeParam in SURVEY_FORMS ? typeParam : 'morning';
  const SurveyForm = SURVEY_FORMS[type];

  const [pinCode, setPinCode] = useState('');
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [surveyId, setSurveyId] = useState<string | null>(surveyIdParam || null);
  const [surveyIdError, setSurveyIdError] = useState<string | null>(null);
  const [loadingSurvey, setLoadingSurvey] = useState(false);
  const [lang, setLang] = useState<'ru' | 'en'>('en');

  useEffect(() => {
    if (!surveyIdParam && tenantId) {
      setLoadingSurvey(true);
      fetch(`/api/survey/active-id?tenantId=${encodeURIComponent(tenantId)}&type=${type}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('Опросник не найден');
          const data = await res.json();
          setSurveyId(data.surveyId);
        })
        .catch(() => {
          setSurveyIdError('Не удалось найти актуальный опросник для клуба. Обратитесь к тренеру.');
        })
        .finally(() => setLoadingSurvey(false));
    }
  }, [surveyIdParam, tenantId, type]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPinError('');
    try {
      const res = await fetch(`/api/survey/player-by-pin?pinCode=${encodeURIComponent(pinCode)}&tenantId=${encodeURIComponent(tenantId || '')}`);
      if (!res.ok) throw new Error('Пинкод не найден');
      const data = await res.json();
      setPlayer(data.player);
      if (data.player?.language === 'en') setLang('en');
    } catch (err) {
      setPinError('Пинкод не найден. Проверьте правильность ввода.');
    } finally {
      setLoading(false);
    }
  };

  if (surveyIdError) {
    return <div className="text-red-500 text-center text-base animate-fade-in mb-4">{surveyIdError}</div>;
  }

  if (!player) {
    return (
      <div className="w-full min-h-screen flex flex-col justify-center items-center bg-vista-dark px-2 py-6">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl mx-auto">
          <Card className="p-6 shadow-lg bg-vista-dark/80 border-vista-secondary/40">
            <form onSubmit={handlePinSubmit} className="flex flex-col gap-6">
              <div className="flex justify-end mb-2">
                <Button
                  type="button"
                  variant={lang === 'en' ? 'default' : 'outline'}
                  className="mr-2 px-3 py-1 text-xs"
                  onClick={() => setLang('en')}
                >EN</Button>
                <Button
                  type="button"
                  variant={lang === 'ru' ? 'default' : 'outline'}
                  className="px-3 py-1 text-xs"
                  onClick={() => setLang('ru')}
                >RU</Button>
              </div>
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
              />
              {pinError && <div className="text-red-500 text-center text-base animate-fade-in">Пинкод не найден. Проверьте правильность ввода.</div>}
              <Button
                type="submit"
                className={`w-full py-4 text-lg bg-vista-accent hover:bg-vista-accent/90 transition ${loading || pinCode.length !== 6 ? 'opacity-70 text-white' : 'text-white'}`}
                style={{
                  backgroundColor: loading || pinCode.length !== 6 ? 'rgba(90, 204, 229, 0.7)' : '#5acce5',
                  color: '#fff',
                  cursor: loading || pinCode.length !== 6 ? 'not-allowed' : 'pointer',
                }}
                disabled={loading || pinCode.length !== 6 || loadingSurvey}
              >
                {loading ? 'Проверяю пинкод...' : 'Войти'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  if (!SurveyForm) {
    return <div className="text-red-500 text-center text-base animate-fade-in mb-4">Опросник не найден для типа: {type}</div>;
  }

  if (!surveyId) {
    return <div className="text-vista-light text-center text-lg animate-fade-in mb-4">Загрузка опросника...</div>;
  }

  return (
    <ErrorBoundary>
    <div className="w-full min-h-screen flex flex-col justify-center items-center bg-vista-dark px-2 py-6">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl mx-auto">
          <div className="text-vista-light text-center text-xs mb-2">{translations[lang].loadingSurvey}</div>
        {surveyIdError && (
          <div className="text-red-500 text-center text-base animate-fade-in mb-4">{surveyIdError}</div>
        )}
          {!player && !loadingSurvey && !surveyIdError ? (
          <Card className="p-6 shadow-lg bg-vista-dark/80 border-vista-secondary/40">
            <form onSubmit={handlePinSubmit} className="flex flex-col gap-6">
              <div className="flex justify-end mb-2">
                <Button
                  type="button"
                  variant={lang === 'en' ? 'default' : 'outline'}
                  className="mr-2 px-3 py-1 text-xs"
                  onClick={() => setLang('en')}
                >EN</Button>
                <Button
                  type="button"
                  variant={lang === 'ru' ? 'default' : 'outline'}
                  className="px-3 py-1 text-xs"
                  onClick={() => setLang('ru')}
                >RU</Button>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-vista-accent/20 mb-2">
                  <Lock className="w-7 h-7 text-vista-accent" />
                </div>
                <Label htmlFor="pinCode" className="text-xl text-vista-light text-center font-semibold">{translations[lang].pinLabel}</Label>
                <span className="text-vista-light/60 text-sm text-center">{translations[lang].pinHint}</span>
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
              />
              {pinError && <div className="text-red-500 text-center text-base animate-fade-in">{translations[lang].pinError}</div>}
              <Button
                type="submit"
                className={`w-full py-4 text-lg bg-vista-accent hover:bg-vista-accent/90 transition ${loading || pinCode.length !== 6 ? 'opacity-70 text-white' : 'text-white'}`}
                style={{
                  backgroundColor: loading || pinCode.length !== 6 ? 'rgba(90, 204, 229, 0.7)' : '#5acce5',
                  color: '#fff',
                  cursor: loading || pinCode.length !== 6 ? 'not-allowed' : 'pointer',
                }}
                  disabled={loading || pinCode.length !== 6 || loadingSurvey}
              >
                  {playerLoading ? translations[lang].pinLoading : loading ? translations[lang].pinChecking : translations[lang].pinButton}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-4 sm:p-6 shadow-lg mt-4">
            {/* Переключатель языка */}
            <div className="flex justify-end mb-2">
              <Button
                type="button"
                variant={lang === 'en' ? 'default' : 'outline'}
                className="mr-2 px-3 py-1 text-xs"
                onClick={() => setLang('en')}
              >EN</Button>
              <Button
                type="button"
                variant={lang === 'ru' ? 'default' : 'outline'}
                className="px-3 py-1 text-xs"
                onClick={() => setLang('ru')}
              >RU</Button>
            </div>
            <div className="space-y-8">
              {/* Длительность сна */}
              <div>
                <Label className="text-vista-light">{translations[lang].sleepDuration}</Label>
                <Slider
                  value={[formData.sleepDuration]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, sleepDuration: value }))}
                  min={0}
                  max={12}
                  step={0.5}
                  className="mt-2"
                />
                <div className="text-vista-light mt-1">{formData.sleepDuration} {translations[lang].hours}</div>
              </div>

              {/* Качество сна */}
              <div>
                <Label className="text-vista-light">{translations[lang].sleepQuality}</Label>
                <div className="mt-2">
                  <RatingTiles
                    value={formData.sleepQuality}
                    onChange={(value) => setFormData(prev => ({ ...prev, sleepQuality: value }))}
                  />
                </div>
              </div>

              {/* Восстановление сил */}
              <div>
                <Label className="text-vista-light">{translations[lang].recovery}</Label>
                <div className="mt-2">
                  <RatingTiles
                    value={formData.recovery}
                    onChange={(value) => setFormData(prev => ({ ...prev, recovery: value }))}
                  />
                </div>
              </div>

              {/* Настроение */}
              <div>
                <Label className="text-vista-light">{translations[lang].mood}</Label>
                <div className="mt-2">
                  <RatingTiles
                    value={formData.mood}
                    onChange={(value) => setFormData(prev => ({ ...prev, mood: value }))}
                  />
                </div>
              </div>

              {/* Мышечное состояние */}
              <div>
                <Label className="text-vista-light">{translations[lang].muscleCondition}</Label>
                <div className="mt-2">
                  <RatingTiles
                    value={formData.muscleCondition}
                    onChange={(value) => setFormData(prev => ({ ...prev, muscleCondition: value }))}
                  />
                </div>
              </div>

              {/* Боль */}
              <div>
                <Label className="text-vista-light">{translations[lang].hasPain}</Label>
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
                    <Label htmlFor="pain-yes" className="text-vista-light">{translations[lang].yes}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="pain-no" />
                    <Label htmlFor="pain-no" className="text-vista-light">{translations[lang].no}</Label>
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
                      {translations[lang].front}
                    </Button>
                    <Button
                      variant={view === 'back' ? 'default' : 'outline'}
                      onClick={() => setView('back')}
                    >
                      {translations[lang].back}
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
                  <h3 className="font-medium mb-2">{translations[lang].selectedAreas}</h3>
                  <ul className="list-disc list-inside">
                    {formData.painAreas.front.map(area => (
                      <li key={area.id + '-front'} className="flex items-center gap-2">
                        <span className="mr-2">•</span>
                        <span>{area.name || translations[lang].unnamed} — <span className="font-bold text-vista-accent">{area.painLevel}/10</span> <span className="text-xs text-vista-light/60">(спереди)</span></span>
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
                          title={translations[lang].remove}
                        >✕</button>
                      </li>
                    ))}
                    {formData.painAreas.back.map(area => (
                      <li key={area.id + '-back'} className="flex items-center gap-2">
                        <span className="mr-2">•</span>
                        <span>{area.name || translations[lang].unnamed} — <span className="font-bold text-vista-accent">{area.painLevel}/10</span> <span className="text-xs text-vista-light/60">(сзади)</span></span>
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
                          title={translations[lang].remove}
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
                {translations[lang].submit}
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
              <h3 className="text-xl font-semibold text-vista-light mb-2">{translations[lang].successTitle}</h3>
              <p className="text-vista-light/70 mb-6">{translations[lang].successDesc}</p>
              <Button
                onClick={() => window.close()}
                className="w-full bg-vista-accent hover:bg-vista-accent/90 text-white"
              >
                {translations[lang].close}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
} 