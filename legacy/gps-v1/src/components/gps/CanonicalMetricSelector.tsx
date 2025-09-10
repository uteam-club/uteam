'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, Search, Check } from 'lucide-react';
import { CanonicalRegistry, CanonicalMetric, CanonicalGroup } from '@/canon/types';

interface CanonicalMetricSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (metricKey: string) => void;
  canonicalRegistry: CanonicalRegistry | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function CanonicalMetricSelector({
  isOpen,
  onClose,
  onSelect,
  canonicalRegistry,
  searchQuery,
  onSearchChange
}: CanonicalMetricSelectorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const getGroupedMetrics = () => {
    if (!canonicalRegistry) return {};

    const grouped: Record<string, CanonicalMetric[]> = {};
    
    // Сначала создаем группы
    canonicalRegistry.groups.forEach(group => {
      grouped[group.key] = [];
    });
    
    // Добавляем метрики в соответствующие группы
    canonicalRegistry.metrics.forEach(metric => {
      const group = canonicalRegistry.groups.find(g => g.metrics.includes(metric.key));
      if (group) {
        grouped[group.key].push(metric);
      }
    });

    // Фильтрация по поисковому запросу
    if (searchQuery.trim()) {
      const filtered: Record<string, CanonicalMetric[]> = {};
      Object.entries(grouped).forEach(([groupKey, metrics]) => {
        const filteredMetrics = metrics.filter(metric => 
          metric.labels.ru.toLowerCase().includes(searchQuery.toLowerCase()) ||
          metric.labels.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
          metric.key.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filteredMetrics.length > 0) {
          filtered[groupKey] = filteredMetrics;
        }
      });
      return filtered;
    }

    return grouped;
  };

  const groupedMetrics = getGroupedMetrics();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-2xl max-h-[80vh] overflow-y-auto focus:outline-none focus:ring-0 custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">Выберите каноническую метрику</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Поиск */}
          <div className="space-y-2">
            <Label htmlFor="metricSearch" className="text-vista-light/40 font-normal">Поиск метрик</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vista-light/50" />
              <Input
                id="metricSearch"
                placeholder="Поиск по названию или ключу метрики..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          {/* Список групп и метрик */}
          <div className="space-y-2">
            {Object.entries(groupedMetrics).map(([groupKey, metrics]) => {
              const group = canonicalRegistry?.groups.find(g => g.key === groupKey);
              const isExpanded = expandedGroups.has(groupKey);
              
              return (
                <div key={groupKey} className="border border-vista-secondary/20 rounded-lg">
                  {/* Заголовок группы */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full px-4 py-3 text-left hover:bg-vista-dark/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-vista-light/60" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-vista-light/60" />
                      )}
                      <span className="font-medium text-vista-light">
                        {group?.labels.ru || groupKey}
                      </span>
                      <span className="text-sm text-vista-light/40">
                        ({metrics.length})
                      </span>
                    </div>
                  </button>

                  {/* Список метрик группы */}
                  {isExpanded && (
                    <div className="border-t border-vista-secondary/20">
                      {metrics.map((metric) => (
                        <button
                          key={metric.key}
                          onClick={() => {
                            onSelect(metric.key);
                            onClose();
                          }}
                          className="w-full px-6 py-3 text-left hover:bg-vista-dark/30 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-vista-light group-hover:text-vista-primary">
                              {metric.labels.ru}
                            </div>
                            <div className="text-sm text-vista-light/60 mt-1">
                              {metric.key}
                              {metric.unit && (
                                <span className="ml-2 text-vista-light/40">
                                  ({metric.unit})
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {Object.keys(groupedMetrics).length === 0 && (
            <div className="text-center py-8 text-vista-light/60">
              {searchQuery ? 'Метрики не найдены' : 'Нет доступных метрик'}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
          >
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
