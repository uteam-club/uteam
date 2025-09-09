'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PlayerMappingsTabProps {
  teamId?: string;
}

interface PlayerMapping {
  mapping: {
    id: string;
    reportName: string;
    gpsSystem: string;
    confidenceScore: number;
    mappingType: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
  };
  player: {
    id: string;
    name: string;
  } | null;
}

export default function PlayerMappingsTab({ teamId }: PlayerMappingsTabProps) {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<PlayerMapping[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>(teamId || '');
  const [loading, setLoading] = useState(false);

  // Загружаем команды при открытии
  useEffect(() => {
    fetchTeams();
  }, []);

  // Загружаем маппинги при выборе команды
  useEffect(() => {
    if (selectedTeam) {
      fetchMappings();
    } else {
      setMappings([]);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Ошибка при получении команд:', error);
    }
  };

  const resetMappingsForEvent = async () => {
    if (!selectedTeam) return;
    
    if (!confirm('Сбросить сохранённые маппинги для текущей команды?')) return;
    
    try {
      const response = await fetch('/api/player-mappings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: selectedTeam
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Успешно",
          description: `Маппинги сброшены. Удалено ${result.deleted} записей`,
        });
        fetchMappings(); // Обновляем список
      } else {
        throw new Error('Ошибка при сбросе маппингов');
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сбросить маппинги",
        variant: "destructive"
      });
    }
  };

  const fetchMappings = async () => {
    if (!selectedTeam) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/player-mappings?teamId=${selectedTeam}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[GPS-DEBUG] PlayerMappingsTab received data:', JSON.stringify(data, null, 2));
        setMappings(data);
      } else {
        console.error('Ошибка при получении маппингов');
      }
    } catch (error) {
      console.error('Ошибка при получении маппингов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      const response = await fetch(`/api/player-mappings/${mappingId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Успешно",
          description: "Маппинг игрока удален",
        });
        fetchMappings(); // Обновляем список
      } else {
        throw new Error('Ошибка при удалении маппинга');
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить маппинг игрока",
        variant: "destructive"
      });
    }
  };

  const resetAllMappings = async () => {
    if (!selectedTeam) return;
    
    if (!confirm('Сбросить все сохранённые маппинги для этой команды и GPS системы?')) return;
    
    try {
      const response = await fetch('/api/player-mappings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: selectedTeam, 
          gpsSystem: 'all' // Сбрасываем для всех GPS систем
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Успешно",
          description: `Удалено ${result.removed} маппингов`,
        });
        fetchMappings(); // Обновляем список
      } else {
        throw new Error('Ошибка при сбросе маппингов');
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сбросить маппинги",
        variant: "destructive"
      });
    }
  };

  const getMappingTypeIcon = (type: string) => {
    switch (type) {
      case 'exact':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'fuzzy':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'manual':
        return <Users className="w-4 h-4 text-blue-400" />;
      case 'alias':
        return <Clock className="w-4 h-4 text-purple-400" />;
      default:
        return <Users className="w-4 h-4 text-gray-400" />;
    }
  };

  const getMappingTypeText = (type: string) => {
    switch (type) {
      case 'exact':
        return 'Точное совпадение';
      case 'fuzzy':
        return 'Нечеткое совпадение';
      case 'manual':
        return 'Ручное сопоставление';
      case 'alias':
        return 'Алиас';
      default:
        return 'Неизвестно';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (confidence >= 0.6) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-vista-light">Маппинги игроков</h2>
          <p className="text-vista-light/60 mt-1">
            Управление сопоставлением игроков из отчетов с игроками в команде
          </p>
        </div>
        {selectedTeam && mappings.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetMappingsForEvent}
              className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Сбросить маппинги
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={resetAllMappings}
              className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Сбросить все
            </Button>
          </div>
        )}
      </div>

      {/* Выбор команды */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-vista-light/70">Команда</label>
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light">
            <SelectValue placeholder="Выберите команду" />
          </SelectTrigger>
          <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light">
            {teams.map(team => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Список маппингов */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary mx-auto"></div>
          <p className="text-vista-light/70 mt-2">Загрузка маппингов...</p>
        </div>
      ) : mappings.length === 0 ? (
        <div className="text-center py-12 text-vista-light/50">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Нет маппингов для выбранной команды</p>
          <p className="text-sm mt-1">Маппинги создаются автоматически при загрузке отчетов</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {mappings.map((mapping) => {
            const playerName = mapping.player 
              ? `${(mapping.player as any).firstName || ''} ${(mapping.player as any).lastName || ''}`.trim() || '—'
              : '—';
            const playerId = mapping.player?.id;
            const pct = Math.round((mapping.mapping?.confidenceScore ?? 0) * 100);
            
            return (
            <Card key={mapping.mapping.id} className="bg-vista-dark/50 border-vista-secondary/50">
              <CardHeader>
                <CardTitle className="text-vista-light flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{mapping.mapping.reportName}</span>
                    <span className="text-vista-light/60">→</span>
                    <span className="text-vista-primary">{playerName}</span>
                    {!mapping.player && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">нет в ростере</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getConfidenceColor(mapping.mapping.confidenceScore)}>
                      {pct}%
                    </Badge>
                    <div className="flex items-center gap-1">
                      {getMappingTypeIcon(mapping.mapping.mappingType)}
                      <span className="text-sm text-vista-light/60">
                        {getMappingTypeText(mapping.mapping.mappingType)}
                      </span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-vista-light/70">
                      <span>GPS система: {mapping.mapping.gpsSystem}</span>
                      <span>Создан: {new Date(mapping.mapping.createdAt).toLocaleDateString()}</span>
                    </div>
                    {mapping.mapping.notes && (
                      <p className="text-sm text-vista-light/60 italic">
                        Заметки: {mapping.mapping.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-vista-error/50 text-vista-error hover:bg-vista-error/10"
                    onClick={() => handleDeleteMapping(mapping.mapping.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Статистика */}
      {mappings.length > 0 && (
        <div className="bg-vista-secondary/20 border border-vista-secondary/30 rounded-lg p-4">
          <h3 className="text-vista-light font-medium mb-3">Статистика</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-vista-light/60">Всего маппингов</div>
              <div className="text-vista-light font-medium">{mappings.length}</div>
            </div>
            <div>
              <div className="text-vista-light/60">Высокая точность</div>
              <div className="text-vista-light font-medium">
                {mappings.filter(m => m.mapping.confidenceScore >= 0.8).length}
              </div>
            </div>
            <div>
              <div className="text-vista-light/60">GPS систем</div>
              <div className="text-vista-light font-medium">
                {new Set(mappings.map(m => m.mapping.gpsSystem)).size}
              </div>
            </div>
            <div>
              <div className="text-vista-light/60">Последнее обновление</div>
              <div className="text-vista-light font-medium">
                {mappings.length > 0 ? 
                  new Date(Math.max(...mappings.map(m => new Date(m.mapping.updatedAt).getTime()))).toLocaleDateString() : 
                  '-'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 