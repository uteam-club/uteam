"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';
import { format } from 'date-fns';
import { RPESchedulingModal } from './RPESchedulingModal';
import { TeamSelect } from '@/components/ui/team-select';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { MUSCLE_NAMES } from '@/lib/constants';
import { TrainingDurationModal } from './TrainingDurationModal';

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

  // Тестовая рассылка
  const handleTestBroadcast = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/telegram/test-broadcast?type=${type}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Тестовая рассылка выполнена', variant: 'default' });
      } else {
        toast({ title: 'Ошибка', description: data.error || 'Ошибка тестовой рассылки', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Ошибка', description: 'Ошибка тестовой рассылки', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Открыть модал планирования RPE
  const handleOpenScheduling = (team: Team) => {
    setSelectedTeamForScheduling({ id: team.id, name: team.name });
    setIsSchedulingModalOpen(true);
  };

  return (
    <div className="p-0 md:p-6 bg-vista-dark/60 border border-vista-secondary/30 rounded-lg mb-6">
      <div className="flex flex-row items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-vista-light">{t('morningSurveyTabs.settings_title')}</h3>
        <div className="flex gap-2">
          <Dialog open={showInstruction} onOpenChange={setShowInstruction}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20" onClick={() => setShowInstruction(true)}>{t('morningSurveyTabs.instruction')}</Button>
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
          <Button onClick={handleTestBroadcast} disabled={loading} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark rounded-md px-4 py-2 text-sm font-semibold shadow">
            {t('morningSurveyTabs.test_broadcast')}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-vista-secondary/30">
              <th className="px-4 py-2 text-left text-xs text-vista-light/70 font-semibold">{t('morningSurveyTabs.team')}</th>
              {type === 'rpe' ? (
                <>
                  <th className="px-4 py-2 text-left text-xs text-vista-light/70 font-semibold">Статус расписания</th>
                  <th className="px-4 py-2 text-left text-xs text-vista-light/70 font-semibold">Действия</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-2 text-left text-xs text-vista-light/70 font-semibold">{t('morningSurveyTabs.send_time')}</th>
                  <th className="px-4 py-2 text-left text-xs text-vista-light/70 font-semibold">{t('morningSurveyTabs.status')}</th>
                  <th className="px-4 py-2 text-left text-xs text-vista-light/70 font-semibold">{t('morningSurveyTabs.actions')}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {teams.map(team => {
              const schedule = schedules.find(s => s.teamId === team.id) || { sendTime: '08:00', enabled: true };
              return (
                <tr key={team.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                  <td className="px-4 py-2 text-vista-light font-medium text-sm">{team.name}</td>
                  {type === 'rpe' ? (
                    <>
                      <td className="px-4 py-2">
                        <span className="text-vista-light/60 text-sm">
                          Настраивается индивидуально для каждой тренировки
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          size="sm"
                          className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark rounded-md px-4 py-2 text-sm font-semibold shadow"
                          onClick={() => handleOpenScheduling(team)}
                          disabled={loading}
                        >
                          Запланировать рассылки
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="time"
                          value={schedule.sendTime}
                          onChange={e => setSchedules(schedules => schedules.map(s => s.teamId === team.id ? { ...s, sendTime: e.target.value } : s))}
                          className="px-2 py-1 rounded border border-vista-secondary/50 bg-vista-dark/40 text-vista-light focus:ring-2 focus:ring-vista-accent text-sm"
                          disabled={saving === team.id}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span className={schedule.enabled ? 
                          'text-emerald-400 font-semibold text-sm' : 
                          'text-red-400 font-semibold text-sm'
                        }>
                          {schedule.enabled ? t('morningSurveyTabs.enabled') : t('morningSurveyTabs.disabled')}
                        </span>
                      </td>
                      <td className="px-4 py-2 flex items-center gap-4">
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={e => setSchedules(schedules => schedules.map(s => s.teamId === team.id ? { ...s, enabled: e } : s))}
                          disabled={saving === team.id}
                          className="data-[state=checked]:bg-vista-primary data-[state=unchecked]:bg-vista-secondary"
                        />
                        <Button
                          size="sm"
                          className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark rounded-md px-4 py-2 text-sm font-semibold shadow"
                          onClick={() => handleSave(team.id, schedule.sendTime, schedule.enabled)}
                          disabled={saving === team.id}
                        >
                          {saving === team.id ? t('morningSurveyTabs.saving') : t('morningSurveyTabs.save')}
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
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

  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="settings">{t('morningSurveyTabs.settings')}</TabsTrigger>
        <TabsTrigger value="analysis">{t('morningSurveyTabs.analysis')}</TabsTrigger>
      </TabsList>
      <TabsContent value="settings">
        <TelegramBotSettings type={type} />
      </TabsContent>
      <TabsContent value="analysis">
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
          <h3 className="text-xl font-bold text-vista-light mb-4">{t('morningSurveyTabs.analysis_title')}</h3>
          <div className="flex flex-wrap gap-4 mb-4 items-end">
            <div className="min-w-[220px]">
              <TeamSelect teams={teams} value={selectedTeam} onChange={setSelectedTeam} />
            </div>
            <div>
              <label className="block text-vista-light/80 mb-1">{t('morningSurveyTabs.date')}</label>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    className="px-2 py-1 rounded border border-vista-secondary/50 bg-vista-dark/40 text-vista-light [&::-webkit-calendar-picker-indicator]:text-vista-primary [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:saturate-100 [&::-webkit-calendar-picker-indicator]:hue-rotate-[180deg]" 
                  />
                </div>
                
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
                      <th className="px-3 py-1 border-b border-vista-secondary/30 text-left whitespace-nowrap text-xs">{t('morningSurveyTabs.player')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.rpe_score')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">Длительность (мин)</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">Нагрузка (RPE×Время)</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.status')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.time')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map(player => {
                      const resp = responseByPlayerId[player.id];
                      const playerDuration = resp ? (durationSettings?.individualDurations?.[player.id] || durationSettings?.globalDuration) : null;
                      const workload = resp && playerDuration ? resp.rpeScore * playerDuration : null;
                      
                      return (
                        <tr key={player.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                          <td className="px-3 py-1 whitespace-nowrap text-xs">{player.lastName} {player.firstName}</td>
                          <td className="px-2 py-1 text-center align-middle">
                            {resp ? (
                              <span className={`inline-block rounded-lg border-0 text-base font-bold w-14 h-8 flex items-center justify-center transition-all duration-200 mx-auto ${
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
                            ) : ''}
                          </td>
                          <td className="px-2 py-1 text-center align-middle text-xs">
                            {resp && playerDuration ? (
                              <span className="inline-block px-2 py-1 rounded bg-vista-primary/20 text-vista-primary text-xs">
                                {playerDuration} мин
                              </span>
                            ) : resp ? (
                              <span className="text-vista-light/50 text-xs">Не задано</span>
                            ) : (
                              <span className="text-vista-light/50 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-center align-middle text-xs">
                            {workload ? (
                              <span className={`inline-block px-2 py-1 rounded text-white text-xs font-medium ${
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
                          <td className="px-2 py-1 text-center align-middle text-xs">
                            {resp ? (
                              <span className="text-emerald-400 font-semibold">
                                {t('morningSurveyTabs.completed')}
                              </span>
                            ) : (
                              <span className="text-red-400 font-semibold">
                                {t('morningSurveyTabs.not_completed')}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-center align-middle text-xs">{resp ? formatDateTime(resp.createdAt) : '-'}</td>
                          <td className="px-2 py-1 text-center align-middle">
                            <button
                              className="px-3 py-1 rounded bg-vista-secondary/10 text-vista-light/40 hover:bg-vista-accent hover:text-white disabled:opacity-60 border border-vista-secondary/20 text-xs transition-colors opacity-70 hover:opacity-100"
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
                      <td className="px-3 py-1 text-center text-xs">{t('morningSurveyTabs.average')}</td>
                      <td className="px-2 py-1 text-center align-middle text-xs">
                        {filteredPlayers.filter(p => responseByPlayerId[p.id]).length > 0 ? (filteredPlayers.reduce((acc, p) => acc + (responseByPlayerId[p.id]?.rpeScore || 0), 0) / filteredPlayers.filter(p => responseByPlayerId[p.id]).length).toFixed(2) : ''}
                      </td>
                      <td className="px-2 py-1 text-center align-middle text-xs">
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
                      <td className="px-2 py-1 text-center align-middle text-xs">
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
                      <td className="px-2 py-1"></td>
                      <td className="px-2 py-1"></td>
                      <td className="px-2 py-1"></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md">
                  <thead>
                    <tr className="bg-vista-dark/70 text-xs">
                      <th className="px-3 py-1 border-b border-vista-secondary/30 text-left whitespace-nowrap text-xs">{t('morningSurveyTabs.player')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.sleep_duration')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.sleep_quality')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.recovery')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.mood')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.muscle_condition')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap min-w-[180px] text-xs">{t('morningSurveyTabs.pain')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.status')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.time')}</th>
                      <th className="px-2 py-1 border-b border-vista-secondary/30 text-center whitespace-nowrap text-xs">{t('morningSurveyTabs.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map(player => {
                      const resp = responseByPlayerId[player.id];
                      return (
                        <tr key={player.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                          <td className="px-3 py-1 whitespace-nowrap text-xs">{player.lastName} {player.firstName}</td>
                          {/* Плитки оценок */}
                          {["sleepDuration","sleepQuality","recovery","mood","muscleCondition"].map((key, idx) => (
                            <td key={key} className={`px-2 py-1 text-center align-middle`}>
                              {resp ? (
                                <span className={`inline-block rounded-lg border-0 text-base font-bold w-14 h-8 flex items-center justify-center transition-all duration-200 ${
                                  resp[key] < (key==="sleepDuration"?7:3) 
                                    ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' 
                                    : resp[key]<(key==="sleepDuration"?8:4) 
                                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' 
                                      : 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                                }`}>{resp[key]}</span>
                              ) : ''}
                            </td>
                          ))}
                          {/* Болевые зоны */}
                          <td className="px-2 py-1 min-w-[180px] max-w-[220px] overflow-x-auto custom-scrollbar">
                            {resp && resp.painAreas && resp.painAreas.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {resp.painAreas.map((area: any, idx: number) => {
                                  // Определяем view (front/back) по id: если есть в MUSCLE_NAMES.front, иначе back
                                  let view: 'front' | 'back' = 'front';
                                  if (MUSCLE_NAMES.back[area.id as keyof typeof MUSCLE_NAMES.back]) view = 'back';
                                  const localizedName = MUSCLE_NAMES[view][area.id as keyof typeof MUSCLE_NAMES[typeof view]]?.[lang] || area.areaName || '';
                                  return (
                                    <span key={idx} className={`inline-flex items-center rounded-full border-0 px-2 py-1 text-xs font-semibold whitespace-nowrap gap-1 transition-all duration-200 ${
                                      area.painLevel >= 7 
                                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                                        : area.painLevel >= 4 
                                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
                                          : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                                    }`}>
                                      <span className={`inline-block w-2 h-2 rounded-full ${
                                        area.painLevel >= 7 ? 'bg-white' : area.painLevel >= 4 ? 'bg-white' : 'bg-white'
                                      }`}></span>
                                      {localizedName} <span className="opacity-90">({area.painLevel})</span>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : ''}
                          </td>
                          <td className="px-2 py-1 text-center align-middle text-xs">
                            {resp ? (
                              <span className="text-emerald-400 font-semibold">
                                {t('morningSurveyTabs.completed')}
                              </span>
                            ) : (
                              <span className="text-red-400 font-semibold">
                                {t('morningSurveyTabs.not_completed')}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-center align-middle text-xs">{resp ? formatDateTime(resp.createdAt) : '-'}</td>
                          <td className="px-2 py-1 text-center align-middle">
                            <button
                              className="px-3 py-1 rounded bg-vista-secondary/10 text-vista-light/40 hover:bg-vista-accent hover:text-white disabled:opacity-60 border border-vista-secondary/20 text-xs transition-colors opacity-70 hover:opacity-100"
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
                      <td className="px-3 py-1 text-center text-xs">{t('morningSurveyTabs.average')}</td>
                      {["sleepDuration","sleepQuality","recovery","mood","muscleCondition"].map((key, idx) => (
                        <td key={key} className="px-2 py-1 text-center align-middle text-xs">
                          {filteredPlayers.filter(p => responseByPlayerId[p.id]).length > 0 ? (filteredPlayers.reduce((acc, p) => acc + (responseByPlayerId[p.id]?.[key] || 0), 0) / filteredPlayers.filter(p => responseByPlayerId[p.id]).length).toFixed(2) : ''}
                        </td>
                      ))}
                      <td className="px-2 py-1"></td>
                      <td className="px-2 py-1"></td>
                      <td className="px-2 py-1"></td>
                      <td className="px-2 py-1"></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>
      </TabsContent>
      {/* Модальное окно для управления длительностью */}
      <TrainingDurationModal
        open={showDurationModal}
        onOpenChange={setShowDurationModal}
        teamId={selectedTeam}
        date={date}
        players={players}
        onDurationUpdate={handleDurationUpdate}
      />
    </Tabs>
  );
} 