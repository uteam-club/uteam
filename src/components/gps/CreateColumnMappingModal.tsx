'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { createGpsColumnMapping } from '@/lib/gps-api';
import { getAllCanonicalMetrics, getMetricLabel, getAllowedUnitsForMetric, getCanonicalMetricByKey } from '@/lib/canonical-metrics';
import canonicalMetricsData from '@/canon/canonical_metrics_grouped_v1.0.1.json';
import { toast } from '@/components/ui/use-toast';

interface CreateColumnMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  onMappingCreated: () => void;
  usedReportsCount?: number;
}

export default function CreateColumnMappingModal({
  open,
  onOpenChange,
  profileId,
  onMappingCreated,
  usedReportsCount = 0,
}: CreateColumnMappingModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sourceColumn: '',
    customName: '',
    canonicalMetric: '',
    displayUnit: '',
    isVisible: true,
    displayOrder: 0,
    description: '',
  });

  const canonicalMetrics = getAllCanonicalMetrics();

  // Получаем каноническую единицу для метрики
  const getCanonicalUnitForMetric = (metricKey: string): string => {
    const metric = getCanonicalMetricByKey(metricKey);
    if (!metric) return 'm'; // разумный дефолт
    
    const dimension = canonicalMetricsData.dimensions[metric.dimension as keyof typeof canonicalMetricsData.dimensions];
    return dimension?.canonical_unit || 'm';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (usedReportsCount > 0) {
      toast({
        title: 'Структура профиля заморожена',
        description: 'Нельзя добавлять новые маппинги для используемого профиля',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.sourceColumn || !formData.customName || !formData.canonicalMetric || !formData.displayUnit) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const mapping = await createGpsColumnMapping({
        gpsProfileId: profileId,
        sourceColumn: formData.sourceColumn,
        customName: formData.customName,
        canonicalMetric: formData.canonicalMetric,
        displayUnit: formData.displayUnit,
        isVisible: formData.isVisible,
        displayOrder: formData.displayOrder,
        description: formData.description,
      });

      if (mapping) {
        toast({
          title: 'Успех',
          description: 'Маппинг столбца создан успешно',
        });
        onMappingCreated();
        setFormData({
          sourceColumn: '',
          customName: '',
          canonicalMetric: '',
          displayUnit: '',
          isVisible: true,
          displayOrder: 0,
          description: '',
        });
      } else {
        throw new Error('Failed to create mapping');
      }
    } catch (error) {
      console.error('Error creating column mapping:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать маппинг столбца',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
        setFormData({
          sourceColumn: '',
          customName: '',
          canonicalMetric: '',
          displayUnit: '',
          isVisible: true,
          displayOrder: 0,
          description: '',
        });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Добавить маппинг столбца</DialogTitle>
            <DialogDescription>
              Сопоставьте столбец из GPS файла с канонической метрикой
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sourceColumn">Исходный столбец *</Label>
              <Input
                id="sourceColumn"
                value={formData.sourceColumn}
                onChange={e => setFormData(prev => ({ ...prev, sourceColumn: e.target.value }))}
                placeholder="Например: Total distance"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="customName">Кастомное название *</Label>
              <Input
                id="customName"
                value={formData.customName}
                onChange={e => setFormData(prev => ({ ...prev, customName: e.target.value }))}
                placeholder="Например: Общая дистанция"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="canonicalMetric">Каноническая метрика *</Label>
              <Select
                value={formData.canonicalMetric}
                onValueChange={(value) => {
                  const canonicalUnit = getCanonicalUnitForMetric(value);
                  setFormData(prev => ({ 
                    ...prev, 
                    canonicalMetric: value,
                    displayUnit: canonicalUnit
                  }));
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите каноническую метрику" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {canonicalMetrics.map((metric) => (
                    <SelectItem key={metric.key} value={metric.key}>
                      <div className="flex flex-col">
                        <span>{getMetricLabel(metric.key)}</span>
                        <span className="text-xs text-muted-foreground">
                          {metric.key} • {metric.unit}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayUnit">Единица отображения</Label>
              <Select
                value={formData.displayUnit}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  displayUnit: value 
                }))}
                disabled={!formData.canonicalMetric}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите единицу отображения" />
                </SelectTrigger>
                <SelectContent>
                  {formData.canonicalMetric && getAllowedUnitsForMetric(formData.canonicalMetric).map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {!formData.canonicalMetric 
                  ? 'Сначала выберите каноническую метрику'
                  : 'Если не выбрано, будет использована единица из файла'
                }
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="displayOrder">Порядок отображения</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={e => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="isVisible"
                  checked={formData.isVisible}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isVisible: checked }))}
                />
                <Label htmlFor="isVisible">Видимый столбец</Label>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание маппинга (необязательно)"
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Создание...' : 'Создать маппинг'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
