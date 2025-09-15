'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// Убрали импорты иконок сортировки
import { GpsReport, GpsProfile, GpsColumnMapping, GpsPlayerMapping } from '@/types/gps';
import { getPlayersByTeamId } from '@/lib/teams-api';
import { Player } from '@/types/player';
import EventInfoCards from './EventInfoCards';
import { Training, Match } from '@/types/events';
// Убрали неиспользуемые импорты для форматирования с единицами измерения

  // Компонент для мини-графика (для таблицы)
  const MiniBarChart = ({ value, maxValue, minValue = 0, color = '#5acce5' }: {
    value: number;
    maxValue: number;
    minValue?: number;
    color?: string;
  }) => {
    // Вычисляем ширину градиента на основе значения
    const range = maxValue - minValue;
    let gradientWidth = 100;
    
    if (range > 0) {
      // Используем более мягкую кривую для более длинного градиента
      const normalizedValue = (value - minValue) / range;
      gradientWidth = Math.pow(normalizedValue, 0.7) * 100; // Более мягкая кривая
      gradientWidth = Math.max(25, Math.min(100, gradientWidth)); // Минимум 25%, максимум 100%
    }
    
    const displayValue = Math.round(value);
    
    return (
      <div className="w-full relative">
        {/* Фоновая полоска */}
        <div className="bg-vista-dark/50 rounded-sm h-6 border border-vista-secondary/20"></div>
        
        {/* Градиентная заливка */}
        <div 
          className="absolute top-0 left-0 h-full rounded-sm transition-all duration-500 ease-out"
          style={{ 
            width: `${gradientWidth}%`,
            background: `linear-gradient(to right, ${color}, transparent)`,
          }}
        ></div>
        
        {/* Число по центру всей ширины */}
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <span className="text-xs text-vista-light font-medium drop-shadow-sm">
            {displayValue}
          </span>
        </div>
      </div>
    );
  };

  // Компонент для полукругового индикатора (спидометр) - только для блока средних значений
  const SemicircularGauge = ({ value, maxValue, minValue = 0, color = '#5acce5', percentageDiff, title }: {
    value: number;
    maxValue: number;
    minValue?: number;
    color?: string;
    percentageDiff?: number;
    title?: string;
  }) => {
    // Вычисляем процент заполнения на основе percentageDiff
    // При 0% и выше - спидометр полностью заполнен (100%)
    // При отрицательном проценте - спидометр уменьшается
    let percentage = 100; // По умолчанию полностью заполнен
    
    if (percentageDiff !== undefined) {
      if (percentageDiff >= 0) {
        // При 0% и выше - полностью заполнен
        percentage = 100;
      } else {
        // При отрицательном проценте - уменьшаем заполнение
        // Максимальное уменьшение до 20% (не полностью пустой)
        percentage = Math.max(20, 100 + percentageDiff);
      }
    }
    
    
    const displayValue = Math.round(value);
    
    // Генерируем уникальный ID для градиента
    const gradientId = `gauge-gradient-${value}-${maxValue}-${minValue}`.replace(/[^a-zA-Z0-9-]/g, '');
    
    // Определяем цвет заливки: полный цвет для положительных/нулевых процентов, градиент для отрицательных
    const isNegative = percentageDiff !== undefined && percentageDiff < 0;
    const strokeColor = isNegative ? `url(#${gradientId})` : color;
    
    return (
      <div className="w-full relative flex justify-center pt-6 pb-1">
        <div className="relative w-full h-28">
          {/* SVG для полукругового индикатора */}
          <svg 
            width="100%" 
            height="112" 
            viewBox="0 0 200 80" 
            className="overflow-visible"
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={`${color}4D`} />
              </linearGradient>
            </defs>
            
            {/* Фоновая дуга */}
            <path
              d="M 10 70 A 90 90 0 0 1 190 70"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="30"
            />
            
            {/* Заполненная дуга с градиентом */}
            <path
              d="M 10 70 A 90 90 0 0 1 190 70"
              fill="none"
              stroke={strokeColor}
              strokeWidth="30"
              strokeDasharray={`${(percentage / 100) * 282.7} 282.7`}
              strokeDashoffset="0"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          
          {/* Название сверху внутри полукруга */}
          {title && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
              <span className="text-vista-light/60 text-xs font-medium">
                {title}
              </span>
            </div>
          )}
          
          {/* Процент по центру */}
          {percentageDiff !== undefined && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className={`text-sm font-medium drop-shadow-sm ${percentageDiff > 0 ? 'text-green-400' : percentageDiff < 0 ? 'text-red-400' : 'text-vista-light'}`}>
                {percentageDiff > 0 ? '+' : ''}{percentageDiff}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

interface GpsReportVisualizationProps {
  gpsReport: GpsReport;
  gpsProfile: GpsProfile;
  columnMappings: GpsColumnMapping[];
  playerMappings: GpsPlayerMapping[];
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export default function GpsReportVisualization({
  gpsReport,
  gpsProfile,
  columnMappings,
  playerMappings
}: GpsReportVisualizationProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [eventData, setEventData] = useState<Training | Match | null>(null);
  const [eventLoading, setEventLoading] = useState(false);

  // Загружаем данные события
  const loadEventData = async () => {
    if (!gpsReport.eventId || !gpsReport.eventType) return;
    
    setEventLoading(true);
    try {
      const endpoint = gpsReport.eventType === 'training' 
        ? `/api/trainings/${gpsReport.eventId}`
        : `/api/matches/${gpsReport.eventId}`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setEventData(data);
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setEventLoading(false);
    }
  };

  // Загружаем игроков команды
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true);
        const teamPlayers = await getPlayersByTeamId(gpsReport.teamId);
        setPlayers(teamPlayers);
      } catch (error) {
        console.error('Error loading players:', error);
      } finally {
        setLoading(false);
      }
    };

    if (gpsReport.teamId) {
      loadPlayers();
    }
    loadEventData();
  }, [gpsReport.teamId, gpsReport.eventId, gpsReport.eventType]);

  // Загружаем данные для сравнения
  useEffect(() => {
    const loadComparisonData = async () => {
      // Сравнение работает только для тренировок, не для матчей
      if (gpsReport.eventType !== 'training') {
        setComparisonData({ message: 'Сравнение доступно только для тренировок' });
        return;
      }

      try {
        setComparisonLoading(true);
        
        // Получаем информацию о сравнении
        const comparisonResponse = await fetch(
          `/api/gps/reports/comparison?eventId=${gpsReport.eventId}&eventType=${gpsReport.eventType}&teamId=${gpsReport.teamId}`
        );
        
        if (!comparisonResponse.ok) {
          throw new Error('Failed to fetch comparison data');
        }
        
        const comparisonInfo = await comparisonResponse.json();
        
        if (!comparisonInfo.comparisonData) {
          // Убрали отладочный лог
          setComparisonData({ message: comparisonInfo.message });
          return;
        }

        // Получаем агрегированные данные для сравнения
        const reportIds = Object.values(comparisonInfo.comparisonData.reportsByTraining)
          .flat()
          .map((report: any) => report.id);
        
        if (reportIds.length === 0) {
          setComparisonData({ message: 'Нет данных для сравнения' });
          return;
        }

        const aggregatedResponse = await fetch('/api/gps/reports/aggregated-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportIds })
        });

        if (!aggregatedResponse.ok) {
          throw new Error('Failed to fetch aggregated data');
        }

        const aggregatedData = await aggregatedResponse.json();
        
        
        setComparisonData({
          ...comparisonInfo,
          aggregatedData
        });

      } catch (error) {
        console.error('Error loading comparison data:', error);
        setComparisonData({ error: 'Ошибка загрузки данных сравнения' });
      } finally {
        setComparisonLoading(false);
      }
    };

    if (gpsReport.eventId && gpsReport.eventType && gpsReport.teamId) {
      loadComparisonData();
    }
  }, [gpsReport.eventId, gpsReport.eventType, gpsReport.teamId]);

  // Функция для получения правильного имени игрока
  const getPlayerDisplayName = (rowIndex: number, sourceColumn: string, rawValue: any) => {
    // Находим маппинг для этой строки
    const mapping = playerMappings.find(m => m.rowIndex === rowIndex);
    if (!mapping || !mapping.playerId) return rawValue;

    // Находим игрока в базе данных
    const player = players.find(p => p.id === mapping.playerId);
    if (!player) return rawValue;

    // Если это столбец с именем игрока (athlete_name), показываем правильное имя
    const columnMapping = columnMappings.find(cm => cm.sourceColumn === sourceColumn);
    if (columnMapping?.canonicalMetric === 'athlete_name') {
      return `${player.lastName} ${player.firstName}`;
    }

    return rawValue;
  };

  // Убрали функцию getCanonicalUnitForMetric - единицы измерения больше не нужны

  // Функция для форматирования значения без единиц измерения
  const formatValue = (value: any, mapping: GpsColumnMapping) => {
    // Убрали отладочные логи

    // Специальная обработка для времени - конвертируем в минуты
    // Проверяем по разным критериям
    const isTimeColumn = mapping.canonicalMetric === 'time' || 
                        mapping.customName?.toLowerCase().includes('time') ||
                        mapping.sourceColumn?.toLowerCase().includes('time') ||
                        mapping.customName?.toLowerCase() === 'time' ||
                        mapping.sourceColumn?.toLowerCase() === 'time';
    
    // Универсальная проверка для времени - если строка содержит двоеточие в формате HH:MM:SS
    if (typeof value === 'string' && value.includes(':') && value.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
      const parts = value.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        const seconds = parseInt(parts[2], 10) || 0;
        const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);
        // Убрали отладочный лог
        return totalMinutes;
      }
    }

    if (isTimeColumn) {
      
      // Если это строка в формате HH:MM:SS, парсим её
      if (typeof value === 'string' && value.includes(':')) {
        const parts = value.split(':');
        if (parts.length === 3) {
          const hours = parseInt(parts[0], 10) || 0;
          const minutes = parseInt(parts[1], 10) || 0;
          const seconds = parseInt(parts[2], 10) || 0;
          const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);
          // Убрали отладочный лог
          return totalMinutes;
        }
      }
      
      // Если это число, предполагаем что в секундах
      if (typeof value === 'number') {
        return Math.round(value / 60);
      }
      
      return value;
    }

    // Если это не числовое значение, возвращаем как есть
    if (typeof value !== 'number' || isNaN(value)) {
      return value;
    }

    // Специальная обработка для процентов - убираем лишние нули
    if (mapping.canonicalMetric === 'percentage' || 
        mapping.customName?.toLowerCase().includes('%') ||
        mapping.sourceColumn?.toLowerCase().includes('%') ||
        mapping.customName?.toLowerCase().includes('hsr%')) {
      return Math.round(value); // Округляем до целых чисел
    }

    // Для остальных числовых значений - округляем до целых чисел
    return Math.round(value);
  };

  // Фильтруем данные только по сопоставленным игрокам
  const filteredData = useMemo(() => {
    if (!gpsReport.rawData || !Array.isArray(gpsReport.rawData)) {
      return [];
    }

    // Получаем индексы строк сопоставленных игроков (только с не-null playerId)
    const mappedRowIndexes = new Set(
      playerMappings
        .filter(mapping => mapping.playerId !== null)
        .map(mapping => mapping.rowIndex)
    );
    
    // Фильтруем rawData только по сопоставленным игрокам
    return gpsReport.rawData.filter((_, index) => mappedRowIndexes.has(index));
  }, [gpsReport.rawData, playerMappings]);

  // Сортируем данные
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Метрики, которые не должны отображаться в средних значениях
  const EXCLUDED_FROM_AVERAGES = [
    'athlete_name',
    'position', 
    'duration_s',
    'max_acceleration_ms2',
    'max_deceleration_ms2',
    'max_speed_ms',
    'max_speed_kmh',
    'top_heart_rate_bpm'
  ];

  // Функция для вычисления сравнения с данными по тегу
  const getComparisonValue = (currentValue: number, canonicalMetric: string) => {
    if (!comparisonData?.aggregatedData?.averages) {
      return null;
    }
    
    // Ищем среднее значение по canonicalMetric (API должен возвращать данные по каноническим метрикам)
    let tagAverage = comparisonData.aggregatedData.averages[canonicalMetric];
    
    if (tagAverage === undefined || tagAverage === 0) {
      return null;
    }
    
    const percentageDiff = ((currentValue - tagAverage) / tagAverage) * 100;
    const absoluteDiff = currentValue - tagAverage;
    
    return {
      percentage: Math.round(percentageDiff * 10) / 10,
      absolute: Math.round(absoluteDiff),
      tagAverage: Math.round(tagAverage),
      isHigher: percentageDiff > 0
    };
  };

  // Функция для получения цвета индикатора
  const getComparisonColor = (comparison: any) => {
    if (!comparison) return 'text-vista-light';
    
    const absPercentage = Math.abs(comparison.percentage);
    if (absPercentage < 5) return 'text-vista-light'; // Нейтральный
    if (absPercentage < 15) return comparison.isHigher ? 'text-yellow-400' : 'text-orange-400'; // Умеренное отклонение
    return comparison.isHigher ? 'text-green-400' : 'text-red-400'; // Сильное отклонение
  };

  // Вычисляем средние значения
  const averages = useMemo(() => {
    if (filteredData.length === 0) return {};

    const numericColumns = columnMappings.filter(mapping => {
      const sampleValue = filteredData[0]?.[mapping.sourceColumn];
      const isNumeric = typeof sampleValue === 'number' && !isNaN(sampleValue);
      const isNotExcluded = !EXCLUDED_FROM_AVERAGES.includes(mapping.canonicalMetric);
      return isNumeric && isNotExcluded;
    });

    const averages: Record<string, number | string> = {};

    numericColumns.forEach(mapping => {
      const values = filteredData
        .map(row => row[mapping.sourceColumn])
        .filter(value => typeof value === 'number' && !isNaN(value));
      
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        averages[mapping.canonicalMetric] = average;
        
        // Отладочные логи
        // Убрали отладочный лог
      }
    });

    // Добавляем время отдельно (без графиков)
    const timeColumns = columnMappings.filter(mapping => {
      const sampleValue = filteredData[0]?.[mapping.sourceColumn];
      const isTimeString = typeof sampleValue === 'string' && sampleValue.includes(':');
      const isNotExcluded = !EXCLUDED_FROM_AVERAGES.includes(mapping.canonicalMetric);
      return isTimeString && isNotExcluded;
    });

    timeColumns.forEach(mapping => {
      const values = filteredData
        .map(row => {
          const rawValue = row[mapping.sourceColumn];
          if (typeof rawValue === 'string' && rawValue.includes(':')) {
            const parts = rawValue.split(':');
            if (parts.length === 3) {
              const hours = parseInt(parts[0], 10) || 0;
              const minutes = parseInt(parts[1], 10) || 0;
              const seconds = parseInt(parts[2], 10) || 0;
              return hours * 60 + minutes + Math.round(seconds / 60);
            }
          }
          return 0;
        })
        .filter(value => value > 0);
      
      if (values.length > 0) {
        const avgMinutes = values.reduce((sum, val) => sum + val, 0) / values.length;
        const hours = Math.floor(avgMinutes / 60);
        const minutes = Math.floor(avgMinutes % 60);
        const seconds = Math.floor((avgMinutes % 1) * 60);
        averages[mapping.canonicalMetric] = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    });

    return averages;
  }, [filteredData, columnMappings]);

  // Вычисляем максимальную длину имени игрока для динамической ширины
  const maxPlayerNameLength = useMemo(() => {
    const playerColumn = columnMappings.find(m => m.canonicalMetric === 'athlete_name');
    if (!playerColumn) return 0;
    
    const names = filteredData.map(row => {
      const name = getPlayerDisplayName(
        filteredData.indexOf(row), 
        playerColumn.sourceColumn, 
        row[playerColumn.sourceColumn]
      );
      return name.length;
    });
    
    return Math.max(...names, 0);
  }, [filteredData, columnMappings]);

  // Вычисляем min/max значения для графиков
  const columnStats = useMemo(() => {
    if (filteredData.length === 0) return {};

    const numericColumns = columnMappings.filter(mapping => {
      const sampleValue = filteredData[0]?.[mapping.sourceColumn];
      return typeof sampleValue === 'number' && !isNaN(sampleValue);
    });

    const stats: Record<string, { min: number; max: number; color: string }> = {};

    numericColumns.forEach(mapping => {
      const values = filteredData
        .map(row => row[mapping.sourceColumn])
        .filter(value => typeof value === 'number' && !isNaN(value));
      
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        // Если все значения одинаковые, устанавливаем min = 0 для корректного отображения
        const adjustedMin = min === max ? 0 : min;
        const adjustedMax = max === min ? Math.max(max, 1) : max; // Минимум 1 для избежания деления на 0
        
        // Используем бирюзовый цвет для всех графиков (как в кнопке "Новый отчет")
        const color = '#5acce5'; // vista-primary цвет
        
        stats[mapping.sourceColumn] = { min: adjustedMin, max: adjustedMax, color };
        
        // Отладочные логи
        // Убрали отладочный лог
      }
    });

    return stats;
  }, [filteredData, columnMappings]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };

  // Убрали функцию getSortIcon - иконки больше не нужны

  if (loading) {
    return (
      <Card className="bg-vista-dark border-vista-secondary/30">
        <CardContent className="p-6">
          <div className="text-center text-vista-light/70">
            <p>Загрузка данных игроков...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredData.length === 0) {
    return (
      <Card className="bg-vista-dark border-vista-secondary/30">
        <CardContent className="p-6">
          <div className="text-center text-vista-light/70">
            <p>Нет данных для отображения</p>
            <p className="text-sm mt-2">Убедитесь, что игроки сопоставлены в маппинге</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Информация о событии */}
      {eventLoading ? (
        <Card className="bg-vista-dark/70 border-vista-secondary/50 shadow-md">
          <CardContent className="p-6">
            <div className="text-center text-vista-light/70">
              Загрузка информации о событии...
            </div>
          </CardContent>
        </Card>
      ) : eventData ? (
        <EventInfoCards 
          eventType={gpsReport.eventType as 'training' | 'match'}
          eventData={eventData}
        />
      ) : (
      <Card className="bg-vista-dark/70 border-vista-secondary/50 shadow-md">
          <CardContent className="p-6">
            <div className="text-center text-vista-light/70">
              Не удалось загрузить информацию о событии
          </div>
          </CardContent>
      </Card>
      )}

      {/* Таблица данных */}
      <Card className="bg-vista-dark/70 border-vista-secondary/50 shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="table-auto w-full">
              <TableHeader>
                <TableRow className="border-vista-secondary/50 hover:bg-transparent">
                  {columnMappings.map((mapping, index) => {
                    // Определяем класс ширины для заголовка столбца
                    const getHeaderWidthClass = (mapping: GpsColumnMapping) => {
                      if (mapping.canonicalMetric === 'athlete_name') {
                        // Динамическая ширина на основе максимальной длины имени
                        const minWidth = Math.max(maxPlayerNameLength * 10 + 40, 160); // 10px на символ + отступы, минимум 160px
                        return `min-w-[${minWidth}px] whitespace-nowrap`; // Минимальная ширина + запрет переноса
                      } else if (mapping.canonicalMetric === 'time' || mapping.customName?.toLowerCase().includes('time')) {
                        return 'w-15'; // Время - фиксированная ширина 60px
                      } else {
                        return 'w-24'; // Остальные столбцы - фиксированная ширина
                      }
                    };

                    const isTimeHeader = mapping.canonicalMetric === 'time' || mapping.customName?.toLowerCase().includes('time');
                    
                    return (
                      <TableHead key={mapping.id} className={`text-vista-light bg-transparent px-2 py-3 border-r border-vista-secondary/30 text-center hover:bg-transparent ${getHeaderWidthClass(mapping)}`}>
                        <div
                        onClick={() => handleSort(mapping.sourceColumn)}
                          className="cursor-pointer font-medium text-vista-light hover:text-vista-primary text-sm transition-colors"
                      >
                        {mapping.customName}
                        </div>
                    </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, index) => {
                  // Находим оригинальный индекс строки в rawData
                  const originalRowIndex = gpsReport.rawData?.findIndex((originalRow: any, idx: number) => 
                    originalRow === row
                  ) ?? index;
                  
                  return (
                    <TableRow key={index} className="border-vista-secondary/50 hover:bg-vista-dark/30">
                      {columnMappings.map((mapping) => {
                        const rawValue = row[mapping.sourceColumn];
                        const displayValue = getPlayerDisplayName(originalRowIndex, mapping.sourceColumn, rawValue);
                        
                        // Если это числовое значение и не имя игрока, форматируем его
                        const shouldFormat = typeof rawValue === 'number' && 
                          !isNaN(rawValue) && 
                          mapping.canonicalMetric !== 'athlete_name';
                        
                        // Если это время (строка с двоеточием) и не имя игрока, форматируем без графика
                        const isTime = typeof rawValue === 'string' && 
                          rawValue.includes(':') && 
                          mapping.canonicalMetric !== 'athlete_name';
                        
                        // Получаем статистику для колонки (только для числовых значений)
                        const stats = shouldFormat ? columnStats[mapping.sourceColumn] : null;
                        
                        // Определяем класс ширины для столбца
                        const getColumnWidthClass = (mapping: GpsColumnMapping) => {
                          if (mapping.canonicalMetric === 'athlete_name') {
                            // Динамическая ширина на основе максимальной длины имени
                            const minWidth = Math.max(maxPlayerNameLength * 10 + 40, 160); // 10px на символ + отступы, минимум 160px
                            return `min-w-[${minWidth}px] whitespace-nowrap`; // Минимальная ширина + запрет переноса
                          } else if (isTime) {
                            return 'w-15'; // Время - фиксированная ширина 60px
                          } else {
                            return 'w-24'; // Остальные столбцы - фиксированная ширина
                          }
                        };
                        
                        return (
                          <TableCell key={mapping.id} className={`text-vista-light text-sm px-2 py-3 border-r border-vista-secondary/30 ${getColumnWidthClass(mapping)} ${isTime ? 'text-center' : ''}`}>
                            {isTime ? (
                              // Время отображаем как раньше - только число
                              formatValue(rawValue, mapping)
                            ) : shouldFormat && stats ? (
                              // Числовые значения с графиком
                              <div className="w-full">
                                <MiniBarChart
                                  value={rawValue}
                                  maxValue={stats.max}
                                  minValue={stats.min}
                                  color={stats.color}
                                />
                              </div>
                            ) : (
                              // Остальные значения (имена игроков и т.д.)
                              displayValue
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Средние значения */}
      {Object.keys(averages).length > 0 && (
        <Card className="bg-vista-dark/70 border-vista-secondary/50 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
            <CardTitle className="text-vista-light text-lg font-medium">Средние значения</CardTitle>
              {comparisonLoading && (
                <div className="text-sm text-vista-light/50">Загрузка сравнения...</div>
              )}
            </div>
            {comparisonData?.currentTraining && (
              <div className="text-sm text-vista-light/70">
                Сравнение с тренировками категории &quot;{comparisonData.currentTraining.categoryName}&quot; за последние 30 дней
                {comparisonData.comparisonData && (
                  <span className="ml-2 text-vista-light/50">
                    ({comparisonData.comparisonData.totalTrainings} тренировок, {comparisonData.comparisonData.totalReports} отчетов)
                  </span>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {comparisonData?.message ? (
              <div className="text-center py-8 text-vista-light/70">
                {comparisonData.message}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(averages).map(([canonicalMetric, average]) => {
                const mapping = columnMappings.find(m => m.canonicalMetric === canonicalMetric);
                const stats = columnStats[mapping?.sourceColumn || ''];
                const isTime = typeof average === 'string' && average.includes(':');
                const comparison = typeof average === 'number' ? getComparisonValue(average, canonicalMetric) : null;
                  
                return (
                    <div key={canonicalMetric} className="text-center p-4 rounded-lg bg-vista-dark/30 border border-vista-secondary/30 min-h-[180px]">
                      {isTime ? (
                        // Время отображаем как раньше - только число
                        <div className="space-y-1">
                          <div className="text-vista-light font-semibold text-sm">
                            {mapping ? formatValue(average, mapping) : average}
                          </div>
                          {comparison && (
                            <div className="text-xs space-y-1">
                              <div className={`font-medium ${getComparisonColor(comparison)}`}>
                                {comparison.percentage > 0 ? '+' : ''}{comparison.percentage}%
                              </div>
                              <div className="text-vista-light/50">
                                vs {comparison.tagAverage}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : stats ? (
                        // Числовые значения с графиком
                        <div className="space-y-2">
                          <div className="relative">
                            <SemicircularGauge
                              value={typeof average === 'number' ? average : 0}
                              maxValue={stats.max}
                              minValue={stats.min}
                              color={stats.color}
                              percentageDiff={comparison?.percentage}
                              title={mapping?.customName}
                            />
                            {/* Средние значения под индикатором */}
                            <div className="flex justify-between items-center -mt-4">
                              <div className="text-vista-light text-sm">
                                {typeof average === 'number' ? Math.round(average) : average}
                              </div>
                              {comparison && (
                                <div className="text-vista-light/50 text-sm">
                                  {Math.round(comparison.tagAverage)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : typeof average === 'number' ? (
                        // Числовые значения без stats - создаем базовый спидометр
                        <div className="space-y-2">
                          <div className="relative">
                            <SemicircularGauge
                              value={average}
                              maxValue={Math.max(average, 1)} // Используем значение как максимум
                              minValue={0}
                              color="#5acce5"
                              percentageDiff={comparison?.percentage}
                              title={mapping?.customName}
                            />
                            {/* Средние значения под индикатором */}
                            <div className="flex justify-between items-center -mt-4">
                              <div className="text-vista-light text-sm">
                                {Math.round(average)}
                              </div>
                              {comparison && (
                                <div className="text-vista-light/50 text-sm">
                                  {Math.round(comparison.tagAverage)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                    <div className="text-vista-light font-semibold text-sm">
                            {average}
                          </div>
                          {comparison && (
                            <div className="text-xs space-y-1">
                              <div className={`font-medium ${getComparisonColor(comparison)}`}>
                                {comparison.percentage > 0 ? '+' : ''}{comparison.percentage}%
                              </div>
                              <div className="text-vista-light/50">
                                vs {comparison.tagAverage}
                              </div>
                            </div>
                          )}
                    </div>
                      )}
                  </div>
                );
              })}
            </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
