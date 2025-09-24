'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { gpsLogger } from '@/lib/logger';
import { Save, X, RefreshCw, Trash2, AlertTriangle, UserX, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface GpsReportData {
  id: string;
  playerId: string;
  playerName: string;
  fieldName: string;
  fieldLabel: string;
  canonicalMetric: string;
  value: number | string;
  unit: string;
  canonicalValue: number;
  canonicalUnit: string;
}

interface GpsReport {
  id: string;
  name: string;
  fileName: string;
  gpsSystem: string;
  eventType: 'training' | 'match';
  teamName: string;
  playersCount: number;
  createdAt: string;
}

interface EditGpsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
}

export function EditGpsReportModal({ isOpen, onClose, reportId }: EditGpsReportModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<GpsReport | null>(null);
  const [data, setData] = useState<GpsReportData[]>([]);
  const [editedData, setEditedData] = useState<Map<string, { value: number | string; reason?: string }>>(new Map());
  
  // Состояние для удаления
  const [deletedPlayers, setDeletedPlayers] = useState<Set<string>>(new Set());
  const [deletedMetrics, setDeletedMetrics] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'player' | 'metric';
    target: string;
    name: string;
  }>({ isOpen: false, type: 'player', target: '', name: '' });

  useEffect(() => {
    if (isOpen && reportId) {
      fetchReportData();
    } else {
      setReport(null);
      setData([]);
      setEditedData(new Map());
      setDeletedPlayers(new Set());
      setDeletedMetrics(new Set());
      setDeleteDialog({ isOpen: false, type: 'player', target: '', name: '' });
      setLoading(true);
    }
  }, [isOpen, reportId]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Получаем информацию об отчете
      const reportResponse = await fetch(`/api/gps/reports/${reportId}`);
      if (!reportResponse.ok) {
        throw new Error('Failed to fetch report');
      }
      const reportData = await reportResponse.json();
      setReport(reportData.report);

      // Получаем данные отчета
      const dataResponse = await fetch(`/api/gps/reports/${reportId}/data`);
      if (!dataResponse.ok) {
        throw new Error('Failed to fetch report data');
      }
      const dataResult = await dataResponse.json();
      if (dataResult.data && dataResult.data.length > 0) {
      }
      setData(dataResult.data || []);
    } catch (error) {
      gpsLogger.error('Component', 'Error fetching report data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные отчета.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (dataId: string, newValue: string) => {
    const numericValue = parseFloat(newValue);
    const value = isNaN(numericValue) ? newValue : numericValue;
    
    setEditedData(prev => {
      const newMap = new Map(prev);
      newMap.set(dataId, { value });
      return newMap;
    });
  };

  const handleSave = async () => {
    if (!hasChanges) {
      toast({
        title: 'Нет изменений',
        description: 'Не было внесено изменений для сохранения.',
        variant: 'default',
      });
      return;
    }

    setSaving(true);
    try {
      const updates = Array.from(editedData.entries()).map(([dataId, { value }]) => ({
        dataId,
        value,
        reason: 'Редактирование через модальное окно'
      }));

      // Подготавливаем данные для удаления
      const deletedPlayerIds = Array.from(deletedPlayers);
      const deletedMetricNames = Array.from(deletedMetrics);

      const response = await fetch(`/api/gps/reports/${reportId}/data/bulk-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          updates,
          deletedPlayers: deletedPlayerIds,
          deletedMetrics: deletedMetricNames
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      const totalChanges = editedData.size + deletedPlayers.size + deletedMetrics.size;
      toast({
        title: 'Успешно',
        description: `Сохранено ${totalChanges} изменений (${editedData.size} редактирований, ${deletedPlayers.size} удалений игроков, ${deletedMetrics.size} удалений метрик).`,
        variant: 'default',
      });

      // Обновляем данные
      await fetchReportData();
      setEditedData(new Map());
      setDeletedPlayers(new Set());
      setDeletedMetrics(new Set());
    } catch (error) {
      gpsLogger.error('Component', 'Error saving changes:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить изменения.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData(new Map());
    setDeletedPlayers(new Set());
    setDeletedMetrics(new Set());
    onClose();
  };

  // Функции для удаления
  const handleDeletePlayer = (playerId: string, playerName: string) => {
    setDeleteDialog({
      isOpen: true,
      type: 'player',
      target: playerId,
      name: playerName
    });
  };

  const handleDeleteMetric = (metric: string) => {
    const sampleData = data.find(d => (d.canonicalMetric || d.fieldName) === metric);
    setDeleteDialog({
      isOpen: true,
      type: 'metric',
      target: metric,
      name: sampleData?.fieldLabel || metric
    });
  };

  const confirmDelete = () => {
    if (deleteDialog.type === 'player') {
      setDeletedPlayers(prev => new Set([...prev, deleteDialog.target]));
      // Удаляем все данные этого игрока из editedData
      const playerData = data.filter(d => d.playerId === deleteDialog.target);
      setEditedData(prev => {
        const newMap = new Map(prev);
        playerData.forEach(d => newMap.delete(d.id));
        return newMap;
      });
    } else {
      setDeletedMetrics(prev => new Set([...prev, deleteDialog.target]));
      // Удаляем все данные этой метрики из editedData
      const metricData = data.filter(d => (d.canonicalMetric || d.fieldName) === deleteDialog.target);
      setEditedData(prev => {
        const newMap = new Map(prev);
        metricData.forEach(d => newMap.delete(d.id));
        return newMap;
      });
    }
    setDeleteDialog({ isOpen: false, type: 'player', target: '', name: '' });
  };

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, type: 'player', target: '', name: '' });
  };

  const getFieldValue = (dataId: string) => {
    const edited = editedData.get(dataId);
    const originalValue = data.find(d => d.id === dataId)?.value || '';
    const value = edited ? edited.value : originalValue;
    
    // Убеждаемся, что значение является числом для number input
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? '' : numValue.toString();
    }
    return '';
  };

  const hasChanges = editedData.size > 0 || deletedPlayers.size > 0 || deletedMetrics.size > 0;

  // Фильтруем данные, исключая удаленные игроков и метрики
  const filteredData = data.filter(item => 
    !deletedPlayers.has(item.playerId) && 
    !deletedMetrics.has(item.canonicalMetric || item.fieldName)
  );

  // Группируем данные по игрокам и метрикам - используем canonicalMetric как ключ
  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.playerId]) {
      acc[item.playerId] = {
        playerName: item.playerName,
        metrics: {}
      };
    }
    const metricKey = item.canonicalMetric || item.fieldName;
    acc[item.playerId].metrics[metricKey] = item;
    return acc;
  }, {} as Record<string, { playerName: string; metrics: Record<string, GpsReportData> }>);

  // Получаем уникальные метрики - используем canonicalMetric вместо fieldName
  const uniqueMetrics = Array.from(new Set(filteredData.map(item => item.canonicalMetric || item.fieldName))).sort();
  
  // Проверяем, что у каждого игрока есть все метрики (только для отладки)
  if (process.env.NODE_ENV === 'development') {
    Object.entries(groupedData).forEach(([playerId, playerData]) => {
      const playerMetrics = Object.keys(playerData.metrics);
      if (playerMetrics.length !== uniqueMetrics.length) {
        const missing = uniqueMetrics.filter(m => !playerMetrics.includes(m));
        console.debug(`Player ${playerId} missing metrics:`, missing);
      }
    });
  }
  
  const players = Object.keys(groupedData).sort((a, b) => 
    groupedData[a].playerName.localeCompare(groupedData[b].playerName)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-vista-dark border border-vista-secondary/30 rounded-lg w-full max-w-7xl max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-vista-secondary/30 bg-vista-dark/10">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-vista-light">Редактирование отчета</h2>
            <p className="text-sm text-vista-light/60 font-medium">
              {report?.name || 'Загрузка...'}
            </p>
            {uniqueMetrics.length > 0 && (
              <p className="text-xs text-vista-light/50">
                {uniqueMetrics.length} метрик • {players.length} игроков
              </p>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="text-vista-light/70 hover:text-vista-light hover:bg-vista-dark/30 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Контент */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-vista-primary/30 border-t-vista-primary"></div>
                <div className="text-center">
                  <p className="text-vista-light font-medium">Загрузка данных отчета...</p>
                  <p className="text-vista-light/60 text-sm mt-1">Пожалуйста, подождите</p>
                </div>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-vista-light/70">Нет данных для редактирования.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Информация об отчете */}
              <div className="p-6 bg-vista-dark/30 border border-vista-secondary/30 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-vista-light/60 font-medium uppercase tracking-wide">Файл</Label>
                    <p className="text-sm font-semibold text-vista-light truncate" title={report?.fileName}>
                      {report?.fileName}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-vista-light/60 font-medium uppercase tracking-wide">GPS система</Label>
                    <p className="text-sm font-semibold text-vista-light">
                      {report?.gpsSystem || 'auto-detect'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-vista-light/60 font-medium uppercase tracking-wide">Тип события</Label>
                    <p className="text-sm font-semibold text-vista-light">
                      {report?.eventType === 'training' ? 'Тренировка' : 'Матч'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-vista-light/60 font-medium uppercase tracking-wide">Игроков</Label>
                    <p className="text-sm font-semibold text-vista-light">
                      {report?.playersCount || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Таблица с данными */}
              <div className="border border-vista-secondary/30 rounded-lg overflow-hidden">
                <div className="overflow-x-auto w-full custom-scrollbar" style={{ minWidth: "100%" }}>
                  <div className="relative w-auto">
                    {/* Заголовки таблицы */}
                    <div className="flex bg-vista-dark/50">
                      {/* Заголовок столбца игроков - зафиксированный */}
                      <div className="w-[250px] min-w-[250px] p-2 border-r border-vista-secondary/30 bg-vista-dark flex-shrink-0 sticky left-0 z-10">
                        <h3 className="text-sm font-semibold text-vista-light">Игроки</h3>
                      </div>
                      {/* Заголовки метрик - скроллируемые */}
                      {(() => {
                        return null;
                      })()}
                      {uniqueMetrics.map((metric, index) => {
                        const sampleData = data.find(d => (d.canonicalMetric || d.fieldName) === metric);
                        return (
                          <div 
                            key={metric} 
                            className={`w-[120px] min-w-[120px] p-2 border-r border-vista-secondary/30 last:border-r-0 group relative ${
                              index % 2 === 0 ? 'bg-vista-dark/30' : 'bg-vista-dark/20'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-semibold text-vista-light/90 truncate flex-1" title={sampleData?.fieldLabel || metric}>
                                {sampleData?.fieldLabel || metric}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMetric(metric)}
                                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-vista-light/50 hover:text-red-400 hover:bg-red-500/20"
                                title="Удалить столбец"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-xs text-vista-light/60 font-mono">
                              {sampleData?.unit || ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Данные игроков */}
                    <div className="divide-y divide-vista-secondary/20">
                      {(() => {
                        return null;
                      })()}
                      {players.map((playerId, playerIndex) => (
                        <div key={playerId} className="flex hover:bg-vista-dark/10 group">
                          {/* Столбец с именем игрока - зафиксированный */}
                          <div className="w-[250px] min-w-[250px] p-2 border-r border-vista-secondary/30 flex-shrink-0 sticky left-0 z-10 bg-vista-dark group-hover:bg-vista-dark/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-normal text-vista-light truncate flex-1" title={groupedData[playerId].playerName}>
                                {groupedData[playerId].playerName}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePlayer(playerId, groupedData[playerId].playerName)}
                                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-vista-light/50 hover:text-red-400 hover:bg-red-500/20 ml-2"
                                title="Удалить игрока"
                              >
                                <UserX className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Столбцы с метриками - скроллируемые */}
                          {uniqueMetrics.map((metric, metricIndex) => {
                            const fieldData = groupedData[playerId].metrics[metric];
                            const isEdited = fieldData ? editedData.has(fieldData.id) : false;
                            
                            if (playerIndex === 0) { // Логируем только для первого игрока
                            }
                            
                            return (
                              <div 
                                key={`${playerId}-${metric}`} 
                                className={`w-[120px] min-w-[120px] p-2 border-r border-vista-secondary/20 last:border-r-0 ${
                                  playerIndex % 2 === 0 
                                    ? (metricIndex % 2 === 0 ? 'bg-vista-dark/20' : 'bg-vista-dark/10')
                                    : (metricIndex % 2 === 0 ? 'bg-vista-dark/10' : 'bg-vista-dark/20')
                                } ${isEdited ? 'ring-1 ring-vista-primary/50 bg-vista-primary/5' : ''}`}
                              >
                                {!fieldData ? (
                                  <div className="text-xs text-vista-light/30 text-center py-2">—</div>
                                ) : (
                                  <Input
                                    type="number"
                                    value={getFieldValue(fieldData.id)}
                                    onChange={(e) => handleValueChange(fieldData.id, e.target.value)}
                                    className="h-8 text-sm bg-transparent border-0 text-vista-light placeholder:text-vista-light/50 focus:ring-1 focus:ring-vista-primary focus:bg-vista-dark/30 px-2 py-1 text-center w-full"
                                    step="0.01"
                                    placeholder="0"
                                    title={`${fieldData.fieldLabel || fieldData.fieldName} (${fieldData.unit})`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Счетчик изменений */}
              {hasChanges && (
                <div className="p-4 bg-vista-primary/10 border border-vista-primary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-vista-primary rounded-full animate-pulse"></div>
                    <div className="flex items-center gap-4 text-sm text-vista-light">
                      {editedData.size > 0 && (
                        <span>
                          Изменено полей: <span className="font-bold text-vista-primary">{editedData.size}</span>
                        </span>
                      )}
                      {deletedPlayers.size > 0 && (
                        <span>
                          Удалено игроков: <span className="font-bold text-red-400">{deletedPlayers.size}</span>
                        </span>
                      )}
                      {deletedMetrics.size > 0 && (
                        <span>
                          Удалено метрик: <span className="font-bold text-red-400">{deletedMetrics.size}</span>
                        </span>
                      )}
                    </div>
                    <div className="ml-auto">
                      <Button
                        onClick={() => {
                          setEditedData(new Map());
                          setDeletedPlayers(new Set());
                          setDeletedMetrics(new Set());
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-vista-light/70 hover:text-vista-light hover:bg-vista-dark/30 h-7 px-2 text-xs"
                      >
                        Сбросить все
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center justify-between p-6 border-t border-vista-secondary/30 bg-vista-dark/20">
          <div className="flex items-center gap-3">
            {hasChanges && (
              <div className="flex items-center gap-2 text-sm text-vista-light/70">
                <div className="w-2 h-2 bg-vista-primary rounded-full"></div>
                <span>Есть несохраненные изменения</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={saving}
              className="bg-transparent border border-vista-secondary/40 text-vista-light/70 hover:bg-vista-dark/50 hover:text-vista-light hover:border-vista-secondary/60 h-10 px-4 font-medium transition-all"
            >
              <X className="mr-2 h-4 w-4" />
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-vista-primary/20 border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/30 hover:border-vista-primary/60 h-10 px-4 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        </div>
      </div>

      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog({ isOpen: false, type: 'player', target: '', name: '' });
        }
      }}>
        <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-y-auto max-h-[80vh] focus:outline-none focus:ring-0 custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-vista-error" />
              Подтверждение удаления
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="p-4 bg-vista-error/10 border border-vista-error/30 rounded-lg">
                <p className="text-vista-light text-sm leading-relaxed">
                  {deleteDialog.type === 'player' ? (
                    <>
                      Вы уверены, что хотите удалить игрока <strong className="text-vista-light">&quot;{deleteDialog.name}&quot;</strong> из отчета?
                    </>
                  ) : (
                    <>
                      Вы уверены, что хотите удалить метрику <strong className="text-vista-light">&quot;{deleteDialog.name}&quot;</strong> из отчета?
                    </>
                  )}
                </p>
                <p className="text-vista-error text-sm font-medium mt-2">
                  {deleteDialog.type === 'player' 
                    ? 'Это действие удалит все данные этого игрока из отчета и не может быть отменено.'
                    : 'Это действие удалит все данные этой метрики для всех игроков и не может быть отменено.'
                  }
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={cancelDelete}
              className="bg-transparent border border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 h-9 px-3 font-normal"
            >
              Отмена
            </Button>
            <Button 
              type="button" 
              onClick={confirmDelete}
              className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
