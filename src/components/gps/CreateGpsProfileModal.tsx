'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle, Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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

export default function CreateGpsProfileModal({ isOpen, onClose, onCreated }: CreateGpsProfileModalProps) {
  const [profileName, setProfileName] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addColumn = () => {
    const newColumn: Column = {
      id: Date.now().toString(),
      name: '',
      order: columns.length + 1,
      type: 'column'
    };
    setColumns([...columns, newColumn]);
  };

  const removeColumn = (id: string) => {
    setColumns(columns.filter(col => col.id !== id));
    // Пересчитываем порядок
    setColumns(prev => prev.filter(col => col.id !== id).map((col, index) => ({
      ...col,
      order: index + 1
    })));
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
      
      // Дополнительная проверка заголовков
      const validHeaders = data.headers.filter((header: string) => header && header.trim() !== '');
      
      if (validHeaders.length === 0) {
        throw new Error('Не найдено валидных заголовков в файле');
      }
      
      setExcelHeaders(validHeaders);
      setUploadedFile(file);
      toast({
        title: "Файл загружен",
        description: `Найдено ${validHeaders.length} столбцов`,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Не удалось загрузить файл";
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profileName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название профиля",
        variant: "destructive"
      });
      return;
    }

    if (columns.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте хотя бы один столбец",
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

      if (!response.ok) {
        throw new Error('Ошибка при сохранении профиля');
      }

      toast({
        title: "Успешно",
        description: "Профиль создан",
      });

      onCreated();
      onClose();
      setProfileName('');
      setColumns([]);
      setUploadedFile(null);
      setExcelHeaders([]);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">Создать профиль GPS отчета</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Название профиля */}
          <div className="space-y-2">
            <Input
              id="profileName"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Название профиля"
              className="bg-vista-dark/70 border-vista-primary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
            />
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
                        className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50"
                      />
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
                            {excelHeaders
                              .filter(header => header && header.trim() !== '')
                              .map(header => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {column.type === 'formula' && (
                      <div className="w-48">
                        <Label className="text-vista-light/40 font-normal">Формула</Label>
                        <Select
                          value={column.formula?.operation || undefined}
                          onValueChange={(value) => updateColumn(column.id, 'formula', { 
                            operation: value, 
                            operand1: '', 
                            operand2: '' 
                          })}
                        >
                                                  <SelectTrigger className="bg-vista-dark border-vista-secondary/50 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50">
                          <SelectValue placeholder="Выберите операцию" />
                        </SelectTrigger>
                        <SelectContent className="bg-vista-dark border-vista-secondary/50 text-vista-light shadow-lg">
                          <SelectItem value="divide">Деление (A / B)</SelectItem>
                          <SelectItem value="multiply">Умножение (A * B)</SelectItem>
                          <SelectItem value="add">Сложение (A + B)</SelectItem>
                          <SelectItem value="subtract">Вычитание (A - B)</SelectItem>
                        </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Удаление */}
                    <div className="w-10 flex flex-col">
                      <div className="h-5"></div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeColumn(column.id)}
                        className="border-vista-error/50 text-vista-error hover:bg-vista-error/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {columns.length === 0 && (
                  <div className="text-center py-8 text-vista-light/50">
                    Нажмите "Добавить столбец" чтобы создать первый столбец
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Загрузка файла */}
          <Card className="bg-vista-dark/30 border-vista-secondary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-vista-light">
                <FileSpreadsheet className="w-5 h-5" />
                Загрузка файла для маппинга
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-vista-secondary/30 rounded-lg p-6 text-center hover:border-vista-primary/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-vista-light/40" />
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
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-vista-primary hover:text-vista-primary/80 transition-colors">
                      Выберите Excel или CSV файл
                    </span>
                  </label>
                </div>

                {uploadedFile && (
                  <div className="flex items-center gap-2 text-vista-success">
                    <CheckCircle className="w-4 h-4" />
                    <span>{uploadedFile.name} загружен</span>
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
              disabled={isLoading}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить профиль'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 