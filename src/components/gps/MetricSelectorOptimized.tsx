'use client';

import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CanonicalMetric {
  id: string;
  code: string;
  name: string;
  category: string;
  dimension: string;
  canonicalUnit: string;
  supportedUnits: string[];
}

interface MetricSelectorOptimizedProps {
  value: string;
  onValueChange: (value: string) => void;
  metrics: CanonicalMetric[];
  placeholder?: string;
  disabled?: boolean;
  excludeIds?: string[];
}

// Мемоизированный компонент для отдельной метрики
const MetricItem = memo(({ 
  metric, 
  isSelected, 
  onSelect 
}: { 
  metric: CanonicalMetric; 
  isSelected: boolean; 
  onSelect: (id: string) => void;
}) => {
  const handleClick = useCallback(() => {
    onSelect(metric.id);
  }, [metric.id, onSelect]);

  return (
    <div
      className={`px-4 py-1.5 cursor-pointer hover:bg-vista-secondary/30 transition-colors border-b border-vista-secondary/10 last:border-b-0 ${
        isSelected ? 'bg-vista-primary/20 text-vista-primary' : 'text-vista-light'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-light">{metric.name}</span>
        <span className="text-xs text-vista-light/50 font-mono">{metric.code}</span>
      </div>
    </div>
  );
});

MetricItem.displayName = 'MetricItem';

// Мемоизированный компонент для группы метрик
const MetricGroup = memo(({ 
  category, 
  metrics, 
  isExpanded, 
  onToggle, 
  selectedValue, 
  onSelect 
}: {
  category: string;
  metrics: CanonicalMetric[];
  isExpanded: boolean;
  onToggle: (category: string) => void;
  selectedValue: string;
  onSelect: (id: string) => void;
}) => {
  const { i18n } = useTranslation();
  
  const categoryNames = useMemo(() => ({
    'identity': { ru: 'Идентификация', en: 'Identity' },
    'participation': { ru: 'Участие', en: 'Participation' },
    'distance': { ru: 'Дистанция', en: 'Distance' },
    'speed': { ru: 'Скорость', en: 'Speed' },
    'speed_zones': { ru: 'Зоны скорости', en: 'Speed Zones' },
    'hsr_sprint': { ru: 'Высокоскоростной бег', en: 'High Speed Running' },
    'acc_dec': { ru: 'Ускорение и торможение', en: 'Acceleration Deceleration' },
    'load': { ru: 'Нагрузка', en: 'Load' },
    'intensity': { ru: 'Интенсивность', en: 'Intensity' },
    'heart': { ru: 'Пульс', en: 'Heart Rate' },
    'heart_zones': { ru: 'Зоны пульса', en: 'Heart Rate Zones' },
    'derived': { ru: 'Производные метрики', en: 'Derived Metrics' },
    'other': { ru: 'Прочие', en: 'Other' }
  }), []);

  const getCategoryName = useCallback((category: string): string => {
    const categoryData = categoryNames[category as keyof typeof categoryNames];
    if (!categoryData) {
      return category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return i18n.language === 'en' ? categoryData.en : categoryData.ru;
  }, [i18n.language, categoryNames]);

  const handleToggle = useCallback(() => {
    onToggle(category);
  }, [category, onToggle]);

  return (
    <div>
      <div
        className="px-3 py-2 bg-vista-dark/30 text-sm font-medium text-vista-light/90 border-b border-vista-secondary/20 cursor-pointer hover:bg-vista-dark/50 transition-colors flex items-center justify-between"
        onClick={handleToggle}
      >
        <span>{getCategoryName(category)}</span>
        <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </div>

      {isExpanded && (
        <div className="bg-vista-secondary/20 border-l-2 border-vista-primary/30 ml-2">
          {metrics.map((metric) => (
            <MetricItem
              key={metric.id}
              metric={metric}
              isSelected={selectedValue === metric.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
});

MetricGroup.displayName = 'MetricGroup';

export const MetricSelectorOptimized = memo(({
  value,
  onValueChange,
  metrics,
  placeholder = "Выберите метрику",
  disabled = false,
  excludeIds = []
}: MetricSelectorOptimizedProps) => {
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

  // Закрываем выпадающий список при клике вне его
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setExpandedGroups(new Set());
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Мемоизируем фильтрацию метрик
  const filteredMetrics = useMemo(
    () => metrics.filter(metric => !excludeIds.includes(metric.id)),
    [metrics, excludeIds]
  );

  // Мемоизируем группировку метрик с правильной сортировкой
  const groupedMetrics = useMemo(() => {
    const grouped = filteredMetrics.reduce((acc, metric) => {
      const category = metric.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(metric);
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
  const searchFilteredMetrics = useMemo(
    () =>
      Object.entries(groupedMetrics).reduce((acc, [category, categoryMetrics]) => {
        const filtered = categoryMetrics.filter(
          (metric) =>
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
  const handleToggleGroup = useCallback((category: string) => {
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
  }, []);

  const handleSelectMetric = useCallback((metricId: string) => {
    onValueChange(metricId);
    setIsOpen(false);
    setSearchQuery('');
    setExpandedGroups(new Set()); // Закрываем все группы при выборе метрики
  }, [onValueChange]);

  const selectedMetric = metrics.find(m => m.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`bg-vista-dark/30 border border-vista-secondary/30 text-vista-light rounded-lg px-3 py-2 h-9 cursor-pointer hover:border-vista-secondary/50 transition-colors flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between w-full">
          <span className={`text-sm ${selectedMetric ? "text-vista-light" : "text-vista-light/20"}`}>
            {selectedMetric ? selectedMetric.name : placeholder}
          </span>
          <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </div>

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
              <MetricGroup
                key={category}
                category={category}
                metrics={categoryMetrics}
                isExpanded={expandedGroups.has(category) || shouldShowAllMetrics}
                onToggle={handleToggleGroup}
                selectedValue={value}
                onSelect={handleSelectMetric}
              />
            ))}

            {/* Сообщение, если ничего не найдено */}
            {Object.keys(displayMetrics).length === 0 && (
              <div className="px-3 py-4 text-center text-vista-light/50 text-sm">
                Метрики не найдены
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

MetricSelectorOptimized.displayName = 'MetricSelectorOptimized';
