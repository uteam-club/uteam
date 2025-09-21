'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Upload, BarChart3, Activity, Users, Calendar } from 'lucide-react';

export function GpsAnalysisTabSimple() {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего отчетов</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">+0% с прошлого месяца</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных игроков</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">+0% с прошлого месяца</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Тренировок</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">+0% с прошлого месяца</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Матчей</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">+0% с прошлого месяца</p>
          </CardContent>
        </Card>
      </div>

      {/* Кнопка создания отчета */}
      <Card>
        <CardHeader>
          <CardTitle>Новый GPS отчет</CardTitle>
          <CardDescription>
            Загрузите GPS данные для анализа тренировки или матча
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Создать новый отчет
          </Button>
        </CardContent>
      </Card>

      {/* Выбор команды и события */}
      <Card>
        <CardHeader>
          <CardTitle>Просмотр отчета</CardTitle>
          <CardDescription>
            Выберите команду и событие для просмотра GPS данных
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team">Команда</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите команду" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team1">Команда 1</SelectItem>
                  <SelectItem value="team2">Команда 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventType">Тип события</Label>
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Тренировка</SelectItem>
                  <SelectItem value="match">Матч</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event">Событие</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите событие" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event1">Событие 1</SelectItem>
                  <SelectItem value="event2">Событие 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full" disabled={!selectedTeam || !selectedEventType || !selectedEvent}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Просмотреть отчет
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default GpsAnalysisTabSimple;
