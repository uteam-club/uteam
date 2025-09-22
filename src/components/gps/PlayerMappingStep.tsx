'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Users, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Player {
  id: string;
  name: string;
  number?: string;
}

interface PlayerMapping {
  id: string;
  rowIndex: number;
  playerName: string;
  playerId: string | null;
  isMatched: boolean;
}

interface PlayerMappingStepProps {
  fileData: any[][];
  onMappingsChange: (mappings: PlayerMapping[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PlayerMappingStep({ 
  fileData, 
  onMappingsChange, 
  onNext, 
  onBack 
}: PlayerMappingStepProps) {
  const { toast } = useToast();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [mappings, setMappings] = useState<PlayerMapping[]>([]);
  const [loading, setLoading] = useState(false);

  // Загрузка игроков команды
  useEffect(() => {
    loadPlayers();
  }, []);

  // Инициализация маппингов при загрузке данных файла
  useEffect(() => {
    if (fileData.length > 0) {
      initializeMappings();
    }
  }, [fileData]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      // TODO: Получить teamId из контекста или пропсов
      const response = await fetch('/api/teams');
      if (response.ok) {
        const teams = await response.json();
        // Пока берем первую команду, позже нужно будет передавать teamId
        if (teams.length > 0) {
          const playersResponse = await fetch(`/api/teams/${teams[0].id}/players`);
          if (playersResponse.ok) {
            const playersData = await playersResponse.json();
            setPlayers(playersData);
          }
        }
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error loading players:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список игроков',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeMappings = () => {
    // Предполагаем, что первая строка - заголовки, остальные - данные игроков
    const dataRows = fileData.slice(1);
    const newMappings: PlayerMapping[] = dataRows.map((row, index) => {
      // Пытаемся найти имя игрока в первых нескольких колонках
      const playerName = findPlayerNameInRow(row);
      
      return {
        id: `player-${index}`,
        rowIndex: index + 1, // +1 потому что первая строка - заголовки
        playerName: playerName || `Игрок ${index + 1}`,
        playerId: null,
        isMatched: false
      };
    });

    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const findPlayerNameInRow = (row: any[]): string | null => {
    // Ищем в первых 5 колонках текст, который может быть именем игрока
    for (let i = 0; i < Math.min(5, row.length); i++) {
      const cell = row[i];
      if (typeof cell === 'string' && cell.trim().length > 0) {
        // Простая проверка - если это не число и не дата, возможно это имя
        if (!/^\d+$/.test(cell) && !/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(cell)) {
          return cell.trim();
        }
      }
    }
    return null;
  };

  const updatePlayerMapping = (id: string, playerId: string | null) => {
    const newMappings = mappings.map(mapping => 
      mapping.id === id 
        ? { 
            ...mapping, 
            playerId, 
            isMatched: !!playerId 
          } 
        : mapping
    );
    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const suggestPlayerForName = (name: string): Player | null => {
    const lowerName = name.toLowerCase();
    
    // Точное совпадение
    let player = players.find(p => p.name.toLowerCase() === lowerName);
    if (player) return player;

    // Частичное совпадение по фамилии
    const nameParts = lowerName.split(' ');
    for (const part of nameParts) {
      if (part.length > 2) {
        player = players.find(p => 
          p.name.toLowerCase().includes(part) || 
          part.includes(p.name.toLowerCase().split(' ')[0])
        );
        if (player) return player;
      }
    }

    return null;
  };

  const autoMatchPlayers = () => {
    const newMappings = mappings.map(mapping => {
      if (mapping.isMatched) return mapping;
      
      const suggestedPlayer = suggestPlayerForName(mapping.playerName);
      return {
        ...mapping,
        playerId: suggestedPlayer?.id || null,
        isMatched: !!suggestedPlayer
      };
    });

    setMappings(newMappings);
    onMappingsChange(newMappings);

    const matchedCount = newMappings.filter(m => m.isMatched).length;
    toast({
      title: 'Автоматическое сопоставление',
      description: `Сопоставлено ${matchedCount} из ${mappings.length} игроков`,
    });
  };

  const matchedMappings = mappings.filter(m => m.isMatched);
  const unmatchedMappings = mappings.filter(m => !m.isMatched);

  const canProceed = matchedMappings.length > 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-base font-semibold">Сопоставление игроков</h3>
        <p className="text-xs text-muted-foreground">
          Сопоставьте игроков из файла с игроками команды
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{mappings.length}</div>
            <div className="text-xs text-muted-foreground">Всего строк</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-green-600">{matchedMappings.length}</div>
            <div className="text-xs text-muted-foreground">Сопоставлено</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-red-600">{unmatchedMappings.length}</div>
            <div className="text-xs text-muted-foreground">Не сопоставлено</div>
          </CardContent>
        </Card>
      </div>

      {/* Автоматическое сопоставление */}
      <div className="flex justify-center">
        <Button 
          onClick={autoMatchPlayers}
          disabled={loading || unmatchedMappings.length === 0}
          variant="outline"
          size="sm"
          className="flex items-center gap-1 h-8 px-3 text-xs"
        >
          <UserCheck className="h-3 w-3" />
          Автоматическое сопоставление
        </Button>
      </div>

      {/* Сопоставленные игроки */}
      {matchedMappings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700 text-sm">
              <UserCheck className="h-3 w-3" />
              Сопоставленные игроки ({matchedMappings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {matchedMappings.map((mapping) => {
              const player = players.find(p => p.id === mapping.playerId);
              return (
                <div key={mapping.id} className="flex items-center justify-between p-2 border rounded-md bg-green-50">
                  <div>
                    <div className="text-sm font-medium">{mapping.playerName}</div>
                    <div className="text-xs text-muted-foreground">Строка {mapping.rowIndex}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-2 py-0.5">
                      {player?.name} {player?.number && `#${player.number}`}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updatePlayerMapping(mapping.id, null)}
                      className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                    >
                      <UserX className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Несопоставленные игроки */}
      {unmatchedMappings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700 text-sm">
              <UserX className="h-3 w-3" />
              Несопоставленные игроки ({unmatchedMappings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unmatchedMappings.map((mapping) => (
              <div key={mapping.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md">
                <div className="col-span-4">
                  <Label className="text-xs text-muted-foreground">Имя из файла</Label>
                  <div className="text-sm font-medium">{mapping.playerName}</div>
                  <div className="text-xs text-muted-foreground">Строка {mapping.rowIndex}</div>
                </div>
                
                <div className="col-span-6">
                  <Label className="text-xs text-muted-foreground">Выберите игрока</Label>
                  <Select
                    value={mapping.playerId || ''}
                    onValueChange={(value) => updatePlayerMapping(mapping.id, value || null)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Выберите игрока команды" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не сопоставлять</SelectItem>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} {player.number && `#${player.number}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updatePlayerMapping(mapping.id, null)}
                    className="text-gray-400 hover:text-gray-600 h-7 px-2 text-xs"
                  >
                    Пропустить
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Кнопки навигации */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} size="sm" className="flex items-center gap-1 h-8 px-3 text-xs">
          <ArrowLeft className="h-3 w-3" />
          Назад
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!canProceed || loading}
          size="sm"
          className="flex items-center gap-1 h-8 px-3 text-xs"
        >
          {loading ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Загрузка...
            </>
          ) : (
            <>
              Завершить
              <ArrowRight className="h-3 w-3" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
