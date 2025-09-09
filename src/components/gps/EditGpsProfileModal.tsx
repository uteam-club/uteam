'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Upload, CheckCircle, AlertCircle, ChevronUp, ChevronDown, Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CanonicalRegistry } from '@/canon/types';
import { suggestCanonical } from '@/canon/suggest';
import RecalcCanonicalModal from './RecalcCanonicalModal';
import CanonicalMetricSelector from './CanonicalMetricSelector';
import { cn } from '@/lib/utils';

interface EditGpsProfileModalProps {
  isOpen: boolean;
  profileId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

interface Column {
  id: string;
  name: string;
  mappedColumn?: string;
  order: number;
  type: 'column' | 'formula';
  formula?: {
    operation: string;
    operand1: string;
    operand2: string;
  };
  displayName?: string;
  dataType?: string;
  isVisible?: boolean;
  canonicalKey?: string;
}

type ColumnMappingItem = {
  sourceHeader: string;
  displayName: string;
  canonicalKey: string;
  order: number;
  mappedColumn?: string;
};

// Ключ "смысла" строки — только canonicalKey + mappedColumn
const getRowKey = (c: { canonicalKey?: string | null; mappedColumn?: string | null }) =>
  `${(c?.canonicalKey ?? '').toLowerCase()}__@@__${(c?.mappedColumn ?? '').toLowerCase()}`;

interface ValidationError {
  field: string;
  message: string;
}

interface GpsProfile {
  id: string;
  name: string;
  description: string;
  gpsSystem: string;
  columnMapping: Column[];
  isDefault: boolean;
  isActive: boolean;
  visualizationConfig?: {
    hiddenCanonicalKeys?: string[];
  };
}

export default function EditGpsProfileModal({ isOpen, profileId, onClose, onUpdated }: EditGpsProfileModalProps) {
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<GpsProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [gpsSystem, setGpsSystem] = useState('');
  const [customGpsSystem, setCustomGpsSystem] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<ColumnMappingItem[]>([]);
  const [canonicalRegistry, setCanonicalRegistry] = useState<CanonicalRegistry | null>(null);
  const [metricSearchQuery, setMetricSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [oldCanonicalKeys, setOldCanonicalKeys] = useState<Set<string>>(new Set());
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [newCanonicalKeys, setNewCanonicalKeys] = useState<string[]>([]);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [showMetricSelector, setShowMetricSelector] = useState(false);
  const [selectedMetricIndex, setSelectedMetricIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [usageCount, setUsageCount] = useState<number>(0);
  
  // Снимок старых строк при загрузке профиля
  const oldKeys = useRef<Set<string>>(new Set());
  
  // Определяем, заблокирован ли профиль
  const isLocked = usageCount > 0;

  const gpsSystemOptions = [
    'B-SIGHT',
    'Polar',
    'Catapult',
    'STATSports',
    'WIMU',
    'GPSports',
    'Custom'
  ];

  // Загрузка канонических метрик при открытии модалки
  useEffect(() => {
    if (isOpen && !canonicalRegistry) {
      loadCanonicalMetrics();
    }
  }, [isOpen, canonicalRegistry]);

  const loadCanonicalMetrics = async () => {
    try {
      const response = await fetch('/api/canonical/metrics');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке канонических метрик');
      }
      const registry = await response.json();
      setCanonicalRegistry(registry);
      console.log(`📊 Canonical metrics loaded: v${registry.__meta.version}, ${registry.metrics.length} metrics, ${registry.groups.length} groups`);
    } catch (error) {
      console.error('Ошибка загрузки канонических метрик:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить канонические метрики",
        variant: "destructive"
      });
    }
  };

  const loadUsageCount = async (profileId: string) => {
    try {
      const response = await fetch(`/api/gps-profiles/${profileId}/usage`);
      if (!response.ok) {
        throw new Error('Ошибка при загрузке количества использований');
      }
      const data = await response.json();
      setUsageCount(data.usageCount || 0);
    } catch (error) {
      console.error('Ошибка при загрузке количества использований:', error);
      setUsageCount(0);
    }
  };

  // Загрузка профиля при открытии модального окна
  useEffect(() => {
    if (isOpen && profileId) {
      fetchProfile();
      loadUsageCount(profileId);
    }
  }, [isOpen, profileId]);

  // Валидация на фронтенде
  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Валидация названия профиля
    if (!profileName.trim()) {
      errors.push({ field: 'name', message: 'Название профиля обязательно' });
    } else if (profileName.trim().length < 3) {
      errors.push({ field: 'name', message: 'Название профиля должно содержать минимум 3 символа' });
    }

    // Валидация GPS системы
    if (!gpsSystem) {
      errors.push({ field: 'gpsSystem', message: 'Выберите GPS систему' });
    } else if (gpsSystem === 'Custom' && !customGpsSystem.trim()) {
      errors.push({ field: 'customGpsSystem', message: 'Введите название кастомной GPS системы' });
    }

    // Валидация выбранных колонок
    if (selectedColumns.length === 0) {
      errors.push({ field: 'columns', message: 'Выберите хотя бы одну колонку для маппинга' });
    } else {
      selectedColumns.forEach((column, index) => {
        if (!column.displayName.trim()) {
          errors.push({ field: `column-${index}-displayName`, message: `Колонка "${column.sourceHeader}": кастомное название обязательно` });
        }
        
        if (!column.canonicalKey) {
          errors.push({ field: `column-${index}-canonicalKey`, message: `Колонка "${column.sourceHeader}": выберите каноническую метрику` });
        }
      });
    }

    return errors;
  };

