'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2, RefreshCw } from 'lucide-react';

export function RPESurveyTabs() {
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
    fetch(`/api/surveys/rpe?${params.toString()}`)
      .then(res => res.json())
      .then(setResponses)
      .catch(e => setError(e.message || 'Ошибка при загрузке ответов'))
      .finally(() => setLoading(false));
  }, [selectedTeam, date]);

  const handleResend = async (playerId: string) => {
    setResending(playerId);
    try {
      const response = await fetch('/api/surveys/rpe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, teamId: selectedTeam, date }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при отправке');
      }
      
      toast({
        title: "Успешно",
        description: "Опросник отправлен игроку",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить опросник",
        variant: "destructive",
      });
    } finally {
      setResending(null);
    }
  };

  const getRPEBadgeColor = (score: number) => {
    if (score <= 3) return 'bg-green-500';
    if (score <= 5) return 'bg-lime-500';
    if (score <= 7) return 'bg-yellow-500';
    if (score <= 9) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRPEStatus = (score: number) => {
    if (score <= 3) return 'Очень легко';
    if (score <= 5) return 'Умеренно';
    if (score <= 7) return 'Тяжело';
    if (score <= 9) return 'Очень тяжело';
    return 'Максимально';
  };

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-vista-light mb-2 block">Команда</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите команду" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-vista-light mb-2 block">Дата</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-vista-dark/50 border border-vista-secondary/30 rounded-md text-vista-light"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  const start = new Date(date);
                  start.setHours(0, 0, 0, 0);
                  const end = new Date(date);
                  end.setHours(23, 59, 59, 999);
                  const params = new URLSearchParams({ 
                    teamId: selectedTeam,
                    startDate: start.toISOString(),
                    endDate: end.toISOString()
                  });
                  setLoading(true);
                  fetch(`/api/surveys/rpe?${params.toString()}`)
                    .then(res => res.json())
                    .then(setResponses)
                    .catch(e => setError(e.message || 'Ошибка при загрузке ответов'))
                    .finally(() => setLoading(false));
                }}
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Обновить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardHeader>
          <CardTitle className="text-vista-light">Статистика RPE</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-vista-light" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-vista-dark/50 rounded-lg">
                <div className="text-2xl font-bold text-vista-light">{responses.length}</div>
                <div className="text-sm text-vista-light/70">Всего ответов</div>
              </div>
              <div className="text-center p-4 bg-vista-dark/50 rounded-lg">
                <div className="text-2xl font-bold text-vista-light">
                  {responses.length > 0 
                    ? (responses.reduce((sum, r) => sum + r.rpeScore, 0) / responses.length).toFixed(1)
                    : '0'
                  }
                </div>
                <div className="text-sm text-vista-light/70">Средний RPE</div>
              </div>
              <div className="text-center p-4 bg-vista-dark/50 rounded-lg">
                <div className="text-2xl font-bold text-vista-light">
                  {responses.length > 0 ? Math.max(...responses.map(r => r.rpeScore)) : '0'}
                </div>
                <div className="text-sm text-vista-light/70">Максимальный RPE</div>
              </div>
              <div className="text-center p-4 bg-vista-dark/50 rounded-lg">
                <div className="text-2xl font-bold text-vista-light">
                  {responses.length > 0 ? Math.min(...responses.map(r => r.rpeScore)) : '0'}
                </div>
                <div className="text-sm text-vista-light/70">Минимальный RPE</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Таблица ответов */}
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardHeader>
          <CardTitle className="text-vista-light">Ответы игроков</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-vista-light" />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-vista-light">Игрок</TableHead>
                  <TableHead className="text-vista-light">RPE</TableHead>
                  <TableHead className="text-vista-light">Статус</TableHead>
                  <TableHead className="text-vista-light">Время</TableHead>
                  <TableHead className="text-vista-light">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell className="text-vista-light">
                      {response.player?.firstName} {response.player?.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRPEBadgeColor(response.rpeScore)}>
                        {response.rpeScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-vista-light">
                      {getRPEStatus(response.rpeScore)}
                    </TableCell>
                    <TableCell className="text-vista-light">
                      {format(new Date(response.createdAt), 'HH:mm', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResend(response.playerId)}
                        disabled={resending === response.playerId}
                      >
                        {resending === response.playerId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Отправить повторно'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {responses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-vista-light/70 py-8">
                      Нет ответов за выбранную дату
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 