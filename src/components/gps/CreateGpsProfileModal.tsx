'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle, Trash2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CanonicalRegistry } from '@/canon/types';
import { suggestCanonical } from '@/canon/suggest';
import { allowedDisplayUnitsFor, suggestDefaultDisplayUnit } from '@/canon/displayUnits';
import CanonicalMetricSelector from './CanonicalMetricSelector';

interface CreateGpsProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
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
}

type ColumnMappingItem = {
  sourceHeader: string;
  displayName: string;
  canonicalKey: string;
  order: number;
  displayUnit?: string;
};

interface ValidationError {
  field: string;
  message: string;
}

export default function CreateGpsProfileModal({ isOpen, onClose, onCreated }: CreateGpsProfileModalProps) {
  const [profileName, setProfileName] = useState('');
  const [gpsSystem, setGpsSystem] = useState('');
  const [customGpsSystem, setCustomGpsSystem] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<ColumnMappingItem[]>([]);
  const [canonicalRegistry, setCanonicalRegistry] = useState<CanonicalRegistry | null>(null);
  const [metricSearchQuery, setMetricSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showMetricSelector, setShowMetricSelector] = useState(false);
  const [selectedMetricIndex, setSelectedMetricIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

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

  // Загрузка стандартных шаблонов
  const loadTemplate = async (gpsSystem: string) => {
    try {
      const response = await fetch('/api/gps-profiles/templates');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке шаблонов');
      }

      const templates = await response.json();
      const template = templates[gpsSystem];

      if (!template) {
        toast({
          title: "Ошибка",
          description: `Шаблон для ${gpsSystem} не найден`,
          variant: "destructive"
        });
        return;
      }

      // Загружаем шаблон
      setProfileName(template.name);
      setColumns(template.columns.map((col: any, index: number) => ({
        id: Date.now().toString() + index,
        name: col.name,
        mappedColumn: col.mappedColumn,
        order: col.order,
        type: col.type
      })));

      toast({
        title: "Шаблон загружен",
        description: `Загружен шаблон ${template.name}`,
      });

    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить шаблон",
        variant: "destructive"
      });
    }
  };

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
    setColumns(prev => prev.map(col => 
      col.id === id ? { ...col, [field]: value } : col
    ));
    setValidationErrors([]); // Очищаем ошибки при изменении колонки
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await fetch('/api/gps-profiles/parse-excel', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Ошибка при загрузке файла');
      }

      const data = await response.json();
      setExcelHeaders(data.headers || []);
      setUploadedFile(file);
      
      // Создаем маппинг колонок из заголовков Excel
      const newSelectedColumns: ColumnMappingItem[] = data.headers.map((header: string, index: number) => {
        const suggestedKey = suggestCanonical(header);
        const suggestedDisplayUnit = suggestedKey ? suggestDefaultDisplayUnit(suggestedKey) : undefined;
        return {
          sourceHeader: header,
          displayName: header,
          canonicalKey: suggestedKey || '',
          order: index + 1,
          displayUnit: suggestedDisplayUnit || undefined
        };
      });
      
      setSelectedColumns(newSelectedColumns);
      
      toast({
        title: "Файл загружен",
        description: `Найдено ${data.headers.length} колонок`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить файл",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Обновление выбранной колонки
  const updateSelectedColumn = useCallback((index: number, field: keyof ColumnMappingItem, value: any) => {
    setSelectedColumns(prev => prev.map((col, i) => {
      if (i === index) {
        const updatedCol = { ...col, [field]: value };
        
        // Если изменился canonicalKey, сбрасываем displayUnit и устанавливаем новый по умолчанию
        if (field === 'canonicalKey') {
          const newDisplayUnit = suggestDefaultDisplayUnit(value);
          updatedCol.displayUnit = newDisplayUnit || undefined;
        }
        
        return updatedCol;
      }
      return col;
    }));
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
    const guess = suggestCanonical(sourceHeader);
    if (guess) {
      setSelectedColumns(prev => prev.map((col, i) => 
        i === index ? { ...col, canonicalKey: guess } : col
      ));
    }
  }, []);

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

  // Функция сброса состояния
  const resetForm = useCallback(() => {
    setProfileName('');
    setGpsSystem('');
    setCustomGpsSystem('');
    setColumns([]);
    setSelectedColumns([]);
    setExcelHeaders([]);
    setUploadedFile(null);
    setValidationErrors([]);
    setShowMetricSelector(false);
    setSelectedMetricIndex(null);
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
      if (file.type.includes('sheet') || file.type.includes('csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        handleFileUpload(file);
      } else {
        toast({
          title: "Неверный формат файла",
          description: "Пожалуйста, выберите файл Excel (.xlsx, .xls) или CSV",
          variant: "destructive"
        });
      }
    }
  }, [toast]);



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
      // Показываем первую ошибку
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

      const response = await fetch('/api/gps-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileName,
          gpsSystem: gpsSystem === 'Custom' ? customGpsSystem : gpsSystem,
          columns: apiColumns
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Обработка ошибок от сервера
        if (data.details && Array.isArray(data.details)) {
          const serverErrors: ValidationError[] = data.details.map((error: string, index: number) => ({
            field: `server-error-${index}`,
            message: error
          }));
          setValidationErrors(serverErrors);
        } else {
          toast({
            title: "Ошибка сервера",
            description: data.error || 'Не удалось создать профиль',
            variant: "destructive"
          });
        }
        return;
      }

      toast({
        title: "Успешно",
        description: "GPS профиль создан",
      });

      onCreated();
      handleClose();
    } catch (error) {
      console.error('Ошибка при создании профиля:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать профиль",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-3xl max-h-[90vh] overflow-y-auto focus:outline-none focus:ring-0 custom-scrollbar mt-16 mb-8">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">Создать GPS профиль</DialogTitle>
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
                <Select value={gpsSystem} onValueChange={setGpsSystem}>
                  <SelectTrigger 
                    id="gpsSystem"
                    className="bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                  >
                    <SelectValue placeholder="Выберите GPS систему" />
                        </SelectTrigger>
                  <SelectContent className="bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-lg">
                    {gpsSystemOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                {validationErrors.some(e => e.field === 'gpsSystem') && (
                  <p className="text-sm text-red-500 mt-1">
                    {validationErrors.find(e => e.field === 'gpsSystem')?.message}
                  </p>
                )}
              </div>
                      </div>

            {gpsSystem === 'Custom' && (
              <div className="space-y-2">
                <Label htmlFor="customGpsSystem" className="text-vista-light/40 font-normal">Название кастомной системы *</Label>
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

                  {!uploadedFile && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading}
                      size="sm"
                      className="bg-vista-primary/10 border-vista-primary/40 text-vista-primary hover:bg-vista-primary/20 h-8 px-3 font-normal flex-shrink-0"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Выбрать
                    </Button>
                  )}
                  
                  {uploadedFile && (
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="flex items-center space-x-1 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                          setExcelHeaders([]);
                          setSelectedColumns([]);
                          (document.getElementById('file-upload') as HTMLInputElement).value = '';
                        }}
                        className="text-vista-light/60 hover:text-vista-error hover:bg-vista-error/10 h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
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
                        <th className="text-left p-2 text-vista-light/60 font-normal w-32">Единица отображения</th>
                        <th className="text-left p-2 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedColumns.map((column, index) => (
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
                                if (!column.canonicalKey) {
                                  suggestCanonicalForColumn(column.sourceHeader, index);
                                }
                              }}
                              placeholder="Кастомное название"
                              className="w-full bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0"
                            />
                          </td>
                          <td className="p-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => openMetricSelector(index)}
                              className={`w-full justify-start h-9 px-3 font-normal border-dashed ${
                                column.canonicalKey 
                                  ? 'bg-vista-primary/10 border-vista-primary/40 text-vista-primary hover:bg-vista-primary/20' 
                                  : 'bg-vista-dark border-vista-secondary/30 text-vista-light/40 hover:bg-vista-dark/70'
                              }`}
                            >
                              <span className="truncate">
                                {getSelectedMetricLabel(column.canonicalKey)}
                              </span>
                            </Button>
                          </td>
                          <td className="p-2">
                            {column.canonicalKey && allowedDisplayUnitsFor(column.canonicalKey).length > 0 ? (
                              <Select
                                value={column.displayUnit || suggestDefaultDisplayUnit(column.canonicalKey) || ''}
                                onValueChange={(value) => updateSelectedColumn(index, 'displayUnit', value)}
                              >
                                <SelectTrigger className="w-full bg-vista-dark border-vista-secondary/30 text-vista-light focus:outline-none focus:ring-0">
                                  <SelectValue placeholder="Выберите единицу" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allowedDisplayUnitsFor(column.canonicalKey).map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {unit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="text-sm text-vista-light/40 italic">
                                {column.canonicalKey ? 'Не требуется' : 'Выберите метрику'}
                              </div>
                            )}
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
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeSelectedColumn(index)}
                                className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
              {isLoading ? 'Создание...' : 'Создать профиль'}
            </Button>
        </div>
      </DialogContent>

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