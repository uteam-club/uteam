'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Clock, User, Edit, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { gpsLogger } from '@/lib/logger';

interface HistoryEntry {
  id: string;
  reportDataId: string;
  reportId: string;
  playerId: string;
  fieldName: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string;
  changedById: string;
  changedByName: string;
  changedAt: string;
  changeType: 'manual' | 'automatic';
}

interface GpsReportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportName: string;
}

export function GpsReportHistoryModal({ 
  isOpen, 
  onClose, 
  reportId, 
  reportName 
}: GpsReportHistoryModalProps) {
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && reportId) {
      fetchHistory();
    }
  }, [isOpen, reportId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/gps/reports/${reportId}/history`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.history || []);
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить историю изменений',
          variant: 'destructive',
        });
      }
    } catch (error) {
      gpsLogger.error('Component', 'Error fetching history:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при загрузке истории',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeTypeBadge = (changeType: string) => {
    switch (changeType) {
      case 'manual':
        return (
          <Badge variant="outline" className="bg-vista-primary/10 text-vista-primary border-vista-primary/30">
            <Edit className="h-3 w-3 mr-1" />
            Ручное
          </Badge>
        );
      case 'automatic':
        return (
          <Badge variant="outline" className="bg-vista-secondary/10 text-vista-secondary border-vista-secondary/30">
            <RotateCcw className="h-3 w-3 mr-1" />
            Автоматическое
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-vista-secondary/10 text-vista-secondary border-vista-secondary/30">
            {changeType}
          </Badge>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-vista-dark border border-vista-secondary/30 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-vista-secondary/30">
          <div>
            <h2 className="text-xl font-semibold text-vista-light">
              История изменений
            </h2>
            <p className="text-sm text-vista-light mt-1">
              {reportName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-vista-secondary hover:text-vista-light hover:bg-vista-secondary/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Содержимое */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vista-primary"></div>
              <span className="ml-2 text-vista-secondary">Загрузка истории...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-vista-secondary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-vista-light mb-2">
                История пуста
              </h3>
              <p className="text-vista-secondary">
                В этом отчете пока нет изменений
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <Card key={entry.id} className="bg-vista-dark/50 border border-vista-secondary/20 hover:border-vista-secondary/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-vista-light" />
                          <span className="font-medium text-vista-light">
                            {entry.changedByName}
                          </span>
                        </div>
                        {getChangeTypeBadge(entry.changeType)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-vista-light">
                        <Clock className="h-4 w-4" />
                        {formatDate(entry.changedAt)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-vista-light">
                          Поле: {entry.fieldLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        {entry.oldValue && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-vista-light">Было:</span>
                            <span className="text-sm bg-red-500/20 text-vista-light px-3 py-1 rounded-md border border-red-500/30">
                              {entry.oldValue}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-vista-light">Стало:</span>
                          <span className="text-sm bg-green-500/20 text-vista-light px-3 py-1 rounded-md border border-green-500/30">
                            {entry.newValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Подвал */}
        <div className="flex items-center justify-end p-6 border-t border-vista-secondary/30">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-vista-dark border border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20 hover:border-vista-secondary/70"
          >
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
