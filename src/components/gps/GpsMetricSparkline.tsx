'use client';

import React from 'react';

interface GpsMetricSparklineProps {
  value?: number;
  unit?: string;
  historicalData?: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function GpsMetricSparkline({ 
  value,
  unit,
  historicalData = [], 
  width = 100, 
  height = 40, 
  color = '#3b82f6' 
}: GpsMetricSparklineProps) {
  // Если нет значения, показываем пустой график
  if (value === undefined || value === null || isNaN(value)) {
    return (
      <div 
        className="flex items-center justify-center text-vista-light/50 text-xs bg-vista-dark/30 rounded border border-vista-secondary/20"
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  // Определяем максимальное значение для нормализации
  let maxValue = value;
  if (historicalData.length > 0) {
    maxValue = Math.max(...historicalData, value);
  } else {
    maxValue = value;
  }

  // Нормализуем значение от 0 до 1 (0% до 100% заполнения)
  const normalizedValue = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
  
  // Вычисляем ширину заполнения слева направо без отступа
  const fillWidth = normalizedValue * width; // Без отступа - заполнение до самого края
  const fillX = fillWidth;

  // Создаем уникальный ID для градиента
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div 
      className="flex items-center justify-center rounded overflow-hidden min-w-[56px] sm:min-w-[70px]"
      style={{ width, height }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5acce5" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#4ab8d1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3a9bbd" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        
        {/* Фон контейнера */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="#1a2228"
          rx="4"
          ry="4"
        />
        
        {/* Заливка с закругленными углами */}
        <rect
          x="0"
          y="0"
          width={fillX}
          height={height}
          fill={`url(#${gradientId})`}
          rx="4"
          ry="4"
        />
        
        {/* Обводка */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="none"
          stroke="#2c3c42"
          strokeWidth="1"
          rx="4"
          ry="4"
        />
        
      </svg>
    </div>
  );
}