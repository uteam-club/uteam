'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, UserPlus, AlertCircle, Users } from 'lucide-react';
// Удаляем импорт серверного сервиса
interface PlayerMappingResult {
  reportName: string;
  suggestedPlayer: any | null;
  confidence: number;
  alternatives: any[];
  action: 'confirm' | 'skip' | 'manual';
  mappingId?: string;
}

// Новый тип для элементов маппинга
type MappingItem = {
  reportName: string;
  rowIndex?: number;
  selectedPlayerId?: string | null;
  mappingType: 'auto' | 'manual' | 'none';
  confidenceScore?: number | null; // только из авто-подбора, при ручном выборе не трогаем
  candidates?: Array<{ id: string; name: string; score: number }>;
  isConfirmed?: boolean;
  changeOrigin: 'auto' | 'user' | 'saved' | 'reset'; // источник изменения
  userSelected?: boolean; // НОВОЕ: истина только если клик в селекте
  // Legacy поля для совместимости
  suggestedPlayer?: any | null;
  confidence?: number;
  alternatives?: any[];
  action?: 'confirm' | 'skip' | 'manual';
  mappingId?: string;
};

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

// Функция для проверки служебных строк
function isSummaryRow(name: string) {
  const n = name.toLowerCase().trim().replace(/[ё]/g, 'е').replace(/[-'']+/g, ' ').replace(/\s+/g, ' ');
  return ['среднее','сумма','average','total'].some(k => n.includes(k));
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
  const [mappings, setMappings] = useState<MappingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);

  // Вычисление конфликтов
  const conflicts = React.useMemo(() => {
    const byPlayer = new Map<string, string[]>(); // playerId -> [reportName...]
    mappings.forEach(r => {
      if (r.selectedPlayerId) {
        const arr = byPlayer.get(r.selectedPlayerId) ?? [];
        arr.push(r.reportName);
        byPlayer.set(r.selectedPlayerId, arr);
      }
    });
    const ids = new Set<string>();
    byPlayer.forEach((names, id) => { if (names.length > 1) ids.add(id); });
    return { ids, byPlayer }; // ids: Set<string>, byPlayer: Map<string,string[]>
  }, [mappings]);

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
          console.log('🔍 Auto-match result for', reportName, ':', {
            result,
            suggestedPlayer: result.suggestedPlayer,
            suggestedPlayerId: result.suggestedPlayer?.id,
            confidence: result.confidence,
            action: result.action
          });
          const isAuto = result.action === 'confirm' && result.suggestedPlayer?.id;
          
          return {
            ...result,
            reportName,
            rowIndex: reportNames.indexOf(reportName),
            selectedPlayerId: isAuto ? result.suggestedPlayer.id : null,
            mappingType: isAuto ? 'auto' : 'none',
            confidenceScore: typeof result.confidence === 'number' ? result.confidence : 0,
            candidates: [], // Убираем альтернативы
            isConfirmed: !!isAuto,
            changeOrigin: result.source === 'saved' ? 'saved' : 'auto',
            userSelected: false,
            // Legacy поля
            suggestedPlayer: result.suggestedPlayer,
            confidence: result.confidence,
            alternatives: [],
            action: result.action,
            mappingId: result.mappingId,
            source: result.source
          };
        } else {
          // Если API недоступен, создаем базовый результат
          return {
            reportName,
            rowIndex: reportNames.indexOf(reportName),
            selectedPlayerId: null,
            mappingType: 'none' as const,
            confidenceScore: 0,
            candidates: [],
            isConfirmed: false,
            changeOrigin: 'auto',
            userSelected: false,
            // Legacy поля
            suggestedPlayer: null,
            confidence: 0,
            alternatives: [],
            action: 'manual',
          };
        }
      });

      const results = await Promise.all(mappingPromises);
      console.log('🔍 Final mapping results:', results);
      
      // Временная диагностика (только в dev)
      if (process.env.NEXT_PUBLIC_GPS_DEBUG === '1') {
        console.table(results.map(m => ({
          reportName: m.reportName,
          mappingType: m.mappingType,
          changeOrigin: m.changeOrigin,
          userSelected: !!m.userSelected,
          selectedPlayerId: m.selectedPlayerId,
          confidence: m.confidenceScore
        })));
      }
      
      setMappings(results);
    } catch (error) {
      console.error('Ошибка автоматического сопоставления:', error);
      // Создаем базовые результаты при ошибке
      const results = reportNames.map(reportName => ({
        reportName,
        rowIndex: reportNames.indexOf(reportName),
        selectedPlayerId: null,
        mappingType: 'none' as const,
        confidenceScore: 0,
        candidates: [],
        isConfirmed: false,
        changeOrigin: 'auto' as const,
        userSelected: false,
        // Legacy поля
        suggestedPlayer: null,
        confidence: 0,
        alternatives: [],
        action: 'manual' as const,
      }));
      setMappings(results);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (rowIndex: number, selectedPlayerId: string | null, isUser: boolean) => {
    console.log('Mapping change:', { rowIndex, selectedPlayerId, isUser, teamPlayers });
    setMappings(ms => ms.map((m, i) => i !== rowIndex ? m : {
      ...m,
      selectedPlayerId,
      mappingType: isUser ? 'manual' : m.mappingType, // manual только при клике пользователя
      isConfirmed: !!selectedPlayerId,
      changeOrigin: isUser ? 'user' : m.changeOrigin ?? 'auto',
      userSelected: isUser ? true : m.userSelected ?? false,
      // Legacy поля
      suggestedPlayer: selectedPlayerId ? teamPlayers.find(p => p.id === selectedPlayerId) || null : null,
      action: 'manual',
    }));
  };

  // Удаляем функцию создания игрока - больше не нужна


  const handleConfirmAll = async () => {
    setLoading(true);
    try {
      // Сохраняем маппинги в базу данных
      const savePromises = mappings
        .filter(mapping => mapping.selectedPlayerId)
        .map(async (mapping) => {
          // Сохраняем маппинг через API
          const response = await fetch('/api/player-mappings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reportName: mapping.reportName,
              playerId: mapping.selectedPlayerId,
              gpsSystem,
              teamId,
              confidenceScore: mapping.confidenceScore || mapping.confidence,
              mappingType: mapping.mappingType || mapping.action,
              notes: 'Создан при загрузке отчета'
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка сохранения маппинга');
          }
          
          return response.json();
        });

      const savedMappings = await Promise.all(savePromises);
      console.log('✅ Маппинги сохранены в базу:', savedMappings);
      
      // Передаем результаты в родительский компонент для загрузки отчёта
      console.log('🔍 Все mappings перед фильтрацией:', mappings);
      const apiMappings = mappings
        .filter(mapping => mapping.selectedPlayerId)
        .map(mapping => ({
          reportName: mapping.reportName,
          rowIndex: mapping.rowIndex,
          selectedPlayerId: mapping.selectedPlayerId!,
          mappingType: mapping.mappingType,
          confidenceScore: mapping.confidenceScore
        }));
      
      console.log('🔗 Передаем маппинги в UploadGpsReportModal:', apiMappings);
      onConfirm(apiMappings);
      onClose();
    } catch (error: any) {
      console.error('Ошибка сохранения маппингов:', error);
      
      // Обработка ошибки дублирования маппингов
      if (error.message && error.message.includes('duplicate_player_mapping')) {
        // Показываем тост с информацией о конфликтах
        console.error('Обнаружены дублирующиеся маппинги игроков:', error.details);
        // Здесь можно добавить toast уведомление
      }
    } finally {
      setLoading(false);
    }
  };

  const getMappingBadge = (mapping: MappingItem) => {
    // Если пользователь выбрал вручную
    if (mapping.userSelected === true) {
      return {
        text: 'Выбран вручную',
        className: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      };
    }
    
    // Если автоподбор с выбранным игроком
    if (mapping.mappingType === 'auto' && mapping.selectedPlayerId) {
      const confidence = mapping.confidenceScore || 0;
      const pct = Math.round(confidence * 100);
      return {
        text: `Авто • ${pct}%`,
        className: confidence >= 0.8 
          ? 'bg-green-500/20 text-green-400 border-green-500/30'
          : confidence >= 0.6 
            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            : 'bg-red-500/20 text-red-400 border-red-500/30'
      };
    }
    
    return {
      text: 'Не сопоставлено',
      className: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
  };

  const getActionIcon = (action: string, selectedPlayerId?: string) => {
    if (!selectedPlayerId || selectedPlayerId === 'undefined' || selectedPlayerId === '') {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
    
    switch (action) {
      case 'confirm':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'create':
        return <UserPlus className="w-4 h-4 text-red-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const getActionText = (action: string, selectedPlayerId?: string) => {
    if (!selectedPlayerId || selectedPlayerId === 'undefined' || selectedPlayerId === '') {
      return 'Не выбран';
    }
    
    switch (action) {
      case 'confirm':
        return 'Подтверждено';
      case 'create':
        return 'Игрок отсутствует';
      case 'manual':
        return 'Выбран вручную';
      default:
        return 'Не выбран';
    }
  };

  // Определение уровня сходства на основе mappingType и confidence score
  const getSimilarityLevel = (mapping: MappingItem) => {
    // Если нет выбранного игрока, всегда считаем как 'none'
    if (!mapping.selectedPlayerId || mapping.selectedPlayerId === 'undefined' || mapping.selectedPlayerId === '') {
      return 'none';
    }
    
    if (mapping.mappingType === 'auto' && mapping.confidenceScore !== undefined && mapping.confidenceScore !== null) {
      if (mapping.confidenceScore >= 0.8) return 'high';
      if (mapping.confidenceScore >= 0.5) return 'medium';
      if (mapping.confidenceScore >= 0.3) return 'low';
    }
    
    if (mapping.mappingType === 'manual') {
      return 'manual';
    }
    
    return 'none';
  };

  // Стили для разделителей групп
  const getSeparatorStyles = (groupKey: string) => {
    switch (groupKey) {
      case 'high':
        return {
          lineClass: 'bg-gradient-to-r from-green-500 to-green-400',
          iconClass: 'text-green-400',
          bgClass: 'bg-green-500/10',
          borderClass: 'border-green-500/20'
        };
      case 'medium':
        return {
          lineClass: 'bg-gradient-to-r from-yellow-500 to-yellow-400',
          iconClass: 'text-yellow-400',
          bgClass: 'bg-yellow-500/10',
          borderClass: 'border-yellow-500/20'
        };
      case 'low':
        return {
          lineClass: 'bg-gradient-to-r from-orange-500 to-orange-400',
          iconClass: 'text-orange-400',
          bgClass: 'bg-orange-500/10',
          borderClass: 'border-orange-500/20'
        };
      case 'manual':
        return {
          lineClass: 'bg-gradient-to-r from-blue-500 to-blue-400',
          iconClass: 'text-blue-400',
          bgClass: 'bg-blue-500/10',
          borderClass: 'border-blue-500/20'
        };
      case 'none':
        return {
          lineClass: 'bg-gradient-to-r from-gray-500 to-gray-400',
          iconClass: 'text-gray-400',
          bgClass: 'bg-gray-500/10',
          borderClass: 'border-gray-500/20'
        };
      default:
        return {
          lineClass: 'bg-gradient-to-r from-gray-500 to-gray-400',
          iconClass: 'text-gray-400',
          bgClass: 'bg-gray-500/10',
          borderClass: 'border-gray-500/20'
        };
    }
  };

  // Группируем маппинги по уровню сходства
  const groupedMappings = mappings.reduce((groups, mapping) => {
    const similarityLevel = getSimilarityLevel(mapping);
    if (!groups[similarityLevel]) {
      groups[similarityLevel] = [];
    }
    groups[similarityLevel].push(mapping);
    return groups;
  }, {} as Record<string, MappingItem[]>);

  // Порядок отображения групп
  const groupOrder = ['high', 'medium', 'low', 'manual', 'none'];
  const groupTitles = {
    high: 'Высокое сходство (80-100%)',
    medium: 'Среднее сходство (50-79%)',
    low: 'Низкое сходство (30-49%)',
    manual: 'Ручной выбор',
    none: 'Игроки без привязки'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-2xl overflow-y-auto max-h-[80vh] focus:outline-none focus:ring-0 custom-scrollbar"
        aria-describedby="player-mapping-description"
      >
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-vista-primary" />
            Сопоставление игроков из отчета
          </DialogTitle>
        </DialogHeader>
        <div id="player-mapping-description" className="sr-only">
          Модальное окно для сопоставления игроков из GPS отчета с игроками команды
        </div>

        <div className="grid gap-4 py-4 custom-scrollbar">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary mx-auto"></div>
              <p className="text-vista-light/70 mt-2">Анализируем игроков...</p>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {groupOrder.map(groupKey => {
                  const groupMappings = groupedMappings[groupKey] || [];
                  if (groupMappings.length === 0) return null;

                  const groupTitle = groupTitles[groupKey as keyof typeof groupTitles];
                  const separatorStyles = getSeparatorStyles(groupKey);

                  return (
                    <div key={groupKey} className="space-y-4">
                      {/* Компактный разделитель с полоской */}
                      <div className={`relative ${separatorStyles.bgClass} rounded-md px-3 py-2 border ${separatorStyles.borderClass}`}>
                        <div className="flex items-center gap-3">
                          {/* Иконка */}
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full ${separatorStyles.bgClass} flex items-center justify-center`}>
                            {groupKey === 'high' && (
                              <svg className={`w-4 h-4 ${separatorStyles.iconClass}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {groupKey === 'medium' && (
                              <svg className={`w-4 h-4 ${separatorStyles.iconClass}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            )}
                            {groupKey === 'low' && (
                              <svg className={`w-4 h-4 ${separatorStyles.iconClass}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                            {groupKey === 'manual' && (
                              <svg className={`w-4 h-4 ${separatorStyles.iconClass}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            )}
                            {groupKey === 'none' && (
                              <svg className={`w-4 h-4 ${separatorStyles.iconClass}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          
                          {/* Заголовок группы */}
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-vista-light">{groupTitle}</h4>
                          </div>
                          
                          {/* Счетчик */}
                          <Badge className={`${getMappingBadge(groupMappings[0] || {}).className} text-xs px-2 py-1`}>
                            {groupMappings.length}
                          </Badge>
                        </div>
                        
                        {/* Декоративная полоска */}
                        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${separatorStyles.lineClass} rounded-b-md`}></div>
                      </div>
                      
                      {/* Плитки игроков в группе */}
                      <div className="space-y-3">
                        {groupMappings.map((mapping, index) => {
                          console.log('🔍 Rendering mapping for', mapping.reportName, ':', {
                            selectedPlayerId: mapping.selectedPlayerId,
                            confidence: mapping.confidence,
                            suggestedPlayer: mapping.suggestedPlayer,
                            action: mapping.action
                          });
                          
                          // Проверяем, есть ли selectedPlayerId в teamPlayers
                          const selectedPlayer = teamPlayers.find(p => p.id === mapping.selectedPlayerId);
                          console.log('🔍 Selected player in teamPlayers:', selectedPlayer);
                          console.log('🔍 Team players count:', teamPlayers.length);
                          const hasConflict = conflicts.ids.has(mapping.selectedPlayerId || '');
                          return (
                          <div key={index} className={`bg-vista-dark/50 border border-vista-secondary/30 rounded-lg p-3 ${hasConflict ? 'ring-1 ring-red-500/60' : ''}`}>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-vista-light font-medium text-base">{mapping.reportName}</h3>
                              <div className="flex items-center gap-2">
                                <Badge className={getMappingBadge(mapping).className}>
                                  {getMappingBadge(mapping).text}
                                </Badge>
                                {hasConflict && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30" title={`Также выбран для: ${conflicts.byPlayer.get(mapping.selectedPlayerId || '')?.filter(n => n !== mapping.reportName).join(', ')}`}>
                                    Конфликт
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1">
                                  {getActionIcon(mapping.action || 'manual', mapping.selectedPlayerId || undefined)}
                                  <span className="text-xs">{getActionText(mapping.action || 'manual', mapping.selectedPlayerId || undefined)}</span>
                                </div>
                              </div>
                            </div>
                    
                    <div className="space-y-3">

                                            {/* Выбор игрока */}
                      <div>
                        <p className="text-vista-light/70 text-xs mb-1">Выберите игрока:</p>
                        <Select
                          value={mapping.selectedPlayerId || '__none__'}
                          onValueChange={(value) => handleMappingChange(mapping.rowIndex || 0, value === '__none__' ? null : value, true)}
                        >
                          <SelectTrigger className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0">
                            <SelectValue placeholder="Выберите игрока из команды">
                              {mapping.selectedPlayerId && teamPlayers.find(p => p.id === mapping.selectedPlayerId) 
                                ? `${teamPlayers.find(p => p.id === mapping.selectedPlayerId)?.firstName || ''} ${teamPlayers.find(p => p.id === mapping.selectedPlayerId)?.lastName || ''}`.trim()
                                : mapping.suggestedPlayer 
                                  ? `${mapping.suggestedPlayer.firstName || ''} ${mapping.suggestedPlayer.lastName || ''}`.trim()
                                  : "Выберите игрока из команды"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                            <SelectItem value="__none__">
                              <span className="text-gray-400">Не сопоставлено</span>
                            </SelectItem>
                            {teamPlayers.map((player) => (
                              <SelectItem key={player.id} value={player.id}>
                                {`${player.firstName || ''} ${player.lastName || ''}`.trim() || player.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

              {/* Превью маппинга */}
              <div className="mt-4 p-3 rounded-lg border border-vista-secondary/30 bg-vista-dark/30">
                <div className="text-sm font-medium text-vista-light mb-2">Итоговый расчёт:</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">
                      {mappings.filter(m => m.selectedPlayerId && !isSummaryRow(m.reportName)).length}
                    </div>
                    <div className="text-xs text-vista-light/70">✔ Будет загружено (промаплено)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-400">
                      {mappings.filter(m => !m.selectedPlayerId && !isSummaryRow(m.reportName)).length}
                    </div>
                    <div className="text-xs text-vista-light/70">⚠ Пропущено</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">
                      {mappings.filter(m => isSummaryRow(m.reportName)).length}
                    </div>
                    <div className="text-xs text-vista-light/70">🛈 Служебные строки</div>
                  </div>
                </div>
                
                {mappings.filter(m => m.selectedPlayerId && !isSummaryRow(m.reportName)).length === 0 && (
                  <div className="mt-2 text-sm text-red-400">
                    ⚠️ Нужно сопоставить минимум одного игрока
                  </div>
                )}
              </div>

              {/* Кнопки действий */}
              <div className="flex justify-end gap-2 pt-4 border-t border-vista-secondary/30">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
                  onClick={onClose}
                >
                  Отмена
                </Button>
                <Button
                  type="button"
                  className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
                  onClick={handleConfirmAll}
                  disabled={loading || conflicts.ids.size > 0 || mappings.filter(m => m.selectedPlayerId && !isSummaryRow(m.reportName)).length === 0}
                  title={
                    conflicts.ids.size > 0 ? 'Устраните конфликты сопоставлений' : 
                    mappings.filter(m => m.selectedPlayerId && !isSummaryRow(m.reportName)).length === 0 ? 'Нужно сопоставить минимум одного игрока' : ''
                  }
                >
                  {loading ? 'Сохранение...' : 
                   conflicts.ids.size > 0 ? 'Устраните конфликты сопоставлений' : 
                   mappings.filter(m => m.selectedPlayerId && !isSummaryRow(m.reportName)).length === 0 ? 'Нужно сопоставить игрока' : 
                   'Подтвердить'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 