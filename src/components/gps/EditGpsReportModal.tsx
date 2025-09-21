'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Save, X, RefreshCw } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen && reportId) {
      fetchReportData();
    } else {
      setReport(null);
      setData([]);
      setEditedData(new Map());
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
      console.log('EditGpsReportModal: API response:', dataResult);
      console.log('EditGpsReportModal: Data length:', dataResult.data?.length || 0);
      if (dataResult.data && dataResult.data.length > 0) {
        console.log('EditGpsReportModal: First data item:', dataResult.data[0]);
        console.log('EditGpsReportModal: Unique canonical metrics:', [...new Set(dataResult.data.map((item: any) => item.canonicalMetric))]);
      }
      setData(dataResult.data || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
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
    if (editedData.size === 0) {
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

      const response = await fetch(`/api/gps/reports/${reportId}/data/bulk-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      toast({
        title: 'Успешно',
        description: `Сохранено ${editedData.size} изменений.`,
        variant: 'default',
      });

      // Обновляем данные
      await fetchReportData();
      setEditedData(new Map());
    } catch (error) {
      console.error('Error saving changes:', error);
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
    onClose();
  };

  const getFieldValue = (dataId: string) => {
    const edited = editedData.get(dataId);
    return edited ? edited.value : data.find(d => d.id === dataId)?.value || '';
  };

  const hasChanges = editedData.size > 0;

  // Группируем данные по игрокам и метрикам - используем canonicalMetric как ключ
  const groupedData = data.reduce((acc, item) => {
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
  const uniqueMetrics = Array.from(new Set(data.map(item => item.canonicalMetric || item.fieldName))).sort();
  console.log('EditGpsReportModal: Total data items:', data.length);
  console.log('EditGpsReportModal: Unique metrics for display:', uniqueMetrics);
  console.log('EditGpsReportModal: Unique metrics count:', uniqueMetrics.length);
  console.log('EditGpsReportModal: Grouped data keys:', Object.keys(groupedData));
  
  // Проверяем, что у каждого игрока есть все метрики
  Object.entries(groupedData).forEach(([playerId, playerData]) => {
    const playerMetrics = Object.keys(playerData.metrics);
    console.log(`EditGpsReportModal: Player ${playerId} has ${playerMetrics.length} metrics:`, playerMetrics);
    if (playerMetrics.length !== uniqueMetrics.length) {
      console.warn(`EditGpsReportModal: Player ${playerId} missing metrics!`);
      const missing = uniqueMetrics.filter(m => !playerMetrics.includes(m));
      console.warn(`EditGpsReportModal: Missing metrics:`, missing);
    }
  });
  
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
                        console.log('EditGpsReportModal: Rendering', uniqueMetrics.length, 'metric headers');
                        console.log('EditGpsReportModal: Metrics list:', uniqueMetrics);
                        return null;
                      })()}
                      {uniqueMetrics.map((metric, index) => {
                        console.log(`EditGpsReportModal: Rendering metric ${index + 1}/${uniqueMetrics.length}: ${metric}`);
                        const sampleData = data.find(d => (d.canonicalMetric || d.fieldName) === metric);
                        console.log(`EditGpsReportModal: Sample data for ${metric}:`, sampleData);
                        return (
                          <div 
                            key={metric} 
                            className={`w-[120px] min-w-[120px] p-2 border-r border-vista-secondary/30 last:border-r-0 ${
                              index % 2 === 0 ? 'bg-vista-dark/30' : 'bg-vista-dark/20'
                            }`}
                          >
                            <div className="text-xs font-semibold text-vista-light/90 mb-1 truncate" title={sampleData?.fieldLabel || metric}>
                              {sampleData?.fieldLabel || metric}
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
                        console.log('EditGpsReportModal: Rendering data for', players.length, 'players');
                        return null;
                      })()}
                      {players.map((playerId, playerIndex) => (
                        <div key={playerId} className="flex hover:bg-vista-dark/10">
                          {/* Столбец с именем игрока - зафиксированный */}
                          <div className="w-[250px] min-w-[250px] p-2 border-r border-vista-secondary/30 flex-shrink-0 sticky left-0 z-10 bg-vista-dark">
                            <div className="text-sm font-normal text-vista-light truncate" title={groupedData[playerId].playerName}>
                              {groupedData[playerId].playerName}
                            </div>
                          </div>
                          
                          {/* Столбцы с метриками - скроллируемые */}
                          {uniqueMetrics.map((metric, metricIndex) => {
                            const fieldData = groupedData[playerId].metrics[metric];
                            const isEdited = fieldData ? editedData.has(fieldData.id) : false;
                            
                            if (playerIndex === 0) { // Логируем только для первого игрока
                              console.log(`EditGpsReportModal: Player ${playerIndex}, Metric ${metricIndex + 1}/${uniqueMetrics.length}: ${metric} - ${fieldData ? 'HAS DATA' : 'NO DATA'}`);
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
                    <p className="text-sm text-vista-light">
                      Изменено полей: <span className="font-bold text-vista-primary">{editedData.size}</span>
                    </p>
                    <div className="ml-auto">
                      <Button
                        onClick={() => setEditedData(new Map())}
                        variant="ghost"
                        size="sm"
                        className="text-vista-light/70 hover:text-vista-light hover:bg-vista-dark/30 h-7 px-2 text-xs"
                      >
                        Сбросить
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
    </div>
  );
}
