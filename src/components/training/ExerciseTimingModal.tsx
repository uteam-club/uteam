'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Pause, RotateCcw } from 'lucide-react';

interface ExerciseTimingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (timing: {
    series: number;
    repetitions: number;
    repetitionTime: number;
    pauseBetweenRepetitions: number;
    pauseBetweenSeries: number;
  }) => void;
  exerciseTitle: string;
  initialTiming?: {
    series: number;
    repetitions: number;
    repetitionTime: number;
    pauseBetweenRepetitions: number;
    pauseBetweenSeries: number;
  };
}

export default function ExerciseTimingModal({
  isOpen,
  onClose,
  onSave,
  exerciseTitle,
  initialTiming
}: ExerciseTimingModalProps) {
  const [series, setSeries] = useState(initialTiming?.series || 1);
  const [repetitions, setRepetitions] = useState(initialTiming?.repetitions || 1);
  
  // Отдельные поля для минут и секунд
  const [repetitionTimeMinutes, setRepetitionTimeMinutes] = useState(
    Math.floor((initialTiming?.repetitionTime || 30) / 60)
  );
  const [repetitionTimeSeconds, setRepetitionTimeSeconds] = useState(
    (initialTiming?.repetitionTime || 30) % 60
  );
  
  const [pauseBetweenRepetitionsMinutes, setPauseBetweenRepetitionsMinutes] = useState(
    Math.floor((initialTiming?.pauseBetweenRepetitions || 15) / 60)
  );
  const [pauseBetweenRepetitionsSeconds, setPauseBetweenRepetitionsSeconds] = useState(
    (initialTiming?.pauseBetweenRepetitions || 15) % 60
  );
  
  const [pauseBetweenSeriesMinutes, setPauseBetweenSeriesMinutes] = useState(
    Math.floor((initialTiming?.pauseBetweenSeries || 30) / 60)
  );
  const [pauseBetweenSeriesSeconds, setPauseBetweenSeriesSeconds] = useState(
    (initialTiming?.pauseBetweenSeries || 30) % 60
  );

  // Реф для отслеживания высоты модального окна
  const modalRef = useRef<HTMLDivElement>(null);
  const [topMargin, setTopMargin] = useState('mt-8');

  // Вычисляем общее время в секундах для отображения
  const totalRepetitionTime = repetitionTimeMinutes * 60 + repetitionTimeSeconds;
  const totalPauseBetweenRepetitions = pauseBetweenRepetitionsMinutes * 60 + pauseBetweenRepetitionsSeconds;
  const totalPauseBetweenSeries = pauseBetweenSeriesMinutes * 60 + pauseBetweenSeriesSeconds;

  // Общее время выполнения упражнения
  const totalExerciseTime = series * (repetitions * totalRepetitionTime + (repetitions - 1) * totalPauseBetweenRepetitions) + (series - 1) * totalPauseBetweenSeries;

  // Функция для расчета отступа сверху
  const calculateTopMargin = () => {
    if (modalRef.current) {
      const modalHeight = modalRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      const topBarHeight = 80; // Примерная высота верхнего бара
      
      // Если модальное окно слишком высокое, увеличиваем отступ сверху
      if (modalHeight > windowHeight - topBarHeight - 100) {
        setTopMargin('mt-16');
      } else if (modalHeight > windowHeight - topBarHeight - 200) {
        setTopMargin('mt-12');
      } else {
        setTopMargin('mt-8');
      }
    }
  };

  // Пересчитываем отступ при изменении количества серий
  useEffect(() => {
    // Небольшая задержка для корректного расчета высоты после рендера
    const timer = setTimeout(calculateTopMargin, 100);
    return () => clearTimeout(timer);
  }, [series, isOpen]);

  // Пересчитываем отступ при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        calculateTopMargin();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleSave = () => {
    onSave({
      series,
      repetitions,
      repetitionTime: totalRepetitionTime,
      pauseBetweenRepetitions: totalPauseBetweenRepetitions,
      pauseBetweenSeries: totalPauseBetweenSeries
    });
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}м ${seconds}с`;
    }
    return `${seconds}с`;
  };

  const handleInputChange = (
    value: string,
    setMinutes: (value: number) => void,
    setSeconds: (value: number) => void,
    isMinutes: boolean
  ) => {
    // Разрешаем пустую строку для удобства ввода
    if (value === '') {
      if (isMinutes) {
        setMinutes(0);
      } else {
        setSeconds(0);
      }
      return;
    }
    
    const numValue = parseInt(value) || 0;
    if (isMinutes) {
      setMinutes(Math.max(0, Math.min(59, numValue)));
    } else {
      setSeconds(Math.max(0, Math.min(59, numValue)));
    }
  };

  const handleNumberInputChange = (
    value: string,
    setValue: (value: number) => void,
    min: number,
    max: number
  ) => {
    // Разрешаем пустую строку для удобства ввода
    if (value === '') {
      setValue(min);
      return;
    }
    
    const numValue = parseInt(value) || min;
    setValue(Math.max(min, Math.min(max, numValue)));
  };

  // Функция для обработки фокуса на поле ввода
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // При фокусе выделяем весь текст для удобства замены
    e.target.select();
  };

  // Функция для обработки ввода с возможностью удаления 0
  const handleInputWithZero = (
    value: string,
    setValue: (value: number) => void,
    min: number,
    max: number
  ) => {
    // Если поле пустое, устанавливаем минимальное значение
    if (value === '') {
      setValue(min);
      return;
    }
    
    // Если введено только 0, разрешаем это
    if (value === '0') {
      setValue(0);
      return;
    }
    
    // Убираем ведущие нули
    const cleanValue = value.replace(/^0+/, '');
    
    if (cleanValue === '') {
      setValue(min);
      return;
    }
    
    const numValue = parseInt(cleanValue) || min;
    setValue(Math.max(min, Math.min(max, numValue)));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={modalRef}
        className={`bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-2xl overflow-hidden backdrop-blur-xl ${topMargin}`}
      >
        <DialogHeader className="pt-6">
          <DialogTitle className="text-vista-light text-xl flex items-center gap-2">
            <Clock className="h-5 w-5 text-vista-primary" />
            Тайминги упражнения
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 px-6 pb-6">
          {/* Название упражнения */}
          <div className="p-4 bg-vista-dark/50 border border-vista-secondary/30 rounded-lg">
            <p className="text-vista-primary font-medium text-sm text-center">{exerciseTitle}</p>
          </div>

          {/* Первый ряд: Количество серий и Повторов в серии */}
          <div className="grid grid-cols-2 gap-6">
            {/* Количество серий */}
            <div className="space-y-3">
              <Label htmlFor="series" className="text-vista-light/90 flex items-center gap-2 text-sm font-medium">
                <RotateCcw className="h-4 w-4 text-vista-primary flex-shrink-0" />
                Количество серий
              </Label>
              <Input
                id="series"
                type="number"
                min="1"
                max="20"
                value={series}
                onChange={e => handleNumberInputChange(e.target.value, setSeries, 1, 20)}
                className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 h-10"
              />
            </div>

            {/* Повторов в серии */}
            <div className="space-y-3">
              <Label htmlFor="repetitions" className="text-vista-light/90 flex items-center gap-2 text-sm font-medium">
                <RotateCcw className="h-4 w-4 text-vista-primary flex-shrink-0" />
                Повторов в серии
              </Label>
              <Input
                id="repetitions"
                type="number"
                min="1"
                max="50"
                value={repetitions}
                onChange={e => handleNumberInputChange(e.target.value, setRepetitions, 1, 50)}
                className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 h-10"
              />
            </div>
          </div>

          {/* Второй ряд: Время повтора и Пауза между повторами */}
          <div className="grid grid-cols-2 gap-6">
            {/* Время повтора */}
            <div className="space-y-3">
              <Label className="text-vista-light/90 flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-vista-primary flex-shrink-0" />
                Время повтора
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="repetitionTimeMinutes" className="text-xs text-vista-light/60 block mb-1">
                    Мин
                  </Label>
                  <Input
                    id="repetitionTimeMinutes"
                    type="number"
                    min="0"
                    max="59"
                    value={repetitionTimeMinutes}
                    onChange={e => handleInputWithZero(e.target.value, setRepetitionTimeMinutes, 0, 59)}
                    onFocus={handleFocus}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 h-9 text-center"
                  />
                </div>
                <div>
                  <Label htmlFor="repetitionTimeSeconds" className="text-xs text-vista-light/60 block mb-1">
                    Сек
                  </Label>
                  <Input
                    id="repetitionTimeSeconds"
                    type="number"
                    min="0"
                    max="59"
                    value={repetitionTimeSeconds}
                    onChange={e => handleInputWithZero(e.target.value, setRepetitionTimeSeconds, 0, 59)}
                    onFocus={handleFocus}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 h-9 text-center"
                  />
                </div>
              </div>
            </div>

            {/* Пауза между повторами */}
            <div className="space-y-3">
              <Label className="text-vista-light/90 flex items-center gap-2 text-sm font-medium">
                <Pause className="h-4 w-4 text-vista-primary flex-shrink-0" />
                Пауза между повторами
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="pauseBetweenRepetitionsMinutes" className="text-xs text-vista-light/60 block mb-1">
                    Мин
                  </Label>
                  <Input
                    id="pauseBetweenRepetitionsMinutes"
                    type="number"
                    min="0"
                    max="59"
                    value={pauseBetweenRepetitionsMinutes}
                    onChange={e => handleInputWithZero(e.target.value, setPauseBetweenRepetitionsMinutes, 0, 59)}
                    onFocus={handleFocus}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 h-9 text-center"
                  />
                </div>
                <div>
                  <Label htmlFor="pauseBetweenRepetitionsSeconds" className="text-xs text-vista-light/60 block mb-1">
                    Сек
                  </Label>
                  <Input
                    id="pauseBetweenRepetitionsSeconds"
                    type="number"
                    min="0"
                    max="59"
                    value={pauseBetweenRepetitionsSeconds}
                    onChange={e => handleInputWithZero(e.target.value, setPauseBetweenRepetitionsSeconds, 0, 59)}
                    onFocus={handleFocus}
                    className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 h-9 text-center"
                  />
                </div>
              </div>
              
              {/* Пауза между сериями (только если серий больше 1) */}
              {series > 1 && (
                <div className="space-y-3 pt-4">
                  <Label className="text-vista-light/90 flex items-center gap-2 text-sm font-medium">
                    <Pause className="h-4 w-4 text-vista-primary flex-shrink-0" />
                    Пауза между сериями
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="pauseBetweenSeriesMinutes" className="text-xs text-vista-light/60 block mb-1">
                        Мин
                      </Label>
                      <Input
                        id="pauseBetweenSeriesMinutes"
                        type="number"
                        min="0"
                        max="59"
                        value={pauseBetweenSeriesMinutes}
                        onChange={e => handleInputWithZero(e.target.value, setPauseBetweenSeriesMinutes, 0, 59)}
                        onFocus={handleFocus}
                        className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 h-9 text-center"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pauseBetweenSeriesSeconds" className="text-xs text-vista-light/60 block mb-1">
                        Сек
                      </Label>
                      <Input
                        id="pauseBetweenSeriesSeconds"
                        type="number"
                        min="0"
                        max="59"
                        value={pauseBetweenSeriesSeconds}
                        onChange={e => handleInputWithZero(e.target.value, setPauseBetweenSeriesSeconds, 0, 59)}
                        onFocus={handleFocus}
                        className="bg-vista-dark/70 border-vista-secondary/30 text-vista-light focus:border-vista-primary focus:ring-1 focus:ring-vista-primary/50 h-9 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Общее время */}
          <div className="p-4 bg-vista-primary/10 border border-vista-primary/30 rounded-lg">
            <div className="text-sm font-medium text-vista-light text-center">
              Общее время: {formatTime(totalExerciseTime)}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 px-6 pb-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

