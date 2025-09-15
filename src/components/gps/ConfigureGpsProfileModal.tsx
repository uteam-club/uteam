'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  X, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft,
  ArrowRight,
  Settings,
  FileText,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createGpsProfile, createGpsColumnMapping } from '@/lib/gps-api';
import { getAvailableGpsSystems, getAllowedUnitsForMetric, getCanonicalMetricByKey } from '@/lib/canonical-metrics';

// Убираем единицу в скобках: "Время на поле (мин)" → "Время на поле"
const stripUnitSuffix = (s: string) => s.replace(/\s*\([^)]*\)\s*$/u, '').trim();
import canonicalMetrics from '@/canon/canonical_metrics_grouped_v1.0.1.json';
import CanonicalMetricSelectionModal from './CanonicalMetricSelectionModal';

interface ColumnMapping {
  id: string;
  sourceColumn: string;
  customName: string;
  canonicalMetric: string;
  canonicalMetricLabel: string;
  displayOrder: number;
  /** Единица отображения: обязательное поле */
  displayUnit: string;
  /** Видимость столбца */
  isVisible: boolean;
}

interface ConfigureGpsProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileCreated: () => void;
}

export default function ConfigureGpsProfileModal({
  open,
  onOpenChange,
  onProfileCreated,
}: ConfigureGpsProfileModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'basic' | 'file' | 'columns'>('basic');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gpsSystem: '',
  });
  const [fileData, setFileData] = useState<{
    fileName: string;
    fileSize: number;
    headers: string[];
  } | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');

  const gpsSystems = getAvailableGpsSystems();

  // Получаем каноническую единицу для метрики
  const getCanonicalUnitForMetric = (metricKey: string): string => {
    const metric = getCanonicalMetricByKey(metricKey);
    if (!metric) return '';
    
    const dimension = canonicalMetrics.dimensions[metric.dimension as keyof typeof canonicalMetrics.dimensions];
    return dimension?.canonical_unit || '';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Ошибка',
        description: 'Размер файла превышает 10MB',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/gps/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Failed to upload file');
      }

      // Step 2: Process file
      const processResponse = await fetch('/api/gps/process-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: uploadResult.filePath,
          fileName: uploadResult.fileName,
        }),
      });

      const processResult = await processResponse.json();

      if (!processResponse.ok) {
        throw new Error(processResult.error || 'Failed to process file');
      }

      setFileData({
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        headers: processResult.columns,
      });

      // Initialize column mappings
      const mappings: ColumnMapping[] = processResult.columns.map((header: string, index: number) => ({
        id: `col-${index}`,
        sourceColumn: header,
        customName: '',
        canonicalMetric: '',
        canonicalMetricLabel: '',
        displayOrder: index,
        displayUnit: '',
        isVisible: true,
      }));

      setColumnMappings(mappings);
      setStep('columns');

      toast({
        title: 'Успех',
        description: `Файл "${uploadResult.fileName}" успешно обработан. Найдено ${processResult.columns.length} столбцов.`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обработать файл',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleColumnChange = (columnId: string, field: 'customName' | 'canonicalMetric' | 'canonicalMetricLabel' | 'displayUnit', value: string) => {
    setColumnMappings(prev => 
      prev.map(col => 
        col.id === columnId 
          ? { ...col, [field]: value }
          : col
      )
    );
  };

  const handleRemoveColumn = (columnId: string) => {
    setColumnMappings(prev => prev.filter(col => col.id !== columnId));
  };

  const handleMoveColumn = (columnId: string, direction: 'up' | 'down') => {
    setColumnMappings(prev => {
      const newMappings = [...prev];
      const index = newMappings.findIndex(col => col.id === columnId);
      
      if (direction === 'up' && index > 0) {
        [newMappings[index], newMappings[index - 1]] = [newMappings[index - 1], newMappings[index]];
      } else if (direction === 'down' && index < newMappings.length - 1) {
        [newMappings[index], newMappings[index + 1]] = [newMappings[index + 1], newMappings[index]];
      }
      
      return newMappings.map((col, idx) => ({ ...col, displayOrder: idx }));
    });
  };

  const handleSelectMetric = (metric: any) => {
    if (selectedColumnId) {
      const canonicalUnit = getCanonicalUnitForMetric(metric.key);
      handleColumnChange(selectedColumnId, 'canonicalMetric', metric.key);
      handleColumnChange(selectedColumnId, 'canonicalMetricLabel', stripUnitSuffix(metric.labels.ru));
      handleColumnChange(selectedColumnId, 'displayUnit', canonicalUnit);
    }
    setShowMetricModal(false);
    setSelectedColumnId('');
  };

  const validateForm = () => {
    if (!formData.name || !formData.gpsSystem) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return false;
    }

    if (step === 'columns') {
      if (columnMappings.length === 0) {
        toast({
          title: 'Ошибка',
          description: 'Необходимо настроить хотя бы один столбец',
          variant: 'destructive',
        });
        return false;
      }

      // Check for duplicate custom names
      const customNames = columnMappings.map(col => col.customName).filter(name => name);
      const uniqueNames = new Set(customNames);
      if (customNames.length !== uniqueNames.size) {
        toast({
          title: 'Ошибка',
          description: 'Кастомные названия столбцов должны быть уникальными',
          variant: 'destructive',
        });
        return false;
      }

      // Check for duplicate canonical metrics
      const canonicalMetrics = columnMappings.map(col => col.canonicalMetric).filter(metric => metric);
      const uniqueMetrics = new Set(canonicalMetrics);
      if (canonicalMetrics.length !== uniqueMetrics.size) {
        toast({
          title: 'Ошибка',
          description: 'Канонические метрики должны быть уникальными',
          variant: 'destructive',
        });
        return false;
      }

      // Check that all visible columns have custom names, canonical metrics and display units
      const visibleColumns = columnMappings.filter(col => col.isVisible);
      const incompleteColumns = visibleColumns.filter(col => !col.customName || !col.canonicalMetric || !col.displayUnit);
      if (incompleteColumns.length > 0) {
        toast({
          title: 'Ошибка',
          description: 'Все видимые столбцы должны иметь название, каноническую метрику и единицу отображения',
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create GPS profile
      const profile = await createGpsProfile({
        name: formData.name,
        gpsSystem: formData.gpsSystem,
        clubId: 'temp', // Will be set by API
      });

      if (!profile) {
        throw new Error('Failed to create GPS profile');
      }

      // Create column mappings
      for (const column of columnMappings) {
        await createGpsColumnMapping({
          gpsProfileId: profile.id,
          sourceColumn: column.sourceColumn,
          customName: column.customName,
          canonicalMetric: column.canonicalMetric,
          displayOrder: column.displayOrder,
          displayUnit: column.displayUnit,
        });
      }

      toast({
        title: 'Успех',
        description: 'GPS профиль успешно создан и настроен',
      });

      handleClose();
      onProfileCreated();
    } catch (error) {
      console.error('Error creating GPS profile:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать GPS профиль',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStep('basic');
      setFormData({ name: '', gpsSystem: '' });
      setFileData(null);
      setColumnMappings([]);
      setShowMetricModal(false);
      setSelectedColumnId('');
      onOpenChange(false);
    }
  };

  const getUsedMetricKeys = () => {
    return columnMappings
      .filter(col => col.canonicalMetric && col.id !== selectedColumnId)
      .map(col => col.canonicalMetric);
  };

  const getStepTitle = () => {
    switch (step) {
      case 'basic':
        return 'Создание GPS профиля';
      case 'file':
        return 'Загрузка GPS файла';
      case 'columns':
        return 'Настройка столбцов';
      default:
        return 'Создание GPS профиля';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'basic':
        return 'Создайте новый профиль для GPS системы';
      case 'file':
        return 'Загрузите GPS файл для настройки столбцов';
      case 'columns':
        return 'Настройте отображение и сопоставление столбцов';
      default:
        return '';
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'basic':
        return formData.name.trim() !== '' && formData.gpsSystem !== '';
      case 'file':
        return fileData?.fileName !== '';
      case 'columns':
        return columnMappings.length > 0;
      default:
        return false;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={`bg-vista-dark border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl flex flex-col p-0 custom-scrollbar max-h-[90vh] overflow-hidden mt-4 ${
          step === 'basic' ? 'max-w-md h-auto' : 
          step === 'file' ? 'max-w-lg h-auto' : 
          'max-w-4xl h-[85vh]'
        }`}>
          <DialogHeader className="px-6 py-4 border-b border-vista-secondary/30">
            <DialogTitle className="text-vista-light text-xl">
              {getStepTitle()}
            </DialogTitle>
            <DialogDescription className="text-vista-light/60">
              {getStepDescription()}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Progress indicator */}
            <div className="flex items-center justify-center px-6 py-4 border-b border-vista-secondary/30">
              <div className="flex items-center space-x-2">
                {['basic', 'file', 'columns'].map((stepName, index) => (
                  <div key={stepName} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === stepName 
                        ? 'bg-vista-primary text-white' 
                        : ['basic', 'file', 'columns'].indexOf(step) > index
                        ? 'bg-vista-primary/20 text-vista-primary'
                        : 'bg-vista-secondary/20 text-vista-light/40'
                    }`}>
                      {index + 1}
                    </div>
                    {index < 2 && (
                      <div className={`w-8 h-0.5 ${
                        ['basic', 'file', 'columns'].indexOf(step) > index
                          ? 'bg-vista-primary'
                          : 'bg-vista-secondary/20'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {step === 'basic' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-vista-light/80 font-normal">
                        Название профиля <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Например: Polar Team A"
                        className="bg-vista-secondary/20 border-vista-secondary/30 text-vista-light placeholder:text-vista-light/40 focus:border-vista-primary focus:ring-vista-primary/20"
                        autoComplete="off"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="gpsSystem" className="text-vista-light/80 font-normal">
                        GPS система <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.gpsSystem}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, gpsSystem: value }))}
                        required
                      >
                        <SelectTrigger className="w-full bg-vista-secondary/20 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-vista-primary/20">
                          <SelectValue placeholder="Выберите GPS систему" />
                        </SelectTrigger>
                        <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                          {gpsSystems.map((system) => (
                            <SelectItem key={system} value={system} className="text-vista-light hover:bg-vista-secondary/20">
                              {system}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {step === 'file' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-vista-secondary/30 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 text-vista-light/40 mx-auto mb-3" />
                      <h3 className="text-base font-medium text-vista-light mb-2">
                        Загрузите GPS файл
                      </h3>
                      <p className="text-sm text-vista-light/60 mb-4">
                        CSV и Excel файлы (максимум 5MB)
                      </p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-4 font-normal"
                      >
                        {loading ? 'Обработка...' : 'Выбрать файл'}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}

                {step === 'columns' && fileData && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-vista-secondary/10 rounded-lg">
                      <FileText className="w-5 h-5 text-vista-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-vista-light">{fileData.fileName}</p>
                        <p className="text-sm text-vista-light/60">
                          {(fileData.fileSize / 1024).toFixed(1)} KB • {fileData.headers.length} столбцов
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-300">Настройте отображение столбцов</p>
                          <p className="text-xs text-blue-300/80 mt-1">
                            Для каждого столбца выберите каноническую метрику и единицу отображения. 
                            Все видимые столбцы должны иметь название, метрику и единицу измерения.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {columnMappings.map((column, index) => (
                        <div
                          key={column.id}
                          className="p-3 rounded-lg border bg-vista-secondary/10 border-vista-secondary/30 hover:bg-vista-secondary/15 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {/* Номер столбца и кнопки перемещения */}
                            <div className="flex flex-col items-center gap-1 min-w-[40px]">
                              <div className="w-6 h-6 rounded-full bg-vista-primary/20 flex items-center justify-center">
                                <span className="text-xs font-medium text-vista-primary">{index + 1}</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMoveColumn(column.id, 'up')}
                                  disabled={index === 0}
                                  className="h-5 w-5 p-0 text-vista-light/60 hover:text-vista-light"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMoveColumn(column.id, 'down')}
                                  disabled={index === columnMappings.length - 1}
                                  className="h-5 w-5 p-0 text-vista-light/60 hover:text-vista-light"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex-1 flex gap-3">
                              {/* Исходный столбец - одинаковая ширина */}
                              <div className="space-y-2 w-48 flex-shrink-0">
                                <Label className="text-xs text-vista-light/60">Исходный столбец</Label>
                                <div className="h-9 flex items-center px-3 rounded-md border bg-vista-secondary/10 border-vista-secondary/20">
                                  <p className="text-xs text-vista-light/90 truncate font-normal">{column.sourceColumn}</p>
                                </div>
                              </div>
                              
                              {/* Кастомное название - одинаковая ширина */}
                              <div className="space-y-2 w-48 flex-shrink-0">
                                <Label className="text-xs text-vista-light/60">Кастомное название</Label>
                                <Input
                                  value={column.customName}
                                  onChange={(e) => handleColumnChange(column.id, 'customName', e.target.value)}
                                  placeholder="Введите название"
                                  className="h-9 bg-vista-secondary/20 border-vista-secondary/30 text-vista-light placeholder:text-vista-light/40 focus:border-vista-primary focus:ring-vista-primary/20 text-xs font-normal"
                                />
                              </div>
                              
                              {/* Каноническая метрика - одинаковая ширина */}
                              <div className="space-y-2 w-48 flex-shrink-0">
                                <Label className="text-xs text-vista-light/60">Каноническая метрика</Label>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedColumnId(column.id);
                                    setShowMetricModal(true);
                                  }}
                                  className={`h-9 w-full justify-start text-left text-xs font-normal ${
                                    column.canonicalMetric 
                                      ? 'bg-vista-primary/20 border-vista-primary text-vista-primary hover:bg-vista-primary/30' 
                                      : 'bg-vista-secondary/20 border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/30'
                                  }`}
                                >
                                  <span className="truncate">{column.canonicalMetricLabel || 'Выберите метрику'}</span>
                                </Button>
                              </div>

                              {/* Единица отображения - компактная */}
                              <div className="space-y-2 w-24 flex-shrink-0">
                                <Label className="text-xs text-vista-light/60">Единица</Label>
                                {column.canonicalMetric ? (
                                  <Select
                                    value={column.displayUnit}
                                    onValueChange={(value) => {
                                      setColumnMappings(cols => cols.map(cm => cm.id === column.id ? { ...cm, displayUnit: value } : cm));
                                    }}
                                  >
                                    <SelectTrigger className="h-9 bg-vista-secondary/20 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-vista-primary/20 text-xs font-normal">
                                      <SelectValue placeholder="Единица" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-vista-dark border-vista-secondary/30 text-vista-light">
                                      {getAllowedUnitsForMetric(column.canonicalMetric).map(unit => (
                                        <SelectItem key={unit} value={unit} className="text-vista-light hover:bg-vista-secondary/20 text-xs font-normal">
                                          {unit}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="h-9 flex items-center px-3 rounded-md border bg-vista-secondary/10 border-vista-secondary/20">
                                    {/* Пустое поле - ничего не отображаем */}
                                  </div>
                                )}
                              </div>

                              {/* Действие - фиксированная ширина */}
                              <div className="space-y-2 w-12 flex-shrink-0">
                                <Label className="text-xs text-vista-light/60 invisible">Действие</Label>
                                <div className="flex items-center justify-center h-9">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveColumn(column.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                                    title="Удалить столбец"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex items-center mt-4 px-6 py-4 border-t border-vista-secondary/30">
              <div className="flex-1 flex justify-start">
                {step !== 'basic' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (step === 'file') setStep('basic');
                      if (step === 'columns') setStep('file');
                    }}
                    disabled={loading}
                    className="bg-transparent border border-vista-secondary/60 text-vista-light hover:bg-vista-secondary/20 hover:border-vista-secondary/80 h-9 px-3 font-normal"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Назад
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
                >
                  Отмена
                </Button>
                
                {step !== 'columns' && (
                  <Button
                    type="button"
                    onClick={() => {
                      if (step === 'basic') setStep('file');
                      if (step === 'file') setStep('columns');
                    }}
                    disabled={!canProceed() || loading}
                    className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
                  >
                    {loading ? 'Обработка...' : 'Далее'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {step === 'columns' && (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
                  >
                    {loading ? 'Создание...' : 'Создать профиль'}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <CanonicalMetricSelectionModal
        open={showMetricModal}
        onOpenChange={setShowMetricModal}
        onSelect={handleSelectMetric}
        usedMetricKeys={getUsedMetricKeys()}
      />
    </>
  );
}
