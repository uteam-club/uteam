'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Upload, FileText, Users, Calendar, Settings, Check, X as XIcon, Plus, ChevronLeft, ChevronRight, User, Star, Activity, MapPin, Clock, Search, Trash2 } from 'lucide-react';
import { GpsFileParser, ParsedGpsData } from '@/lib/gps-file-parser';
import { GpsDataValidator } from '@/lib/gps-validation';
import { GpsErrorHandler, GpsFileError } from '@/lib/gps-errors';
import { matchPlayers, getRecommendedMatch, PlayerMappingGroup, PlayerMatch } from '@/lib/player-name-matcher';
import { gpsLogger } from '@/lib/logger';


// Компоненты для новых иконок
const CircleStarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11.051 7.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.867l-1.156-1.152a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z"/>
    <circle cx="12" cy="12" r="10"/>
  </svg>
);

const TrafficConeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16.05 10.966a5 2.5 0 0 1-8.1 0"/>
    <path d="m16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04"/>
    <path d="M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z"/>
    <path d="M9.194 6.57a5 2.5 0 0 0 5.61 0"/>
  </svg>
);

// Компонент для выбора канонической метрики с поиском и группировкой
function MetricSelector({ 
  value, 
  onValueChange, 
  metrics, 
  columnMappings,
  placeholder = "Выберите метрику" 
}: {
  value: string;
  onValueChange: (value: string) => void;
  metrics: Array<{id: string, code: string, name: string, category: string, dimension: string, canonicalUnit: string, supportedUnits: string[]}>;
  columnMappings: Array<{id: string, isActive: boolean, canonicalMetricId: string}>;
  placeholder?: string;
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

  // Получаем уже выбранные метрики из всех колонок
  const selectedMetricIds = columnMappings
    .filter(col => col.isActive && col.canonicalMetricId)
    .map(col => col.canonicalMetricId);

  // Фильтруем метрики по поисковому запросу и исключаем уже выбранные
  const filteredMetrics = Object.entries(groupedMetrics).reduce((acc, [category, categoryMetrics]) => {
    const filtered = categoryMetrics.filter(metric => {
      const matchesSearch = metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           metric.code.toLowerCase().includes(searchQuery.toLowerCase());
      const notSelected = !selectedMetricIds.includes(metric.id);
      return matchesSearch && notSelected;
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
        className="bg-vista-dark/50 border border-vista-secondary/50 text-vista-light rounded-md px-3 py-2 cursor-pointer hover:border-vista-secondary/70 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={selectedMetric ? "text-vista-light" : "text-vista-light/50"}>
            {selectedMetric ? selectedMetric.name : placeholder}
          </span>
          <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-vista-dark border border-vista-secondary/50 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Поле поиска */}
          <div className="p-3 border-b border-vista-secondary/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vista-light/50" />
              <Input
                placeholder="Поиск метрики..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-vista-dark/50 border-vista-secondary/50 text-vista-light"
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

// Компонент для карточки сопоставления игрока
function PlayerMappingCard({ 
  filePlayerName, 
  groups, 
  players, 
  selectedPlayerId, 
  onPlayerSelect,
  similarity,
  matchLevel,
  selectedPlayerMappings
}: {
  filePlayerName: string;
  groups: PlayerMappingGroup;
  players: Array<{id: string, name: string, firstName: string, lastName: string}>;
  selectedPlayerId?: string;
  onPlayerSelect: (playerId: string) => void;
  similarity: number;
  matchLevel: 'manual' | 'high' | 'medium' | 'low' | 'none';
  selectedPlayerMappings: Record<string, string>;
}) {
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const recommendedMatch = getRecommendedMatch(filePlayerName, groups);
  
  // Определяем актуальный matchLevel на основе выбора пользователя
  const actualMatchLevel = selectedPlayerId === '' || selectedPlayerId === undefined ? 'none' : matchLevel;
  
  // Автоматически выбираем рекомендуемое сопоставление при первом рендере
  React.useEffect(() => {
    if (selectedPlayerId === undefined && recommendedMatch && recommendedMatch.matchLevel !== 'none') {
      onPlayerSelect(recommendedMatch.playerId);
    }
  }, [selectedPlayerId, recommendedMatch, onPlayerSelect]);

  const getSimilarityColor = (level: string) => {
    switch (level) {
      case 'manual': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'high': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'low': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'none': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Получаем уже выбранных игроков из других маппингов
  const selectedPlayerIds = Object.values(selectedPlayerMappings).filter(id => id && id !== selectedPlayerId && id !== 'no-mapping');
  
  return (
    <div className={`group flex items-center gap-3 p-2 border rounded-md transition-all duration-200 ${
      actualMatchLevel === 'none' 
        ? 'bg-vista-dark/25 border-vista-secondary/30 hover:bg-vista-dark/30 hover:border-vista-secondary/50' 
        : 'bg-vista-dark/30 border-vista-secondary/30'
    }`}>
      {/* Имя игрока из файла */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium transition-colors duration-200 truncate ${actualMatchLevel === 'none' ? 'text-vista-light/30 group-hover:text-vista-light' : 'text-vista-light'}`}>
          {filePlayerName}
        </div>
      </div>

      {/* Процент сходства или статус */}
      {actualMatchLevel !== 'none' && (
        <div className="flex items-center gap-1">
          <Badge className={`${getSimilarityColor(actualMatchLevel)} text-xs px-2 py-0.5`}>
            {similarity}%
          </Badge>
        </div>
      )}

      {/* Сопоставленное имя */}
      <div className="flex-1 min-w-0">
        <div className={`text-xs transition-colors duration-200 truncate ${actualMatchLevel === 'none' ? 'text-vista-light/30 group-hover:text-vista-light' : 'text-vista-light'}`}>
          {selectedPlayerId && selectedPlayerId !== 'no-mapping' && selectedPlayer ? selectedPlayer.name : 'Без привязки'}
        </div>
      </div>

      {/* Пикер выбора игрока */}
      <div className="flex-1 min-w-0">
        <Select
          value={selectedPlayerId === '' ? 'no-mapping' : (selectedPlayerId || 'no-mapping')}
          onValueChange={onPlayerSelect}
        >
          <SelectTrigger className={`h-8 text-xs shadow-sm border-vista-secondary/50 focus:outline-none focus:ring-0 transition-all duration-200 ${
            actualMatchLevel === 'none' 
              ? 'bg-vista-dark/50 border-vista-secondary/40 text-vista-light/30 group-hover:bg-vista-dark/70 group-hover:border-vista-secondary/50 group-hover:text-vista-light' 
              : 'bg-vista-dark/70 border-vista-secondary/50 text-vista-light'
          }`}>
            <SelectValue placeholder="Без привязки" />
          </SelectTrigger>
          <SelectContent className="bg-vista-dark border-vista-light/20 text-vista-light shadow-2xl rounded-lg custom-scrollbar max-h-60">
            <SelectItem 
              value="no-mapping" 
              className="text-vista-light/70 hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary"
            >
              Без привязки
            </SelectItem>
            {players
              .filter(player => !selectedPlayerIds.includes(player.id)) // Исключаем уже выбранных игроков
              .map(player => (
                <SelectItem 
                  key={player.id} 
                  value={player.id} 
                  className="text-vista-light hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary"
                >
                  {player.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface NewGpsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ColumnMapping {
  id: string;
  originalName: string;
  sourceUnit: string;
  canonicalMetricId: string;
  canonicalMetricName: string;
  canonicalMetricCode: string;
  isActive: boolean;
}

export function NewGpsReportModal({ isOpen, onClose, onSuccess }: NewGpsReportModalProps) {
  const [step, setStep] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [teams, setTeams] = useState<Array<{id: string, name: string}>>([]);
  const [events, setEvents] = useState<Array<{
    id: string, 
    name: string, 
    type: string, 
    date: string, 
    time?: string, 
    categoryName?: string,
    // Поля для матчей
    isHome?: boolean,
    opponentName?: string,
    teamGoals?: number,
    opponentGoals?: number,
    teamName?: string
  }>>([]);
  const [canonicalMetrics, setCanonicalMetrics] = useState<Array<{id: string, code: string, name: string, category: string, dimension: string, canonicalUnit: string, supportedUnits: string[]}>>([]);
  const [units, setUnits] = useState<Array<{id: string, code: string, name: string, dimension: string, conversionFactor: number}>>([]);
  const [players, setPlayers] = useState<Array<{id: string, name: string, firstName: string, lastName: string}>>([]);
  const [playerMappings, setPlayerMappings] = useState<Record<string, PlayerMappingGroup>>({});
  const [selectedPlayerMappings, setSelectedPlayerMappings] = useState<Record<string, string>>({});
  const [manualPlayerMappings, setManualPlayerMappings] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ParsedGpsData | null>(null);
  const [parsingError, setParsingError] = useState<string | null>(null);

  const getSteps = () => [
    { title: 'Выбор команды', description: 'Выберите команду для загрузки GPS отчета' },
    { title: 'Тип события', description: 'Выберите тип события' },
    { 
      title: selectedEventType === 'match' ? 'Выбор матча' : 'Выбор тренировки', 
      description: selectedEventType === 'match' ? 'Выберите матч для привязки GPS отчета' : 'Выберите тренировку для привязки GPS отчета' 
    },
    { title: 'Загрузка файла', description: 'Загрузите GPS файл для привязки к событию' },
    { title: 'Маппинг колонок', description: 'Настройте маппинг колонок для корректной обработки данных' },
    { title: 'Маппинг игроков', description: 'Настройте маппинг игроков для корректной обработки данных' }
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFile(file);
    setParsingError(null);
    setLoading(true);

    try {
      // Парсим файл
      const parsed = await GpsFileParser.parseFile(file);
      
      // Проверяем валидацию - только критические ошибки блокируют загрузку
      if (parsed.validation && !parsed.validation.isValid) {
        const errorMessage = GpsDataValidator.formatErrors(parsed.validation.errors);
        setParsingError(`Ошибки в файле:\n\n${errorMessage}\n\nИсправьте файл и загрузите снова.`);
        setLoading(false);
        return;
      }

      // Показываем предупреждения, но не блокируем загрузку
      if (parsed.validation && parsed.validation.warnings.length > 0) {
        const warningMessage = GpsDataValidator.formatWarnings(parsed.validation.warnings);
        gpsLogger.warn('NewGpsReportModal', 'Предупреждения валидации (не блокируют загрузку):', warningMessage);
        // Показываем toast с предупреждениями, но продолжаем
      }

      setParsedData(parsed);

      // Анализируем колонки
      const columnInfos = GpsFileParser.analyzeColumns(parsed.headers, parsed.rows);
      
      // Получаем предложения для маппинга
      const suggestions = GpsFileParser.suggestColumnMappings(columnInfos);

      // Загружаем сохраненные маппинги для команды
      let savedMappings: any[] = [];
      try {
        const mappingsResponse = await fetch(`/api/gps/column-mappings?teamId=${selectedTeam}`);
        if (mappingsResponse.ok) {
          const mappingsData = await mappingsResponse.json();
          savedMappings = mappingsData.mappings || [];
        } else {
        }
      } catch (error) {
        gpsLogger.error('NewGpsReportModal', 'Error loading saved mappings:', error);
      }

      // Создаем маппинги колонок с использованием сохраненных данных
      const mappings = parsed.headers.map((header, index) => {
        // Ищем сохраненный маппинг для этой колонки
        const savedMapping = savedMappings.find(m => m.sourceColumn === header);
        
        if (savedMapping && savedMapping.canonicalMetric && savedMapping.canonicalMetric.trim() !== '') {
          // Используем сохраненный маппинг только если есть каноническая метрика
          
          // Находим метрику по коду из сохраненного маппинга
          const metric = canonicalMetrics.find(m => m.code === savedMapping.canonicalMetric);
          
          return {
            id: `col_${index}`,
            originalName: header,
            sourceUnit: savedMapping.sourceUnit || '',
            canonicalMetricId: metric?.id || '',
            canonicalMetricName: metric?.name || '',
            canonicalMetricCode: metric?.code || '',
            isActive: savedMapping.isVisible !== false,
            displayOrder: savedMapping.displayOrder || index,
          };
        } else {
          // Если нет сохраненного маппинга, используем автоматическое определение
          const suggestion = suggestions.find(s => s.columnName === header);
          
          // Находим подходящую каноническую метрику
          let suggestedMetric = '';
          let suggestedUnit = '';
          
          if (suggestion) {
            // Ищем метрику по коду или названию
            const metric = canonicalMetrics.find(m => 
              m.code === suggestion.suggestedMetric || 
              m.name.toLowerCase().includes(suggestion.suggestedMetric.toLowerCase())
            );
            
            
            if (metric) {
              suggestedMetric = metric.id;
              suggestedUnit = suggestion.suggestedUnit || metric.canonicalUnit;
            }
          }
          
          const metric = suggestedMetric ? canonicalMetrics.find(m => m.id === suggestedMetric) : null;
          return {
            id: `col_${index}`,
            originalName: header,
            sourceUnit: suggestedUnit,
            canonicalMetricId: suggestedMetric,
            canonicalMetricName: metric?.name || '',
            canonicalMetricCode: metric?.code || '',
            isActive: !!suggestedMetric, // Активируем колонку, если есть предложенная метрика
            displayOrder: index,
          };
        }
      });

      // Сортируем маппинги по displayOrder
      const sortedMappings = mappings.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      
      setColumnMappings(sortedMappings);


      // Отладка: проверяем, что извлечено
      console.log('🔍 Отладка маппинга игроков:');
      console.log('📊 Всего строк в файле:', parsed.rows.length);
      console.log('👥 Извлечено имен игроков:', parsed.playerNames.length);
      console.log('📝 Имена игроков:', parsed.playerNames);
      
      // Проверяем, есть ли "SUM" в извлеченных именах
      const hasSum = parsed.playerNames.includes('SUM');
      const hasAverage = parsed.playerNames.includes('Average');
      console.log('🔍 Есть ли "SUM" в именах:', hasSum);
      console.log('🔍 Есть ли "Average" в именах:', hasAverage);

      // Создаем умные маппинги игроков
      if (players.length > 0) {
        const playerMatches = matchPlayers(parsed.playerNames, players);
        console.log('🔍 playerMatches после matchPlayers:', playerMatches);
        console.log('🔍 Ключи playerMatches:', Object.keys(playerMatches));
        console.log('🔍 Есть ли "SUM" в playerMatches:', 'SUM' in playerMatches);
        console.log('🔍 Есть ли "Average" в playerMatches:', 'Average' in playerMatches);
        setPlayerMappings(playerMatches);
        
        // Автоматически выбираем рекомендуемые сопоставления
        const autoMappings: Record<string, string> = {};
        parsed.playerNames.forEach(playerName => {
          const recommended = getRecommendedMatch(playerName, playerMatches[playerName]);
          if (recommended && recommended.matchLevel !== 'none') {
            autoMappings[playerName] = recommended.playerId;
          } else {
            // Если нет рекомендации, устанавливаем "Без привязки" (пустая строка)
            autoMappings[playerName] = '';
          }
        });
        console.log('🔍 autoMappings после создания:', autoMappings);
        console.log('🔍 Ключи autoMappings:', Object.keys(autoMappings));
        console.log('🔍 Есть ли "SUM" в autoMappings:', 'SUM' in autoMappings);
        console.log('🔍 Есть ли "Average" в autoMappings:', 'Average' in autoMappings);
        setSelectedPlayerMappings(autoMappings);
      } else {
        // Если игроки не загружены, создаем пустые маппинги
        const emptyMappings: Record<string, PlayerMappingGroup> = {};
        const emptyPlayerMappings: Record<string, string> = {};
        parsed.playerNames.forEach(playerName => {
          emptyMappings[playerName] = {
            high: [],
            medium: [],
            low: [],
            none: [{ playerId: '', playerName: playerName, similarity: 0, matchLevel: 'none' }]
          };
          // Устанавливаем "Без привязки" для всех игроков
          emptyPlayerMappings[playerName] = '';
        });
        setPlayerMappings(emptyMappings);
        setSelectedPlayerMappings(emptyPlayerMappings);
      }

    } catch (error) {
      gpsLogger.error('Component', 'Error parsing file:', error);
      
      if (error instanceof GpsFileError) {
        setParsingError(error.message);
      } else {
        setParsingError(GpsErrorHandler.handleError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileRemove = () => {
    setFile(null);
    setParsedData(null);
    setParsingError(null);
    setColumnMappings([]);
    setPlayerMappings({});
    setSelectedPlayerMappings({});
    // Очищаем input файла
    const fileInput = document.getElementById('gps-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleColumnMappingChange = (id: string, field: keyof ColumnMapping, value: string | boolean) => {
    setColumnMappings(prev => prev.map(col => {
      if (col.id === id) {
        const updated = { ...col, [field]: value };
        if (field === 'canonicalMetricId') {
          const metric = canonicalMetrics.find(m => m.id === value);
          updated.canonicalMetricName = metric?.name || '';
          updated.canonicalMetricCode = metric?.code || '';
          updated.isActive = !!value;
          // Устанавливаем каноническую единицу по умолчанию
          updated.sourceUnit = metric?.canonicalUnit || '';
        } else if (field === 'isActive') {
          // При отключении активности сбрасываем метрику и единицу
          if (!value) {
            updated.canonicalMetricId = '';
            updated.canonicalMetricName = '';
            updated.canonicalMetricCode = '';
            updated.sourceUnit = '';
          }
        }
        return updated;
      }
      return col;
    }));
  };

  // Получаем поддерживаемые единицы для метрики
  const getSupportedUnits = (metricId: string) => {
    const metric = canonicalMetrics.find(m => m.id === metricId);
    if (!metric || !Array.isArray(units)) return [];
    
    return units.filter(unit => 
      metric.supportedUnits.includes(unit.code) && 
      unit.dimension === metric.dimension
    );
  };

  // Валидация маппинга колонок
  const isColumnMappingValid = () => {
    const activeColumns = columnMappings.filter(c => c.isActive);
    return activeColumns.every(column => 
      column.canonicalMetricId && column.sourceUnit
    );
  };

  // Валидация маппинга игроков
  const isPlayerMappingValid = () => {
    // Проверяем, что все игроки из файла имеют маппинг (включая "Без привязки")
    const filePlayerNames = Object.keys(playerMappings);
    return filePlayerNames.every(name => 
      selectedPlayerMappings.hasOwnProperty(name) && 
      selectedPlayerMappings[name] !== undefined
    );
  };

  // Функция для применения автоматического маппинга
  const handleAutoMapping = () => {
    if (players.length === 0) return;
    
    const autoMappings: Record<string, string> = {};
    const filePlayerNames = Object.keys(playerMappings);
    
    filePlayerNames.forEach(playerName => {
      const recommended = getRecommendedMatch(playerName, playerMappings[playerName]);
      if (recommended && recommended.matchLevel !== 'none') {
        autoMappings[playerName] = recommended.playerId;
      } else {
        // Если нет рекомендации, устанавливаем "Без привязки"
        autoMappings[playerName] = '';
      }
    });
    
    setSelectedPlayerMappings(autoMappings);
    setManualPlayerMappings(new Set()); // Сбрасываем ручные маппинги
  };

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedTeam('');
    setSelectedEventType('');
    setSelectedEvent('');
    setFile(null);
    setParsedData(null);
    setColumnMappings([]);
    setPlayerMappings({});
    setSelectedPlayerMappings({});
    setParsingError(null);
    setLoading(false);
    setDataLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Загрузка данных при открытии модала
  React.useEffect(() => {
    if (isOpen) {
      // Сбрасываем состояние при открытии модального окна
      resetForm();
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      // Загружаем команды
      const teamsResponse = await fetch('/api/gps/teams');
      const teamsData = await teamsResponse.json();
      setTeams(teamsData.teams || []);

      // Загружаем канонические метрики и единицы
      const [metricsResponse, unitsResponse] = await Promise.all([
        fetch('/api/gps/canonical-metrics-all'),
        fetch('/api/gps/units')
      ]);
      const metricsData = await metricsResponse.json();
      const unitsData = await unitsResponse.json();
      setCanonicalMetrics(metricsData.metrics || []);
      setUnits(unitsData.units || []);

      // Игроки будут загружены при выборе команды
    } catch (error) {
      gpsLogger.error('Component', 'Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // Загрузка событий при изменении команды и типа события
  React.useEffect(() => {
    if (selectedTeam && selectedEventType) {
      fetchEvents(selectedTeam, selectedEventType);
    }
  }, [selectedTeam, selectedEventType]);

  // Загрузка игроков при выборе команды
  React.useEffect(() => {
    if (selectedTeam) {
      fetchPlayers(selectedTeam);
    }
  }, [selectedTeam]);

  const fetchEvents = async (teamId: string, eventType: string) => {
    try {
      const response = await fetch(`/api/gps/events?teamId=${teamId}&eventType=${eventType}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      gpsLogger.error('Component', 'Error fetching events:', error);
    }
  };

  const fetchPlayers = async (teamId: string) => {
    try {
      const response = await fetch(`/api/players?teamId=${teamId}`);
      const data = await response.json();
      setPlayers(data.players || []);
    } catch (error) {
      gpsLogger.error('Component', 'Error fetching players:', error);
    }
  };

  const handleSubmit = async () => {
    if (!file || !parsedData) {
      gpsLogger.error('Component', 'Missing file or parsed data');
      return;
    }

    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('teamId', selectedTeam);
      formData.append('eventType', selectedEventType);
      formData.append('eventId', selectedEvent);
      formData.append('gpsSystem', 'auto-detect'); // Автоматическое определение системы
      
      // Получаем профиль для команды
      const profileResponse = await fetch(`/api/gps/profiles?teamId=${selectedTeam}`);
      const profileData = await profileResponse.json();
      const profileId = profileData.profile?.id || null;
      formData.append('profileId', profileId);
      formData.append('file', file!);
      formData.append('parsedData', JSON.stringify(parsedData));
      // Фильтруем только активные колонки с выбранными метриками
      const activeColumnMappings = columnMappings.filter(mapping => 
        mapping.isActive && 
        mapping.canonicalMetricId && 
        mapping.canonicalMetricId.trim() !== '' &&
        mapping.canonicalMetricCode &&
        mapping.canonicalMetricCode.trim() !== ''
      );
      formData.append('columnMappings', JSON.stringify(activeColumnMappings));
      // Преобразуем selectedPlayerMappings в массив для API
      const playerMappingsArray = Object.entries(selectedPlayerMappings).map(([filePlayerName, playerId]) => ({
        filePlayerName,
        playerId,
        similarity: playerId ? 'high' : 'none' // Исправлено: 'none' вместо 'not_found'
      }));
      formData.append('playerMappings', JSON.stringify(playerMappingsArray));

      
                // Добавляем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 30000); // 30 секунд таймаут
      
      // Создаем XMLHttpRequest для отслеживания прогресса
      const xhr = new XMLHttpRequest();
      
      // Отслеживаем прогресс загрузки
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });
      
      // Обрабатываем ответ
      const response = await new Promise<Response>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers({
                'content-type': xhr.getResponseHeader('content-type') || 'application/json'
              })
            }));
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Request timeout'));
        
        xhr.open('POST', '/api/gps/reports');
        xhr.send(formData);
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.success) {
        // Сохраняем маппинги для будущего использования
        try {
          await fetch('/api/gps/column-mappings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              teamId: selectedTeam,
              mappings: activeColumnMappings.map(mapping => ({
                originalName: mapping.originalName,
                displayName: mapping.originalName,
                canonicalMetricId: mapping.canonicalMetricId,
                canonicalMetricName: mapping.canonicalMetricName,
                canonicalMetricCode: canonicalMetrics.find(m => m.id === mapping.canonicalMetricId)?.code || '',
                sourceUnit: mapping.sourceUnit,
                displayOrder: 0,
                isActive: mapping.isActive,
              })),
            }),
          });
        } catch (error) {
          gpsLogger.error('Component', 'Error saving mappings:', error);
          // Не показываем ошибку пользователю, так как это не критично
        }

        setUploadProgress(0);
        onSuccess?.();
        onClose();
      } else {
        gpsLogger.error('Component', 'Error creating report:', data.error);
        alert(`Ошибка при создании отчета: ${data.error}`);
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error submitting GPS report:', error);
      setUploadProgress(0);
      
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Время ожидания истекло (30 секунд). Обработка файла заняла слишком много времени. Попробуйте еще раз или обратитесь к администратору.');
      } else {
        alert(`Произошла ошибка при создании отчета: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
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
            <h2 className="text-xl font-semibold text-vista-light">{getSteps()[step - 1].title}</h2>
            <p className="text-sm text-vista-light/70 mt-1">
              {getSteps()[step - 1].description}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-vista-light/70 hover:text-vista-light">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Индикатор прогресса */}
        <div className="px-6 py-4 border-b border-vista-secondary/30">
          <div className="flex items-center justify-between">
            {getSteps().map((_, index) => (
              <React.Fragment key={index}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index + 1 <= step 
                    ? 'bg-vista-primary text-vista-dark' 
                    : 'bg-vista-dark/50 text-vista-light/50'
                }`}>
                  {index + 1}
                </div>
                {index < getSteps().length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
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
              {/* Шаг 1: Выбор команды */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams.map(team => (
                      <div
                        key={team.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedTeam === team.id
                            ? 'border-vista-primary bg-vista-primary/10'
                            : 'border-vista-secondary/30 bg-vista-dark/30 hover:border-vista-secondary/50'
                        }`}
                        onClick={() => setSelectedTeam(team.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-vista-primary/20 flex items-center justify-center">
                            <Users className="h-5 w-5 text-vista-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium text-vista-light">{team.name}</h3>
                            <p className="text-sm text-vista-light/70">Команда</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Шаг 2: Тип события */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-6 border rounded-lg cursor-pointer transition-colors ${
                        selectedEventType === 'training'
                          ? 'border-vista-primary bg-vista-primary/10'
                          : 'border-vista-secondary/30 bg-vista-dark/30 hover:border-vista-secondary/50'
                      }`}
                      onClick={() => setSelectedEventType('training')}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-vista-primary/20 flex items-center justify-center">
                          <TrafficConeIcon className="h-6 w-6 text-vista-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-vista-light">Тренировка</h3>
                          <p className="text-sm text-vista-light/70">Тренировочное занятие</p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-6 border rounded-lg cursor-pointer transition-colors ${
                        selectedEventType === 'match'
                          ? 'border-vista-primary bg-vista-primary/10'
                          : 'border-vista-secondary/30 bg-vista-dark/30 hover:border-vista-secondary/50'
                      }`}
                      onClick={() => setSelectedEventType('match')}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-vista-primary/20 flex items-center justify-center">
                          <CircleStarIcon className="h-6 w-6 text-vista-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-vista-light">Матч</h3>
                          <p className="text-sm text-vista-light/70">Игровой матч</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Шаг 3: Выбор тренировки/матча */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {events.map(event => {
                      // Определяем тип события и цвет бейджа
                      const isGym = event.type === 'GYM';
                      const isMatch = event.type === 'match';
                      const eventTypeLabel = isGym ? 'Тренажерный зал' : (isMatch ? 'Матч' : 'Тренировка');
                      const eventTypeColor = isGym ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 
                                           (isMatch ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-vista-primary/20 text-vista-primary border-vista-primary/30');
                      
                      // Форматируем дату в формат DD.MM.YY
                      const formatDate = (dateStr: string) => {
                        const date = new Date(dateStr);
                        const day = date.getDate().toString().padStart(2, '0');
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const year = date.getFullYear().toString().slice(-2);
                        return `${day}.${month}.${year}`;
                      };

                      // Для матчей формируем специальное отображение
                      const renderMatchInfo = () => {
                        if (!isMatch) return null;
                        
                        const homeTeam = event.isHome ? event.teamName : event.opponentName;
                        const awayTeam = event.isHome ? event.opponentName : event.teamName;
                        const homeGoals = event.isHome ? event.teamGoals : event.opponentGoals;
                        const awayGoals = event.isHome ? event.opponentGoals : event.teamGoals;
                        
                        
                        return (
                          <div className="space-y-2">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-vista-light">
                                {homeTeam} {` ${homeGoals ?? 0} - ${awayGoals ?? 0} `} {awayTeam}
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-4 text-sm text-vista-light/70">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(event.date)}
                              </span>
                              {event.time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {event.time}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div
                          key={event.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedEvent === event.id
                              ? 'border-vista-primary bg-vista-primary/10'
                              : 'border-vista-secondary/30 bg-vista-dark/30 hover:border-vista-secondary/50'
                          }`}
                          onClick={() => setSelectedEvent(event.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {isMatch ? (
                                renderMatchInfo()
                              ) : (
                                <div>
                                  <h3 className="font-medium text-vista-light">{event.name}</h3>
                                  <div className="flex items-center gap-4 text-sm text-vista-light/70">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(event.date)}
                                    </span>
                                    {event.time && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {event.time}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <Badge className={`${eventTypeColor} text-xs`}>
                                {eventTypeLabel}
                              </Badge>
                              {!isMatch && (
                                <Badge className="bg-vista-dark/50 text-vista-light/70 border-vista-secondary/30 text-xs w-fit">
                                  {event.categoryName || 'Без категории'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Шаг 4: Загрузка файла */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-vista-light/70 font-normal">GPS файл *</Label>
                    <div className="bg-vista-dark/30 border border-vista-secondary/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Upload className="h-5 w-5 text-vista-primary" />
                          <div>
                            <p className="text-vista-light font-medium">Выберите GPS файл</p>
                            <p className="text-sm text-vista-light/70">
                              CSV, Excel файлы (до 5МВ)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-vista-light/70">
                            {file ? file.name : 'Файл не выбран'}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('gps-file-input')?.click()}
                            className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-8 px-3 text-sm"
                            disabled={loading}
                          >
                            Выбрать файл
                          </Button>
                        </div>
                      </div>
                      <Input
                        id="gps-file-input"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-vista-primary"></div>
                        <span className="text-vista-light">Парсинг файла...</span>
                      </div>
                    </div>
                  )}

                  {parsingError && (
                    <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-300">
                          <X className="h-5 w-5" />
                          <span className="font-medium">Ошибка парсинга файла</span>
                        </div>
                        {file && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleFileRemove}
                            className="bg-transparent border border-red-500/50 text-red-300 hover:bg-red-500/20 h-8 px-3 text-sm"
                            title="Удалить файл"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Удалить файл
                          </Button>
                        )}
                      </div>
                      <p className="text-red-300 mt-2">{parsingError}</p>
                    </div>
                  )}

                  {file && parsedData && !loading && !parsingError && (
                    <div className="p-3 border border-vista-primary/30 rounded-lg bg-vista-primary/5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-vista-primary" />
                        <span className="text-sm font-medium text-vista-light">{file.name}</span>
                        <span className="text-xs text-vista-light/70 ml-auto">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleFileRemove}
                          className="bg-transparent border border-red-500/50 text-red-300 hover:bg-red-500/20 h-7 px-2 text-xs ml-2"
                          title="Удалить файл"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Шаг 5: Маппинг колонок */}
              {step === 5 && (
                <div className="space-y-6">
                  <div className="p-4 bg-vista-primary/10 border border-vista-primary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-vista-primary" />
                      <div>
                        <h3 className="font-medium text-vista-light">Сопоставление колонок</h3>
                        <p className="text-sm text-vista-light/70">
                          Строки с пунктом «Без привязки» не попадут в отчёты. В поле &quot;Исходная единица&quot; выберите ту же единицу измерения, что используется в GPS файле.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {columnMappings.map((column) => (
                      <div key={column.id} className={`p-4 border rounded-lg transition-colors ${
                        column.isActive 
                          ? 'border-vista-secondary/30 bg-vista-dark/30' 
                          : 'border-vista-secondary/20 bg-vista-dark/20 opacity-60'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-vista-light">{column.originalName}</h4>
                            <Badge 
                              variant={column.isActive ? "default" : "outline"} 
                              className={`text-xs ${
                                column.isActive 
                                  ? 'bg-vista-primary/20 text-vista-primary border-vista-primary/30' 
                                  : 'bg-vista-dark/50 text-vista-light/80 border-vista-secondary/40'
                              }`}
                            >
                              {column.isActive ? 'Активна' : 'Неактивна'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${column.id}`} className="text-sm text-vista-light/70">
                              Включить колонку
                            </Label>
                            <Switch
                              id={`active-${column.id}`}
                              checked={column.isActive}
                              onCheckedChange={(checked) => handleColumnMappingChange(column.id, 'isActive', checked)}
                            />
                          </div>
                        </div>
                        
                        {column.isActive && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className={`text-xs font-normal mb-2 block ${
                                column.isActive && !column.canonicalMetricId 
                                  ? 'text-red-400' 
                                  : 'text-vista-light/70'
                              }`}>
                                Каноническая метрика {column.isActive && !column.canonicalMetricId && '*'}
                              </Label>
                              <MetricSelector
                                value={column.canonicalMetricId}
                                onValueChange={(value) => {
                                  const metric = canonicalMetrics.find(m => m.id === value);
                                  handleColumnMappingChange(column.id, 'canonicalMetricId', value);
                                  if (metric) {
                                    handleColumnMappingChange(column.id, 'canonicalMetricCode', metric.code);
                                    handleColumnMappingChange(column.id, 'canonicalMetricName', metric.name);
                                    handleColumnMappingChange(column.id, 'sourceUnit', metric.canonicalUnit);
                                  }
                                }}
                                metrics={canonicalMetrics}
                                columnMappings={columnMappings}
                                placeholder="Выберите метрику"
                              />
                            </div>

                            <div>
                              <Label className={`text-xs font-normal mb-2 block ${
                                column.isActive && !column.sourceUnit 
                                  ? 'text-red-400' 
                                  : 'text-vista-light/70'
                              }`}>
                                Исходная единица {column.isActive && !column.sourceUnit && '*'}
                              </Label>
                              <Select 
                                value={column.sourceUnit} 
                                onValueChange={(value) => handleColumnMappingChange(column.id, 'sourceUnit', value)}
                                disabled={!column.canonicalMetricId}
                              >
                                <SelectTrigger className={`shadow-sm text-vista-light focus:outline-none focus:ring-0 ${
                                  column.isActive && !column.sourceUnit
                                    ? 'bg-vista-dark/70 border-red-500/50'
                                    : 'bg-vista-dark/70 border-vista-secondary/50'
                                }`}>
                                  <SelectValue placeholder={column.canonicalMetricId ? "Выберите единицу" : "Сначала выберите метрику"} />
                                </SelectTrigger>
                                <SelectContent className="bg-vista-dark border-vista-light/20 text-vista-light shadow-2xl rounded-lg custom-scrollbar max-h-60">
                                  {getSupportedUnits(column.canonicalMetricId).map(unit => (
                                    <SelectItem key={unit.id} value={unit.code} className="text-vista-light hover:bg-vista-primary/20 hover:text-vista-primary data-[state=checked]:bg-vista-primary/30 data-[state=checked]:text-vista-primary data-[highlighted]:bg-vista-primary/20 data-[highlighted]:text-vista-primary">
                                      {unit.name} ({unit.code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Шаг 6: Маппинг игроков */}
              {step === 6 && (
                <div className="space-y-4">
                  <div className="p-3 bg-vista-primary/10 border border-vista-primary/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-vista-primary" />
                      <div>
                        <h3 className="text-sm font-medium text-vista-light">Сопоставление игроков</h3>
                        <p className="text-xs text-vista-light/70">
                          Всего игроков: {Object.keys(playerMappings).length}, с маппингом: {Object.values(selectedPlayerMappings).filter(id => id && id !== '').length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Кнопка автомаппинга */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleAutoMapping}
                      variant="outline"
                      size="sm"
                      className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-7 px-2 text-xs font-normal"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Автомаппинг
                    </Button>
                    <div className="text-xs text-vista-light/60">
                      Применить автоматическое сопоставление
                    </div>
                  </div>

                  {/* Группировка по уровням сходства и выбору пользователя */}
                  {(() => {
                    const groupedPlayers = {
                      manual: [] as Array<{filePlayerName: string, groups: PlayerMappingGroup, similarity: number}>,
                      high: [] as Array<{filePlayerName: string, groups: PlayerMappingGroup, similarity: number}>,
                      medium: [] as Array<{filePlayerName: string, groups: PlayerMappingGroup, similarity: number}>,
                      low: [] as Array<{filePlayerName: string, groups: PlayerMappingGroup, similarity: number}>,
                      none: [] as Array<{filePlayerName: string, groups: PlayerMappingGroup, similarity: number}>
                    };

                    console.log('🔍 Начинаем группировку игроков...');
                    console.log('🔍 playerMappings:', playerMappings);
                    console.log('🔍 selectedPlayerMappings:', selectedPlayerMappings);
                    
                    Object.entries(playerMappings).forEach(([filePlayerName, groups]) => {
                      const selectedPlayerId = selectedPlayerMappings[filePlayerName];
                      
                      console.log(`🔍 Обрабатываем игрока: ${filePlayerName}`);
                      console.log(`🔍 selectedPlayerId: ${selectedPlayerId}`);
                      console.log(`🔍 groups:`, groups);
                      
                      // Если пользователь выбрал "Без привязки" (пустая строка), перемещаем в группу "none"
                      if (selectedPlayerId === '' || selectedPlayerId === undefined) {
                        console.log(`🔍 ${filePlayerName} -> группа "none" (пустая строка)`);
                        groupedPlayers.none.push({ filePlayerName, groups, similarity: 0 });
                      } 
                      // Если игрок был выбран вручную (не автоматически), помещаем в группу "manual"
                      else if (manualPlayerMappings.has(filePlayerName)) {
                        console.log(`🔍 ${filePlayerName} -> группа "manual" (ручной выбор)`);
                        groupedPlayers.manual.push({ filePlayerName, groups, similarity: 100 });
                      } 
                      // Остальные игроки группируются по сходству
                      else if (groups.high.length > 0) {
                        console.log(`🔍 ${filePlayerName} -> группа "high" (высокое сходство)`);
                        groupedPlayers.high.push({ filePlayerName, groups, similarity: 88 });
                      } else if (groups.medium.length > 0) {
                        console.log(`🔍 ${filePlayerName} -> группа "medium" (среднее сходство)`);
                        groupedPlayers.medium.push({ filePlayerName, groups, similarity: 67 });
                      } else if (groups.low.length > 0) {
                        console.log(`🔍 ${filePlayerName} -> группа "low" (низкое сходство)`);
                        groupedPlayers.low.push({ filePlayerName, groups, similarity: 50 });
                      } else {
                        console.log(`🔍 ${filePlayerName} -> группа "none" (нет сходства)`);
                        groupedPlayers.none.push({ filePlayerName, groups, similarity: 0 });
                      }
                    });
                    
                    console.log('🔍 Результат группировки:');
                    console.log('🔍 manual:', groupedPlayers.manual.length);
                    console.log('🔍 high:', groupedPlayers.high.length);
                    console.log('🔍 medium:', groupedPlayers.medium.length);
                    console.log('🔍 low:', groupedPlayers.low.length);
                    console.log('🔍 none:', groupedPlayers.none.length);
                    console.log('🔍 Игроки в группе "none":', groupedPlayers.none.map(p => p.filePlayerName));

                    return (
                      <div className="space-y-4">
                        {/* Ручная привязка */}
                        {groupedPlayers.manual.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2 p-2 bg-blue-500/20 rounded-md">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <h4 className="text-sm font-semibold text-blue-300">
                                Ручная привязка ({groupedPlayers.manual.length})
                              </h4>
                            </div>
                            <div className="space-y-1">
                              {groupedPlayers.manual.map(({ filePlayerName, groups, similarity }) => {
                                const selectedPlayerId = selectedPlayerMappings[filePlayerName];
                                const actualMatchLevel = selectedPlayerId === '' || selectedPlayerId === undefined ? 'none' : 'manual';
                                return (
                                  <PlayerMappingCard
                                    key={filePlayerName}
                                    filePlayerName={filePlayerName}
                                    groups={groups}
                                    players={players}
                                    selectedPlayerId={selectedPlayerId}
                                    onPlayerSelect={(playerId) => {
                                      setSelectedPlayerMappings(prev => ({
                                        ...prev,
                                        [filePlayerName]: playerId === 'no-mapping' ? '' : playerId
                                      }));
                                      // Если выбрали конкретного игрока, добавляем в ручные выборы
                                      if (playerId !== 'no-mapping') {
                                        setManualPlayerMappings(prev => new Set([...prev, filePlayerName]));
                                      } else {
                                        // Если выбрали "Без привязки", убираем из ручных выборов
                                        setManualPlayerMappings(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(filePlayerName);
                                          return newSet;
                                        });
                                      }
                                    }}
                                    similarity={similarity}
                                    matchLevel={actualMatchLevel}
                                    selectedPlayerMappings={selectedPlayerMappings}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Высокое сходство */}
                        {groupedPlayers.high.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2 p-2 bg-green-500/20 rounded-md">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <h4 className="text-sm font-semibold text-green-300">
                                Высокое сходство (88-100%) ({groupedPlayers.high.length})
                              </h4>
                            </div>
                            <div className="space-y-1">
                              {groupedPlayers.high.map(({ filePlayerName, groups, similarity }) => {
                                const selectedPlayerId = selectedPlayerMappings[filePlayerName];
                                const actualMatchLevel = selectedPlayerId === '' || selectedPlayerId === undefined ? 'none' : 'high';
                                return (
                                  <PlayerMappingCard
                                    key={filePlayerName}
                                    filePlayerName={filePlayerName}
                                    groups={groups}
                                    players={players}
                                    selectedPlayerId={selectedPlayerId}
                                  onPlayerSelect={(playerId) => {
                                    setSelectedPlayerMappings(prev => ({
                                      ...prev,
                                      [filePlayerName]: playerId === 'no-mapping' ? '' : playerId
                                    }));
                                    // Если выбрали конкретного игрока, добавляем в ручные выборы
                                    if (playerId !== 'no-mapping') {
                                      setManualPlayerMappings(prev => new Set([...prev, filePlayerName]));
                                    } else {
                                      // Если выбрали "Без привязки", убираем из ручных выборов
                                      setManualPlayerMappings(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(filePlayerName);
                                        return newSet;
                                      });
                                    }
                                  }}
                                    similarity={similarity}
                                    matchLevel={actualMatchLevel}
                                    selectedPlayerMappings={selectedPlayerMappings}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Среднее сходство */}
                        {groupedPlayers.medium.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2 p-2 bg-yellow-500/20 rounded-md">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <h4 className="text-sm font-semibold text-yellow-300">
                                Среднее сходство (70-87%) ({groupedPlayers.medium.length})
                              </h4>
                            </div>
                            <div className="space-y-1">
                              {groupedPlayers.medium.map(({ filePlayerName, groups, similarity }) => {
                                const selectedPlayerId = selectedPlayerMappings[filePlayerName];
                                const actualMatchLevel = selectedPlayerId === '' || selectedPlayerId === undefined ? 'none' : 'medium';
                                return (
                                  <PlayerMappingCard
                                    key={filePlayerName}
                                    filePlayerName={filePlayerName}
                                    groups={groups}
                                    players={players}
                                    selectedPlayerId={selectedPlayerId}
                                    onPlayerSelect={(playerId) => {
                                      setSelectedPlayerMappings(prev => ({
                                        ...prev,
                                        [filePlayerName]: playerId === 'no-mapping' ? '' : playerId
                                      }));
                                      // Если выбрали конкретного игрока, добавляем в ручные выборы
                                      if (playerId !== 'no-mapping') {
                                        setManualPlayerMappings(prev => new Set([...prev, filePlayerName]));
                                      } else {
                                        // Если выбрали "Без привязки", убираем из ручных выборов
                                        setManualPlayerMappings(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(filePlayerName);
                                          return newSet;
                                        });
                                      }
                                    }}
                                    similarity={similarity}
                                    matchLevel={actualMatchLevel}
                                    selectedPlayerMappings={selectedPlayerMappings}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Низкое сходство */}
                        {groupedPlayers.low.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2 p-2 bg-orange-500/20 rounded-md">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <h4 className="text-sm font-semibold text-orange-300">
                                Низкое сходство (35-69%) ({groupedPlayers.low.length})
                              </h4>
                            </div>
                            <div className="space-y-1">
                              {groupedPlayers.low.map(({ filePlayerName, groups, similarity }) => {
                                const selectedPlayerId = selectedPlayerMappings[filePlayerName];
                                const actualMatchLevel = selectedPlayerId === '' || selectedPlayerId === undefined ? 'none' : 'low';
                                return (
                                  <PlayerMappingCard
                                    key={filePlayerName}
                                    filePlayerName={filePlayerName}
                                    groups={groups}
                                    players={players}
                                    selectedPlayerId={selectedPlayerId}
                                    onPlayerSelect={(playerId) => {
                                      setSelectedPlayerMappings(prev => ({
                                        ...prev,
                                        [filePlayerName]: playerId === 'no-mapping' ? '' : playerId
                                      }));
                                      // Если выбрали конкретного игрока, добавляем в ручные выборы
                                      if (playerId !== 'no-mapping') {
                                        setManualPlayerMappings(prev => new Set([...prev, filePlayerName]));
                                      } else {
                                        // Если выбрали "Без привязки", убираем из ручных выборов
                                        setManualPlayerMappings(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(filePlayerName);
                                          return newSet;
                                        });
                                      }
                                    }}
                                    similarity={similarity}
                                    matchLevel={actualMatchLevel}
                                    selectedPlayerMappings={selectedPlayerMappings}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Без привязки */}
                        {groupedPlayers.none.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2 p-2 bg-gray-500/20 rounded-md">
                              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                              <h4 className="text-sm font-semibold text-gray-300">
                                Без привязки ({groupedPlayers.none.length})
                              </h4>
                            </div>
                            <div className="space-y-1">
                              {groupedPlayers.none.map(({ filePlayerName, groups, similarity }) => {
                                const selectedPlayerId = selectedPlayerMappings[filePlayerName];
                                const actualMatchLevel = selectedPlayerId === '' || selectedPlayerId === undefined ? 'none' : 'none';
                                return (
                                  <PlayerMappingCard
                                    key={filePlayerName}
                                    filePlayerName={filePlayerName}
                                    groups={groups}
                                    players={players}
                                    selectedPlayerId={selectedPlayerId}
                                  onPlayerSelect={(playerId) => {
                                    setSelectedPlayerMappings(prev => ({
                                      ...prev,
                                      [filePlayerName]: playerId === 'no-mapping' ? '' : playerId
                                    }));
                                    // Если выбрали конкретного игрока, добавляем в ручные выборы
                                    if (playerId !== 'no-mapping') {
                                      setManualPlayerMappings(prev => new Set([...prev, filePlayerName]));
                                    } else {
                                      // Если выбрали "Без привязки", убираем из ручных выборов
                                      setManualPlayerMappings(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(filePlayerName);
                                        return newSet;
                                      });
                                    }
                                  }}
                                    similarity={similarity}
                                    matchLevel={actualMatchLevel}
                                    selectedPlayerMappings={selectedPlayerMappings}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>

        {/* Кнопки навигации */}
        <div className="flex items-center justify-between p-6 border-t border-vista-secondary/30">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handlePrev} className="bg-transparent border border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 h-9 px-3 font-normal">
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
            {step < 6 ? (
              <Button 
                onClick={handleNext} 
                disabled={
                  dataLoading ||
                  (step === 1 && !selectedTeam) ||
                  (step === 2 && !selectedEventType) ||
                  (step === 3 && !selectedEvent) ||
                  (step === 4 && !file) ||
                  (step === 5 && !isColumnMappingValid()) ||
                  (step === 6 && !isPlayerMappingValid())
                }
                className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
              >
                Далее
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <div className="space-y-3">
                {loading && uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-vista-light/60">
                      <span>Загрузка файла...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-vista-dark/30 rounded-full h-2">
                      <div 
                        className="bg-vista-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || dataLoading || !isColumnMappingValid() || !isPlayerMappingValid()}
                  className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
                >
                  {loading ? 'Создание...' : 'Сохранить отчет'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewGpsReportModal;