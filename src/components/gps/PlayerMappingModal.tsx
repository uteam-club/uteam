'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, UserPlus, AlertCircle, Users } from 'lucide-react';
// Удаляем импорт серверного сервиса
interface PlayerMappingResult {
  reportName: string;
  suggestedPlayer: any | null;
  confidence: number;
  alternatives: any[];
  action: 'confirm' | 'skip' | 'manual';
  mappingId?: string;
}

interface PlayerMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mappings: { reportName: string; selectedPlayerId: string }[]) => void;
  reportNames: string[];
  gpsSystem: string;
  teamId: string;
  clubId: string;
  createdById: string;
}

interface MappingState extends PlayerMappingResult {
  isConfirmed: boolean;
  selectedPlayerId?: string;
}

export default function PlayerMappingModal({
  isOpen,
  onClose,
  onConfirm,
  reportNames,
  gpsSystem,
  teamId,
  clubId,
  createdById
}: PlayerMappingModalProps) {
  const [mappings, setMappings] = useState<MappingState[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);

  // Загружаем игроков команды
  useEffect(() => {
    console.log('useEffect for fetchTeamPlayers:', { isOpen, teamId });
    if (isOpen && teamId && teamId.trim() !== '') {
      fetchTeamPlayers();
    }
  }, [isOpen, teamId]);

  // Автоматическое сопоставление при открытии
  useEffect(() => {
    if (isOpen && reportNames.length > 0 && teamPlayers.length > 0) {
      performAutoMapping();
    }
  }, [isOpen, reportNames, teamPlayers]);

  const fetchTeamPlayers = async () => {
    console.log('Fetching team players for teamId:', teamId);
    try {
      const response = await fetch(`/api/teams/${teamId}/players`);
      console.log('Response status:', response.status);
      if (response.ok) {
        const players = await response.json();
        console.log('Players loaded:', players);
        setTeamPlayers(players);
      } else {
        console.error('Failed to load players:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Ошибка загрузки игроков команды:', error);
    }
  };

  const performAutoMapping = async () => {
    setLoading(true);
    try {
      const mappingPromises = reportNames.map(async (reportName) => {
        // Вызываем API для автоматического сопоставления
        const response = await fetch('/api/player-mappings/auto-match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportName,
            teamId,
            clubId,
            gpsSystem
          })
        });

        if (response.ok) {
          const result = await response.json();
          return {
            ...result,
            isConfirmed: result.action === 'confirm',
            selectedPlayerId: result.suggestedPlayer?.id
          };
        } else {
          // Если API недоступен, создаем базовый результат
          return {
            reportName,
            suggestedPlayer: null,
            confidence: 0,
            alternatives: [],
            action: 'manual',
            isConfirmed: false
          };
        }
      });

      const results = await Promise.all(mappingPromises);
      setMappings(results);
    } catch (error) {
      console.error('Ошибка автоматического сопоставления:', error);
      // Создаем базовые результаты при ошибке
      const results = reportNames.map(reportName => ({
        reportName,
        suggestedPlayer: null,
        confidence: 0,
        alternatives: [],
        action: 'manual' as const,
        isConfirmed: false
      }));
      setMappings(results);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (reportName: string, playerId: string) => {
    console.log('Mapping change:', { reportName, playerId, teamPlayers });
    setMappings(prev => prev.map(mapping => {
      if (mapping.reportName === reportName) {
        const selectedPlayer = teamPlayers.find(p => p.id === playerId);
        console.log('Selected player:', selectedPlayer);
        return {
          ...mapping,
          selectedPlayerId: playerId,
          suggestedPlayer: selectedPlayer || null,
          confidence: selectedPlayer ? 1.0 : 0,
          action: 'manual',
          isConfirmed: false // Не подтверждаем автоматически
        };
      }
      return mapping;
    }));
  };

  // Удаляем функцию создания игрока - больше не нужна

  const handleSkipPlayer = (reportName: string) => {
    setMappings(prev => prev.map(mapping => {
      if (mapping.reportName === reportName) {
        return {
          ...mapping,
          action: 'skip',
          isConfirmed: true
        };
      }
      return mapping;
    }));
  };

  const handleConfirmAll = async () => {
    setLoading(true);
    try {
      // Сохраняем маппинги в базу данных
      const savePromises = mappings
        .filter(mapping => mapping.action !== 'skip' && mapping.selectedPlayerId)
        .map(async (mapping) => {
          // Сохраняем маппинг через API
          await fetch('/api/player-mappings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reportName: mapping.reportName,
              playerId: mapping.selectedPlayerId,
              gpsSystem,
              teamId,
              confidenceScore: mapping.confidence,
              mappingType: mapping.action,
              notes: 'Создан при загрузке отчета'
            })
          });
        });

      await Promise.all(savePromises);
      
      // Преобразуем маппинги в нужный формат для API
      const apiMappings = mappings
        .filter(mapping => mapping.action !== 'skip' && mapping.selectedPlayerId)
        .map(mapping => ({
          reportName: mapping.reportName,
          selectedPlayerId: mapping.selectedPlayerId!
        }));
      
      console.log('🔗 Передаем маппинги в API формате:', apiMappings);
      
      // Передаем результаты в родительский компонент
      onConfirm(apiMappings);
      onClose();
    } catch (error) {
      console.error('Ошибка сохранения маппингов:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (confidence >= 0.6) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'confirm':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'skip':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'confirm':
        return 'Подтверждено';
      case 'skip':
        return 'Пропустить';
      default:
        return 'Требует внимания';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-vista-dark/95 border-vista-secondary/30 text-vista-light max-w-4xl max-h-[85vh] overflow-y-auto mt-8"
        aria-describedby="player-mapping-description"
      >
        <DialogHeader>
          <DialogTitle className="text-vista-light flex items-center gap-2">
            <Users className="w-5 h-5" />
            Сопоставление игроков из отчета
          </DialogTitle>
        </DialogHeader>
        <div id="player-mapping-description" className="sr-only">
          Модальное окно для сопоставления игроков из GPS отчета с игроками команды
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary mx-auto"></div>
              <p className="text-vista-light/70 mt-2">Анализируем игроков...</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {mappings.map((mapping, index) => (
                  <Card key={index} className="bg-vista-dark/50 border-vista-secondary/50">
                    <CardHeader>
                      <CardTitle className="text-vista-light text-lg flex items-center justify-between">
                        <span>{mapping.reportName}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={getConfidenceColor(mapping.confidence)}>
                            {Math.round(mapping.confidence * 100)}%
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getActionIcon(mapping.action)}
                            <span className="text-sm">{getActionText(mapping.action)}</span>
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                                             {/* Предлагаемый игрок */}
                       {mapping.suggestedPlayer && (
                         <div className="bg-vista-dark/30 p-3 rounded-lg">
                           <p className="text-vista-light/70 text-sm mb-2">Предлагаемый игрок:</p>
                           <p className="text-vista-light font-medium">{`${mapping.suggestedPlayer.firstName || ''} ${mapping.suggestedPlayer.lastName || ''}`.trim() || mapping.suggestedPlayer.id}</p>
                         </div>
                       )}

                      {/* Альтернативы */}
                      {mapping.alternatives.length > 0 && (
                        <div>
                          <p className="text-vista-light/70 text-sm mb-2">Альтернативы:</p>
                          <div className="space-y-2">
                                                         {mapping.alternatives.map((player, idx) => (
                               <div key={idx} className="flex items-center gap-2 p-2 bg-vista-dark/20 rounded">
                                 <span className="text-vista-light">{`${player.firstName || ''} ${player.lastName || ''}`.trim() || player.id}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-vista-dark border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                                  onClick={() => handleMappingChange(mapping.reportName, player.id)}
                                >
                                  Выбрать
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Выбор игрока */}
                      <div>
                        <p className="text-vista-light/70 text-sm mb-2">Выберите игрока:</p>
                        <Select
                          value={mapping.selectedPlayerId || ''}
                          onValueChange={(value) => handleMappingChange(mapping.reportName, value)}
                        >
                          <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light">
                            <SelectValue placeholder="Выберите игрока из команды" />
                          </SelectTrigger>
                                                     <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light">
                             {teamPlayers.map((player) => (
                               <SelectItem key={player.id} value={player.id}>
                                 {`${player.firstName || ''} ${player.lastName || ''}`.trim() || player.id}
                               </SelectItem>
                             ))}
                           </SelectContent>
                        </Select>
                      </div>

                      {/* Действия */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-vista-dark border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                          onClick={() => handleSkipPlayer(mapping.reportName)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Пропустить
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Кнопки действий */}
              <div className="flex justify-end gap-3 pt-4 border-t border-vista-secondary/30">
                <Button
                  variant="outline"
                  className="bg-vista-dark border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                  onClick={onClose}
                >
                  Отмена
                </Button>
                <Button
                  className="bg-vista-primary hover:bg-vista-primary/80 text-white"
                  onClick={handleConfirmAll}
                  disabled={loading}
                >
                  {loading ? 'Сохранение...' : 'Подтвердить все'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 