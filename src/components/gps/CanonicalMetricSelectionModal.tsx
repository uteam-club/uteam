'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import canonicalMetrics from '@/canon/canonical_metrics_grouped_v1.0.1.json';
// Убираем единицу в скобках: "Время на поле (мин)" → "Время на поле"
const stripUnitSuffix = (s: string) => s.replace(/\s*\([^)]*\)\s*$/u, '').trim();

// Нормализуем название метрики (убираем хвост в скобках)
const normalizeTitle = (metric: CanonicalMetric) => stripUnitSuffix(metric.labels.ru);

// Получаем каноническую единицу для dimension
const getCanonicalUnit = (dimension: string) => {
  const dim = canonicalMetrics.dimensions[dimension as keyof typeof canonicalMetrics.dimensions];
  return dim?.canonical_unit || '';
};

// Получаем доступные единицы для dimension
const getAllowedUnits = (dimension: string) => {
  const dim = canonicalMetrics.dimensions[dimension as keyof typeof canonicalMetrics.dimensions];
  return dim?.allowed_units || [];
};

interface CanonicalMetric {
  key: string;
  labels: {
    ru: string;
    en: string;
  };
  description: string;
  unit: string;
  dimension: string;
  category: string;
}

interface CanonicalMetricGroup {
  key: string;
  labels: {
    ru: string;
    en: string;
  };
  description: string;
  metrics: string[];
}

interface CanonicalMetricSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (metric: CanonicalMetric) => void;
  selectedMetricKey?: string;
  usedMetricKeys?: string[];
}

export default function CanonicalMetricSelectionModal({
  open,
  onOpenChange,
  onSelect,
  selectedMetricKey,
  usedMetricKeys = []
}: CanonicalMetricSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const metrics = canonicalMetrics.metrics as CanonicalMetric[];
  const groups = canonicalMetrics.groups as CanonicalMetricGroup[];

  // Построим Set занятых концепций по уже выбранным ключам
  const usedConcepts = new Set(
    metrics
      .filter(m => usedMetricKeys.includes(m.key))
      .map(m => normalizeTitle(m))
  );

  // Сначала фильтрация по поиску/группе/неиспользованным
  const filteredMetricsRaw = metrics.filter(metric => {
    const matchesSearch = searchTerm === '' || 
      metric.labels.ru.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metric.labels.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metric.key.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = selectedGroup === 'all' || 
      metric.category === selectedGroup ||
      groups.find(g => g.key === selectedGroup)?.metrics.includes(metric.key);
    
    const notUsed = !usedMetricKeys.includes(metric.key);
    
    // Проверяем, что концепция не занята
    const concept = normalizeTitle(metric);
    const conceptNotUsed = !usedConcepts.has(concept);
    
    return matchesSearch && matchesGroup && notUsed && conceptNotUsed;
  });

  // Группируем метрики по нормализованному названию
  const groupedMetrics = new Map<string, typeof filteredMetricsRaw>();
  for (const metric of filteredMetricsRaw) {
    const normalizedTitle = normalizeTitle(metric);
    if (!groupedMetrics.has(normalizedTitle)) {
      groupedMetrics.set(normalizedTitle, []);
    }
    groupedMetrics.get(normalizedTitle)!.push(metric);
  }

  // В каждой группе выбираем метрику с канонической единицей (или первую)
  const filteredMetrics = Array.from(groupedMetrics.values()).map(group => {
    const canonicalUnit = getCanonicalUnit(group[0].dimension);
    const canonicalMetric = group.find(m => m.unit === canonicalUnit);
    return canonicalMetric || group[0];
  });

  const handleSelect = (metric: CanonicalMetric) => {
    onSelect(metric);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedGroup('all');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-3xl h-[80vh] flex flex-col p-0 custom-scrollbar overflow-hidden mt-4">
        <DialogHeader className="px-6 py-4 border-b border-vista-secondary/30">
          <DialogTitle className="text-vista-light text-xl">
            Выбор канонической метрики
          </DialogTitle>
          <DialogDescription className="text-vista-light/60">
            Выберите каноническую метрику для сопоставления с столбцом из GPS файла
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Filter */}
          <div className="px-6 py-4 border-b border-vista-secondary/30">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-vista-light/40 w-4 h-4" />
                <Input
                  placeholder="Поиск метрик..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-vista-secondary/20 border-vista-secondary/30 text-vista-light placeholder:text-vista-light/40 focus:border-vista-primary focus:ring-vista-primary/20 h-9"
                />
              </div>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-48 bg-vista-secondary/20 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-vista-primary/20 h-9">
                  <SelectValue placeholder="Все группы" />
                </SelectTrigger>
                <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                  <SelectItem value="all" className="text-vista-light hover:bg-vista-secondary/20">
                    Все группы
                  </SelectItem>
                  {groups.map(group => (
                    <SelectItem key={group.key} value={group.key} className="text-vista-light hover:bg-vista-secondary/20">
                      {group.labels.ru}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Metrics List */}
          <div className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              {filteredMetrics.map((metric) => (
                <div
                  key={metric.key}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedMetricKey === metric.key
                      ? 'bg-vista-primary/10 border-vista-primary/50 shadow-md'
                      : 'bg-vista-secondary/10 border-vista-secondary/30 hover:bg-vista-secondary/20 hover:border-vista-secondary/50'
                  }`}
                  onClick={() => handleSelect(metric)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-vista-light text-base">
                          {normalizeTitle(metric)}
                        </h4>
                        {selectedMetricKey === metric.key && (
                          <Check className="w-4 h-4 text-vista-primary" />
                        )}
                      </div>
                      <p className="text-sm text-vista-light/70 mb-2 leading-relaxed">
                        {metric.description}
                      </p>
                      <p className="text-xs text-vista-primary/80 mb-3 font-medium">
                        Единицу измерения вы выберете на следующем шаге
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-vista-secondary/20 border-vista-secondary/40 text-vista-light/80"
                        >
                          {metric.dimension}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-vista-secondary/20 border-vista-secondary/40 text-vista-light/80"
                        >
                          {metric.category}
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-vista-light/60 mb-1">Доступные единицы:</p>
                        <div className="flex flex-wrap gap-1">
                          {getAllowedUnits(metric.dimension).map(unit => (
                            <Badge 
                              key={unit}
                              variant="outline" 
                              className="text-xs bg-vista-primary/10 border-vista-primary/30 text-vista-primary"
                            >
                              {unit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredMetrics.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-vista-light/40 mb-2">
                    <Search className="w-12 h-12 mx-auto mb-4" />
                  </div>
                  <p className="text-vista-light/60 text-lg mb-2">
                    {searchTerm ? 'Метрики не найдены' : 'Нет доступных метрик'}
                  </p>
                  <p className="text-vista-light/40 text-sm">
                    {searchTerm ? 'Попробуйте изменить поисковый запрос' : 'Все метрики уже используются'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-vista-secondary/30">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
