import React from 'react';
import { cn } from '@/lib/utils';

interface ImageProgressProps {
  isLoading: boolean;
  progress?: number; // 0-100
  variant?: 'spinner' | 'bar' | 'overlay';
  className?: string;
}

export const ImageProgress: React.FC<ImageProgressProps> = ({
  isLoading,
  progress = 0,
  variant = 'spinner',
  className,
}) => {
  if (!isLoading) return null;

  if (variant === 'bar') {
    return (
      <div className={cn("relative w-full h-1 bg-gray-200 rounded-full overflow-hidden", className)}>
        <div 
          className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={cn(
        "absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity", 
        isLoading ? "opacity-100" : "opacity-0",
        className
      )}>
        <div className="w-12 h-12 rounded-full border-2 border-white border-t-transparent animate-spin" />
        {progress > 0 && (
          <span className="absolute text-white text-sm font-medium">{Math.round(progress)}%</span>
        )}
      </div>
    );
  }

  // Default spinner
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      {progress > 0 && (
        <span className="ml-2 text-xs text-gray-500">{Math.round(progress)}%</span>
      )}
    </div>
  );
} 