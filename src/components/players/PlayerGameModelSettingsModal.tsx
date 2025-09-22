'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  Save, 
  X, 
  Ruler, 
  Activity, 
  HeartPulse, 
  Target, 
  Zap,
  ChevronRight,
  Gauge,
  Timer,
  BarChart3
} from 'lucide-react';

interface PlayerGameModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  onSave: (settings: { selectedMetrics: string[]; metricUnits: Record<string, string> }) => void;
}

// Интерфейс для метрики из API
interface CanonicalMetric {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  dimension: string;
  canonicalUnit: string;
  supportedUnits: string[];
}

// Иконки по группам
const GROUP_ICONS = {
  hsr_sprint: <Zap className="h-4 w-4" />,
  distance: <Ruler className="h-4 w-4" />,
  speed_zones: <Gauge className="h-4 w-4" />,
  acceleration_deceleration: <Activity className="h-4 w-4" />,
  heart_rate: <HeartPulse className="h-4 w-4" />,
  load_metrics: <BarChart3 className="h-4 w-4" />
};

// Названия групп
const GROUP_NAMES = {
  hsr_sprint: 'HSR & Спринты',
  distance: 'Дистанция',
  speed_zones: 'Скоростные зоны',
  acceleration_deceleration: 'Ускорения & Торможения',
  heart_rate: 'Пульс',
  load_metrics: 'Нагрузочные метрики'
};

// Названия единиц измерения
const UNIT_DISPLAY_NAMES: Record<string, string> = {
  'm': 'Метры',
  'km': 'Километры', 
  'miles': 'Мили',
  'yards': 'Ярды',
  'min': 'Минуты',
  's': 'Секунды',
  'h': 'Часы',
  'count': 'Количество',
  'times': 'Раз',
  'sprints': 'Спринты',
  'au': 'Условные единицы',
  'load': 'Нагрузка',
  '%': 'Проценты',
  'ratio': 'Отношение',
  'm/s': 'м/с',
  'km/h': 'км/ч',
  'm/min': 'м/мин',
  'mph': 'миль/ч'
};

