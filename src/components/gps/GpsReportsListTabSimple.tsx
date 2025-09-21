'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Eye, Edit, Trash2, Calendar, Filter, Search } from 'lucide-react';

export function GpsReportsListTabSimple() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterType, setFilterType] = useState('');

  const [reports] = useState([
    {
      id: '1',
      name: 'Тренировка 15.01.2024',
      teamName: 'Основная команда',
      eventType: 'training',
      gpsSystem: 'Catapult',
      playersCount: 18,
      isProcessed: true,
      hasEdits: false,
      createdAt: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      name: 'Матч 20.01.2024',
      teamName: 'Основная команда',
      eventType: 'match',
      gpsSystem: 'STATSports',
      playersCount: 11,
      isProcessed: true,
      hasEdits: true,
      createdAt: '2024-01-20T15:00:00Z',
    },
  ]);

  const getEventTypeLabel = (type: string) => {
    return type === 'training' ? 'Тренировка' : 'Матч';
  };

  const getEventTypeVariant = (type: string) => {
    return type === 'training' ? 'default' : 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Список отчетов</h2>
          <p className="text-muted-foreground">
            Просмотр и управление загруженными GPS отчетами
          </p>
        </div>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Поиск по названию отчета..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Все команды" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все команды</SelectItem>
                <SelectItem value="team1">Основная команда</SelectItem>
                <SelectItem value="team2">Молодежная команда</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="training">Тренировки</SelectItem>
                <SelectItem value="match">Матчи</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Список отчетов */}
      {reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{report.name}</h3>
                      <Badge variant={getEventTypeVariant(report.eventType)}>
                        {getEventTypeLabel(report.eventType)}
                      </Badge>
                      {report.hasEdits && (
                        <Badge variant="outline">Изменен</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{report.teamName}</span>
                      <span>•</span>
                      <span>{report.gpsSystem}</span>
                      <span>•</span>
                      <span>{report.playersCount} игроков</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="mr-1 h-3 w-3" />
                      Просмотр
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="mr-1 h-3 w-3" />
                      Редактировать
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="mr-1 h-3 w-3" />
                      Скачать
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-1 h-3 w-3" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет отчетов</h3>
            <p className="text-muted-foreground text-center mb-4">
              Загрузите первый GPS отчет для начала анализа
            </p>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Загрузить отчет
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GpsReportsListTabSimple;
