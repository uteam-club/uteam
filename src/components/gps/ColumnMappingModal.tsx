'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowRight, Settings, CheckCircle, XCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CanonicalMetric {
  id: string;
  code: string;
  name: string;
  category: string;
  dimension: string;
  canonicalUnit: string;
  supportedUnits: string[];
}

interface ColumnMapping {
  id: string;
  sourceColumn: string;
  sourceUnit: string;
  canonicalMetricId: string;
  canonicalMetricCode: string;
  isActive: boolean;
  displayOrder: number;
}

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMappingComplete: (mappings: ColumnMapping[]) => void;
  fileColumns: string[];
  reportId: string;
}

export function ColumnMappingModal({ 
  isOpen, 
  onClose, 
  onMappingComplete, 
  fileColumns, 
  reportId 
}: ColumnMappingModalProps) {
  const { toast } = useToast();
  
  const [canonicalMetrics, setCanonicalMetrics] = useState<CanonicalMetric[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Загрузка канонических метрик
  useEffect(() => {
    if (isOpen) {
      loadCanonicalMetrics();
    }
  }, [isOpen]);

  // Инициализация маппингов при загрузке колонок
  useEffect(() => {
    if (fileColumns.length > 0 && canonicalMetrics.length > 0) {
      initializeMappings();
    }
  }, [fileColumns, canonicalMetrics]);

  const loadCanonicalMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gps/canonical-metrics');
      if (response.ok) {
        const data = await response.json();
        setCanonicalMetrics(data);
      }
    } catch (error) {
      console.error('Error loading canonical metrics:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить канонические метрики',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeMappings = () => {
    const initialMappings: ColumnMapping[] = fileColumns.map((column, index) => ({
      id: `temp-${index}`,
      sourceColumn: column,
      sourceUnit: '',
      canonicalMetricId: '',
      canonicalMetricCode: '',
      isActive: false,
      displayOrder: index,
    }));
    setMappings(initialMappings);
  };

  const updateMapping = (index: number, field: keyof ColumnMapping, value: any) => {
    setMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
    ));
  };

  const updateCanonicalMetric = (index: number, metricId: string) => {
    const metric = canonicalMetrics.find(m => m.id === metricId);
    if (metric) {
      setMappings(prev => prev.map((mapping, i) => 
        i === index ? { 
          ...mapping, 
          canonicalMetricId: metricId,
          canonicalMetricCode: metric.code,
          sourceUnit: metric.supportedUnits[0] || '', // Устанавливаем первую поддерживаемую единицу
          isActive: true
        } : mapping
      ));
    }
  };

  const getSuggestedMetric = (columnName: string): CanonicalMetric | null => {
    const lowerColumn = columnName.toLowerCase();
    
    // Простые правила для предложений
    if (lowerColumn.includes('distance') || lowerColumn.includes('дистанция')) {
      return canonicalMetrics.find(m => m.code === 'total_distance') || null;
    }
    if (lowerColumn.includes('speed') || lowerColumn.includes('скорость')) {
      return canonicalMetrics.find(m => m.code === 'max_speed') || null;
    }
    if (lowerColumn.includes('heart') || lowerColumn.includes('пульс') || lowerColumn.includes('hr')) {
      return canonicalMetrics.find(m => m.code === 'avg_heart_rate') || null;
    }
    if (lowerColumn.includes('time') || lowerColumn.includes('время')) {
      return canonicalMetrics.find(m => m.code === 'duration') || null;
    }
    if (lowerColumn.includes('player') || lowerColumn.includes('игрок') || lowerColumn.includes('name')) {
      return canonicalMetrics.find(m => m.code === 'athlete_name') || null;
    }
    if (lowerColumn.includes('position') || lowerColumn.includes('позиция')) {
      return canonicalMetrics.find(m => m.code === 'position') || null;
    }
    // Добавляем специфичные для зон метрики
    if (lowerColumn.includes('зона 4') || lowerColumn.includes('zone 4')) {
      return canonicalMetrics.find(m => m.code === 'distance_zone4') || null;
    }
    if (lowerColumn.includes('зона 5') || lowerColumn.includes('zone 5')) {
      return canonicalMetrics.find(m => m.code === 'distance_zone5') || null;
    }
    if (lowerColumn.includes('входы') || lowerColumn.includes('entries')) {
      return canonicalMetrics.find(m => m.code === 'speed_zone5_entries') || null;
    }
    if (lowerColumn.includes('ускорения') || lowerColumn.includes('acceleration')) {
      return canonicalMetrics.find(m => m.code === 'acc_zone4_count') || null;
    }
    if (lowerColumn.includes('торможения') || lowerColumn.includes('deceleration')) {
      return canonicalMetrics.find(m => m.code === 'dec_zone4_count') || null;
    }
    if (lowerColumn.includes('виб') || lowerColumn.includes('hsr')) {
      // Если есть символ %, ищем процентную метрику, иначе дистанцию
      if (lowerColumn.includes('%')) {
        return canonicalMetrics.find(m => m.code === 'hsr_percentage') || null;
      } else {
        return canonicalMetrics.find(m => m.code === 'hsr_distance') || null;
      }
    }
    if (lowerColumn.includes('минуту') || lowerColumn.includes('minute')) {
      return canonicalMetrics.find(m => m.code === 'distance_per_min') || null;
    }
    
    return null;
  };

  const handleSave = async () => {
    const activeMappings = mappings.filter(m => m.isActive && m.canonicalMetricId);
    
    if (activeMappings.length === 0) {
      toast({
        title: 'Нет активных маппингов',
        description: 'Выберите хотя бы одну колонку для сохранения',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch(`/api/gps/reports/${reportId}/mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mappings: activeMappings }),
      });

      if (response.ok) {
        toast({
          title: 'Маппинг сохранен',
          description: `Настроено ${activeMappings.length} колонок`,
        });
        onMappingComplete(activeMappings);
        onClose();
      } else {
        throw new Error('Ошибка при сохранении маппинга');
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить маппинг колонок',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const activeMappingsCount = mappings.filter(m => m.isActive && m.canonicalMetricId).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройка маппинга колонок
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информация о файле */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                Информация о файле
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Колонок в файле: <Badge variant="secondary">{fileColumns.length}</Badge></span>
                <span>Активных маппингов: <Badge variant={activeMappingsCount > 0 ? "default" : "secondary"}>{activeMappingsCount}</Badge></span>
              </div>
            </CardContent>
          </Card>

          {/* Список маппингов */}
          <div className="space-y-4">
            {mappings.map((mapping, index) => {
              const suggestedMetric = getSuggestedMetric(mapping.sourceColumn);
              const selectedMetric = canonicalMetrics.find(m => m.id === mapping.canonicalMetricId);
              
              return (
                <Card key={mapping.id} className={mapping.isActive ? 'border-vista-primary' : ''}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Исходная колонка */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Исходная колонка</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={mapping.sourceColumn}
                            readOnly
                            className="bg-muted"
                          />
                          {suggestedMetric && !mapping.canonicalMetricId && (
                            <Badge variant="outline" className="text-xs">
                              Предложение
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Стрелка */}
                      <div className="flex justify-center">
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>

                      {/* Каноническая метрика */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Каноническая метрика</Label>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={mapping.isActive}
                              onCheckedChange={(checked) => updateMapping(index, 'isActive', checked)}
                            />
                            <span className="text-xs text-muted-foreground">Активна</span>
                          </div>
                        </div>
                        
                        <Select
                          value={mapping.canonicalMetricId}
                          onValueChange={(value) => updateCanonicalMetric(index, value)}
                          disabled={!mapping.isActive}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите метрику" />
                          </SelectTrigger>
                          <SelectContent>
                            {canonicalMetrics.map((metric) => (
                              <SelectItem key={metric.id} value={metric.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{metric.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {metric.category} • {metric.canonicalUnit}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Предложение */}
                        {suggestedMetric && !mapping.canonicalMetricId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCanonicalMetric(index, suggestedMetric.id)}
                            className="w-full text-xs"
                          >
                            Предложить: {suggestedMetric.name}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Единица измерения */}
                    {mapping.isActive && selectedMetric && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm">Единица в файле</Label>
                            <Select
                              value={mapping.sourceUnit}
                              onValueChange={(value) => updateMapping(index, 'sourceUnit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите единицу" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedMetric.supportedUnits.map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Каноническая единица</Label>
                            <Input
                              value={selectedMetric.canonicalUnit}
                              readOnly
                              className="bg-muted"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={activeMappingsCount === 0 || saving || loading}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Сохранение...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Сохранить маппинг ({activeMappingsCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
