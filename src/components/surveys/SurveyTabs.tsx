"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';

function TelegramBotSettings() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [broadcastTime, setBroadcastTime] = useState('08:00');
  const [savingTime, setSavingTime] = useState(false);

  // Загрузка времени рассылки при монтировании
  useEffect(() => {
    fetch('/api/telegram/broadcast-time')
      .then(res => res.json())
      .then(data => {
        if (data.time) setBroadcastTime(data.time);
      });
  }, []);

  // Сохранение времени рассылки
  const handleSaveTime = async () => {
    setSavingTime(true);
    setResult(null);
    try {
      const res = await fetch('/api/telegram/broadcast-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: broadcastTime }),
      });
      const data = await res.json();
      setResult(data.message || 'Время рассылки сохранено!');
    } catch (e) {
      setResult('Ошибка при сохранении времени');
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
      <div className="mb-4 flex items-center gap-4">
        <label className="text-vista-light/90 font-semibold">Время рассылки:</label>
        <input
          type="time"
          value={broadcastTime}
          onChange={e => setBroadcastTime(e.target.value)}
          className="px-2 py-1 rounded border border-vista-secondary/50 bg-vista-dark/40 text-vista-light"
        />
        <button
          onClick={handleSaveTime}
          disabled={savingTime}
          className="px-4 py-1 rounded bg-vista-accent text-white font-semibold hover:bg-vista-accent/90 transition"
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
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResponses() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/surveys/morning');
        if (!res.ok) throw new Error('Ошибка при загрузке ответов');
        const data = await res.json();
        setResponses(data);
      } catch (e: any) {
        setError(e.message || 'Ошибка при загрузке ответов');
      } finally {
        setLoading(false);
      }
    }
    fetchResponses();
  }, []);

  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="settings">Настройка</TabsTrigger>
        <TabsTrigger value="analysis">Анализ</TabsTrigger>
      </TabsList>
      
      <TabsContent value="settings">
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
          <h2 className="text-2xl font-bold mb-4 text-vista-light">Настройки опросника</h2>
          {/* Здесь будет компонент настроек */}
          <TelegramBotSettings />
        </Card>
      </TabsContent>
      
      <TabsContent value="analysis">
        <Card className="p-6 bg-vista-dark/50 border-vista-secondary/50">
          <h2 className="text-2xl font-bold mb-4 text-vista-light">Анализ ответов</h2>
          {loading ? (
            <div className="text-vista-light/70">Загрузка...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : responses.length === 0 ? (
            <div className="text-vista-light/70">Нет ответов</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-vista-light border border-vista-secondary/30 rounded-md">
                <thead>
                  <tr className="bg-vista-dark/70">
                    <th className="px-3 py-2 border-b border-vista-secondary/30 text-left">Игрок</th>
                    <th className="px-3 py-2 border-b border-vista-secondary/30 text-left">Дата и время отправки</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((resp) => (
                    <tr key={resp.id} className="border-b border-vista-secondary/20 hover:bg-vista-secondary/10">
                      <td className="px-3 py-2">
                        {resp.player?.lastName || ''} {resp.player?.firstName || ''}
                      </td>
                      <td className="px-3 py-2">
                        {resp.createdAt ? formatDateTime(resp.createdAt) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
} 