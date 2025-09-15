'use client';

import { useState, useEffect } from 'react';
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
import { GpsColumnMapping } from '@/types/gps';
import { updateGpsColumnMapping } from '@/lib/gps-api';
import { getAllCanonicalMetrics, getMetricLabel, getAllowedUnitsForMetric, getCanonicalMetricByKey } from '@/lib/canonical-metrics';
import canonicalMetricsData from '@/canon/canonical_metrics_grouped_v1.0.1.json';
import { toast } from '@/components/ui/use-toast';

interface EditColumnMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: GpsColumnMapping;
  onMappingUpdated: () => void;
  usedReportsCount?: number;
}

export default function EditColumnMappingModal({
  open,
  onOpenChange,
  mapping,
  onMappingUpdated,
  usedReportsCount = 0,
}: EditColumnMappingModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (mapping) {
      const canonicalUnit = getCanonicalUnitForMetric(mapping.canonicalMetric);
      setFormData({
        customName: mapping.customName,
        canonicalMetric: mapping.canonicalMetric,
        displayUnit: mapping.displayUnit || canonicalUnit,
        isVisible: mapping.isVisible,
        displayOrder: mapping.displayOrder,
        description: mapping.description || '',
      });
    }
  }, [mapping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customName || !formData.canonicalMetric) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const updatedMapping = await updateGpsColumnMapping(mapping.id, {
        gpsProfileId: mapping.gpsProfileId,
        customName: formData.customName,
        canonicalMetric: formData.canonicalMetric,
        displayUnit: formData.displayUnit,
        isVisible: formData.isVisible,
        displayOrder: formData.displayOrder,
        description: formData.description,
      });

      if (updatedMapping) {
        toast({
          title: 'Успех',
          description: 'Маппинг столбца обновлен успешно',
        });
        onMappingUpdated();
      } else {
        throw new Error('Failed to update mapping');
      }
    } catch (error: any) {
      console.error('Error updating column mapping:', error);
      
      if (error?.error === 'PROFILE_STRUCTURE_FROZEN') {
        const blockedFields = error?.blockedFields || [];
        toast({
          title: 'Структура профиля заморожена',
          description: `Нельзя менять: ${blockedFields.join(', ')}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось обновить маппинг столбца',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Редактировать маппинг столбца</DialogTitle>
            <DialogDescription>
              Измените настройки маппинга для столбца &quot;{mapping.sourceColumn}&quot;
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sourceColumn">Исходный столбец</Label>
              <Input id="sourceColumn"
                value={mapping.sourceColumn}
                disabled
                className="bg-muted"
               autoComplete="off" />
              <p className="text-xs text-muted-foreground">
                Исходное название столбца нельзя изменить
              </p>
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
                onValueChange={(value) => setFormData(prev => ({ ...prev, canonicalMetric: value }))}
                required
                disabled={usedReportsCount > 0}
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
                disabled={usedReportsCount > 0 ? false : false} // displayUnit можно редактировать всегда
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
                Если не выбрано, будет использована единица из файла
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
                  disabled={usedReportsCount > 0}
                />
                <Label htmlFor="isVisible">
                  Видимый столбец
                  {usedReportsCount > 0 && (
                    <span className="text-xs text-muted-foreground block">
                      Профиль уже используется в отчётах. Включать/выключать колонки нельзя.
                    </span>
                  )}
                </Label>
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
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
