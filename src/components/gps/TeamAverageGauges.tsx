'use client';

import React from 'react';

interface TeamAverageGaugesProps {
  currentAverages: Record<string, number>;
  historicalAverages: Record<string, number>;
  metrics: Array<{
    canonicalMetricCode: string;
    displayName: string;
    displayUnit: string;
    canAverage: boolean;
  }>;
  playerCount?: number;
  categoryInfo?: {
    name: string;
    eventCount: number;
    reportCount: number;
    type?: 'training' | 'match';
  };
  hasHistoricalData?: boolean;
  isLoading?: boolean;
}

interface GaugeProps {
  currentValue: number;
  historicalValue: number;
  displayName: string;
  displayUnit: string;
  isFirstTraining: boolean;
  eventType?: 'training' | 'match';
}

function Gauge({ currentValue, historicalValue, displayName, displayUnit, isFirstTraining, eventType }: GaugeProps) {
  // Вычисляем процент разницы
  const percentageDiff = isFirstTraining 
    ? 0 
    : historicalValue > 0 
      ? ((currentValue - historicalValue) / historicalValue) * 100 
      : 0;

  // Вычисляем процент заливки
  const fillPercentage = isFirstTraining 
    ? 100 
    : percentageDiff >= 0 
      ? 100  // Полная заливка при разнице ≥ 0%
      : Math.max(0, 100 + percentageDiff); // Уменьшаем заливку при отрицательной разнице

  const radius = 50;
  const strokeWidth = 16; // Делаем еще жирнее
  const circumference = Math.PI * radius; // Полуокружность
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (fillPercentage / 100) * circumference;

  // Создаем уникальный ID для градиента
  const gradientId = `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`;

  // Цвет для процента разницы
  const getPercentageColor = () => {
    if (isFirstTraining) return '#5acce5';
    if (percentageDiff > 0) return '#10b981'; // Зеленый для роста
    if (percentageDiff < 0) return '#ef4444'; // Красный для падения
    return '#5acce5'; // Vista primary для нуля
  };

  // Отображение процента разницы
  const getPercentageText = () => {
    if (isFirstTraining) return 'N/A';
    const sign = percentageDiff > 0 ? '+' : '';
    return `${sign}${percentageDiff.toFixed(0)}%`;
  };

  return (
    <div className="flex flex-col items-center bg-vista-dark/30 border border-vista-secondary/30 rounded-lg p-3">
      {/* Название метрики */}
      <div className="text-sm font-medium text-vista-light/90 text-center mb-3 h-8 flex items-center justify-center">
        {displayName}
      </div>
      
      {/* Спидометр */}
      <div className="relative mb-3">
        <svg width={120} height={60} viewBox="0 0 120 60" className="overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5acce5" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#4ab8d1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3a9bbd" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          
          {/* Фоновая дуга (незаполненная часть) */}
          <path
            d={`M 10 50 A ${radius} ${radius} 0 0 1 110 50`}
            fill="none"
            stroke="#2c3c42"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeOpacity="0.3"
          />
          
          {/* Заливка с градиентом */}
          <path
            d={`M 10 50 A ${radius} ${radius} 0 0 1 110 50`}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Процент разницы по центру */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div 
            className="text-sm font-medium"
            style={{ color: getPercentageColor() }}
          >
            {getPercentageText()}
          </div>
        </div>
      </div>
      
      {/* Значения */}
      <div className="flex justify-between w-full text-xs">
        <div className="flex flex-col items-center">
          <div className="text-vista-light/70 text-xs">Текущее</div>
          <div className="text-sm font-semibold text-vista-light">
            {currentValue.toFixed(displayUnit === 'min' ? 0 : 0)}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-vista-light/70 text-xs">
            {eventType === 'match' ? '10 матчей' : '30 дней'}
          </div>
          <div className="text-sm font-semibold text-vista-light">
            {isFirstTraining ? '—' : historicalValue.toFixed(displayUnit === 'min' ? 0 : 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeamAverageGauges({ 
  currentAverages, 
  historicalAverages, 
  metrics, 
  playerCount,
  categoryInfo,
  hasHistoricalData = false,
  isLoading = false 
}: TeamAverageGaugesProps) {
  // Фильтруем только метрики, которые можно усреднять
  const averageableMetrics = metrics.filter(metric => metric.canAverage);
  
  // Проверяем, есть ли исторические данные для сравнения
  const isFirstTraining = !hasHistoricalData || Object.values(historicalAverages).every(value => value === 0);

  if (isLoading) {
    return (
      <div className="bg-vista-dark/50 rounded-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-vista-secondary/20 rounded-lg h-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (averageableMetrics.length === 0) {
    return (
      <div className="bg-vista-dark/50 rounded-lg p-6">
        <div className="text-center text-vista-light/60 py-8">
          Нет метрик для усреднения в выбранном профиле
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {averageableMetrics.map((metric) => {
        const currentValue = currentAverages[metric.canonicalMetricCode] || 0;
        const historicalValue = historicalAverages[metric.canonicalMetricCode] || 0;
        
        return (
          <Gauge
            key={metric.canonicalMetricCode}
            currentValue={currentValue}
            historicalValue={historicalValue}
            displayName={metric.displayName}
            displayUnit={metric.displayUnit}
            isFirstTraining={isFirstTraining}
            eventType={categoryInfo?.type}
          />
        );
      })}
    </div>
  );
}
