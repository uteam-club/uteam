'use client';

import Image from 'next/image';
import { useState, useEffect, memo } from 'react';

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

function OptimizedImage({
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
  blur = false,
  placeholder,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <div 
      className={`
        relative overflow-hidden 
        ${fill ? 'w-full h-full' : ''} 
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
        placeholder={blur && blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blur ? blurDataURL : undefined}
        className={`
          ${objectFit === 'contain' ? 'object-contain' : 
            objectFit === 'cover' ? 'object-cover' : 
            objectFit === 'fill' ? 'object-fill' : 
            objectFit === 'none' ? 'object-none' : 
            objectFit === 'scale-down' ? 'object-scale-down' : ''}
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

export default memo(OptimizedImage); 