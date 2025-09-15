'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Player } from '@/types/player';
import { GpsReport } from '@/types/gps';
import { GpsProfile } from '@/types/gps';
import { getPlayersByTeamId } from '@/lib/players-api';
import { getGpsProfileById } from '@/lib/gps-api';
import { createGpsPlayerMapping, deleteGpsPlayerMappings } from '@/lib/gps-api';

interface SmartPlayerMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gpsReport: GpsReport | null;
  teamId: string;
  onMappingComplete: () => void;
}

interface PlayerMatch {
  filePlayer: string;
  teamPlayer: Player | null;
  similarity: number;
  isManual: boolean;
  rowIndex: number;
}

interface SimilarityGroup {
  level: 'high' | 'medium' | 'low' | 'none';
  label: string;
  players: PlayerMatch[];
}

// Алгоритм Левенштейна для расчета сходства
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Нормализация строки для сравнения
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[й]/g, 'и')
    .replace(/[ъь]/g, '')
    .replace(/[^а-яa-z0-9\s]/g, '')
    .trim();
}

// Расчет процента сходства
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  
  if (normalized1 === normalized2) return 100;
  
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  if (maxLength === 0) return 0;
  
  return Math.max(0, Math.round((1 - distance / maxLength) * 100));
}

// Поиск лучшего совпадения для игрока из файла
function findBestMatch(
  filePlayerName: string, 
  teamPlayers: Player[], 
  alreadyMatched: Set<string> = new Set()
): { player: Player | null; similarity: number } {
  let bestMatch = null;
  let bestSimilarity = 0;
  
  // Нормализуем имя из файла
  const normalizedFile = filePlayerName.toLowerCase().trim();
  
  for (const teamPlayer of teamPlayers) {
    // Пропускаем уже сопоставленных игроков
    if (alreadyMatched.has(teamPlayer.id)) {
      continue;
    }
    
    const fullName = `${teamPlayer.firstName} ${teamPlayer.lastName}`.trim();
    const normalizedTeam = fullName.toLowerCase();
    
    // Проверяем несколько вариантов сопоставления
    const similarities = [
      // Полное имя
      calculateSimilarity(normalizedFile, normalizedTeam),
      // Только фамилия
      calculateSimilarity(normalizedFile, teamPlayer.lastName.toLowerCase()),
      // Только имя
      calculateSimilarity(normalizedFile, teamPlayer.firstName.toLowerCase()),
      // Обратный порядок (имя фамилия -> фамилия имя)
      calculateSimilarity(normalizedFile, `${teamPlayer.lastName} ${teamPlayer.firstName}`.toLowerCase()),
    ];
    
    const maxSimilarity = Math.max(...similarities);
    
    // Дополнительная проверка на частичное совпадение
    let hasPartialMatch = false;
    const fileWords = normalizedFile.split(/\s+/);
    const teamWords = normalizedTeam.split(/\s+/);
    
    for (const fileWord of fileWords) {
      for (const teamWord of teamWords) {
        if (fileWord.length > 2 && teamWord.length > 2) {
          if (fileWord.includes(teamWord) || teamWord.includes(fileWord)) {
            hasPartialMatch = true;
            break;
          }
        }
      }
      if (hasPartialMatch) break;
    }
    
    // Если есть частичное совпадение, увеличиваем оценку
    const finalSimilarity = hasPartialMatch ? Math.max(maxSimilarity, 60) : maxSimilarity;
    
    if (finalSimilarity > bestSimilarity) {
      bestSimilarity = finalSimilarity;
      bestMatch = teamPlayer;
    }
  }
  
  return {
    player: bestSimilarity >= 50 ? bestMatch : null, // Повышенный минимальный порог 50%
    similarity: bestSimilarity
  };
}

