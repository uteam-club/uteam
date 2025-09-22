'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';

interface CanonicalMetric {
  id: string;
  code: string;
  name: string;
  category: string;
  dimension: string;
  canonicalUnit: string;
  supportedUnits: string[];
}

interface MetricSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  metrics: CanonicalMetric[];
  placeholder?: string;
  disabled?: boolean;
  excludeIds?: string[];
}

export function MetricSelector({ 
  value, 
  onValueChange, 
  metrics,
  placeholder = "Выберите метрику",
  disabled = false,
  excludeIds = []
}: MetricSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce поискового запроса
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Мемоизируем фильтрацию метрик
  const filteredMetrics = useMemo(() => 
    metrics.filter(metric => !excludeIds.includes(metric.id)), 
    [metrics, excludeIds]
  );

  // Мемоизируем группировку метрик с правильной сортировкой
  const groupedMetrics = useMemo(() => {
    const grouped = filteredMetrics.reduce((acc, metric) => {
      if (!acc[metric.category]) {
        acc[metric.category] = [];
      }
      acc[metric.category].push(metric);
      return acc;
    }, {} as Record<string, CanonicalMetric[]>);

    // Сортируем категории в правильном порядке
    const categoryOrder = [
      'identity', 'participation', 'distance', 'speed', 'speed_zones', 
      'hsr_sprint', 'acc_dec', 'load', 'intensity', 'heart', 
      'heart_zones', 'derived', 'other'
    ];

    const sortedGrouped: Record<string, CanonicalMetric[]> = {};
    categoryOrder.forEach(category => {
      if (grouped[category]) {
        sortedGrouped[category] = grouped[category];
      }
    });

    // Добавляем остальные категории, которых нет в порядке
    Object.keys(grouped).forEach(category => {
      if (!categoryOrder.includes(category)) {
        sortedGrouped[category] = grouped[category];
      }
    });

    return sortedGrouped;
  }, [filteredMetrics]);

  // Мемоизируем фильтрацию по поисковому запросу
  const searchFilteredMetrics = useMemo(() => 
    Object.entries(groupedMetrics).reduce((acc, [category, categoryMetrics]) => {
      const filtered = categoryMetrics.filter(metric =>
        metric.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        metric.code.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    }, {} as Record<string, CanonicalMetric[]>), 
    [groupedMetrics, debouncedSearchQuery]
  );

  // Показываем все метрики, если поиск пустой, иначе только отфильтрованные
  const shouldShowAllMetrics = debouncedSearchQuery.length > 0;
  const displayMetrics = shouldShowAllMetrics ? searchFilteredMetrics : groupedMetrics;

  // Обработчики
  const handleToggleGroup = (category: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        // Если группа уже открыта - закрываем её
        newSet.delete(category);
      } else {
        // Если группа закрыта - закрываем все остальные и открываем только эту
        newSet.clear();
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleSelectMetric = (metricId: string) => {
    onValueChange(metricId);
    setIsOpen(false);
    setSearchQuery('');
    setExpandedGroups(new Set());
  };

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Находим выбранную метрику
  const selectedMetric = metrics.find(m => m.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 text-left bg-vista-dark/30 border border-vista-secondary/30 rounded-lg text-vista-light placeholder:text-vista-light/50 focus:border-vista-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selectedMetric ? selectedMetric.name : placeholder}
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-vista-dark border border-vista-secondary/30 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Поле поиска */}
          <div className="p-3 border-b border-vista-secondary/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vista-light/50" />
              <Input
                placeholder="Поиск метрики..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-vista-dark/30 border border-vista-secondary/30 rounded-lg text-vista-light placeholder:text-vista-light/50 focus:border-vista-primary"
              />
            </div>
          </div>

          {/* Список групп и метрик */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {Object.entries(displayMetrics).map(([category, categoryMetrics]) => (
              <div key={category}>
                {/* Заголовок группы */}
                <div 
                  className="px-3 py-2 bg-vista-dark/30 text-sm font-medium text-vista-light/90 border-b border-vista-secondary/20 cursor-pointer hover:bg-vista-dark/50 transition-colors flex items-center justify-between"
                  onClick={() => handleToggleGroup(category)}
                >
                  <span>{category}</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${
                    expandedGroups.has(category) || shouldShowAllMetrics ? 'rotate-90' : ''
                  }`} />
                </div>

                {/* Метрики группы */}
                {(expandedGroups.has(category) || shouldShowAllMetrics) && (
                  <div className="bg-vista-secondary/20 border-l-2 border-vista-primary/30 ml-2">
                    {categoryMetrics.map((metric) => (
                      <div
                        key={metric.id}
                        className={`px-4 py-1.5 cursor-pointer hover:bg-vista-secondary/30 transition-colors border-b border-vista-secondary/10 last:border-b-0 ${
                          value === metric.id ? 'bg-vista-primary/20 text-vista-primary' : 'text-vista-light'
                        }`}
                        onClick={() => handleSelectMetric(metric.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-light">{metric.name}</span>
                          <span className="text-xs text-vista-light/50 font-mono">{metric.code}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Сообщение, если ничего не найдено */}
            {Object.keys(displayMetrics).length === 0 && (
              <div className="px-3 py-4 text-center text-vista-light/60 text-sm">
                Метрики не найдены
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
