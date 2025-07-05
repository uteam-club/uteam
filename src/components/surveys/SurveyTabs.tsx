"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';
import { format } from 'date-fns';
import { TeamSelect } from '@/components/ui/team-select';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface Team {
  id: string;
  name: string;
  clubId: string;
}

function TelegramBotSettings({ type = 'morning' }: { type?: 'morning' | 'rpe' }) {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [showInstruction, setShowInstruction] = useState(false);

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
        body: JSON.stringify({ teamId, time, enabled }),
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

  return (
    <div className="p-0 md:p-6 bg-vista-dark/60 border border-vista-secondary/30 rounded-lg mb-6">
      <div className="flex flex-row items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-vista-light">Настройки рассылки по командам</h3>
        <div className="flex gap-2">
          <Dialog open={showInstruction} onOpenChange={setShowInstruction}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20" onClick={() => setShowInstruction(true)}>Инструкция</Button>
            </DialogTrigger>
            <DialogContent className="p-0 bg-transparent border-none shadow-none">
              <div className="bg-vista-dark/90 border-vista-secondary/30 shadow-xl rounded-lg p-6">
                <h4 className="text-vista-light text-lg font-bold mb-2">Инструкция по рассылке опросников</h4>
                <ol className="list-decimal list-inside text-vista-light/80 mb-4 space-y-1">
                  <li>Дайте игрокам ссылку на Telegram-бота: <b>@UTEAM_infoBot</b>.</li>
                  <li>Игроки должны пройти привязку (нажать /start и ввести свой пинкод).</li>
                  <li>После этого вы сможете делать рассылку опросников через Telegram.</li>
                </ol>
                <div className="flex justify-end">
                  <DialogClose asChild>
                    <Button variant="outline" className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20">Закрыть</Button>
                  </DialogClose>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleTestBroadcast} disabled={loading} className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark rounded-md px-4 py-2 text-sm font-semibold shadow">
            Тестовая рассылка
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-vista-secondary/30">
              <th className="px-4 py-3 text-left text-sm text-vista-light/70 font-semibold">Команда</th>
              <th className="px-4 py-3 text-left text-sm text-vista-light/70 font-semibold">Время рассылки</th>
              <th className="px-4 py-3 text-left text-sm text-vista-light/70 font-semibold">Статус рассылки</th>
              <th className="px-4 py-3 text-left text-sm text-vista-light/70 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(team => {
              const schedule = schedules.find(s => s.teamId === team.id) || { sendTime: '08:00', enabled: true };
              return (
                <tr key={team.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                  <td className="px-4 py-3 text-vista-light font-medium text-base">{team.name}</td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={schedule.sendTime}
                      onChange={e => setSchedules(schedules => schedules.map(s => s.teamId === team.id ? { ...s, sendTime: e.target.value } : s))}
                      className="px-2 py-1 rounded border border-vista-secondary/50 bg-vista-dark/40 text-vista-light focus:ring-2 focus:ring-vista-accent text-base"
                      disabled={saving === team.id}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={schedule.enabled ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {schedule.enabled ? 'Включена' : 'Выключена'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-4">
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
                      {saving === team.id ? 'Сохраняю...' : 'Сохранить'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SurveyTabsProps {
  type?: 'morning' | 'rpe';
}

export function SurveyTabs({ type = 'morning' }: SurveyTabsProps) {
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

  // Загрузка команд
  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        setTeams(data);
        if (data.length > 0) setSelectedTeam(data[0].id);
      });
  }, []);

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
        <TabsTrigger value="settings">Настройка</TabsTrigger>
        <TabsTrigger value="analysis">Анализ</TabsTrigger>
      </TabsList>
      <TabsContent value="settings">
        <TelegramBotSettings type={type} />
      </TabsContent>
      <TabsContent value="analysis">
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
          <h3 className="text-xl font-bold text-vista-light mb-4">Анализ ответов</h3>
          <div className="flex flex-wrap gap-4 mb-4 items-end">
            <div className="min-w-[220px]">
              <TeamSelect teams={teams} value={selectedTeam} onChange={setSelectedTeam} />
            </div>
            <div>
              <label className="block text-vista-light/80 mb-1">Дата</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-2 py-1 rounded border border-vista-secondary/50 bg-vista-dark/40 text-vista-light" />
            </div>
          </div>
          {loading ? (
            <div className="text-vista-light/70">Загрузка...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : players.length === 0 ? (
            <div className="text-vista-light/70">Нет игроков в команде</div>
          ) : (
            <div className="overflow-x-auto">
              {type === 'rpe' ? (
                <table className="min-w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md">
                  <thead>
                    <tr className="bg-vista-dark/70 text-xs">
                      <th className="px-3 py-2 border-b border-vista-secondary/30 text-left whitespace-nowrap">Игрок</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Оценка RPE</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Статус</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Время</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map(player => {
                      const resp = responseByPlayerId[player.id];
                      return (
                        <tr key={player.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                          <td className="px-3 py-2 whitespace-nowrap">{player.lastName} {player.firstName}</td>
                          <td className="px-2 py-2 text-center align-middle">
                            {resp ? (
                              <span className="inline-block rounded-lg shadow border border-vista-secondary/30 text-xl font-semibold w-16 h-10 flex items-center justify-center bg-vista-primary/20">{resp.rpeScore}</span>
                            ) : ''}
                          </td>
                          <td className="px-2 py-2 text-center align-middle">{resp ? <span className="text-green-400">Прошёл</span> : <span className="text-red-400">Не прошёл</span>}</td>
                          <td className="px-2 py-2 text-center align-middle">{resp ? formatDateTime(resp.createdAt) : '-'}</td>
                          <td className="px-2 py-2 text-center align-middle">
                            {!resp && <button
                              className="px-3 py-1 rounded bg-vista-accent text-white hover:bg-vista-accent/90 disabled:opacity-60 shadow border border-vista-secondary/30"
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
                                    toast({ title: 'Опрос отправлен', description: `Игроку ${player.lastName} ${player.firstName} отправлен опрос повторно.` });
                                  } else {
                                    toast({ title: 'Ошибка', description: data.error || 'Не удалось отправить опрос', variant: 'destructive' });
                                  }
                                } catch (e) {
                                  toast({ title: 'Ошибка', description: String(e), variant: 'destructive' });
                                } finally {
                                  setResending(null);
                                }
                              }}
                            >{resending === player.id ? 'Отправка...' : 'Отправить повторно'}</button>}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Среднее значение */}
                    <tr className="bg-vista-dark/80 font-bold">
                      <td className="px-3 py-2 text-center">Среднее</td>
                      <td className="px-2 py-2 text-center align-middle">
                        {filteredPlayers.filter(p => responseByPlayerId[p.id]).length > 0 ? (filteredPlayers.reduce((acc, p) => acc + (responseByPlayerId[p.id]?.rpeScore || 0), 0) / filteredPlayers.filter(p => responseByPlayerId[p.id]).length).toFixed(2) : ''}
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
                      <th className="px-3 py-2 border-b border-vista-secondary/30 text-left whitespace-nowrap">Игрок</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Сон (ч)</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Качество</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Восст.</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Настр.</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Мышцы</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap min-w-[180px]">Боль</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Статус</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Время</th>
                      <th className="px-2 py-2 border-b border-vista-secondary/30 text-center whitespace-nowrap">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map(player => {
                      const resp = responseByPlayerId[player.id];
                      return (
                        <tr key={player.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                          <td className="px-3 py-2 whitespace-nowrap">{player.lastName} {player.firstName}</td>
                          {/* Плитки оценок */}
                          {["sleepDuration","sleepQuality","recovery","mood","muscleCondition"].map((key, idx) => (
                            <td key={key} className={`px-2 py-2 text-center align-middle`}>
                              {resp ? (
                                <span className={`inline-block rounded-lg shadow border border-vista-secondary/30 text-xl font-semibold w-16 h-10 flex items-center justify-center ${resp[key] < (key==="sleepDuration"?7:3)?'bg-red-900/40':resp[key]<(key==="sleepDuration"?8:4)?'bg-yellow-900/40':'bg-green-900/30'}`}>{resp[key]}</span>
                              ) : ''}
                            </td>
                          ))}
                          {/* Болевые зоны */}
                          <td className="px-2 py-2 min-w-[180px] max-w-[220px] overflow-x-auto">
                            {resp && resp.painAreas && resp.painAreas.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {resp.painAreas.map((area: any, idx: number) => (
                                  <span key={idx} className="inline-flex items-center rounded-full border border-vista-secondary/30 bg-vista-dark/40 px-2 py-0.5 text-xs font-medium whitespace-nowrap gap-1">
                                    <span className={`inline-block w-2 h-2 rounded-full ${area.painLevel >= 7 ? 'bg-red-500' : area.painLevel >= 4 ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                                    {area.areaName} <span className="opacity-60">({area.painLevel})</span>
                                  </span>
                                ))}
                              </div>
                            ) : ''}
                          </td>
                          <td className="px-2 py-2 text-center align-middle">{resp ? <span className="text-green-400">Прошёл</span> : <span className="text-red-400">Не прошёл</span>}</td>
                          <td className="px-2 py-2 text-center align-middle">{resp ? formatDateTime(resp.createdAt) : '-'}</td>
                          <td className="px-2 py-2 text-center align-middle">
                            {!resp && <button
                              className="px-3 py-1 rounded bg-vista-accent text-white hover:bg-vista-accent/90 disabled:opacity-60 shadow border border-vista-secondary/30"
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
                                    toast({ title: 'Опрос отправлен', description: `Игроку ${player.lastName} ${player.firstName} отправлен опрос повторно.` });
                                  } else {
                                    toast({ title: 'Ошибка', description: data.error || 'Не удалось отправить опрос', variant: 'destructive' });
                                  }
                                } catch (e) {
                                  toast({ title: 'Ошибка', description: String(e), variant: 'destructive' });
                                } finally {
                                  setResending(null);
                                }
                              }}
                            >{resending === player.id ? 'Отправка...' : 'Отправить повторно'}</button>}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Средние значения */}
                    <tr className="bg-vista-dark/80 font-bold">
                      <td className="px-3 py-2 text-center">Среднее</td>
                      {["sleepDuration","sleepQuality","recovery","mood","muscleCondition"].map((key, idx) => (
                        <td key={key} className="px-2 py-2 text-center align-middle">
                          {filteredPlayers.filter(p => responseByPlayerId[p.id]).length > 0 ? (filteredPlayers.reduce((acc, p) => acc + (responseByPlayerId[p.id]?.[key] || 0), 0) / filteredPlayers.filter(p => responseByPlayerId[p.id]).length).toFixed(2) : ''}
                        </td>
                      ))}
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                      <td className="px-2 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
} 