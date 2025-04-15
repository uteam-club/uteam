'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ImageProgress } from './ImageProgress';
import { getResponsiveSizes, shouldPrioritize, getImageQuality, getOptimalImageFormat, ImageContextType } from '@/lib/image-optimizations';

export interface ImageItem {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
  objectPosition?: string;
  blurDataURL?: string;
}

interface ImageListProps {
  images: ImageItem[];
  layout?: 'grid' | 'masonry' | 'carousel' | 'gallery';
  imageContext?: ImageContextType;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  imageClassName?: string;
  showProgress?: boolean;
  progressVariant?: 'spinner' | 'bar' | 'overlay';
  onImageClick?: (image: ImageItem, index: number) => void;
}

export const ImageList: React.FC<ImageListProps> = ({
  images,
  layout = 'grid',
  imageContext = 'content',
  columns = 3,
  gap = 'md',
  className,
  imageClassName,
  showProgress = true,
  progressVariant = 'overlay',
  onImageClick,
}) => {
  const [loadingStates, setLoadingStates] = useState<Record<number, { loading: boolean; progress: number }>>({});

  const handleLoadStart = (index: number) => {
    setLoadingStates(prev => ({
      ...prev,
      [index]: { loading: true, progress: 0 }
    }));
  };

  const handleLoadProgress = (index: number, progress: number) => {
    setLoadingStates(prev => ({
      ...prev,
      [index]: { loading: true, progress }
    }));
  };

  const handleLoadComplete = (index: number) => {
    setLoadingStates(prev => ({
      ...prev,
      [index]: { loading: false, progress: 100 }
    }));
  };

  const gapClasses = {
    'none': '',
    'xs': 'gap-1',
    'sm': 'gap-2',
    'md': 'gap-4',
    'lg': 'gap-6',
  };

  const containerClasses = cn(
    'w-full',
    layout === 'grid' && 'grid',
    layout === 'grid' && {
      'grid-cols-1': columns === 1,
      'grid-cols-2': columns === 2,
      'grid-cols-3': columns === 3,
      'grid-cols-4': columns === 4,
    },
    layout === 'masonry' && 'columns-1 md:columns-2 lg:columns-3',
    layout === 'carousel' && 'flex overflow-x-auto snap-x snap-mandatory',
    layout === 'gallery' && 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-max',
    gapClasses[gap],
    className
  );

  return (
    <div className={containerClasses}>
      {images.map((image, index) => {
        const { sizes, isLoading = false, progress = 0 } = { 
          sizes: getResponsiveSizes(imageContext),
          ...loadingStates[index]
        };
        
        const priority = shouldPrioritize(imageContext, index);
        const quality = getImageQuality(imageContext);
        const optimizedFormat = getOptimalImageFormat(image.src);
        
        return (
          <div 
            key={`${image.src}-${index}`}
            className={cn(
              'relative',
              layout === 'carousel' && 'flex-shrink-0 snap-start',
              layout === 'masonry' && 'mb-4 break-inside-avoid',
              imageClassName
            )}
            onClick={() => onImageClick?.(image, index)}
          >
            <div className="relative aspect-square w-full overflow-hidden">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes={sizes}
                quality={quality}
                priority={priority}
                placeholder={image.blurDataURL ? 'blur' : 'empty'}
                blurDataURL={image.blurDataURL}
                className="object-cover transition-all duration-300 hover:scale-105"
                onLoadStart={() => handleLoadStart(index)}
                onLoadingComplete={() => handleLoadComplete(index)}
                style={{
                  objectFit: image.objectFit || 'cover',
                  objectPosition: image.objectPosition || 'center',
                }}
              />
              {showProgress && <ImageProgress 
                isLoading={isLoading} 
                progress={progress} 
                variant={progressVariant} 
              />}
            </div>
          </div>
        );
      })}
    </div>
  );
}; 