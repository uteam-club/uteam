'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  blur?: boolean;
  placeholder?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  quality = 85,
  className = '',
  objectFit = 'cover',
  blur = true,
  placeholder,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [blurDataURL, setBlurDataURL] = useState<string | undefined>(placeholder);

  // Если плейсхолдер не передан и включен эффект размытия,
  // используем базовый плейсхолдер (светло-серый фон)
  const defaultBlurDataURL = 
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  // Зависимости: при изменении src и blur
  useEffect(() => {
    setIsLoading(true);
    
    if (!placeholder && blur) {
      setBlurDataURL(defaultBlurDataURL);
    } else {
      setBlurDataURL(placeholder);
    }
  }, [src, blur, placeholder]);

  return (
    <div 
      className={`
        relative overflow-hidden 
        ${fill ? 'w-full h-full' : ''} 
        ${isLoading && blur ? 'animate-pulse bg-vista-dark-lighter/30' : ''} 
        ${className}
      `}
      style={!fill ? { width: width, height: height } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes || '100vw'}
        priority={priority}
        quality={quality}
        loading={priority ? 'eager' : 'lazy'}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        className={`
          transition-all duration-300 
          ${isLoading ? 'scale-105 blur-sm' : 'scale-100 blur-0'} 
          ${objectFit === 'contain' ? 'object-contain' : objectFit === 'cover' ? 'object-cover' : 'object-' + objectFit}
        `}
        onLoad={() => setIsLoading(false)}
        {...(!alt || alt === '' ? { 
          'aria-hidden': true,
          role: 'presentation' 
        } : {})}
      />
    </div>
  );
} 