'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CANON } from '@/canon/metrics.registry';

type RecalcOption = 'none' | '7' | '30' | 'all';

type RecalcResult = {
  total: number;
  matched: number;
  updated: number;
  skipped: number;
  errors: string[];
  dryRun: boolean;
};

type Props = {
  profileId: string;
  newKeys: string[];
  onClose: () => void;
};

export default function RecalcCanonicalModal({ profileId, newKeys, onClose }: Props) {
  const [selectedOption, setSelectedOption] = useState<RecalcOption>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [recalcResult, setRecalcResult] = useState<RecalcResult | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  // При изменении опции делаем dry-run
  useEffect(() => {
    if (selectedOption === 'none') {
      setRecalcResult(null);
      return;
    }

    const performDryRun = async () => {
      setIsLoading(true);
      try {
        const days = selectedOption === 'all' ? null : parseInt(selectedOption);
        const response = await fetch('/api/gps-reports/recalculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId,
            days,
            dryRun: true,
            newKeys
          })
        });

        if (!response.ok) {
          throw new Error('Ошибка при проверке отчётов');
        }

        const result = await response.json();
        setRecalcResult(result);
      } catch (error) {
        console.error('Dry run failed:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось проверить количество отчётов",
          variant: "destructive"
        });
        setRecalcResult(null);
      } finally {
        setIsLoading(false);
      }
    };

    performDryRun();
  }, [selectedOption, profileId, newKeys, toast]);

  const handleRecalculate = async () => {
    if (selectedOption === 'none') {
      // Если выбрано "Не пересчитывать", просто закрываем модалку
      onClose();
      return;
    }

    if (!recalcResult) return;

    setIsRecalculating(true);
    try {
      const days = selectedOption === 'all' ? null : parseInt(selectedOption);
      const response = await fetch('/api/gps-reports/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          days,
          dryRun: false,
          newKeys
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при пересчёте отчётов');
      }

      const result = await response.json();
      setRecalcResult(result);

      toast({
        title: "Пересчёт завершён",
        description: `Обновлено: ${result.updated}, пропущено: ${result.skipped}${result.errors.length > 0 ? `, ошибок: ${result.errors.length}` : ''}`,
        variant: result.errors.length > 0 ? "destructive" : "default"
      });

      // Закрываем модалку через небольшую задержку
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Recalculation failed:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось пересчитать отчёты",
        variant: "destructive"
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const isRecalculateDisabled = isLoading || isRecalculating;
  const isSaveMode = selectedOption === 'none';

  // Получаем информацию о добавляемых метриках
  const getMetricsInfo = () => {
    if (newKeys.length === 0) return '';
    
    const metrics = newKeys
      .map(key => CANON.metrics.find(m => m.key === key))
      .filter(Boolean)
      .slice(0, 3); // Показываем максимум 3 метрики
    
    const labels = metrics.map(metric => {
      const label = metric?.labels?.ru || metric?.labels?.en || metric?.key || '';
      const unit = metric?.dimension ? CANON.dimensions[metric.dimension]?.canonical_unit : '';
      return unit ? `${label} (${unit})` : label;
    });
    
    if (newKeys.length <= 3) {
      return labels.join(', ');
    } else {
      return labels.join(', ') + ` +${newKeys.length - 3} ещё`;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-vista-dark border-vista-secondary/30">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl font-semibold">
            Пересчёт канонических метрик
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Информация о новых метриках */}
          <div className="space-y-3">
            <div className="text-sm text-vista-light/70">
              Добавлены новые метрики: <span className="text-vista-light font-medium">{newKeys.join(', ')}</span>
            </div>
            
            {getMetricsInfo() && (
              <div className="bg-vista-secondary/20 border border-vista-secondary/30 rounded-lg p-4">
                <div className="text-sm text-vista-light font-medium mb-1">
                  Добавятся метрики:
                </div>
                <div className="text-sm text-vista-light/80">
                  {getMetricsInfo()}
                </div>
              </div>
            )}
          </div>

          {/* Опции пересчёта */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-vista-light mb-3">
              Выберите период для пересчёта:
            </div>
            
            <RadioGroup 
              value={selectedOption} 
              onValueChange={(value) => setSelectedOption(value as RecalcOption)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-vista-secondary/20 hover:bg-vista-secondary/10 transition-colors">
                <RadioGroupItem 
                  value="none" 
                  id="none" 
                  className="border-vista-secondary/50 data-[state=checked]:border-vista-primary data-[state=checked]:bg-vista-primary"
                />
                <Label htmlFor="none" className="text-vista-light cursor-pointer">
                  Не пересчитывать старые отчёты
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-vista-secondary/20 hover:bg-vista-secondary/10 transition-colors">
                <RadioGroupItem 
                  value="7" 
                  id="7" 
                  className="border-vista-secondary/50 data-[state=checked]:border-vista-primary data-[state=checked]:bg-vista-primary"
                />
                <Label htmlFor="7" className="text-vista-light cursor-pointer">
                  Пересчитать за 7 дней
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-vista-secondary/20 hover:bg-vista-secondary/10 transition-colors">
                <RadioGroupItem 
                  value="30" 
                  id="30" 
                  className="border-vista-secondary/50 data-[state=checked]:border-vista-primary data-[state=checked]:bg-vista-primary"
                />
                <Label htmlFor="30" className="text-vista-light cursor-pointer">
                  Пересчитать за 30 дней
                </Label>
              </div>
              
              {/* Кнопка "Дополнительно" */}
              <div 
                className="flex items-center space-x-3 p-3 rounded-lg border border-vista-secondary/20 hover:bg-vista-secondary/10 transition-colors cursor-pointer"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full bg-vista-light/60 transition-transform ${showAdvanced ? 'rotate-45' : ''}`}></div>
                </div>
                <Label className="text-vista-light cursor-pointer">
                  Дополнительно
                </Label>
              </div>
              
              {/* Скрытый пункт "За всё время" */}
              {showAdvanced && (
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-vista-error/30 hover:bg-vista-error/10 transition-colors ml-4">
                  <RadioGroupItem 
                    value="all" 
                    id="all" 
                    className="border-vista-error/50 data-[state=checked]:border-vista-error data-[state=checked]:bg-vista-error"
                  />
                  <Label htmlFor="all" className="text-vista-light cursor-pointer">
                    За всё время <span className="text-vista-error/70">(не рекомендуется)</span>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Статус загрузки */}
          {isLoading && (
            <div className="flex items-center space-x-3 text-sm text-vista-light/70 bg-vista-secondary/10 rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin text-vista-primary" />
              <span>Проверяем количество отчётов...</span>
            </div>
          )}

          {/* Результат dry-run */}
          {recalcResult && !isLoading && (
            <Alert className="bg-vista-secondary/20 border-vista-secondary/30">
              <AlertCircle className="h-4 w-4 text-vista-primary" />
              <AlertDescription className="text-vista-light">
                Будет обновлено <span className="font-medium text-vista-primary">{recalcResult.matched}</span> отчётов
              </AlertDescription>
            </Alert>
          )}

          {/* Результат пересчёта */}
          {recalcResult && !isRecalculating && recalcResult.dryRun === false && (
            <Alert className={recalcResult.errors.length > 0 ? "bg-vista-error/20 border-vista-error/30" : "bg-vista-success/20 border-vista-success/30"}>
              <CheckCircle className={`h-4 w-4 ${recalcResult.errors.length > 0 ? 'text-vista-error' : 'text-vista-success'}`} />
              <AlertDescription className="text-vista-light">
                <div className="space-y-1">
                  <div>Обновлено: <span className="font-medium">{recalcResult.updated}</span></div>
                  <div>Пропущено: <span className="font-medium">{recalcResult.skipped}</span></div>
                  {recalcResult.errors.length > 0 && (
                    <div>Ошибок: <span className="font-medium text-vista-error">{recalcResult.errors.length}</span></div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Кнопки действий */}
          <div className="flex justify-end gap-2 pt-4 border-t border-vista-secondary/20">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isRecalculating}
              className="bg-transparent border border-vista-error/50 text-vista-error hover:bg-vista-error/10 h-9 px-3 font-normal"
            >
              Отмена
            </Button>
            <Button 
              onClick={handleRecalculate} 
              disabled={isRecalculateDisabled}
              className="bg-transparent border border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-3 font-normal"
            >
              {isRecalculating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Пересчёт...
                </>
              ) : isSaveMode ? (
                'Сохранить'
              ) : (
                'Пересчитать'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
