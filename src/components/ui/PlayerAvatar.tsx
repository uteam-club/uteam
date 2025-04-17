'use client';

import React from 'react';
import { memo } from "react";
import OptimizedImage from './OptimizedImage';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  photoUrl?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

function PlayerAvatar({
  photoUrl,
  name,
  size = 'md',
  className,
  onClick,
}: PlayerAvatarProps) {
  // Размеры по умолчанию для разных вариантов
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-40 h-40',
  };

  // Размеры для иконки по умолчанию
  const iconSizes = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-32 h-32',
  };

  return (
    <div 
      className={cn(
        'relative overflow-hidden bg-gradient-to-b from-vista-light/90 to-vista-dark/10',
        sizeClasses[size],
        className
      )}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Тень внутри для эффекта глубины */}
      <div className="absolute inset-0 shadow-[inset_0_0_10px_rgba(0,0,0,0.15)] z-10"></div>
      
      {photoUrl ? (
        <OptimizedImage
          src={photoUrl}
          alt={`${name} аватар`}
          fill
          sizes={`(max-width: 640px) ${size === 'xl' ? '120px' : '60px'}, ${size === 'xl' ? '160px' : '80px'}`}
          objectFit="cover"
          quality={75}
          className="absolute inset-0 z-0"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <UserCircleIcon className={cn('text-vista-primary', iconSizes[size])} />
        </div>
      )}
    </div>
  );
} 

export default memo(PlayerAvatar);
