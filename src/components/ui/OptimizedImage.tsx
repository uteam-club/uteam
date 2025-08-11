'use client';

import Image from 'next/image';
import { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

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
  fallbackSrc?: string;
  showSkeleton?: boolean;
  onError?: () => void;
  onLoad?: () => void;
}

function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  quality = 75, // Снижаем качество для лучшей производительности
  className = '',
  objectFit = 'cover',
  blur = false,
  placeholder,
  fallbackSrc,
  showSkeleton = true,
  onError,
  onLoad,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [blurDataURL, setBlurDataURL] = useState<string | undefined>(placeholder);

  // Простой плейсхолдер (светло-серый фон)
  const defaultBlurDataURL = 
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  useEffect(() => {
    if (!placeholder && blur) {
      setBlurDataURL(defaultBlurDataURL);
    } else {
      setBlurDataURL(placeholder);
    }
  }, [src, blur, placeholder]);

  useEffect(() => {
    // Кодируем URL для корректной работы с русскими символами
    const encodedSrc = encodeURI(src);
    
    // Для Yandex Cloud изображений используем прокси для оптимизации
    if (encodedSrc.includes('storage.yandexcloud.net')) {
      const proxyUrl = new URL('/api/images/proxy', window.location.origin);
      proxyUrl.searchParams.set('url', encodedSrc);
      if (width) proxyUrl.searchParams.set('width', width.toString());
      if (height) proxyUrl.searchParams.set('height', height.toString());
      proxyUrl.searchParams.set('quality', quality.toString());
      
      setCurrentSrc(proxyUrl.toString());
    } else {
      setCurrentSrc(encodedSrc);
    }
    
    setHasError(false);
    setIsLoading(true);
  }, [src, width, height, quality]);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    
    // Если это Yandex Cloud изображение и прокси не сработал, пробуем оригинал
    if (currentSrc.includes('/api/images/proxy') && src.includes('storage.yandexcloud.net')) {
      console.log('Прокси не сработал, пробуем оригинал:', src);
      setCurrentSrc(encodeURI(src));
      setHasError(false);
      setIsLoading(true);
      return;
    }
    
    // Если есть fallback, пробуем его
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
    } else {
      onError?.();
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  // Если изображение не загрузилось и нет fallback, показываем заглушку
  if (hasError && !fallbackSrc) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-vista-dark/30 text-vista-light/40',
          fill ? 'w-full h-full' : '',
          className
        )}
        style={!fill ? { width: width, height: height } : undefined}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }



  // Проверяем, является ли URL изображением с storage.yandexcloud.net
  const isYandexCloudImage = currentSrc.includes('storage.yandexcloud.net');

  // Для Yandex Cloud изображений используем обычный img тег с прокси
  if (isYandexCloudImage) {
    return (
      <div 
        className={cn(
          'relative overflow-hidden',
          fill ? 'w-full h-full' : '',
          className
        )}
        style={!fill ? { width: width, height: height } : undefined}
      >
        {/* Скелетон загрузки */}
        {isLoading && showSkeleton && (
          <div className="absolute inset-0 bg-vista-dark/20 animate-pulse">
            <div className="w-full h-full bg-gradient-to-r from-vista-dark/20 via-vista-secondary/10 to-vista-dark/20 animate-pulse" />
          </div>
        )}

        <img
          src={currentSrc}
          alt={alt}
          className={cn(
            'block transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            objectFit === 'contain' ? 'object-contain' : 
            objectFit === 'cover' ? 'object-cover' : 
            objectFit === 'fill' ? 'object-fill' : 
            objectFit === 'none' ? 'object-none' : 
            objectFit === 'scale-down' ? 'object-scale-down' : '',
            fill ? 'w-full h-full' : ''
          )}
          style={!fill ? { width: width, height: height } : undefined}
          onLoad={handleLoad}
          onError={handleError}
          {...(!alt || alt === '' ? { 
            'aria-hidden': true,
            role: 'presentation' 
          } : {})}
        />
      </div>
    );
  }

  // Для остальных изображений используем Next.js Image
  return (
    <div 
      className={cn(
        'relative overflow-hidden',
        fill ? 'w-full h-full' : '',
        className
      )}
      style={!fill ? { width: width, height: height } : undefined}
    >
      {/* Скелетон загрузки */}
      {isLoading && showSkeleton && (
        <div className="absolute inset-0 bg-vista-dark/20 animate-pulse">
          <div className="w-full h-full bg-gradient-to-r from-vista-dark/20 via-vista-secondary/10 to-vista-dark/20 animate-pulse" />
        </div>
      )}

      <Image
        src={currentSrc}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        priority={priority}
        quality={Math.min(quality, 85)} // Ограничиваем качество для оптимизации
        loading={priority ? 'eager' : 'lazy'}
        placeholder={blur && blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blur ? blurDataURL : undefined}
        className={cn(
          'block transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          objectFit === 'contain' ? 'object-contain' : 
          objectFit === 'cover' ? 'object-cover' : 
          objectFit === 'fill' ? 'object-fill' : 
          objectFit === 'none' ? 'object-none' : 
          objectFit === 'scale-down' ? 'object-scale-down' : ''
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...(!alt || alt === '' ? { 
          'aria-hidden': true,
          role: 'presentation' 
        } : {})}
      />
    </div>
  );
}

export default memo(OptimizedImage); 