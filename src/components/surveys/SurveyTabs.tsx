"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';
import { format } from 'date-fns';
import { TeamSelect } from '@/components/ui/team-select';
import { useToast } from '@/components/ui/use-toast';

function TelegramBotSettings() {
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [broadcastTime, setBroadcastTime] = useState('08:00');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingTime, setSavingTime] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [teamTimezone, setTeamTimezone] = useState('Europe/Moscow');

  // Загрузка списка команд
  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setTeams(arr);
        if (arr.length > 0) setSelectedTeam(arr[0].id);
      });
  }, []);

  // Загрузка настроек рассылки для выбранной команды
  useEffect(() => {
    if (!selectedTeam) return;
    setLoading(true);
    fetch(`/api/teams/${selectedTeam}`)
      .then(res => res.json())
      .then(data => {
        setTeamTimezone(data.timezone || 'Europe/Moscow');
      });
    fetch(`/api/telegram/broadcast-time?teamId=${selectedTeam}`)
      .then(res => res.json())
      .then(data => {
        setBroadcastTime(data.time || '08:00');
        setEnabled(data.enabled ?? true);
      })
      .finally(() => setLoading(false));
  }, [selectedTeam]);

  // Сохранение настроек рассылки
  const handleSaveTime = async () => {
    if (!selectedTeam) return;
    setSavingTime(true);
    setResult(null);
    try {
      const res = await fetch('/api/telegram/broadcast-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: selectedTeam, time: broadcastTime, enabled }),
      });
      const data = await res.json();
      setResult(data.message || 'Настройки сохранены!');
    } catch (e) {
      setResult('Ошибка при сохранении настроек');
    } finally {
      setSavingTime(false);
    }
  };

  const handleTestBroadcast = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/telegram/test-broadcast', { method: 'POST' });
      const data = await res.json();
      setResult(data.message || 'Рассылка выполнена!');
    } catch (e) {
      setResult('Ошибка при выполнении рассылки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-4 rounded-lg bg-vista-dark/30 border border-vista-secondary/30">
      <h3 className="text-xl font-bold mb-2 text-vista-light">Telegram-бот для опросников</h3>
      <ol className="list-decimal list-inside text-vista-light/80 mb-4">
        <li>Дайте игрокам ссылку на Telegram-бота: <b>@UTEAM_infoBot</b>.</li>
        <li>Игроки должны пройти привязку (нажать /start и ввести свой пинкод).</li>
        <li>После этого вы сможете делать рассылку опросников через Telegram.</li>
      </ol>
      <div className="mb-4 flex flex-row flex-wrap gap-4 items-center">
        <div className="min-w-[220px]">
          <TeamSelect
            teams={teams}
            value={selectedTeam}
            onChange={setSelectedTeam}
            disabled={loading || teams.length === 0}
          />
        </div>
        <div className="flex flex-row items-center gap-2">
          <label className="text-vista-light/90 font-semibold whitespace-nowrap">Время рассылки:</label>
          <input
            type="time"
            value={broadcastTime}
            onChange={e => setBroadcastTime(e.target.value)}
            className="px-2 py-1 rounded border border-vista-secondary/50 bg-vista-dark/40 text-vista-light focus:ring-2 focus:ring-vista-accent"
            disabled={loading}
          />
          <span className="text-vista-light/60 text-xs">({teamTimezone})</span>
        </div>
        <label className="flex items-center gap-2 text-vista-light/90 font-semibold bg-vista-dark/40 border border-vista-secondary/50 rounded px-3 py-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="accent-vista-accent w-5 h-5"
            disabled={loading}
          />
          Включить рассылку
        </label>
        <button
          onClick={handleSaveTime}
          disabled={savingTime || loading || !selectedTeam}
          className="px-6 py-2 rounded bg-vista-accent text-white font-semibold shadow hover:bg-vista-accent/90 transition border-2 border-vista-accent focus:outline-none focus:ring-2 focus:ring-vista-accent/70"
        >
          {savingTime ? 'Сохраняю...' : 'Сохранить'}
        </button>
      </div>
      <button
        onClick={handleTestBroadcast}
        disabled={loading}
        className="px-6 py-2 rounded bg-vista-accent text-white font-semibold hover:bg-vista-accent/90 transition"
      >
        {loading ? 'Рассылка...' : 'Тестовая рассылка опросника'}
      </button>
      {result && <div className="mt-3 text-vista-light/90">{result}</div>}
    </div>
  );
}

export function SurveyTabs() {
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
    fetch(`/api/surveys/morning?${params.toString()}`)
      .then(res => res.json())
      .then(setResponses)
      .catch(e => setError(e.message || 'Ошибка при загрузке ответов'))
      .finally(() => setLoading(false));
  }, [selectedTeam, date]);

  // Сопоставление: playerId -> response
  const responseByPlayerId = Object.fromEntries(responses.map(r => [r.playerId, r]));

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
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="settings">Настройка</TabsTrigger>
        <TabsTrigger value="analysis">Анализ</TabsTrigger>
      </TabsList>
      
      <TabsContent value="settings">
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
          <h2 className="text-2xl font-bold mb-4 text-vista-light">Настройки опросника</h2>
          <TelegramBotSettings />
        </Card>
      </TabsContent>
      
      <TabsContent value="analysis">
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
          <h2 className="text-2xl font-bold mb-4 text-vista-light">Анализ ответов</h2>
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
                        {(filteredPlayers.filter(p => responseByPlayerId[p.id]).length > 0 ? (filteredPlayers.reduce((acc, p) => acc + (responseByPlayerId[p.id]?.[key] || 0), 0) / filteredPlayers.filter(p => responseByPlayerId[p.id]).length).toFixed(2) : '')}
                      </td>
                    ))}
                    <td className="px-2 py-2"></td>
                    <td className="px-2 py-2"></td>
                    <td className="px-2 py-2"></td>
                    <td className="px-2 py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
} 