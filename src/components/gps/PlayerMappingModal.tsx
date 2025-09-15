'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { GpsReport } from '@/types/gps';
import { toast } from '@/components/ui/use-toast';

interface PlayerMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: GpsReport;
  onMappingCompleted: () => void;
}

interface PlayerMapping {
  rowIndex: number;
  playerId: string;
  playerName: string;
  position?: string;
}

export default function PlayerMappingModal({
  open,
  onOpenChange,
  report,
  onMappingCompleted,
}: PlayerMappingModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mappings, setMappings] = useState<PlayerMapping[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for demonstration
  const mockPlayers = [
    { id: '1', name: 'Иванов Иван', position: 'FW' },
    { id: '2', name: 'Петров Петр', position: 'MF' },
    { id: '3', name: 'Сидоров Сидор', position: 'DF' },
    { id: '4', name: 'Козлов Козел', position: 'GK' },
    { id: '5', name: 'Смирнов Смирн', position: 'FW' },
  ];

  const mockReportData = [
    { rowIndex: 0, athleteName: 'Ivanov I.', position: 'FW' },
    { rowIndex: 1, athleteName: 'Petrov P.', position: 'MF' },
    { rowIndex: 2, athleteName: 'Sidorov S.', position: 'DF' },
    { rowIndex: 3, athleteName: 'Kozlov K.', position: 'GK' },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      // TODO: Load actual report data and available players
      setAvailablePlayers(mockPlayers);
      
      // Initialize mappings from report data
      const initialMappings = mockReportData.map(row => ({
        rowIndex: row.rowIndex,
        playerId: '',
        playerName: row.athleteName,
        position: row.position,
      }));
      setMappings(initialMappings);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, report]);

  const handlePlayerSelect = (rowIndex: number, playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    if (player) {
      setMappings(prev => prev.map(mapping => 
        mapping.rowIndex === rowIndex 
          ? { ...mapping, playerId: player.id, playerName: player.name, position: player.position }
          : mapping
      ));
    }
  };

  const handleSave = async () => {
    const unmappedRows = mappings.filter(m => !m.playerId);
    if (unmappedRows.length > 0) {
      toast({
        title: 'Предупреждение',
        description: `Есть ${unmappedRows.length} несопоставленных строк`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // TODO: Implement actual mapping save
      console.log('Saving mappings:', mappings);
      
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: 'Успех',
        description: 'Маппинги игроков сохранены',
      });
      
      onMappingCompleted();
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить маппинги',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredPlayers = availablePlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (player.position && player.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const mappedCount = mappings.filter(m => m.playerId).length;
  const totalCount = mappings.length;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Настройка маппингов игроков</DialogTitle>
            <DialogDescription>
              Загрузка данных отчета...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Загрузка...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Настройка маппингов игроков
          </DialogTitle>
          <DialogDescription>
            Сопоставьте строки из GPS отчета &quot;{report.name}&quot; с игроками команды
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Прогресс сопоставления</span>
                </div>
                <Badge variant={mappedCount === totalCount ? 'default' : 'secondary'}>
                  {mappedCount} из {totalCount}
                </Badge>
              </div>
              <div className="mt-2 w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(mappedCount / totalCount) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Player Search */}
          <div className="space-y-2">
            <Label>Поиск игроков</Label>
            <Input
              placeholder="Поиск по имени или позиции..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Mappings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Сопоставление строк с игроками</CardTitle>
              <CardDescription>
                Выберите игрока для каждой строки из GPS отчета
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Строка</TableHead>
                      <TableHead>Имя из отчета</TableHead>
                      <TableHead>Позиция из отчета</TableHead>
                      <TableHead>Выберите игрока</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping) => (
                      <TableRow key={mapping.rowIndex}>
                        <TableCell className="font-mono text-sm">
                          #{mapping.rowIndex + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {mapping.playerName}
                        </TableCell>
                        <TableCell>
                          {mapping.position && (
                            <Badge variant="outline">{mapping.position}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping.playerId}
                            onValueChange={(value) => handlePlayerSelect(mapping.rowIndex, value)}
                          >
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Выберите игрока" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredPlayers.map((player) => (
                                <SelectItem key={player.id} value={player.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{player.name}</span>
                                    {player.position && (
                                      <Badge variant="secondary" className="text-xs">
                                        {player.position}
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {mapping.playerId ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Сопоставлен</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm">Не сопоставлен</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {mappedCount < totalCount && (
            <Card className="border-destructive/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      Не все строки сопоставлены
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Сопоставьте все строки перед сохранением
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || mappedCount < totalCount}
          >
            {saving ? 'Сохранение...' : 'Сохранить маппинги'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