  const fetchProfile = async () => {
    if (!profileId) return;
    
    try {
      setIsLoadingProfile(true);
      const response = await fetch(`/api/gps-profiles/${profileId}`);
      if (!response.ok) {
        throw new Error('Ошибка при загрузке профиля');
      }

        const profileData = await response.json();
        setProfile(profileData);
        setProfileName(profileData.name);
      setProfileDescription(profileData.description || '');
      setGpsSystem(profileData.gpsSystem || '');
      
      // Инициализируем скрытые ключи
      const initialHiddenKeys = new Set<string>(profileData.visualizationConfig?.hiddenCanonicalKeys ?? []);
      setHiddenKeys(initialHiddenKeys);
      
      // Преобразуем существующие колонки в selectedColumns
      if (profileData.columnMapping && Array.isArray(profileData.columnMapping)) {
        // Сохраняем старые канонические ключи
        const oldCanonicalKeysSet = new Set<string>(
          profileData.columnMapping
            .filter((col: any) => col.type === 'column' && col.canonicalKey)
            .map((col: any) => col.canonicalKey as string)
        );
        setOldCanonicalKeys(oldCanonicalKeysSet);

        // Создаем снимок старых строк для блокировки
        oldKeys.current = new Set(
          (profileData.columnMapping || [])
            .filter((c: any) => c?.type !== 'formula' && c?.canonicalKey && c?.mappedColumn)
            .map(getRowKey)
        );

        const mappedColumns: ColumnMappingItem[] = profileData.columnMapping.map((col: any, index: number) => {
          const sourceHeader = col.mappedColumn || col.name || '';
          const mappedColumn = col.mappedColumn || col.name || '';
          const suggestedKey = col.canonicalKey || suggestCanonical(sourceHeader) || '';
          return {
            sourceHeader,
            displayName: col.name || col.mappedColumn || '',
            canonicalKey: suggestedKey,
            order: col.order || index + 1,
            mappedColumn
          };
        });
        setSelectedColumns(mappedColumns);
      }

      setColumns(profileData.columnMapping || []);
    } catch (error) {
      console.error('Ошибка при загрузке профиля:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить профиль",
        variant: "destructive"
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const addColumn = () => {
    const newColumn: Column = {
      id: Date.now().toString(),
      name: '',
      mappedColumn: '',
      order: columns.length + 1,
      type: 'column'
    };
    setColumns([...columns, newColumn]);
  };

  const removeColumn = (id: string) => {
    setColumns(columns.filter(col => col.id !== id));
    setValidationErrors([]); // Очищаем ошибки при удалении колонки
  };

  const moveColumn = (id: string, direction: 'up' | 'down') => {
    const index = columns.findIndex(col => col.id === id);
    if (index === -1) return;

    const newColumns = [...columns];
    if (direction === 'up' && index > 0) {
      [newColumns[index], newColumns[index - 1]] = [newColumns[index - 1], newColumns[index]];
    } else if (direction === 'down' && index < newColumns.length - 1) {
      [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
    }

    // Обновляем порядок
    newColumns.forEach((col, idx) => {
      col.order = idx + 1;
    });

    setColumns(newColumns);
  };

  const updateColumn = (id: string, field: keyof Column, value: any) => {
    console.log('🔄 Обновление колонки:', { id, field, value });
    
    const updatedColumns = columns.map(col => 
      col.id === id ? { ...col, [field]: value } : col
    );
    
    console.log('📋 Колонки после обновления:', updatedColumns);
    
    setColumns(updatedColumns);
    setValidationErrors([]); // Очищаем ошибки при изменении колонки
  };

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/gps-profiles/parse-excel', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Ошибка при парсинге файла');
      }

      const data = await response.json();
      setExcelHeaders(data.headers || []);
      setUploadedFile(file);

      // Добавляем новые строки из загруженного файла
      const headers = data.headers || [];
      const existing = new Set(
        selectedColumns
          .map(c => (c.mappedColumn ?? c.sourceHeader ?? '').trim().toLowerCase())
          .filter(Boolean)
      );

      const newRows: ColumnMappingItem[] = [];
      for (const h of headers) {
        const key = h.trim().toLowerCase();
        if (existing.has(key)) continue; // Пропускаем существующие

        const canonical = suggestCanonical(h) ?? '';
        newRows.push({
          sourceHeader: h,
          mappedColumn: h,         // ОБЯЗАТЕЛЬНО
          displayName: h,          // кастомное имя по умолчанию
          canonicalKey: canonical, // может быть пусто
          order: selectedColumns.length + newRows.length + 1
        });
      }

      if (newRows.length === 0) {
        toast({
          title: "Информация",
          description: "Новых колонок не найдено",
        });
      } else {
        setSelectedColumns(prev => [...prev, ...newRows]);
      toast({
        title: "Успешно",
          description: `Добавлено новых колонок: ${newRows.length}`,
      });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить файл",
        variant: "destructive"
      });
    }
  };

  // Обработчики drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel' ||
          file.type === 'text/csv') {
        handleFileUpload(file);
      } else {
        toast({
          title: "Ошибка",
          description: "Поддерживаются только файлы .xlsx, .xls, .csv",
          variant: "destructive"
        });
      }
    }
  }, [handleFileUpload, toast]);

  // Обновление выбранной колонки
  const updateSelectedColumn = useCallback((index: number, field: keyof ColumnMappingItem, value: any) => {
    setSelectedColumns(prev => prev.map((col, i) => 
      i === index ? { ...col, [field]: value } : col
    ));
  }, []);

  // Удаление выбранной колонки
  const removeSelectedColumn = useCallback((index: number) => {
    setSelectedColumns(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Перемещение строки вверх
  const moveColumnUp = useCallback((index: number) => {
    if (index > 0) {
      setSelectedColumns(prev => {
        const newColumns = [...prev];
        [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
        return newColumns;
      });
    }
  }, []);

  // Перемещение строки вниз
  const moveColumnDown = useCallback((index: number) => {
    setSelectedColumns(prev => {
      if (index < prev.length - 1) {
        const newColumns = [...prev];
        [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
        return newColumns;
      }
      return prev;
    });
  }, []);

  // Автопредложение канонической метрики
  const suggestCanonicalForColumn = useCallback((sourceHeader: string, index: number) => {
    // Guard: не предлагаем для заблокированных строк
    if (isLocked) {
      const currentColumn = selectedColumns[index];
      if (currentColumn) {
        const rowKey = getRowKey(currentColumn);
        const isExistingRow = oldKeys.current.has(rowKey);
        if (isExistingRow) return;
      }
    }
    
    const guess = suggestCanonical(sourceHeader);
    if (guess) {
      setSelectedColumns(prev => prev.map((col, i) => 
        i === index ? { ...col, canonicalKey: guess } : col
      ));
    }
  }, [isLocked, selectedColumns]);

  const openMetricSelector = useCallback((index: number) => {
    setSelectedMetricIndex(index);
    setShowMetricSelector(true);
  }, []);

  const handleMetricSelect = useCallback((metricKey: string) => {
    if (selectedMetricIndex !== null) {
      updateSelectedColumn(selectedMetricIndex, 'canonicalKey', metricKey);
    }
    setShowMetricSelector(false);
    setSelectedMetricIndex(null);
  }, [selectedMetricIndex, updateSelectedColumn]);


  const getSelectedMetricLabel = useCallback((canonicalKey: string) => {
    if (!canonicalRegistry || !canonicalKey) return 'Выберите метрику';
    const metric = canonicalRegistry.metrics.find(m => m.key === canonicalKey);
    return metric ? metric.labels.ru : 'Выберите метрику';
  }, [canonicalRegistry]);

  // Переключение видимости метрики
  const toggleHidden = useCallback((key?: string | null) => {
    if (!key) return;
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Функция сброса состояния
  const resetForm = useCallback(() => {
    setProfile(null);
    setProfileName('');
    setProfileDescription('');
    setGpsSystem('');
    setCustomGpsSystem('');
    setColumns([]);
    setSelectedColumns([]);
    setExcelHeaders([]);
    setValidationErrors([]);
    setShowMetricSelector(false);
    setSelectedMetricIndex(null);
    setShowRecalcModal(false);
    setNewCanonicalKeys([]);
    setIsDragOver(false);
    // Очищаем файловый input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }, []);

  // Обработчик закрытия модалки
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleRecalcModalClose = () => {
    setShowRecalcModal(false);
    setNewCanonicalKeys([]);
    toast({
      title: "Успешно",
      description: "GPS профиль обновлен",
    });
    onUpdated();
    handleClose();
  };



  const handleSave = async () => {
    // Проверка дубликатов canonicalKey
    const used = new Set<string>();
    for (const c of selectedColumns) {
      const k = (c.canonicalKey ?? '').trim().toLowerCase();
      if (!k) continue;
      if (used.has(k)) {
        toast({ 
          variant: 'destructive', 
          title: 'Дубликат метрики', 
          description: `${k} уже выбран в другой строке` 
        });
        return; // блокируем сохранение
      }
      used.add(k);
    }

    // Валидация на фронтенде
    const errors = validateForm();
    setValidationErrors(errors);

    if (errors.length > 0) {
      const firstError = errors[0];
      toast({
        title: "Ошибка валидации",
        description: firstError.message,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      // Преобразуем selectedColumns в формат columns для API
      const apiColumns = selectedColumns.map(col => ({
        type: 'column' as const,
        name: col.displayName,
        mappedColumn: col.sourceHeader,
        canonicalKey: col.canonicalKey,
        isVisible: true, // Все колонки видимы по умолчанию
        order: col.order
      }));

      // Формируем visualizationConfig
      const hidden = Array.from(hiddenKeys);
      const viz = {
        ...(profile?.visualizationConfig ?? {}),
        hiddenCanonicalKeys: hidden,
      };

      const response = await fetch(`/api/gps-profiles/${profileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileName,
          description: profileDescription,
          gpsSystem: gpsSystem === 'Custom' ? customGpsSystem : gpsSystem,
          columns: apiColumns,
          visualizationConfig: viz
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Обработка 409 ошибки (PROFILE_GUARD)
        if (response.status === 409) {
          toast({
            title: "Профиль заблокирован",
            description: "Профиль уже использовался. Нельзя менять canonicalKey/удалять прежние строки. Добавьте новые строки или создайте копию профиля (v2).",
            variant: "destructive"
          });
          return;
        }
        
        // Обработка других ошибок от сервера
        if (data.details && Array.isArray(data.details)) {
          const serverErrors: ValidationError[] = data.details.map((error: string, index: number) => ({
            field: `server-error-${index}`,
            message: error
          }));
          setValidationErrors(serverErrors);
        } else {
          toast({
            title: "Ошибка сервера",
            description: data.error || 'Не удалось обновить профиль',
            variant: "destructive"
          });
        }
        return;
      }

      // Проверяем, есть ли новые канонические ключи
      const newKeys = selectedColumns
        .filter(col => col.canonicalKey && !oldCanonicalKeys.has(col.canonicalKey))
        .map(col => col.canonicalKey);

      if (newKeys.length > 0) {
        setNewCanonicalKeys(newKeys);
        setShowRecalcModal(true);
      } else {
      toast({
        title: "Успешно",
          description: "GPS профиль обновлен",
      });
      onUpdated();
      handleClose();
      }
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить профиль",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoadingProfile) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-vista-dark border-vista-secondary/30">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary mx-auto mb-4"></div>
              <p className="text-vista-light/70">Загрузка профиля...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-3xl max-h-[90vh] overflow-y-auto focus:outline-none focus:ring-0 custom-scrollbar mt-16 mb-8">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
            Редактировать GPS профиль
            {isLocked && (
              <div className="flex items-center gap-1 text-vista-light/60 text-xs">
                <Lock className="h-3 w-3" />
                <span>зафиксирован</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4 custom-scrollbar">
          {/* Основная информация */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-vista-light">Основная информация</h3>
            
            <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Input
              id="profileName"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Введите название профиля"
                  className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                  autoComplete="off"
                />
                {validationErrors.some(e => e.field === 'name') && (
                  <p className="text-sm text-red-500 mt-1">
                    {validationErrors.find(e => e.field === 'name')?.message}
              </p>
            )}
          </div>

              <div className="space-y-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Select value={gpsSystem} onValueChange={setGpsSystem} disabled={isLocked}>
                        <SelectTrigger 
                          id="gpsSystem"
                          className={`bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <SelectValue placeholder="Выберите GPS систему" />
                        </SelectTrigger>
                        <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light shadow-lg">
                          {gpsSystemOptions.map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TooltipTrigger>
                    {isLocked && (
                      <TooltipContent>
                        <p>Профиль уже использовался. Изменение GPS системы запрещено.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                {validationErrors.some(e => e.field === 'gpsSystem') && (
                  <p className="text-sm text-red-500 mt-1">
                    {validationErrors.find(e => e.field === 'gpsSystem')?.message}
                  </p>
                )}
                        </div>
                    </div>

            <div className="space-y-2">
                      <Input
                id="profileDescription"
                value={profileDescription}
                onChange={(e) => setProfileDescription(e.target.value)}
                placeholder="Описание профиля (необязательно)"
                className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
              />
                    </div>

            {gpsSystem === 'Custom' && (
                          <div className="space-y-2">
                            <Input
                  id="customGpsSystem"
                  value={customGpsSystem}
                  onChange={(e) => setCustomGpsSystem(e.target.value)}
                  placeholder="Введите название GPS системы"
                  className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                />
                {validationErrors.some(e => e.field === 'customGpsSystem') && (
                  <p className="text-sm text-red-500 mt-1">
                    {validationErrors.find(e => e.field === 'customGpsSystem')?.message}
                          </p>
                        )}
                      </div>
                    )}
                      </div>

          {/* Загрузка примера файла */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-vista-light">Пример файла для профиля</h3>
            
              <div className="space-y-4">
              {/* Скрытый input для файла */}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                disabled={isLoading}
                      className="hidden"
                      id="file-upload"
                    />
              
              {/* Кастомное поле загрузки */}
              <div 
                className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer group ${
                  isDragOver 
                    ? 'border-vista-primary/60 bg-vista-primary/5' 
                    : 'border-vista-secondary/30 hover:border-vista-primary/40'
                }`}
                onClick={() => document.getElementById('file-upload')?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-vista-secondary/10 rounded-full flex items-center justify-center group-hover:bg-vista-primary/10 transition-colors flex-shrink-0">
                    <Upload className="h-4 w-4 text-vista-light/60 group-hover:text-vista-primary transition-colors" />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <p className="text-vista-light font-medium text-sm">
                      {uploadedFile 
                        ? uploadedFile.name 
                        : (isDragOver 
                          ? 'Отпустите файл здесь' 
                          : (
                            <>
                              Выберите файл <span className="font-normal text-vista-light/60">(.xlsx, .xls, .csv)</span>
                            </>
                          )
                        )
                      }
                    </p>
                    <p className="text-vista-light/60 text-xs">
                      {uploadedFile 
                        ? 'Файл загружен' 
                        : isDragOver 
                          ? 'Отпустите файл для загрузки'
                          : 'Нажмите для выбора или перетащите сюда'
                      }
                          </p>
                        </div>
                  
                  {uploadedFile && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                          setExcelHeaders([]);
                          setSelectedColumns([]);
                          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                        className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  </div>
              </div>
            </div>
          </div>

          {/* Маппинг колонок */}
          {selectedColumns.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-vista-light">Маппинг колонок на канонические метрики</h3>
              <div className="space-y-4">

                {/* Таблица маппинга */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-vista-secondary/30">
                        <th className="text-left p-2 text-vista-light/60 font-normal w-12">№</th>
                        <th className="text-left p-2 text-vista-light/60 font-normal">Оригинальное имя</th>
                        <th className="text-left p-2 text-vista-light/60 font-normal">Кастомное имя</th>
                        <th className="text-left p-2 text-vista-light/60 font-normal w-64">Каноническая метрика</th>
                        <th className="text-left p-2 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedColumns.map((column, index) => {
                        const rowKey = getRowKey(column);
                        const isExistingRow = oldKeys.current.has(rowKey);
                        const isRowLocked = isLocked && isExistingRow;
                        const isHidden = !!column.canonicalKey && hiddenKeys.has(column.canonicalKey);
                        
                        return (
                        <tr key={`${column.sourceHeader}-${index}`} className="border-b border-vista-secondary/20">
                          <td className="p-2 text-sm text-vista-light/60 text-center font-medium">
                            {index + 1}
                          </td>
                          <td className="p-2 text-sm text-vista-light/60">
                            {column.sourceHeader}
                          </td>
                          <td className="p-2">
                            <Input
                              value={column.displayName}
                              onChange={(e) => {
                                updateSelectedColumn(index, 'displayName', e.target.value);
                                // Автопредложение только если canonicalKey ещё не выбран вручную
                                if (!column.canonicalKey && !isRowLocked) {
                                  suggestCanonicalForColumn(column.sourceHeader, index);
                                }
                              }}
                              placeholder="Кастомное название"
                              className={cn(
                                "w-full bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0",
                                isHidden && "opacity-60"
                              )}
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => !isRowLocked && openMetricSelector(index)}
                                disabled={isRowLocked}
                                className={`w-full justify-start h-9 px-3 font-normal border-dashed ${
                                  column.canonicalKey 
                                    ? 'bg-vista-primary/10 border-vista-primary/40 text-vista-primary hover:bg-vista-primary/20' 
                                    : 'bg-vista-dark border-vista-secondary/30 text-vista-light/40 hover:bg-vista-dark/70'
                                } ${isRowLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <span className="truncate">
                                  {getSelectedMetricLabel(column.canonicalKey)}
                                </span>
                              </Button>
                              {isRowLocked && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Lock className="h-4 w-4 text-vista-light/60 flex-shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Профиль уже использовался. Изменение canonicalKey запрещено. Добавьте новую строку или создайте копию профиля (v2).</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                )}
              </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveColumnUp(index)}
                                  disabled={index === 0}
                                  className="h-6 w-6 p-0 text-vista-light/60 hover:text-vista-light hover:bg-vista-secondary/20 disabled:opacity-30"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveColumnDown(index)}
                                  disabled={index === selectedColumns.length - 1}
                                  className="h-6 w-6 p-0 text-vista-light/60 hover:text-vista-light hover:bg-vista-secondary/20 disabled:opacity-30"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                              {isRowLocked ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled
                                        className="bg-transparent border border-vista-error/30 text-vista-error/30 h-8 w-8 p-0 cursor-not-allowed"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Профиль уже использовался. Удаление прежних строк запрещено. Добавьте новую строку или создайте копию профиля (v2).</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeSelectedColumn(index)}
                                  className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Кнопка скрытия/показа метрики */}
                              {column.canonicalKey && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => toggleHidden(column.canonicalKey)}
                                        aria-label={hiddenKeys.has(column.canonicalKey) ? "Показать в визуализациях" : "Скрыть из визуализаций"}
                                        className="h-8 w-8 p-0 text-vista-light/60 hover:text-vista-light hover:bg-vista-secondary/20"
                                      >
                                        {hiddenKeys.has(column.canonicalKey) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      {hiddenKeys.has(column.canonicalKey) ? "Сделать метрику видимой" : "Скрыть метрику в визуализациях"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {validationErrors.some(e => e.field.startsWith('column-')) && (
                  <Alert variant="destructive" className="bg-vista-error/10 border-vista-error/30 text-vista-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {validationErrors
                        .filter(e => e.field.startsWith('column-'))
                        .map(e => e.message)
                        .join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Ошибки валидации */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="bg-vista-error/10 border-vista-error/30 text-vista-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {validationErrors.map((error, index) => (
                  <div key={index}>{error.message}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
            <Button 
            type="button" 
              variant="outline" 
              onClick={handleClose}
            disabled={isLoading}
            className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
            >
              Отмена
            </Button>
            <Button 
            type="button" 
              onClick={handleSave} 
              disabled={isLoading}
            className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
        </div>
      </DialogContent>

      {/* Модалка пересчёта канонических метрик */}
      {showRecalcModal && profileId && (
        <RecalcCanonicalModal
          profileId={profileId}
          newKeys={newCanonicalKeys}
          onClose={handleRecalcModalClose}
        />
      )}

      {/* Селектор канонических метрик */}
      <CanonicalMetricSelector
        isOpen={showMetricSelector}
        onClose={() => {
          setShowMetricSelector(false);
          setSelectedMetricIndex(null);
        }}
        onSelect={handleMetricSelect}
        canonicalRegistry={canonicalRegistry}
        searchQuery={metricSearchQuery}
        onSearchChange={setMetricSearchQuery}
      />
    </Dialog>
  );
} 