export default function SmartPlayerMappingModal({
  open,
  onOpenChange,
  gpsReport,
  teamId,
  onMappingComplete
}: SmartPlayerMappingModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [gpsProfile, setGpsProfile] = useState<GpsProfile | null>(null);
  const [filePlayers, setFilePlayers] = useState<string[]>([]);
  const [playerMatches, setPlayerMatches] = useState<PlayerMatch[]>([]);
  const [saving, setSaving] = useState(false);

  // Загрузка данных при открытии модалки
  useEffect(() => {
    if (open && gpsReport) {
      loadData();
    }
  }, [open, gpsReport, teamId]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading data for GPS report:', gpsReport);
      
      // Загружаем игроков команды
      const players = await getPlayersByTeamId(teamId);
      console.log('👥 Loaded team players:', players.length);
      setTeamPlayers(players);

      // Загружаем GPS профиль
      let profile = null;
      if (gpsReport?.profileId) {
        profile = await getGpsProfileById(gpsReport.profileId);
        console.log('📋 Loaded GPS profile:', profile);
        setGpsProfile(profile);
      }

      // Извлекаем имена игроков из GPS файла
      if (gpsReport?.rawData && profile) {
        console.log('📊 Raw data available:', gpsReport.rawData);
        const names = await extractPlayerNamesFromFile(gpsReport.rawData, profile);
        console.log('👤 Extracted player names:', names);
        setFilePlayers(names);

        // Создаем автоматические сопоставления с проверкой на дублирование
        const matches: PlayerMatch[] = [];
        const usedTeamPlayers = new Set<string>();
        
        for (let index = 0; index < names.length; index++) {
          const name = names[index];
          const { player, similarity } = findBestMatch(name, players, usedTeamPlayers);
          
          const match: PlayerMatch = {
            filePlayer: name,
            teamPlayer: player,
            similarity,
            isManual: false,
            rowIndex: index
          };
          
          // Если нашли сопоставление, отмечаем игрока как использованного
          if (player) {
            usedTeamPlayers.add(player.id);
          }
          
          matches.push(match);
        }

        console.log('🎯 Created matches:', matches);
        setPlayerMatches(matches);
      } else {
        console.warn('⚠️ Missing data:', {
          hasRawData: !!gpsReport?.rawData,
          hasProfile: !!profile,
          profileId: gpsReport?.profileId
        });
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные для маппинга игроков.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Извлечение имен игроков из файла на основе GPS профиля
  const extractPlayerNamesFromFile = async (rawData: any, profile: GpsProfile): Promise<string[]> => {
    console.log('🔍 Extracting names from raw data:', rawData);
    console.log('📋 Using profile:', profile);
    
    if (!rawData || !Array.isArray(rawData)) {
      console.warn('⚠️ Raw data is not an array:', rawData);
      return [];
    }

    // Находим колонку с именами игроков по канонической метрике "athlete_name"
    const nameColumn = await findNameColumn(rawData, profile);
    console.log('📝 Found name column:', nameColumn);
    
    if (!nameColumn) {
      console.warn('⚠️ No name column found');
      return [];
    }

    const names = rawData.map((row: any) => row[nameColumn] || '').filter((name: string) => name.trim());
    console.log('👤 Extracted names:', names);
    
    return names;
  };

  // Поиск колонки с именами в GPS профиле
  const findNameColumn = async (rawData: any, profile: GpsProfile): Promise<string | null> => {
    console.log('🔍 Finding name column for profile:', profile.id);
    
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      console.warn('⚠️ Raw data is empty or not an array');
      return null;
    }
    
    try {
      // Получаем маппинги колонок для профиля
      console.log('📡 Fetching column mappings...');
      const response = await fetch(`/api/gps/profiles/${profile.id}/mappings`);
      if (response.ok) {
        const mappings = await response.json();
        console.log('📋 Column mappings:', mappings);
        
        const nameMapping = mappings.find((mapping: any) => 
          mapping.canonicalMetric === 'athlete_name'
        );
        
        if (nameMapping) {
          console.log('✅ Found name mapping:', nameMapping);
          return nameMapping.sourceColumn;
        } else {
          console.warn('⚠️ No athlete_name mapping found in profile');
        }
      } else {
        console.warn('⚠️ Failed to fetch column mappings:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching column mappings:', error);
    }
    
    // Fallback: используем эвристику - ищем колонки с "name", "player", "athlete"
    console.log('🔄 Using fallback heuristic...');
    const sampleRow = rawData[0];
    console.log('📊 Sample row keys:', Object.keys(sampleRow));
    
    const possibleColumns = Object.keys(sampleRow).filter(key => 
      key.toLowerCase().includes('name') || 
      key.toLowerCase().includes('player') || 
      key.toLowerCase().includes('athlete')
    );

    console.log('🎯 Possible name columns:', possibleColumns);
    return possibleColumns.length > 0 ? possibleColumns[0] : null;
  };

  // Группировка игроков по уровню сходства
  const similarityGroups = useMemo((): SimilarityGroup[] => {
    const groups: SimilarityGroup[] = [
      { level: 'high', label: 'Высокое сходство (80-100%)', players: [] },
      { level: 'medium', label: 'Среднее сходство (60-79%)', players: [] },
      { level: 'low', label: 'Низкое сходство (50-59%)', players: [] },
      { level: 'none', label: 'Нет похожих', players: [] }
    ];

    playerMatches.forEach(match => {
      if (match.teamPlayer) {
        if (match.similarity >= 80) groups[0].players.push(match);
        else if (match.similarity >= 60) groups[1].players.push(match);
        else if (match.similarity >= 50) groups[2].players.push(match);
        else groups[3].players.push(match);
      } else {
        groups[3].players.push(match);
      }
    });

    return groups.filter(group => group.players.length > 0);
  }, [playerMatches]);

  // Изменение сопоставления игрока
  const handlePlayerChange = (filePlayer: string, newPlayerId: string | null) => {
    setPlayerMatches(prev => prev.map(match => {
      if (match.filePlayer === filePlayer) {
        const teamPlayer = newPlayerId ? teamPlayers.find(p => p.id === newPlayerId) || null : null;
        return {
          ...match,
          teamPlayer,
          isManual: true,
          similarity: teamPlayer ? calculateSimilarity(filePlayer, `${teamPlayer.firstName} ${teamPlayer.lastName}`.trim()) : 0
        };
      }
      return match;
    }));
  };

  // Проверка на дублирование сопоставлений
  const hasDuplicateMappings = useMemo(() => {
    const mappedPlayerIds = playerMatches
      .filter(match => match.teamPlayer)
      .map(match => match.teamPlayer!.id);
    
    return mappedPlayerIds.length !== new Set(mappedPlayerIds).size;
  }, [playerMatches]);

  // Сохранение маппинга
  const handleSave = async () => {
    if (hasDuplicateMappings) {
      toast({
        title: 'Ошибка',
        description: 'Нельзя сопоставить одного игрока команды с несколькими игроками из файла.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Удаляем старые маппинги для этого отчета
      if (gpsReport) {
        await deleteGpsPlayerMappings(gpsReport.id);
      }

      // Создаем новые маппинги только для сопоставленных игроков
      const mappingsToSave = playerMatches.filter(match => match.teamPlayer);
      
      for (const mapping of mappingsToSave) {
        await createGpsPlayerMapping({
          gpsReportId: gpsReport!.id,
          playerId: mapping.teamPlayer!.id,
          rowIndex: mapping.rowIndex
        });
      }

      toast({
        title: 'Успех',
        description: `Сохранено ${mappingsToSave.length} сопоставлений игроков.`,
      });

      onMappingComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving player mappings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить сопоставления игроков.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (similarity >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (similarity >= 50) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getSimilarityBadge = (similarity: number) => {
    if (similarity >= 80) return 'bg-green-500/20 text-green-400';
    if (similarity >= 60) return 'bg-yellow-500/20 text-yellow-400';
    if (similarity >= 50) return 'bg-orange-500/20 text-orange-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b border-vista-secondary/30">
            <DialogTitle className="text-vista-light text-xl">Маппинг игроков</DialogTitle>
            <DialogDescription className="text-vista-light/60">
              Загрузка данных...
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-vista-light/60">Загрузка...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-vista-secondary/30">
          <DialogTitle className="text-vista-light text-xl">Маппинг игроков</DialogTitle>
          <DialogDescription className="text-vista-light/60">
            Сопоставьте игроков из GPS файла с игроками команды
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Статистика */}
          <div className="px-6 py-4 border-b border-vista-secondary/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-vista-light/60">
                Найдено игроков в файле: {filePlayers.length}
              </div>
              <div className="text-sm text-vista-light/60">
                Сопоставлено: {playerMatches.filter(m => m.teamPlayer).length}
              </div>
            </div>
          </div>

          {/* Список игроков */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {similarityGroups.map((group) => (
                <div key={group.level} className="space-y-3">
                  <h3 className={`text-sm font-medium ${
                    group.level === 'high' ? 'text-green-400' :
                    group.level === 'medium' ? 'text-yellow-400' :
                    group.level === 'low' ? 'text-orange-400' :
                    'text-gray-400'
                  }`}>
                    {group.label} ({group.players.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {group.players.map((match, index) => (
                      <Card key={`${match.filePlayer}-${index}`} className={`${
                        group.level === 'none' ? 'opacity-50' : ''
                      } ${
                        match.teamPlayer ? getSimilarityColor(match.similarity) : 'bg-gray-500/10 border-gray-500/30'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-vista-light">
                                {match.filePlayer}
                              </div>
                              {match.teamPlayer && (
                                <div className="text-sm text-vista-light/60 mt-1">
                                  {match.teamPlayer.firstName} {match.teamPlayer.lastName}
                                  {match.teamPlayer.number && ` (#${match.teamPlayer.number})`}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              {match.similarity > 0 && (
                                <Badge className={getSimilarityBadge(match.similarity)}>
                                  {match.similarity}%
                                </Badge>
                              )}
                              
                              {match.isManual && (
                                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                  Выбрано вручную
                                </Badge>
                              )}
                              
                              <Select
                                value={match.teamPlayer?.id || 'none'}
                                onValueChange={(value) => handlePlayerChange(match.filePlayer, value === 'none' ? null : value)}
                              >
                                <SelectTrigger className="w-48 bg-vista-secondary/20 border-vista-secondary/30 text-vista-light">
                                  <SelectValue placeholder="Выберите игрока" />
                                </SelectTrigger>
                                <SelectContent className="bg-vista-dark border-vista-secondary/30">
                                  <SelectItem value="none">Не сопоставлять</SelectItem>
                                  {teamPlayers.map((player) => (
                                    <SelectItem 
                                      key={player.id} 
                                      value={player.id}
                                      disabled={playerMatches.some(m => 
                                        m.teamPlayer?.id === player.id && m.filePlayer !== match.filePlayer
                                      )}
                                    >
                                      {player.firstName} {player.lastName}
                                      {player.number && ` (#${player.number})`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-vista-secondary/30 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="bg-transparent border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || hasDuplicateMappings}
            className="bg-vista-primary hover:bg-vista-primary/80 text-white"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
