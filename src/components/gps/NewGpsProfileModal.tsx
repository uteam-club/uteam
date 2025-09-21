'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus, Trash2, GripVertical, Settings, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface NewGpsProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ProfileColumn {
  id: string;
  canonicalMetricId: string;
  canonicalMetricName: string;
  displayName: string;
  displayUnit: string;
  displayOrder: number;
}

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
  conversionFactor: number;
}

// Компонент для выбора канонической метрики с поиском и группировкой
function MetricSelector({ 
  value, 
  onValueChange, 
  metrics, 
  placeholder = "Выберите метрику",
  excludeIds = []
}: {
  value: string;
  onValueChange: (value: string) => void;
  metrics: Array<{id: string, code: string, name: string, category: string, dimension: string, canonicalUnit: string, supportedUnits: string[]}>;
  placeholder?: string;
  excludeIds?: string[];
}) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Маппинг для правильных названий групп на русском и английском
  const categoryNames: Record<string, { ru: string; en: string }> = {
    'identity': { ru: 'Идентификация', en: 'Identity' },
    'participation': { ru: 'Участие', en: 'Participation' },
    'distance': { ru: 'Дистанция', en: 'Distance' },
    'speed': { ru: 'Скорость', en: 'Speed' },
    'speed_zones': { ru: 'Зоны скорости', en: 'Speed Zones' },
    'hsr_sprint': { ru: 'Высокоскоростной бег', en: 'High Speed Running' },
    'acc_dec': { ru: 'Ускорение и торможение', en: 'Acceleration Deceleration' },
    'heart': { ru: 'Пульс', en: 'Heart Rate' },
    'heart_zones': { ru: 'Зоны пульса', en: 'Heart Rate Zones' },
    'load': { ru: 'Нагрузка', en: 'Load' },
    'intensity': { ru: 'Интенсивность', en: 'Intensity' },
    'derived': { ru: 'Производные метрики', en: 'Derived Metrics' }
  };

  // Функция для получения названия группы на текущем языке
  const getCategoryName = (category: string): string => {
    const categoryData = categoryNames[category];
    if (!categoryData) {
      // Если категория не найдена, форматируем её название
      return category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return i18n.language === 'en' ? categoryData.en : categoryData.ru;
  };

  // Группируем метрики по категориям
  const groupedMetrics = metrics.reduce((acc, metric) => {
    const category = metric.category || 'other';
    const categoryName = getCategoryName(category);
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(metric);
    return acc;
  }, {} as Record<string, typeof metrics>);

  // Фильтруем метрики по поисковому запросу и исключаем уже выбранные
  const filteredMetrics = Object.entries(groupedMetrics).reduce((acc, [category, categoryMetrics]) => {
    const filtered = categoryMetrics.filter(metric => {
      const matchesSearch = metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           metric.code.toLowerCase().includes(searchQuery.toLowerCase());
      const notExcluded = !excludeIds.includes(metric.id);
      return matchesSearch && notExcluded;
    });
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, typeof metrics>);

  const selectedMetric = metrics.find(m => m.id === value);

  // Обработчик клика по группе
  const handleGroupClick = (category: string) => {
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

  // Если есть поисковый запрос, показываем все метрики
  const shouldShowAllMetrics = searchQuery.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="bg-vista-dark/30 border border-vista-secondary/30 text-vista-light rounded-lg px-3 py-2 h-9 cursor-pointer hover:border-vista-secondary/50 transition-colors flex items-center"
        onClick={() => setIsOpen(!isOpen)}
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
            {Object.entries(filteredMetrics).map(([category, categoryMetrics]) => (
              <div key={category}>
                {/* Заголовок группы */}
                <div 
                  className="px-3 py-2 bg-vista-dark/30 text-sm font-medium text-vista-light/90 border-b border-vista-secondary/20 cursor-pointer hover:bg-vista-dark/50 transition-colors flex items-center justify-between"
                  onClick={() => handleGroupClick(category)}
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
                        onClick={() => {
                          onValueChange(metric.id);
                          setIsOpen(false);
                          setSearchQuery('');
                          setExpandedGroups(new Set());
                        }}
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
            
            {Object.keys(filteredMetrics).length === 0 && (
              <div className="px-3 py-4 text-center text-vista-light/50 text-sm">
                Метрики не найдены
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NewGpsProfileModal({ isOpen, onClose, onSuccess }: NewGpsProfileModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [profileName, setProfileName] = useState('');
  const [columns, setColumns] = useState<ProfileColumn[]>([]);
  const [canonicalMetrics, setCanonicalMetrics] = useState<CanonicalMetric[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const steps = [
    { title: 'Основная информация', description: 'Введите название и описание профиля' },
    { title: 'Настройка колонок', description: 'Добавьте и настройте колонки для отображения данных' }
  ];

  const handleAddColumn = () => {
    const newColumn: ProfileColumn = {
      id: Date.now().toString(),
      canonicalMetricId: '',
      canonicalMetricName: '',
      displayName: '',
      displayUnit: '',
      displayOrder: columns.length,
    };
    setColumns([...columns, newColumn]);
  };

  const handleColumnChange = (id: string, field: keyof ProfileColumn, value: string | number) => {
    setColumns(prev => prev.map(col => {
      if (col.id === id) {
        const updated = { ...col, [field]: value };
        if (field === 'canonicalMetricId') {
          // Проверяем, не выбрана ли уже эта метрика в другой колонке
          const isDuplicate = prev.some(otherCol => 
            otherCol.id !== id && 
            otherCol.canonicalMetricId === value
          );
          
          if (isDuplicate) {
            // Если метрика уже выбрана, сбрасываем выбор
            updated.canonicalMetricId = '';
            updated.canonicalMetricName = '';
            updated.displayName = '';
            updated.displayUnit = '';
            return updated;
          }
          
          const metric = canonicalMetrics.find(m => m.id === value);
          updated.canonicalMetricName = metric?.name || '';
          updated.displayName = metric?.name || '';
          // Сбрасываем единицу отображения при смене метрики
          updated.displayUnit = '';
        }
        return updated;
      }
      return col;
    }));
  };

  // Получаем поддерживаемые единицы для метрики
  const getSupportedUnits = (metricId: string) => {
    const metric = canonicalMetrics.find(m => m.id === metricId);
    if (!metric) return [];
    
    return units.filter(unit => 
      metric.supportedUnits.includes(unit.code) && 
      unit.dimension === metric.dimension
    );
  };

  // Проверяем, заполнена ли колонка полностью
  const isColumnComplete = (column: ProfileColumn) => {
    return column.canonicalMetricId && 
           column.displayName.trim() && 
           column.displayUnit;
  };

  const handleRemoveColumn = (id: string) => {
    setColumns(prev => prev.filter(col => col.id !== id));
  };

  const handleMoveColumn = (id: string, direction: 'up' | 'down') => {
    setColumns(prev => {
      const index = prev.findIndex(col => col.id === id);
      if (index === -1) return prev;
      
      const newColumns = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (targetIndex >= 0 && targetIndex < newColumns.length) {
        [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
        // Обновляем displayOrder
        newColumns.forEach((col, i) => {
          col.displayOrder = i;
        });
      }
      
      return newColumns;
    });
  };

  // Убрана функция выбора команд

  // Загрузка данных при открытии модала
  React.useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      // Загружаем канонические метрики и единицы
      const metricsResponse = await fetch('/api/gps/canonical-metrics');
      const metricsData = await metricsResponse.json();
      setCanonicalMetrics(metricsData.metrics || []);
      setUnits(metricsData.units || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setProfileName('');
    setColumns([]);
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    if (!profileName.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название профиля',
        variant: 'destructive',
      });
      return false;
    }
    if (columns.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Добавьте хотя бы одну колонку',
        variant: 'destructive',
      });
      return false;
    }
    
    // Проверяем, что все колонки заполнены
    for (const column of columns) {
      if (!column.canonicalMetricId) {
        toast({
          title: 'Ошибка',
          description: 'Выберите каноническую метрику для всех колонок',
          variant: 'destructive',
        });
        return false;
      }
      if (!column.displayName.trim()) {
        toast({
          title: 'Ошибка',
          description: 'Введите название для всех колонок',
          variant: 'destructive',
        });
        return false;
      }
      if (!column.displayUnit) {
        toast({
          title: 'Ошибка',
          description: 'Выберите единицу измерения для всех колонок',
          variant: 'destructive',
        });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/gps/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileName,
          description: '',
          columns: columns.map(col => ({
            canonicalMetricId: col.canonicalMetricId,
            displayName: col.displayName,
            displayUnit: col.displayUnit,
            displayOrder: col.displayOrder,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Успех',
          description: 'Профиль успешно создан',
        });
        onSuccess?.();
        handleClose();
      } else {
        console.error('Error creating profile:', data.error);
        toast({
          title: 'Ошибка',
          description: `Ошибка при создании профиля: ${data.error}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting GPS profile:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при создании профиля',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-vista-dark border border-vista-secondary/30 rounded-lg w-full max-w-4xl max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-vista-secondary/30">
          <div>
            <h2 className="text-xl font-semibold text-vista-light">{steps[step - 1].title}</h2>
            <p className="text-sm text-vista-light/70 mt-1">
              {steps[step - 1].description}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-vista-light/70 hover:text-vista-light">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Индикатор прогресса */}
        <div className="px-6 py-4 border-b border-vista-secondary/30">
          <div className="flex items-center justify-center gap-4">
            {steps.map((_, index) => (
              <React.Fragment key={index}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index + 1 <= step 
                    ? 'bg-vista-primary text-vista-dark' 
                    : 'bg-vista-dark/50 text-vista-light/50'
                }`}>
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    index + 1 < step ? 'bg-vista-primary' : 'bg-vista-secondary/30'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Контент */}
        <div className="p-6">
          {dataLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-vista-primary"></div>
                <span className="text-vista-light">Загрузка данных...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Этап 1: Основная информация */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-vista-light/70 font-normal">Название профиля *</Label>
                      <Input
                        id="profileName"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Например: название GPS системы"
                        autoComplete="off"
                        className="bg-vista-dark/30 border border-vista-secondary/30 rounded-lg text-vista-light placeholder:text-vista-light/50 focus:border-vista-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Этап 2: Настройка колонок */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="p-4 bg-vista-primary/10 border border-vista-primary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-vista-primary" />
                      <div>
                        <h3 className="font-medium text-vista-light">Настройка колонок</h3>
                        <p className="text-sm text-vista-light/70">
                          Добавьте и настройте колонки для отображения GPS данных
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-vista-light/70">
                      Добавить новую колонку для отображения метрики
                    </div>
                    <Button 
                      onClick={handleAddColumn} 
                      size="sm"
                      className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-8 px-3 font-normal"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить колонку
                    </Button>
                  </div>

            {columns.length === 0 ? (
              <div className="border-2 border-dashed border-vista-secondary/30 rounded-lg p-8 text-center">
                <Settings className="h-12 w-12 text-vista-light/50 mb-4 mx-auto" />
                <p className="text-vista-light/70">
                  Добавьте колонки для отображения GPS данных
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {columns.map((column, index) => (
                  <div key={column.id} className="border border-vista-secondary/30 rounded-lg p-4 bg-vista-dark/30">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 pl-9">
                          <div className="flex-1 min-w-0">
                            <Label className="text-vista-light/70 font-normal text-xs">Каноническая метрика *</Label>
                          </div>
                          <div className="flex-1 min-w-0">
                            <Label className="text-vista-light/70 font-normal text-xs">Отображаемое название *</Label>
                          </div>
                          <div className="flex-1 min-w-0">
                            <Label className="text-vista-light/70 font-normal text-xs">Единица *</Label>
                          </div>
                          <div className="w-24 flex-shrink-0"></div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                            isColumnComplete(column) 
                              ? 'bg-vista-primary text-vista-dark' 
                              : 'border border-vista-primary text-vista-primary bg-transparent'
                          }`}>
                            {index + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <MetricSelector
                              value={column.canonicalMetricId}
                              onValueChange={(value) => handleColumnChange(column.id, 'canonicalMetricId', value)}
                              metrics={canonicalMetrics}
                              placeholder="Выберите метрику"
                              excludeIds={columns
                                .filter(col => col.id !== column.id && col.canonicalMetricId)
                                .map(col => col.canonicalMetricId)
                              }
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <Input
                              value={column.displayName}
                              onChange={(e) => handleColumnChange(column.id, 'displayName', e.target.value)}
                              placeholder="Название колонки"
                              className="bg-vista-dark/30 border border-vista-secondary/30 rounded-lg text-vista-light placeholder:text-vista-light/20 focus:border-vista-primary h-9"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <Select 
                              value={column.displayUnit} 
                              onValueChange={(value) => handleColumnChange(column.id, 'displayUnit', value)}
                              disabled={!column.canonicalMetricId}
                            >
                        <SelectTrigger className="shadow-sm text-vista-light focus:outline-none focus:ring-0 bg-vista-dark/70 border-vista-secondary/50 disabled:opacity-50 h-9 [&>span]:text-left [&>span]:whitespace-nowrap [&>span]:overflow-visible [&>span[data-placeholder]]:text-vista-light/20 [&>span:not([data-placeholder])]:text-vista-light">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                              <SelectContent className="bg-vista-dark border-vista-light/20 text-vista-light shadow-2xl rounded-lg custom-scrollbar max-h-60">
                                {getSupportedUnits(column.canonicalMetricId).map(unit => (
                                  <SelectItem key={unit.id} value={unit.code} className="text-vista-light hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary text-left">
                                    {unit.name} ({unit.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveColumn(column.id, 'up')}
                              disabled={index === 0}
                              className="h-9 w-8 p-0 text-vista-light hover:bg-vista-primary/15 disabled:text-vista-light/30"
                            >
                              ↑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveColumn(column.id, 'down')}
                              disabled={index === columns.length - 1}
                              className="h-9 w-8 p-0 text-vista-light hover:bg-vista-primary/15 disabled:text-vista-light/30"
                            >
                              ↓
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveColumn(column.id)}
                              className="h-9 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/15"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      </div>
                    </div>
                ))}
              </div>
            )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Кнопки навигации */}
        <div className="flex items-center justify-between p-6 border-t border-vista-secondary/30">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="bg-transparent border border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 h-9 px-3 font-normal">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={loading || dataLoading}
              className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
            >
              Отмена
            </Button>
            {step < 2 ? (
              <Button 
                onClick={handleNext} 
                disabled={!profileName.trim()}
                className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
              >
                Далее
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={!profileName || columns.length === 0 || loading || dataLoading}
                className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
              >
                {loading ? 'Создание...' : 'Создать профиль'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewGpsProfileModal;
