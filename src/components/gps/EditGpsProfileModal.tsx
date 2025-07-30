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
import { Plus, Trash2, MoveUp, MoveDown, FileSpreadsheet, Upload, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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

  // Загрузка профиля при открытии модального окна
  useEffect(() => {
    if (isOpen && profileId) {
      fetchProfile();
    }
  }, [isOpen, profileId]);

  const fetchProfile = async () => {
    if (!profileId) return;
    
    try {
      setIsLoadingProfile(true);
      const response = await fetch(`/api/gps-profiles/${profileId}`);
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        setProfileName(profileData.name);



        setColumns(profileData.columnMapping || []);
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
      id: `col-${Date.now()}`,
      name: '',
      order: columns.length,
      type: 'column'
    };
    setColumns([...columns, newColumn]);
  };

  const removeColumn = (id: string) => {
    setColumns(columns.filter(col => col.id !== id));
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
    setColumns(columns.map(col => 
      col.id === id ? { ...col, [field]: value } : col
    ));
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

      const response = await fetch(`/api/gps-profiles/${profileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileName,


          columnMapping: columns.map(col => ({
            name: col.name,
            mappedColumn: col.mappedColumn,
            order: col.order,
            type: col.type,
            formula: col.formula
          })),

        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении профиля');
      }

      toast({
        title: "Успешно",
        description: "Профиль обновлен",
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

  const resetForm = () => {
    setProfile(null);
    setProfileName('');



    setColumns([]);
    setExcelHeaders([]);
    setUploadedFile(null);
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
          {/* Основная информация */}
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