'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, MoveUp, MoveDown, FileSpreadsheet, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
}

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
}

export default function EditGpsProfileModal({ isOpen, profileId, onClose, onUpdated }: EditGpsProfileModalProps) {
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<GpsProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Загрузка профиля при открытии модального окна
  useEffect(() => {
    if (isOpen && profileId) {
      fetchProfile();
    }
  }, [isOpen, profileId]);

  // Валидация на фронтенде (та же логика, что и в создании)
  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Валидация названия профиля
    if (!profileName.trim()) {
      errors.push({ field: 'name', message: 'Название профиля обязательно' });
    } else if (profileName.trim().length < 3) {
      errors.push({ field: 'name', message: 'Название профиля должно содержать минимум 3 символа' });
    }

    // Валидация колонок
    if (columns.length === 0) {
      errors.push({ field: 'columns', message: 'Добавьте хотя бы одну колонку' });
    } else {
      columns.forEach((column, index) => {
        if (!column.name.trim()) {
          errors.push({ field: `column-${index}-name`, message: `Колонка #${index + 1}: название обязательно` });
        }
        
        if (!column.mappedColumn?.trim()) {
          errors.push({ field: `column-${index}-mapped`, message: `Колонка "${column.name}": маппинг обязателен` });
        }
      });

      // Проверка дублирования mappedColumn
      const mappedColumns = columns.map(col => col.mappedColumn).filter(Boolean);
      const duplicates = mappedColumns.filter((item, index) => mappedColumns.indexOf(item) !== index);
      if (duplicates.length > 0) {
        errors.push({ 
          field: 'columns', 
          message: `Дублирующиеся маппинги колонок: ${duplicates.join(', ')}` 
        });
      }

      // Проверка обязательных полей
      const columnNames = columns.map(col => col.name);
      const requiredFields = ['Player', 'Time', 'TD'];
      const missingRequired = requiredFields.filter(field => !columnNames.includes(field));
      
      if (missingRequired.length > 0) {
        errors.push({ 
          field: 'required', 
          message: `Отсутствуют обязательные поля: ${missingRequired.join(', ')}` 
        });
      }
    }

    return errors;
  };

  const fetchProfile = async () => {
    if (!profileId) return;
    
    try {
      setIsLoadingProfile(true);
      const response = await fetch(`/api/gps-profiles/${profileId}`);
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        setProfileName(profileData.name);
        
        // Обрабатываем columnMapping с дополнительной проверкой
        let columnMapping = profileData.columnMapping || [];
        
        // Если columnMapping - строка, пытаемся распарсить JSON
        if (typeof columnMapping === 'string') {
          try {
            columnMapping = JSON.parse(columnMapping);
          } catch (e) {
            console.error('Ошибка парсинга columnMapping:', e);
            columnMapping = [];
          }
        }
        
        // Убеждаемся, что это массив и добавляем id если его нет
        if (Array.isArray(columnMapping)) {
          const processedColumns = columnMapping.map((col, index) => ({
            ...col,
            id: col.id || `col-${Date.now()}-${index}`,
            order: col.order !== undefined ? col.order : index
          }));
          setColumns(processedColumns);
        } else {
          console.error('columnMapping не является массивом:', columnMapping);
          setColumns([]);
        }
        
        setValidationErrors([]); // Очищаем ошибки при загрузке
      }
    } catch (error) {
      console.error('Ошибка при получении профиля:', error);
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
      id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      mappedColumn: '',
      order: columns.length,
      type: 'column'
    };
    setColumns([...columns, newColumn]);
    setValidationErrors([]); // Очищаем ошибки при добавлении колонки
  };

  const removeColumn = (id: string) => {
    console.log('🗑️ Удаление колонки:', id);
    console.log('📋 Колонки до удаления:', columns);
    
    // Проверяем, что колонка существует
    const columnToRemove = columns.find(col => col.id === id);
    if (!columnToRemove) {
      console.error('❌ Колонка не найдена:', id);
      return;
    }
    
    // Удаляем колонку и обновляем порядок
    const updatedColumns = columns
      .filter(col => col.id !== id)
      .map((col, index) => ({
        ...col,
        order: index
      }));
    
    console.log('📋 Колонки после удаления:', updatedColumns);
    
    // Дополнительная проверка
    if (updatedColumns.length === 0) {
      console.log('⚠️  Все колонки удалены, устанавливаем пустой массив');
    }
    
    setColumns(updatedColumns);
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
      col.order = idx;
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

      toast({
        title: "Успешно",
        description: "Файл загружен и заголовки извлечены",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить файл",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
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

    if (!profileId || !profileName.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните название профиля",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      const requestData = {
        name: profileName,
        columnMapping: columns.map(col => ({
          name: col.name,
          mappedColumn: col.mappedColumn,
          order: col.order,
          type: col.type,
          displayName: col.displayName || col.name,
          dataType: col.dataType || 'string',
          isVisible: col.isVisible !== undefined ? col.isVisible : true,
          formula: col.formula
        })),
      };

      console.log('📤 Отправляем данные на сервер:', requestData);

      const response = await fetch(`/api/gps-profiles/${profileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log('📥 Ответ сервера:', {
        status: response.status,
        ok: response.ok,
        data: data
      });

      if (!response.ok) {
        // Обработка ошибок от сервера
        if (data.details && Array.isArray(data.details)) {
          const serverErrors: ValidationError[] = data.details.map((error: string, index: number) => ({
            field: `server-error-${index}`,
            message: error
          }));
          setValidationErrors(serverErrors);
          
          toast({
            title: "Ошибки валидации",
            description: data.details[0],
            variant: "destructive"
          });
        } else {
          throw new Error(data.error || 'Ошибка при обновлении профиля');
        }
        return;
      }

      toast({
        title: "Успешно",
        description: data.message || "Профиль обновлен",
      });

      onUpdated();
      onClose();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить профиль",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  const resetForm = () => {
    setProfile(null);
    setProfileName('');
    setColumns([]);
    setExcelHeaders([]);
    setUploadedFile(null);
    setValidationErrors([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (isLoadingProfile) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-xl">
          <div className="text-center py-8 text-vista-light/60">
            Загрузка профиля...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">Редактировать профиль GPS отчета</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информационное сообщение */}
          <Alert className="bg-blue-900/20 border-blue-500/30">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-200">
              Обязательные поля: Player, Time, TD. Вы можете использовать русские названия колонок из файла.
              {excelHeaders.length === 0 && (
                <span className="block mt-2">
                  💡 <strong>Совет:</strong> Загрузите Excel файл с GPS данными, чтобы выбрать колонки из выпадающего списка вместо ручного ввода.
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Основная информация */}
          <div className="space-y-2">
            <Label htmlFor="profileName" className="text-vista-light">Название профиля</Label>
            <Input
              id="profileName"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Название профиля"
              className={`bg-vista-dark/70 border-vista-primary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 ${
                getFieldError('name') ? 'border-red-500' : ''
              }`}
            />
            {getFieldError('name') && (
              <p className="text-red-400 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {getFieldError('name')}
              </p>
            )}
          </div>

          {/* Столбцы */}
          <Card className="bg-vista-dark/30 border-vista-secondary/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-vista-light">
                Столбцы профиля
                <Button 
                  onClick={addColumn} 
                  size="sm"
                  className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить столбец
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Отладочная информация */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-vista-light/50 p-2 bg-vista-dark/20 rounded">
                    Отладка: {columns.length} колонок загружено
                  </div>
                )}
                
                {/* Защита от пустого массива */}
                {!Array.isArray(columns) && (
                  <div className="text-red-400 text-sm p-2 bg-red-900/20 rounded">
                    ⚠️ Ошибка: columns не является массивом
                  </div>
                )}
                
                {Array.isArray(columns) && columns.map((column, index) => {
                  // Дополнительная проверка каждой колонки
                  if (!column || typeof column !== 'object') {
                    console.error('❌ Некорректная колонка:', column);
                    return null;
                  }
                  
                  return (
                    <div key={column.id || `temp-${index}`} className="flex items-center gap-4 p-4 border border-vista-secondary/30 rounded-lg bg-vista-dark/20">
                      {/* Отладочная информация для каждой колонки */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-vista-light/30 absolute top-1 right-1">
                          ID: {column.id}, Order: {column.order}
                        </div>
                      )}
                    
                    {/* Кнопки перемещения */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveColumn(column.id, 'up')}
                        disabled={index === 0}
                        className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                      >
                        <MoveUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveColumn(column.id, 'down')}
                        disabled={index === columns.length - 1}
                        className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                      >
                        <MoveDown className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Название столбца */}
                    <div className="flex-1">
                      <Label className="text-vista-light/40 font-normal">Название столбца</Label>
                      <Input
                        value={column.name}
                        onChange={(e) => updateColumn(column.id, 'name', e.target.value)}
                        placeholder="Например: Время, Дистанция"
                        className={`bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 ${
                          getFieldError(`column-${index}-name`) ? 'border-red-500' : ''
                        }`}
                      />
                      {getFieldError(`column-${index}-name`) && (
                        <p className="text-red-400 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {getFieldError(`column-${index}-name`)}
                        </p>
                      )}
                    </div>

                    {/* Тип столбца */}
                    <div className="w-48">
                      <Label className="text-vista-light/40 font-normal">Тип</Label>
                      <Select
                        value={column.type}
                        onValueChange={(value) => updateColumn(column.id, 'type', value)}
                      >
                        <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                          <SelectItem value="column">Столбец из файла</SelectItem>
                          <SelectItem value="formula">Своя формула</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Маппинг или формула */}
                    {column.type === 'column' && (
                      <div className="w-48">
                        <Label className="text-vista-light/40 font-normal">
                          {excelHeaders.length > 0 ? 'Столбец из файла' : 'Маппинг колонки'}
                        </Label>
                        
                        {excelHeaders.length > 0 ? (
                          // Выпадающий список с колонками из файла
                          <Select
                            value={column.mappedColumn || undefined}
                            onValueChange={(value) => updateColumn(column.id, 'mappedColumn', value)}
                          >
                            <SelectTrigger className={`bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 ${
                              getFieldError(`column-${index}-mapped`) ? 'border-red-500' : ''
                            }`}>
                              <SelectValue placeholder="Выберите столбец" />
                            </SelectTrigger>
                            <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                              {excelHeaders.map((header: string) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          // Текстовое поле с подсказкой о загрузке файла
                          <div className="space-y-2">
                            <Input
                              value={column.mappedColumn || ''}
                              onChange={(e) => updateColumn(column.id, 'mappedColumn', e.target.value)}
                              placeholder="Например: Player, Time, TD или русские названия"
                              className={`bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 ${
                                getFieldError(`column-${index}-mapped`) ? 'border-red-500' : ''
                              }`}
                            />
                            <p className="text-xs text-vista-light/50">
                              💡 Загрузите Excel файл для выбора из списка или введите название вручную
                            </p>
                          </div>
                        )}
                        
                        {getFieldError(`column-${index}-mapped`) && (
                          <p className="text-red-400 text-sm flex items-center mt-1">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {getFieldError(`column-${index}-mapped`)}
                          </p>
                        )}
                      </div>
                    )}

                    {column.type === 'formula' && (
                      <div className="w-48">
                        <Label className="text-vista-light/40 font-normal">Формула</Label>
                        <Input
                          value={column.formula?.operation || ''}
                          onChange={(e) => updateColumn(column.id, 'formula', { 
                            operation: e.target.value, 
                            operand1: '', 
                            operand2: '' 
                          })}
                          placeholder="Например: +, -, *, /"
                          className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
                        />
                      </div>
                    )}

                    {/* Кнопка удаления */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeColumn(column.id)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}

                {columns.length === 0 && (
                  <div className="text-center py-8 text-vista-light/60">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Добавьте столбцы для редактирования профиля</p>
                    <p className="text-sm">Или загрузите Excel файл для автоматического создания</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Общие ошибки валидации */}
          {getFieldError('columns') && (
            <Alert className="bg-red-900/20 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                {getFieldError('columns')}
              </AlertDescription>
            </Alert>
          )}

          {/* Загрузка файла */}
          <Card className="bg-vista-dark/30 border-vista-secondary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-vista-light">
                <FileSpreadsheet className="w-5 h-5" />
                Загрузка Excel файла для маппинга
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {excelHeaders.length === 0 ? (
                  // Если файл не загружен
                  <div className="border-2 border-dashed border-vista-secondary/30 rounded-lg p-6 text-center hover:border-vista-primary/50 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-4 text-vista-light/40" />
                    <p className="text-vista-light/60 mb-2">Загрузите Excel файл с GPS данными</p>
                    <p className="text-sm text-vista-light/40 mb-4">
                      Это позволит выбрать колонки из выпадающего списка вместо ручного ввода
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer bg-vista-primary hover:bg-vista-primary/90 text-vista-dark px-4 py-2 rounded-lg inline-block"
                    >
                      Выбрать Excel файл
                    </label>
                  </div>
                ) : (
                  // Если файл загружен
                  <div className="border border-vista-primary/30 rounded-lg p-4 bg-vista-primary/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-vista-light font-medium">
                            {uploadedFile?.name || 'Файл загружен'}
                          </p>
                          <p className="text-sm text-vista-light/60">
                            Найдено {excelHeaders.length} колонок
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExcelHeaders([]);
                          setUploadedFile(null);
                        }}
                        className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
                      >
                        Очистить
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Кнопки */}
          <div className="flex justify-end gap-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
            >
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 