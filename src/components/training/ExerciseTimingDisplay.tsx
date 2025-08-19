'use client';

interface ExerciseTimingDisplayProps {
  series?: number;
  repetitions?: number;
  repetitionTime?: number;
  pauseBetweenRepetitions?: number;
  pauseBetweenSeries?: number;
  className?: string;
}

export default function ExerciseTimingDisplay({
  series = 1,
  repetitions = 1,
  repetitionTime = 30,
  pauseBetweenRepetitions = 15,
  pauseBetweenSeries = 60,
  className = ''
}: ExerciseTimingDisplayProps) {
  // Если тайминги не настроены, не показываем компонент
  if (!series || !repetitions || !repetitionTime) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}"`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}'${remainingSeconds}"` : `${minutes}'`;
  };

  const totalTime = series * repetitions * repetitionTime +
    series * repetitions * pauseBetweenRepetitions +
    (series > 1 ? (series - 1) * pauseBetweenSeries : 0);

  return (
    <div className={`flex items-baseline text-xs gap-1 ${className}`}>
      {/* Компактное отображение таймингов */}
      <span 
        className="text-vista-light/90 font-medium cursor-help"
        title={`Серии: ${series}, Повторения: ${repetitions}, Время повтора: ${formatTime(repetitionTime)}, Пауза между повторами: ${formatTime(pauseBetweenRepetitions)}${series > 1 ? `, Пауза между сериями: ${formatTime(pauseBetweenSeries)}` : ''}, Общее время: ${formatTime(totalTime)}`}
      >
        <span className="text-vista-light/90">{series}</span>
        <span className="text-vista-light/40 text-xs">×</span>
        <span className="text-vista-light/90">{repetitions}</span>
        <span className="text-vista-light/40 text-xs">×</span>
        <span className="text-vista-light/90">{formatTime(repetitionTime)}</span>
        <span className="text-vista-light/40 text-xs">×</span>
        <span className="text-vista-light/90">{formatTime(pauseBetweenRepetitions)}</span>
        {series > 1 && (
          <>
            <span className="text-vista-light/40 text-xs">×</span>
            <span className="text-vista-light/90">{formatTime(pauseBetweenSeries)}</span>
          </>
        )}
      </span>
      
      {/* Сумарное время с фоном */}
      <span className="bg-vista-secondary/20 text-vista-light px-2 py-1 rounded border border-vista-secondary/30 font-medium ml-2">
        {formatTime(totalTime)}
      </span>
    </div>
  );
}

