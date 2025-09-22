'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowUp, ArrowDown, Trash2, Plus, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { gpsLogger } from '@/lib/logger';

interface CanonicalMetric {
  id: string;
  code: string;
  name: string;
  category: string;
  dimension: string;
  canonicalUnit: string;
  supportedUnits: string[];
}

interface Unit {
  id: string;
  code: string;
  name: string;
  dimension: string;
}

interface ColumnMapping {
  id: string;
  originalName: string;
  sourceUnit: string;
  canonicalMetricId: string;
  canonicalMetricCode: string;
  isActive: boolean;
  displayOrder: number;
}

interface ColumnMappingStepProps {
  fileColumns: string[];
  teamId: string;
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ColumnMappingStep({ 
  fileColumns, 
  teamId,
  onMappingsChange, 
  onNext, 
  onBack 
}: ColumnMappingStepProps) {
  const { toast } = useToast();
  
  const [canonicalMetrics, setCanonicalMetrics] = useState<CanonicalMetric[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [loading, setLoading] = useState(false);

  // Загрузка канонических метрик и единиц
  useEffect(() => {
    loadData();
  }, []);

  // Инициализация маппингов при загрузке колонок
  useEffect(() => {
    if (fileColumns.length > 0 && canonicalMetrics.length > 0) {
      initializeMappings();
    }
  }, [fileColumns, canonicalMetrics]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsResponse, unitsResponse, mappingsResponse] = await Promise.all([
        fetch('/api/gps/canonical-metrics-for-mapping'),
        fetch('/api/gps/units'),
        fetch(`/api/gps/column-mappings?teamId=${teamId}`)
      ]);

      if (metricsResponse.ok && unitsResponse.ok) {
        const [metricsData, unitsData] = await Promise.all([
          metricsResponse.json(),
          unitsResponse.json()
        ]);
        
        setCanonicalMetrics(metricsData.metrics || metricsData);
        setUnits(unitsData);
      }

      // Загружаем сохраненные маппинги
      if (mappingsResponse.ok) {
        const mappingsData = await mappingsResponse.json();
        const savedMappings = mappingsData.mappings || [];
        
        if (savedMappings.length > 0) {
          // Используем сохраненные маппинги для инициализации
          initializeMappingsWithSaved(savedMappings);
          return;
        }
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error loading data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные для маппинга',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeMappings = () => {
    const newMappings: ColumnMapping[] = fileColumns.map((column, index) => {
      // Попытка автоматического определения метрики по названию колонки
      const suggestedMetric = suggestMetricForColumn(column);
      
      return {
        id: `mapping-${index}`,
        originalName: column,
        sourceUnit: suggestedMetric?.canonicalUnit || '',
        canonicalMetricId: suggestedMetric?.id || '',
        canonicalMetricCode: suggestedMetric?.code || '',
        isActive: suggestedMetric ? true : false, // Активна если найдена подсказка
        displayOrder: index
      };
    });

    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const initializeMappingsWithSaved = (savedMappings: any[]) => {
    const newMappings: ColumnMapping[] = fileColumns.map((column, index) => {
      // Ищем сохраненный маппинг для этой колонки
      const savedMapping = savedMappings.find(m => m.sourceColumn === column);
      
      if (savedMapping) {
        // Используем сохраненный маппинг
        return {
          id: `mapping-${index}`,
          originalName: column,
          sourceUnit: savedMapping.sourceUnit || '',
          canonicalMetricId: savedMapping.canonicalMetric || '',
          canonicalMetricCode: savedMapping.canonicalMetric || '',
          isActive: savedMapping.isVisible !== false,
          displayOrder: savedMapping.displayOrder || index
        };
      } else {
        // Если нет сохраненного маппинга, используем автоматическое определение
        const suggestedMetric = suggestMetricForColumn(column);
        return {
          id: `mapping-${index}`,
          originalName: column,
          sourceUnit: suggestedMetric?.canonicalUnit || '',
          canonicalMetricId: suggestedMetric?.id || '',
          canonicalMetricCode: suggestedMetric?.code || '',
          isActive: false, // Новые колонки неактивны по умолчанию
          displayOrder: index
        };
      }
    });

    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const suggestMetricForColumn = (columnName: string): CanonicalMetric | null => {
    const lowerColumn = columnName.toLowerCase();
    
    // Простые правила для определения метрики по названию колонки
    const suggestions: { [key: string]: string } = {
      'distance': 'total_distance',
      'дистанция': 'total_distance',
      'speed': 'max_speed',
      'скорость': 'max_speed',
      'heart': 'avg_heart_rate',
      'пульс': 'avg_heart_rate',
      'hr': 'avg_heart_rate',
      'time': 'duration',
      'время': 'duration',
      'duration': 'duration',
      'продолжительность': 'duration',
      'acceleration': 'max_acceleration',
      'ускорение': 'max_acceleration',
      'deceleration': 'max_deceleration',
      'торможение': 'max_deceleration',
      'sprint': 'sprint_count',
      'спринт': 'sprint_count',
      'high': 'high_speed_running',
      'высокая': 'high_speed_running',
      'load': 'total_load',
      'нагрузка': 'total_load',
      'work': 'total_work',
      'работа': 'total_work',
      'player': 'athlete_name',
      'игрок': 'athlete_name',
      'name': 'athlete_name',
      'position': 'position',
      'позиция': 'position',
      // Добавляем специфичные для зон метрики
      'зона': 'distance_zone3',
      'zone': 'distance_zone3',
      'входы': 'speed_zone5_entries',
      'ускорения': 'acc_zone4_count',
      'торможения': 'dec_zone4_count',
      'виб': 'hsr_distance',
      'hsr': 'hsr_distance',
      'виб %': 'hsr_percentage',
      'hsr %': 'hsr_percentage'
    };

    for (const [keyword, metricCode] of Object.entries(suggestions)) {
      if (lowerColumn.includes(keyword)) {
        const metric = canonicalMetrics.find(m => m.code === metricCode);
        if (metric) return metric;
      }
    }

    return null;
  };

  const updateMapping = (id: string, field: keyof ColumnMapping, value: any) => {
    const newMappings = mappings.map(mapping => 
      mapping.id === id ? { ...mapping, [field]: value } : mapping
    );
    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const toggleActive = (id: string) => {
    const newMappings = mappings.map(mapping => 
      mapping.id === id ? { ...mapping, isActive: !mapping.isActive } : mapping
    );
    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const saveMappings = async () => {
    try {
      const response = await fetch('/api/gps/column-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          mappings: mappings.map(mapping => ({
            originalName: mapping.originalName,
            displayName: mapping.originalName, // Используем оригинальное имя как отображаемое
            canonicalMetricCode: mapping.canonicalMetricCode,
            sourceUnit: mapping.sourceUnit,
            displayOrder: mapping.displayOrder,
            isActive: mapping.isActive,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save mappings');
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error saving mappings:', error);
      // Не показываем ошибку пользователю, так как это не критично
    }
  };

  const moveMapping = (id: string, direction: 'up' | 'down') => {
    const currentIndex = mappings.findIndex(m => m.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= mappings.length) return;

    const newMappings = [...mappings];
    [newMappings[currentIndex], newMappings[newIndex]] = [newMappings[newIndex], newMappings[currentIndex]];
    
    // Обновляем displayOrder
    newMappings.forEach((mapping, index) => {
      mapping.displayOrder = index;
    });

    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const getUnitsForMetric = (metricId: string) => {
    const metric = canonicalMetrics.find(m => m.id === metricId);
    if (!metric) return units;
    
    return units.filter(unit => 
      unit.dimension === metric.dimension || 
      metric.supportedUnits.includes(unit.code)
    );
  };

  const getGroupedMetrics = () => {
    const grouped: { [key: string]: CanonicalMetric[] } = {};
    canonicalMetrics.forEach(metric => {
      if (!grouped[metric.category]) {
        grouped[metric.category] = [];
      }
      grouped[metric.category].push(metric);
    });
    return grouped;
  };

  const activeMappings = mappings.filter(m => m.isActive);
  const inactiveMappings = mappings.filter(m => !m.isActive);

  const canProceed = activeMappings.length > 0 && 
    activeMappings.every(m => m.canonicalMetricId && m.sourceUnit);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Настройка маппинга столбцов</h3>
        <p className="text-sm text-muted-foreground">
          Выберите какие столбцы сохранять и как их обрабатывать
        </p>
      </div>

      {/* Активная группа */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Settings className="h-4 w-4" />
            Активные столбцы ({activeMappings.length})
            <Badge variant="secondary" className="ml-auto">
              Будут сохранены в БД
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeMappings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет активных столбцов. Переключите столбцы из неактивной группы.
            </p>
          ) : (
            activeMappings.map((mapping) => (
              <div key={mapping.id} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg bg-green-50">
                <div className="col-span-3">
                  <Label className="text-xs text-muted-foreground">Столбец</Label>
                  <p className="text-sm font-medium">{mapping.originalName}</p>
                </div>
                
                <div className="col-span-3">
                  <Label className="text-xs text-muted-foreground">Единица измерения</Label>
                  <Select
                    value={mapping.sourceUnit}
                    onValueChange={(value) => updateMapping(mapping.id, 'sourceUnit', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Выберите единицу" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUnitsForMetric(mapping.canonicalMetricId).map((unit) => (
                        <SelectItem key={unit.id} value={unit.code}>
                          {unit.name} ({unit.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-4">
                  <Label className="text-xs text-muted-foreground">Каноническая метрика</Label>
                  <Select
                    value={mapping.canonicalMetricId}
                    onValueChange={(value) => {
                      const metric = canonicalMetrics.find(m => m.id === value);
                      updateMapping(mapping.id, 'canonicalMetricId', value);
                      updateMapping(mapping.id, 'canonicalMetricCode', metric?.code || '');
                      updateMapping(mapping.id, 'sourceUnit', metric?.canonicalUnit || '');
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Выберите метрику" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(getGroupedMetrics()).map(([category, metrics]) => (
                        <div key={category}>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                            {category}
                          </div>
                          {metrics.map((metric) => (
                            <SelectItem key={metric.id} value={metric.id}>
                              {metric.name} ({metric.canonicalUnit})
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveMapping(mapping.id, 'up')}
                    disabled={mapping.displayOrder === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveMapping(mapping.id, 'down')}
                    disabled={mapping.displayOrder === activeMappings.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive(mapping.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Неактивная группа */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-500">
            <Settings className="h-4 w-4" />
            Неактивные столбцы ({inactiveMappings.length})
            <Badge variant="outline" className="ml-auto">
              Будут проигнорированы
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inactiveMappings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Все столбцы активны
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {inactiveMappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                  <span className="text-sm text-muted-foreground">{mapping.originalName}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive(mapping.id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Кнопки навигации */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Назад
        </Button>
        <Button 
          onClick={async () => {
            // Сохраняем маппинги для будущего использования
            await saveMappings();
            onNext();
          }} 
          disabled={!canProceed || loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Загрузка...
            </>
          ) : (
            <>
              Далее
              <ArrowDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
