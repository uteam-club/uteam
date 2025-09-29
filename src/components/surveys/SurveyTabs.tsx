"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';
import { format } from 'date-fns';
import { RPESchedulingModal } from './RPESchedulingModal';
import { MorningSurveyRecipientsModal } from './MorningSurveyRecipientsModal';
import { TeamSelect } from '@/components/ui/team-select';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { MUSCLE_NAMES } from '@/lib/constants';
import { DateBasedTrainingDurationModal } from './DateBasedTrainingDurationModal';

interface Team {
  id: string;
  name: string;
  clubId: string;
}

function TelegramBotSettings({ type = 'morning' }: { type?: 'morning' | 'rpe' }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [showInstruction, setShowInstruction] = useState(false);
  
  // Состояние для модала планирования RPE (только для type === 'rpe')
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [selectedTeamForScheduling, setSelectedTeamForScheduling] = useState<{ id: string; name: string } | null>(null);

  // Состояние для модала выбора получателей (только для type === 'morning')
  const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
  const [selectedTeamForRecipients, setSelectedTeamForRecipients] = useState<{ id: string; name: string } | null>(null);

  // Загрузка всех команд и их расписаний рассылки
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const teamsRes = await fetch('/api/teams');
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
        const schedRes = await fetch(`/api/survey/schedules?type=${type}`);
        const schedData = await schedRes.json();
        setSchedules(schedData);
      } catch (e) {
        toast({ title: 'Ошибка', description: 'Ошибка загрузки данных', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Обновить время/статус рассылки для команды
  const handleSave = async (teamId: string, time: string, enabled: boolean) => {
    setSaving(teamId);
    try {
      const res = await fetch('/api/telegram/broadcast-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, time, enabled, type }), // добавлен type
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Настройки сохранены', variant: 'default' });
        setSchedules(schedules => schedules.map(s => s.teamId === teamId ? { ...s, sendTime: time, enabled } : s));
      } else {
        toast({ title: 'Ошибка', description: data.error || 'Ошибка сохранения', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Ошибка', description: 'Ошибка сохранения', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };


  // Открыть модал планирования RPE
  const handleOpenScheduling = (team: Team) => {
    setSelectedTeamForScheduling({ id: team.id, name: team.name });
    setIsSchedulingModalOpen(true);
  };

  // Открыть модал выбора получателей
  const handleOpenRecipientsModal = (team: Team) => {
    console.log('Opening recipients modal for team:', team);
    setSelectedTeamForRecipients({ id: team.id, name: team.name });
    setIsRecipientsModalOpen(true);
  };

  return (
    <div className="p-0 md:p-6 bg-vista-dark/60 border border-vista-secondary/30 rounded-lg mb-6">
      <div className="flex flex-row items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-vista-light">{t('morningSurveyTabs.settings_title')}</h3>
        <div className="flex gap-2">
          <Dialog open={showInstruction} onOpenChange={setShowInstruction}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full sm:w-[200px] bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 font-normal text-sm shadow-lg"
                onClick={() => setShowInstruction(true)}
              >
                {t('morningSurveyTabs.instruction')}
              </Button>
            </DialogTrigger>
            <DialogContent className="p-0 bg-transparent border-none shadow-none">
              <div className="bg-vista-dark/90 border-vista-secondary/30 shadow-xl rounded-lg p-6">
                <h4 className="text-vista-light text-lg font-bold mb-2">{t('morningSurveyTabs.instruction_title')}</h4>
                <ol className="list-decimal list-inside text-vista-light/80 mb-4 space-y-1">
                  <li>{t('morningSurveyTabs.instruction_step1')}</li>
                  <li>{t('morningSurveyTabs.instruction_step2')}</li>
                  <li>{t('morningSurveyTabs.instruction_step3')}</li>
                </ol>
                <div className="flex justify-end">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20">{t('morningSurveyTabs.close')}</Button>
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {teams.map(team => {
          const schedule = schedules.find(s => s.teamId === team.id) || { sendTime: '08:00', enabled: true };
          return (
            <div key={team.id} className="bg-vista-dark/30 border border-vista-secondary/20 rounded-lg p-4 hover:bg-vista-secondary/10 transition-colors">
              <div className="space-y-3">
                {/* Название команды */}
                <h3 className="text-vista-light font-medium text-sm text-center">{team.name}</h3>
                
                {type === 'rpe' ? (
                  /* RPE опросник - только кнопка планирования */
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full h-9 bg-transparent border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 px-3 font-normal text-sm"
                      onClick={() => handleOpenScheduling(team)}
                      disabled={loading}
                    >
                      Запланировать рассылки
                    </Button>
                  </div>
                ) : (
                  /* Утренний опросник - полная структура */
                  <div className="space-y-3">
                    {/* Время рассылки и кнопка выбора получателей */}
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={schedule.sendTime}
                        onChange={e => setSchedules(schedules => schedules.map(s => s.teamId === team.id ? { ...s, sendTime: e.target.value } : s))}
                        className="flex-1 px-2 py-1 rounded border border-vista-secondary/50 bg-vista-dark/40 text-vista-light focus:ring-2 focus:ring-vista-accent text-sm"
                        disabled={saving === team.id}
                      />
                      <Button
                        variant="outline"
                        className="flex-1 px-3 py-1 rounded bg-vista-secondary/10 text-vista-light/40 hover:bg-vista-accent hover:text-white disabled:opacity-60 border border-vista-secondary/20 text-xs transition-colors opacity-70 hover:opacity-100"
                        onClick={() => handleOpenRecipientsModal(team)}
                        disabled={saving === team.id}
                      >
                        Получатели
                      </Button>
                    </div>
                    
                    {/* Статус рассылки, переключатель и кнопка сохранения */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={schedule.enabled ? 
                        'text-emerald-400 font-semibold text-xs' : 
                        'text-red-400 font-semibold text-xs'
                      }>
                        {schedule.enabled ? t('morningSurveyTabs.enabled') : t('morningSurveyTabs.disabled')}
                      </span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={e => setSchedules(schedules => schedules.map(s => s.teamId === team.id ? { ...s, enabled: e } : s))}
                          disabled={saving === team.id}
                          className="data-[state=checked]:bg-vista-primary data-[state=unchecked]:bg-vista-secondary"
                        />
                        <Button
                          variant="outline"
                          className="w-full h-9 bg-transparent border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 px-3 font-normal text-sm"
                          onClick={() => handleSave(team.id, schedule.sendTime, schedule.enabled)}
                          disabled={saving === team.id}
                        >
                          {saving === team.id ? t('morningSurveyTabs.saving') : t('morningSurveyTabs.save')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Модал планирования RPE (только для type === 'rpe') */}
      {type === 'rpe' && (
        <RPESchedulingModal
          open={isSchedulingModalOpen}
          onOpenChange={setIsSchedulingModalOpen}
          team={selectedTeamForScheduling}
          onScheduleUpdated={() => {
            // Можно здесь обновить данные или показать уведомление
            toast({ title: 'Расписание обновлено', variant: 'default' });
          }}
        />
      )}

      {/* Модал выбора получателей (только для type === 'morning') */}
      {type === 'morning' && (
        <MorningSurveyRecipientsModal
          open={isRecipientsModalOpen}
          onOpenChange={setIsRecipientsModalOpen}
          teamId={selectedTeamForRecipients?.id || ''}
          teamName={selectedTeamForRecipients?.name || ''}
          onRecipientsUpdate={() => {
            // Можно здесь обновить данные или показать уведомление
            toast({ title: 'Получатели обновлены', variant: 'default' });
          }}
        />
      )}
    </div>
  );
}

interface SurveyTabsProps {
  type?: 'morning' | 'rpe';
}

export function SurveyTabs({ type = 'morning' }: SurveyTabsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'ru';
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState<string>(todayStr);
  const [players, setPlayers] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [resending, setResending] = useState<string | null>(null);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationSettings, setDurationSettings] = useState<{
    globalDuration: number | null;
    individualDurations: Record<string, number>;
  }>({
    globalDuration: null,
    individualDurations: {}
  });
  
  // Состояние для отслеживания развернутых болевых зон игроков
  const [expandedPainAreas, setExpandedPainAreas] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('analysis');

  // Загрузка команд
  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch('/api/teams');
        const data = await res.json();
        setTeams(data);
        if (data.length > 0) {
          setSelectedTeam(data[0].id);
        }
      } catch (e) {
        console.error('Ошибка загрузки команд:', e);
      }
    }
    fetchTeams();
  }, []);

  // Загружаем настройки длительности
  useEffect(() => {
    if (type === 'rpe' && selectedTeam && date) {
      loadDurationSettings();
    }
  }, [type, selectedTeam, date]);

  const loadDurationSettings = async () => {
    if (!selectedTeam || !date) return;
    
    try {
      const response = await fetch(`/api/surveys/rpe/duration?teamId=${selectedTeam}&date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setDurationSettings({
          globalDuration: data.globalDuration || null,
          individualDurations: data.individualDurations || {}
        });
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек длительности:', error);
    }
  };

  const handleDurationUpdate = () => {
    loadDurationSettings();
  };

  // Загрузка игроков выбранной команды
  useEffect(() => {
    if (!selectedTeam) return;
    fetch(`/api/teams/${selectedTeam}/players`)
      .then(res => res.json())
      .then(setPlayers);
  }, [selectedTeam]);

  // Загрузка ответов на опросник по команде и дате
  useEffect(() => {
    if (!selectedTeam) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ teamId: selectedTeam });
    if (date) {
      // Формируем диапазон на весь день
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      params.append('startDate', start.toISOString());
      params.append('endDate', end.toISOString());
    }
    fetch(`/api/surveys/${type}?${params.toString()}`)
      .then(res => res.json())
      .then(setResponses)
      .catch(e => setError(e.message || 'Ошибка при загрузке ответов'))
      .finally(() => setLoading(false));
  }, [selectedTeam, date, type]);

  // Сопоставление: playerId -> response
  const safeResponses = Array.isArray(responses) ? responses : [];
  const responseByPlayerId = Object.fromEntries(safeResponses.map(r => [r.playerId, r]));

  const today = new Date();
  today.setHours(0,0,0,0);
  const selectedDate = new Date(date);
  selectedDate.setHours(0,0,0,0);
  let filteredPlayers: any[] = [];
  if (selectedDate <= today) {
    filteredPlayers = players.filter(player => {
      if (!player.createdAt) return false;
      const created = new Date(player.createdAt);
      created.setHours(0,0,0,0);
      return created <= selectedDate;
    });
  }

  // Функция для переключения развернутого состояния болевых зон
  const togglePainAreasExpansion = (playerId: string) => {
    setExpandedPainAreas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  // Функция для определения цвета среднего значения (улучшенная логика с плавными переходами)
  const getAverageValueColor = (value: number, key?: string) => {
    if (key === "sleepDuration") {
      // Для сна: < 6.5 - красный, < 7.5 - оранжевый, >= 7.5 - зелёный
      return value < 6.5 
        ? 'text-red-500' 
        : value < 7.5 
          ? 'text-amber-500' 
          : 'text-emerald-500';
    } else if (key === "rpe") {
      // Для RPE: <= 2.5 - отлично, <= 4.5 - хорошо, <= 6.5 - средне, <= 8.5 - тяжело, > 8.5 - очень тяжело
      return value <= 2.5 
        ? 'text-emerald-400' 
        : value <= 4.5 
          ? 'text-green-400'
          : value <= 6.5 
            ? 'text-yellow-400'
            : value <= 8.5 
              ? 'text-orange-400'
              : 'text-red-500';
    } else {
      // Для остальных оценок: < 2.5 - красный, < 3.5 - оранжевый, >= 3.5 - зелёный
      return value < 2.5 
        ? 'text-red-500' 
        : value < 3.5 
          ? 'text-amber-500' 
          : 'text-emerald-500';
    }
  };

  // Функция для рендера болевых зон
  const renderPainAreas = (painAreas: any[], playerId: string) => {
    if (!painAreas || painAreas.length === 0) {
      return <span className="invisible">-</span>;
    }

    const isExpanded = expandedPainAreas.has(playerId);
    const maxVisible = 2;
    const visibleAreas = isExpanded ? painAreas : painAreas.slice(0, maxVisible);
    const hiddenCount = painAreas.length - maxVisible;

    const renderPainArea = (area: any, idx: number) => {
      // Определяем view (front/back) по id: если есть в MUSCLE_NAMES.front, иначе back
      let view: 'front' | 'back' = 'front';
      if (MUSCLE_NAMES.back[area.id as keyof typeof MUSCLE_NAMES.back]) view = 'back';
      const localizedName = MUSCLE_NAMES[view][area.id as keyof typeof MUSCLE_NAMES[typeof view]]?.[lang] || area.areaName || '';
      
      return (
        <div key={idx} className={`inline-flex items-center rounded-lg shadow-sm border h-6 max-w-[120px] text-xs font-medium transition-all duration-300 overflow-hidden backdrop-blur-sm hover:shadow-md ${
          area.painLevel >= 7 
            ? 'bg-gradient-to-r from-red-50/90 via-red-50/80 to-red-100/90 border-red-200/60 text-red-900 hover:border-red-300/80' 
            : area.painLevel >= 4 
              ? 'bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-orange-100/90 border-amber-200/60 text-amber-900 hover:border-amber-300/80' 
              : 'bg-gradient-to-r from-emerald-50/90 via-green-50/80 to-green-100/90 border-emerald-200/60 text-emerald-900 hover:border-emerald-300/80'
        }`}>
          {/* Левая часть с оценкой */}
          <div className={`flex items-center justify-center min-w-[18px] h-full text-white font-bold text-xs rounded-l-lg ${
            area.painLevel >= 7 
              ? 'bg-gradient-to-br from-red-500 to-red-600' 
              : area.painLevel >= 4 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                : 'bg-gradient-to-br from-emerald-500 to-green-600'
          }`}>
            {area.painLevel}
          </div>
          {/* Правая часть с названием */}
          <div className="flex-1 px-1.5 py-0.5 min-w-0">
            <span className="whitespace-nowrap truncate block text-ellipsis overflow-hidden">{localizedName}</span>
          </div>
        </div>
      );
    };

    if (painAreas.length <= maxVisible) {
      // Если зон не больше 2, просто показываем их в ряд
      return (
        <div className="flex flex-nowrap gap-1 items-center">
          {painAreas.map((area, idx) => renderPainArea(area, idx))}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {/* Первая строка: первые 2 зоны + кнопка +N */}
        <div className="flex flex-nowrap gap-1 items-center">
          {visibleAreas.slice(0, maxVisible).map((area, idx) => renderPainArea(area, idx))}
          {!isExpanded && hiddenCount > 0 && (
            <button
              onClick={() => togglePainAreasExpansion(playerId)}
              className="inline-flex items-center px-2 py-0.5 bg-vista-secondary/30 text-vista-light hover:bg-vista-secondary/50 rounded-full text-xs font-semibold transition-colors"
            >
              +{hiddenCount}
            </button>
          )}
        </div>
        
        {/* Дополнительные строки (если развернуто) */}
        {isExpanded && painAreas.length > maxVisible && (
          <div className="space-y-1">
            {/* Группируем оставшиеся зоны по 2 */}
            {Array.from({ length: Math.ceil((painAreas.length - maxVisible) / 2) }, (_, rowIndex) => {
              const startIdx = maxVisible + rowIndex * 2;
              const endIdx = Math.min(startIdx + 2, painAreas.length);
              const rowAreas = painAreas.slice(startIdx, endIdx);
              
              return (
                <div key={rowIndex} className="flex flex-nowrap gap-1 items-center">
                  {rowAreas.map((area, idx) => renderPainArea(area, startIdx + idx))}
                  {/* Кнопка "свернуть" на последней строке */}
                  {rowIndex === Math.ceil((painAreas.length - maxVisible) / 2) - 1 && (
                    <button
                      onClick={() => togglePainAreasExpansion(playerId)}
                      className="inline-flex items-center px-2 py-0.5 bg-vista-secondary/30 text-vista-light hover:bg-vista-secondary/50 rounded-full text-xs font-semibold transition-colors"
                    >
                      ↑
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          variant="outline"
          className={`flex items-center gap-2 h-8 px-3 text-sm font-normal transition-none ${
            activeTab === 'analysis'
              ? 'bg-vista-primary/15 text-vista-primary border-vista-primary'
              : 'bg-transparent text-vista-light/60 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40'
          }`}
          onClick={() => setActiveTab('analysis')}
        >
          {t('morningSurveyTabs.analysis')}
        </Button>
        <Button
          variant="outline"
          className={`flex items-center gap-2 h-8 px-3 text-sm font-normal transition-none ${
            activeTab === 'settings'
              ? 'bg-vista-primary/15 text-vista-primary border-vista-primary'
              : 'bg-transparent text-vista-light/60 border-vista-light/20 hover:bg-vista-light/10 hover:text-vista-light hover:border-vista-light/40'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          {t('morningSurveyTabs.settings')}
        </Button>
      </div>
      {/* Контент вкладок */}
      <div className="mt-6">
        {activeTab === 'analysis' && (
          <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
          <div className="flex flex-wrap gap-2 mb-4 items-end">
            <div className="min-w-[220px]">
              <TeamSelect teams={teams} value={selectedTeam} onChange={setSelectedTeam} />
            </div>
            <div className="min-w-[150px]">
              <div className="flex items-center gap-2">
                <Input
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="w-full bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/60 hover:bg-vista-light/10 hover:border-vista-light/40 focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-9 px-3 py-0 font-normal text-sm shadow-lg [&::-webkit-calendar-picker-indicator]:text-vista-primary [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:saturate-100 [&::-webkit-calendar-picker-indicator]:hue-rotate-[180deg]"
                />
                
                {/* Кнопка для указания времени тренировки */}
                {type === 'rpe' && (
                  <button
                    onClick={() => setShowDurationModal(true)}
                    className="px-3 py-2 bg-vista-secondary text-vista-light rounded-md hover:bg-vista-secondary/80 transition-colors flex items-center gap-2 h-8"
                    title="Указать время тренировки"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">Время</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-vista-light/70">{t('morningSurveyTabs.loading')}</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : players.length === 0 ? (
            <div className="text-vista-light/70">{t('morningSurveyTabs.no_players')}</div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              {type === 'rpe' ? (
                <table className="min-w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md">
                  <thead>
                    <tr className="bg-vista-dark/70 text-xs">
                      <th className="px-3 py-2 border-b border-vista-secondary/30 text-left whitespace-nowrap text-xs font-normal tracking-tight">{t('morningSurveyTabs.player')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal w-[70px] tracking-tight">{t('morningSurveyTabs.rpe_score')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal w-[70px] tracking-tight">Длительность (мин)</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal w-[70px] tracking-tight">Нагрузка (RPE×Время)</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">{t('morningSurveyTabs.status')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">{t('morningSurveyTabs.time')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">{t('morningSurveyTabs.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers
                      .sort((a, b) => {
                        const aHasResponse = !!responseByPlayerId[a.id];
                        const bHasResponse = !!responseByPlayerId[b.id];
                        // Сначала те, кто прошёл опросник (true), потом те, кто не прошёл (false)
                        return (bHasResponse ? 1 : 0) - (aHasResponse ? 1 : 0);
                      })
                      .map(player => {
                      const resp = responseByPlayerId[player.id];
                      const playerDuration = resp ? (durationSettings?.individualDurations?.[player.id] || durationSettings?.globalDuration) : null;
                      const workload = resp && playerDuration ? resp.rpeScore * playerDuration : null;
                      
                      return (
                        <tr key={player.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10 min-h-[36px]">
                          <td className="px-3 py-0.5 whitespace-nowrap text-xs min-h-[36px] flex items-center">{player.lastName} {player.firstName}</td>
                          <td className="px-2 py-0.5 text-center align-middle w-[70px]">
                            {resp ? (
                              <span className={`inline-block rounded-lg border-0 text-sm font-bold w-14 h-6 flex items-center justify-center transition-all duration-200 mx-auto ${
                                resp.rpeScore <= 2 
                                  ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white' 
                                  : resp.rpeScore <= 4 
                                    ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                                    : resp.rpeScore <= 6 
                                      ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white'
                                      : resp.rpeScore <= 8 
                                        ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                                        : 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                              }`}>{resp.rpeScore}</span>
                            ) : (
                              <span className="text-vista-light/50 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-2 py-0.5 text-center align-middle text-xs w-[70px]">
                            {resp && playerDuration ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-vista-primary/20 text-vista-primary text-xs">
                                {playerDuration} мин
                              </span>
                            ) : resp ? (
                              <span className="text-vista-light/50 text-xs">Не задано</span>
                            ) : (
                              <span className="text-vista-light/50 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-2 py-0.5 text-center align-middle text-xs w-[70px]">
                            {workload ? (
                              <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-medium ${
                                workload <= 20 ? 'bg-green-500' :
                                workload <= 40 ? 'bg-yellow-500' :
                                workload <= 60 ? 'bg-orange-500' : 'bg-red-500'
                              }`}>
                                {workload}
                              </span>
                            ) : (
                              <span className="text-vista-light/50 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-2 py-0.5 text-center align-middle text-xs">
                            {resp ? (
                              <div className="flex justify-center">
                                <div className="w-5 h-5 rounded-full border border-emerald-400 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <div className="w-5 h-5 rounded-full border border-red-400 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-0.5 text-center align-middle text-xs">{resp ? formatDateTime(resp.createdAt) : '-'}</td>
                          <td className="px-2 py-0.5 text-center align-middle">
                            <button
                              className="px-2 py-0.5 rounded bg-vista-secondary/10 text-vista-light/40 hover:bg-vista-accent hover:text-white disabled:opacity-60 border border-vista-secondary/20 text-[10px] transition-colors opacity-70 hover:opacity-100 whitespace-nowrap"
                              disabled={!!resending}
                              onClick={async () => {
                                setResending(player.id);
                                try {
                                  const res = await fetch('/api/surveys/rpe', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ playerId: player.id, teamId: selectedTeam, date }),
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    toast({ title: 'Опрос отправлен', description: `${t('morningSurveyTabs.survey_sent_to')} ${player.lastName} ${player.firstName}` });
                                  } else {
                                    toast({ title: 'Ошибка', description: data.error || 'Не удалось отправить опрос', variant: 'destructive' });
                                  }
                                } catch (e) {
                                  toast({ title: 'Ошибка', description: String(e), variant: 'destructive' });
                                } finally {
                                  setResending(null);
                                }
                              }}
                            >{resending === player.id ? t('morningSurveyTabs.resending') : t('morningSurveyTabs.resend')}</button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Среднее значение */}
                    <tr className="bg-vista-dark/80 font-bold">
                      <td className="px-3 py-2 text-center text-xs">{t('morningSurveyTabs.average')}</td>
                      <td className="px-2 py-2 text-center align-middle text-xs">
                        {(() => {
                          const completedPlayers = filteredPlayers.filter(p => responseByPlayerId[p.id]);
                          if (completedPlayers.length === 0) return '';
                          const average = completedPlayers.reduce((acc, p) => acc + (responseByPlayerId[p.id]?.rpeScore || 0), 0) / completedPlayers.length;
                          return <span className={`font-bold ${getAverageValueColor(average, 'rpe')}`}>{average.toFixed(2)}</span>;
                        })()}
                      </td>
                      <td className="px-2 py-2 text-center align-middle text-xs">
                        {(() => {
                          const completedPlayers = filteredPlayers.filter(p => responseByPlayerId[p.id]);
                          if (completedPlayers.length === 0) return '';
                          
                          const totalDuration = completedPlayers.reduce((acc, p) => {
                            const resp = responseByPlayerId[p.id];
                            const playerDuration = resp ? (durationSettings?.individualDurations?.[p.id] || durationSettings?.globalDuration) : null;
                            return acc + (playerDuration || 0);
                          }, 0);
                          
                          return totalDuration > 0 ? `${Math.round(totalDuration / completedPlayers.length)} мин` : '';
                        })()}
                      </td>
                      <td className="px-2 py-0.5 text-center align-middle text-xs">
                        {(() => {
                          const completedPlayers = filteredPlayers.filter(p => responseByPlayerId[p.id]);
                          if (completedPlayers.length === 0) return '';
                          
                          const totalWorkload = completedPlayers.reduce((acc, p) => {
                            const resp = responseByPlayerId[p.id];
                            const playerDuration = durationSettings?.individualDurations?.[p.id] || durationSettings?.globalDuration;
                            return acc + (resp && playerDuration ? resp.rpeScore * playerDuration : 0);
                          }, 0);
                          
                          return totalWorkload > 0 ? (totalWorkload / completedPlayers.length).toFixed(1) : '';
                        })()}
                      </td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md">
                  <thead>
                    <tr className="bg-vista-dark/70 text-xs">
                      <th className="px-3 py-2 border-b border-vista-secondary/30 text-left whitespace-nowrap text-xs font-normal tracking-tight">{t('morningSurveyTabs.player')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal w-[70px] tracking-tight">{t('morningSurveyTabs.sleep_duration')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal w-[70px] tracking-tight">{t('morningSurveyTabs.sleep_quality')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal w-[70px] tracking-tight">{t('morningSurveyTabs.recovery')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal w-[70px] tracking-tight">{t('morningSurveyTabs.mood')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal w-[70px] tracking-tight">{t('morningSurveyTabs.muscle_condition')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap min-w-[180px] text-xs font-normal tracking-tight">{t('morningSurveyTabs.pain')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">Статус</th>
                      <th className="px-2 py-2 border-b border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">{t('morningSurveyTabs.time')}</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs font-normal tracking-tight">{t('morningSurveyTabs.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers
                      .sort((a, b) => {
                        const aHasResponse = !!responseByPlayerId[a.id];
                        const bHasResponse = !!responseByPlayerId[b.id];
                        // Сначала те, кто прошёл опросник (true), потом те, кто не прошёл (false)
                        return (bHasResponse ? 1 : 0) - (aHasResponse ? 1 : 0);
                      })
                      .map(player => {
                      const resp = responseByPlayerId[player.id];
                      return (
                        <tr key={player.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10 min-h-[36px]">
                          <td className="px-3 py-0.5 whitespace-nowrap text-xs min-h-[36px] flex items-center">{player.lastName} {player.firstName}</td>
                          {/* Плитки оценок */}
                          {["sleepDuration","sleepQuality","recovery","mood","muscleCondition"].map((key, idx) => (
                            <td key={key} className={`px-2 py-0.5 text-center align-middle min-h-[36px] w-[70px]`}>
                              {resp ? (
                                <span className={`inline-block rounded-lg border-0 text-sm font-bold w-14 h-6 flex items-center justify-center transition-all duration-200 mx-auto ${
                                  resp[key] < (key==="sleepDuration"?7:3) 
                                    ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' 
                                    : resp[key]<(key==="sleepDuration"?8:4) 
                                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' 
                                      : 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                                }`}>{resp[key]}</span>
                              ) : (
                                <span className="text-vista-light/50 text-sm">-</span>
                              )}
                            </td>
                          ))}
                          {/* Болевые зоны */}
          <td className="px-2 py-0.5 min-w-[220px] max-w-[280px] min-h-[36px] flex items-center">
                            {renderPainAreas(resp?.painAreas || [], player.id)}
                          </td>
                          <td className="px-2 py-0.5 text-center align-middle text-xs">
                            {resp ? (
                              <div className="flex justify-center">
                                                              <div className="w-5 h-5 rounded-full border border-emerald-400 flex items-center justify-center">
                                <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <div className="w-5 h-5 rounded-full border border-red-400 flex items-center justify-center">
                                <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-0.5 text-center align-middle text-xs">{resp ? formatDateTime(resp.createdAt) : '-'}</td>
                          <td className="px-2 py-0.5 text-center align-middle">
                            <button
                              className="px-2 py-0.5 rounded bg-vista-secondary/10 text-vista-light/40 hover:bg-vista-accent hover:text-white disabled:opacity-60 border border-vista-secondary/20 text-[10px] transition-colors opacity-70 hover:opacity-100 whitespace-nowrap"
                              disabled={!!resending}
                              onClick={async () => {
                                setResending(player.id);
                                try {
                                  const res = await fetch('/api/surveys/morning', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ playerId: player.id, teamId: selectedTeam, date }),
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    toast({ title: 'Опрос отправлен', description: `${t('morningSurveyTabs.survey_sent_to')} ${player.lastName} ${player.firstName}` });
                                  } else {
                                    toast({ title: 'Ошибка', description: data.error || 'Не удалось отправить опрос', variant: 'destructive' });
                                  }
                                } catch (e) {
                                  toast({ title: 'Ошибка', description: String(e), variant: 'destructive' });
                                } finally {
                                  setResending(null);
                                }
                              }}
                            >{resending === player.id ? t('morningSurveyTabs.resending') : t('morningSurveyTabs.resend')}</button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Средние значения */}
                    <tr className="bg-vista-dark/80 font-bold">
                      <td className="px-3 py-2 text-center text-xs">{t('morningSurveyTabs.average')}</td>
                      {["sleepDuration","sleepQuality","recovery","mood","muscleCondition"].map((key, idx) => (
                        <td key={key} className="px-2 py-2 text-center align-middle text-xs">
                          {(() => {
                            const completedPlayers = filteredPlayers.filter(p => responseByPlayerId[p.id]);
                            if (completedPlayers.length === 0) return '';
                            const average = completedPlayers.reduce((acc, p) => acc + (responseByPlayerId[p.id]?.[key] || 0), 0) / completedPlayers.length;
                            return <span className={`font-bold ${getAverageValueColor(average, key)}`}>{average.toFixed(2)}</span>;
                          })()}
                        </td>
                      ))}
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-0.5"></td>
                      <td className="px-2 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>
        )}
        
        {activeTab === 'settings' && (
          <TelegramBotSettings type={type} />
        )}
      </div>
      {/* Модальное окно для управления длительностью */}
      <DateBasedTrainingDurationModal
        open={showDurationModal}
        onOpenChange={setShowDurationModal}
        teamId={selectedTeam}
        date={date}
        players={players}
        onDurationUpdate={handleDurationUpdate}
      />
    </div>
  );
} 