export function PlayerGameModelSettingsModal({ 
  isOpen, 
  onClose, 
  playerId, 
  onSave 
}: PlayerGameModelSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metrics, setMetrics] = useState<CanonicalMetric[]>([]);
  const [groupedMetrics, setGroupedMetrics] = useState<Record<string, CanonicalMetric[]>>({});
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [metricUnits, setMetricUnits] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Загружаем канонические метрики
  useEffect(() => {
    if (isOpen) {
      loadCanonicalMetrics();
      loadSettings();
    }
  }, [isOpen, playerId]);

  const loadCanonicalMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gps/canonical-metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
        // Создаем правильную группировку метрик
        const customGroupedMetrics = createCustomGroupedMetrics(data.metrics);
        setGroupedMetrics(customGroupedMetrics);
      }
    } catch (error) {
      console.error('Error loading canonical metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Создаем правильную группировку метрик как в модалке создания профиля
  const createCustomGroupedMetrics = (metrics: CanonicalMetric[]) => {
    const groups: Record<string, CanonicalMetric[]> = {
      'hsr_sprint': [],
      'distance': [],
      'speed_zones': [],
      'acceleration_deceleration': [],
      'heart_rate': [],
      'load_metrics': []
    };

    metrics.forEach(metric => {
      const code = metric.code;
      
      // HSR и спринты
      if (code.includes('hsr') || code.includes('sprint')) {
        groups.hsr_sprint.push(metric);
      }
      // Дистанция
      else if (code.includes('distance') && !code.includes('zone')) {
        groups.distance.push(metric);
      }
      // Скоростные зоны
      else if (code.includes('speed_zone') || code.includes('time_in_speed_zone')) {
        groups.speed_zones.push(metric);
      }
      // Ускорения и торможения
      else if (code.includes('acc_') || code.includes('dec_')) {
        groups.acceleration_deceleration.push(metric);
      }
      // Пульс
      else if (code.includes('hr_')) {
        groups.heart_rate.push(metric);
      }
      // Нагрузочные метрики
      else if (code.includes('load') || code.includes('power') || code.includes('work')) {
        groups.load_metrics.push(metric);
      }
      // Остальные
      else {
        groups.distance.push(metric);
      }
    });

    // Удаляем пустые группы
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  };

  const handleGroupClick = (category: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(category)) {
      newExpandedGroups.delete(category);
    } else {
      newExpandedGroups.add(category);
    }
    setExpandedGroups(newExpandedGroups);
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}/game-model/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      if (data.success && data.settings) {
        setSelectedMetrics(data.settings.selectedMetrics || []);
        setMetricUnits(data.settings.metricUnits || {});
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleMetricToggle = (metricCode: string, checked: boolean) => {
    if (checked) {
      setSelectedMetrics(prev => [...prev, metricCode]);
      // Устанавливаем единицу по умолчанию
      const metric = metrics.find(m => m.code === metricCode);
      if (metric && !metricUnits[metricCode]) {
        setMetricUnits(prev => ({
          ...prev,
          [metricCode]: metric.canonicalUnit
        }));
      }
    } else {
      setSelectedMetrics(prev => prev.filter(code => code !== metricCode));
      setMetricUnits(prev => {
        const newUnits = { ...prev };
        delete newUnits[metricCode];
        return newUnits;
      });
    }
  };

  const handleUnitChange = (metricCode: string, unit: string) => {
    setMetricUnits(prev => ({
      ...prev,
      [metricCode]: unit
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('Saving settings:', { selectedMetrics, metricUnits });
      
      const response = await fetch(`/api/players/${playerId}/game-model/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedMetrics,
          metricUnits
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save settings:', errorText);
        throw new Error('Failed to save settings');
      }
      
      const data = await response.json();
      console.log('Settings saved successfully:', data);
      
      if (data.success) {
        onSave({ selectedMetrics, metricUnits });
        onClose();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const getGroupIcon = (groupKey: string) => {
    return GROUP_ICONS[groupKey as keyof typeof GROUP_ICONS] || <Settings className="h-4 w-4" />;
  };

  const getGroupName = (groupKey: string) => {
    return GROUP_NAMES[groupKey as keyof typeof GROUP_NAMES] || groupKey;
  };

  const getUnitDisplayName = (unit: string) => {
    return UNIT_DISPLAY_NAMES[unit] || unit;
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar mt-8">
          <DialogHeader>
            <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
              <Settings className="h-5 w-5 text-vista-primary" />
              Настройки игровой модели
            </DialogTitle>
            <DialogDescription className="text-vista-light/70">
              Выберите метрики для отображения и единицы измерения
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar mt-8">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
            <Settings className="h-5 w-5 text-vista-primary" />
            Настройки игровой модели
          </DialogTitle>
          <DialogDescription className="text-vista-light/70">
            Выберите метрики для отображения и единицы измерения
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {Object.entries(groupedMetrics).map(([groupKey, groupMetrics]) => (
            <div key={groupKey}>
              {/* Заголовок группы */}
              <div 
                className="px-3 py-2 bg-vista-dark/30 text-sm font-medium text-vista-light/90 border-b border-vista-secondary/20 cursor-pointer hover:bg-vista-dark/50 transition-colors flex items-center justify-between"
                onClick={() => handleGroupClick(groupKey)}
              >
                <div className="flex items-center gap-2">
                  {getGroupIcon(groupKey)}
                  <span>{getGroupName(groupKey)}</span>
                </div>
                <ChevronRight className={`h-4 w-4 transition-transform ${
                  expandedGroups.has(groupKey) ? 'rotate-90' : ''
                }`} />
              </div>
              
              {/* Метрики группы */}
              {expandedGroups.has(groupKey) && (
                <div className="bg-vista-secondary/20 border-l-2 border-vista-primary/30 ml-2">
                  {groupMetrics.map((metric) => (
                    <div key={metric.id} className="px-4 py-3 border-b border-vista-secondary/10 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <Checkbox
                            id={metric.code}
                            checked={selectedMetrics.includes(metric.code)}
                            onCheckedChange={(checked) => handleMetricToggle(metric.code, checked as boolean)}
                            className="border-vista-secondary/50 data-[state=checked]:bg-vista-primary data-[state=checked]:border-vista-primary"
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor={metric.code}
                              className="text-vista-light/90 font-medium cursor-pointer text-sm"
                            >
                              {metric.name}
                            </Label>
                            {metric.description && (
                              <p className="text-vista-light/60 text-xs mt-1">
                                {metric.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {selectedMetrics.includes(metric.code) && (
                          <div className="flex items-center space-x-2">
                            <Label className="text-vista-light/70 text-xs">Единица:</Label>
                            <Select
                              value={metricUnits[metric.code] || metric.canonicalUnit}
                              onValueChange={(value) => handleUnitChange(metric.code, value)}
                            >
                              <SelectTrigger className="w-28 bg-vista-dark/50 border-vista-secondary/30 text-vista-light h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-vista-dark border-vista-secondary/30">
                                {metric.supportedUnits.map((unit) => (
                                  <SelectItem 
                                    key={unit} 
                                    value={unit}
                                    className="text-vista-light hover:bg-vista-secondary/20 text-xs"
                                  >
                                    {getUnitDisplayName(unit)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
          >
            <X className="h-4 w-4 mr-1" />
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}