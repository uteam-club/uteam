'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle, Plus, Trash2, MoveUp, MoveDown, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface ValidationError {
  field: string;
  message: string;
}

export default function CreateGpsProfileModal({ isOpen, onClose, onCreated }: CreateGpsProfileModalProps) {
  const [profileName, setProfileName] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const { toast } = useToast();

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
        } else {
          // Проверка на русские символы
          const russianPattern = /[а-яё]/i;
          if (russianPattern.test(column.mappedColumn)) {
            // Убираем эту проверку - разрешаем русские названия в mappedColumn
            // errors.push({ 
            //   field: `column-${index}-mapped`, 
            //   message: `Колонка "${column.name}": используйте английские названия вместо "${column.mappedColumn}"` 
            // });
          }

          // Проверка на специальные символы
          const specialCharsPattern = /[^a-zA-Z0-9\s\-_]/;
          if (specialCharsPattern.test(column.mappedColumn)) {
            // Убираем эту проверку - разрешаем любые символы в mappedColumn
            // errors.push({ 
            //   field: `column-${index}-mapped`, 
            //   message: `Колонка "${column.name}": избегайте специальных символов в названии колонки` 
            // });
          }
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

  const addColumn = () => {
    const newColumn: Column = {
      id: Date.now().toString(),
      name: '',
      order: columns.length + 1,
      type: 'column'
    };
    setColumns([...columns, newColumn]);
    setValidationErrors([]); // Очищаем ошибки при добавлении колонки
  };

  const removeColumn = (id: string) => {
    setColumns(columns.filter(col => col.id !== id));
    // Пересчитываем порядок
    setColumns(prev => prev.filter(col => col.id !== id).map((col, index) => ({
      ...col,
      order: index + 1
    })));
    setValidationErrors([]); // Очищаем ошибки при удалении колонки
  };

  const moveColumn = (id: string, direction: 'up' | 'down') => {
    const currentIndex = columns.findIndex(col => col.id === id);
    if (currentIndex === -1) return;

    const newColumns = [...columns];
    if (direction === 'up' && currentIndex > 0) {
      [newColumns[currentIndex], newColumns[currentIndex - 1]] = [newColumns[currentIndex - 1], newColumns[currentIndex]];
    } else if (direction === 'down' && currentIndex < newColumns.length - 1) {
      [newColumns[currentIndex], newColumns[currentIndex + 1]] = [newColumns[currentIndex + 1], newColumns[currentIndex]];
    }

    // Обновляем порядок
    newColumns.forEach((col, index) => {
      col.order = index + 1;
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
      
      // Автоматически создаем колонки из заголовков Excel
      const newColumns: Column[] = data.headers.map((header: string, index: number) => ({
        id: Date.now().toString() + index,
        name: header,
        mappedColumn: header, // По умолчанию используем то же название
        order: index + 1,
        type: 'column'
      }));
      
      setColumns(newColumns);
      
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

    try {
      setIsLoading(true);
      const response = await fetch('/api/gps-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileName,
          columns: columns.map(col => ({
            name: col.name,
            mappedColumn: col.mappedColumn,
            order: col.order,
            type: col.type,
            formula: col.formula
          }))
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
          
          toast({
            title: "Ошибки валидации",
            description: data.details[0],
            variant: "destructive"
          });
        } else {
          throw new Error(data.error || 'Ошибка при сохранении профиля');
        }
        return;
      }

      toast({
        title: "Успешно",
        description: data.message || "Профиль создан",
      });

      onCreated();
      onClose();
      setProfileName('');
      setColumns([]);
      setUploadedFile(null);
      setExcelHeaders([]);
      setValidationErrors([]);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить профиль",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">Создать профиль GPS отчета</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информационное сообщение */}
          <Alert className="bg-blue-900/20 border-blue-500/30">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-200">
              Обязательные поля: Player, Time, TD. Вы можете использовать русские названия колонок из файла.
            </AlertDescription>
          </Alert>

          {/* Стандартные шаблоны */}
          <Card className="bg-vista-dark/30 border-vista-secondary/30">
            <CardHeader>
              <CardTitle className="text-vista-light">Стандартные шаблоны</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => loadTemplate('B-SIGHT')}
                  variant="outline"
                  className="border-vista-primary/50 text-vista-primary hover:bg-vista-primary/20"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  B-SIGHT Стандартный
                </Button>
                <Button
                  onClick={() => loadTemplate('Polar')}
                  variant="outline"
                  className="border-vista-primary/50 text-vista-primary hover:bg-vista-primary/20"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Polar Стандартный
                </Button>
                <Button
                  onClick={() => loadTemplate('Catapult')}
                  variant="outline"
                  className="border-vista-primary/50 text-vista-primary hover:bg-vista-primary/20"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Catapult Стандартный
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Название профиля */}
          <div className="space-y-2">
            <Label htmlFor="profileName" className="text-vista-light">Название профиля</Label>
            <Input
              id="profileName"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Например: B-SIGHT Стандартный"
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
                {columns.map((column, index) => (
                  <div key={column.id} className="flex items-center gap-4 p-4 border border-vista-secondary/30 rounded-lg bg-vista-dark/20">
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
                        <p className="text-red-400 text-sm flex items-center mt-1">
                          <AlertCircle className="w-3 h-3 mr-1" />
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
                    {column.type === 'column' && excelHeaders.length > 0 && (
                      <div className="w-48">
                        <Label className="text-vista-light/40 font-normal">Столбец из файла</Label>
                        <Select
                          value={column.mappedColumn || undefined}
                          onValueChange={(value) => updateColumn(column.id, 'mappedColumn', value)}
                        >
                          <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
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
                      </div>
                    )}

                    {column.type === 'column' && excelHeaders.length === 0 && (
                      <div className="w-48">
                        <Label className="text-vista-light/40 font-normal">Маппинг колонки</Label>
                        <Input
                          value={column.mappedColumn || ''}
                          onChange={(e) => updateColumn(column.id, 'mappedColumn', e.target.value)}
                          placeholder="Например: Player, Time, TD или русские названия"
                          className={`bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 ${
                            getFieldError(`column-${index}-mapped`) ? 'border-red-500' : ''
                          }`}
                        />
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
                          onChange={(e) => updateColumn(column.id, 'formula', { ...column.formula, operation: e.target.value })}
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
                ))}

                {columns.length === 0 && (
                  <div className="text-center py-8 text-vista-light/60">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Добавьте столбцы для создания профиля</p>
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
              <CardTitle className="text-vista-light">Загрузить Excel файл (опционально)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-vista-secondary/30 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-4 text-vista-light/60" />
                  <p className="text-vista-light/60 mb-2">Перетащите Excel файл сюда или нажмите для выбора</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer bg-vista-primary hover:bg-vista-primary/90 text-vista-dark px-4 py-2 rounded-lg inline-block"
                  >
                    Выбрать файл
                  </label>
                </div>

                {uploadedFile && (
                  <div className="flex items-center gap-2 text-vista-light/80">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>{uploadedFile.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Кнопки */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || columns.length === 0}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark disabled:opacity-50"
            >
              {isLoading ? 'Создание...' : 'Создать профиль'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 