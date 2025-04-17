'use client';

import { useState, useEffect , memo } from 'react';
import OptimizedImage from './OptimizedImage';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import { getResponsiveSizes } from '@/lib/image-optimizations';

interface GalleryImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

interface GalleryProps {
  images: GalleryImage[];
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  gap?: number;
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:2';
  maxWidth?: number;
}

function Gallery({
  images,
  className = '',
  columns = 3,
  gap = 4,
  aspectRatio = '1:1',
  maxWidth,
}: GalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const imageUrls = images.map(img => img.src);
  const { progress, isComplete } = useImagePreloader(imageUrls);

  // Расчет CSS грида на основе параметров
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  const gridGap = `gap-${gap}`;
  
  // Вычисление aspect ratio
  let aspectRatioClass = 'aspect-square'; // default 1:1
  
  if (aspectRatio === '16:9') {
    aspectRatioClass = 'aspect-video';
  } else if (aspectRatio === '4:3') {
    aspectRatioClass = 'aspect-[4/3]';
  } else if (aspectRatio === '3:2') {
    aspectRatioClass = 'aspect-[3/2]';
  }

  // Открытие лайтбокса
  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  // Закрытие лайтбокса
  const closeLightbox = () => {
    setIsLightboxOpen(false);
    document.body.style.overflow = '';
  };

  // Навигация по изображениям в лайтбоксе
  const goToNext = () => {
    if (currentImageIndex === null) return;
    setCurrentImageIndex((currentImageIndex + 1) % images.length);
  };

  const goToPrevious = () => {
    if (currentImageIndex === null) return;
    setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length);
  };

  // Очистка overflow при размонтировании
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Получаем размеры sizes для изображений галереи
  const galleryImageSizes = getResponsiveSizes('gallery');

  return (
    <>
      {/* Индикатор загрузки */}
      {!isComplete && (
        <div className="w-full h-6 bg-vista-dark-lighter rounded-full mb-4 overflow-hidden">
          <div 
            className="h-full bg-vista-primary transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {/* Галерея */}
      <div 
        className={`grid ${gridCols[columns]} ${gridGap} ${className}`}
        style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}
      >
        {images.map((image, index) => (
          <div 
            key={`gallery-${image.src}-${index}`}
            className={`relative ${aspectRatioClass} cursor-pointer overflow-hidden rounded-lg group`}
            onClick={() => openLightbox(index)}
          >
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              fill
              sizes={galleryImageSizes}
              objectFit="cover"
              className="rounded-lg transition-transform duration-300 group-hover:scale-105"
              quality={75}
            />
            <div className="absolute inset-0 bg-vista-dark/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <span className="text-vista-light font-medium text-sm">Увеличить</span>
            </div>
          </div>
        ))}
      </div>

      {/* Лайтбокс */}
      {isLightboxOpen && currentImageIndex !== null && (
        <div className="fixed inset-0 z-50 bg-vista-dark/90 flex items-center justify-center">
          <button 
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-vista-light hover:text-vista-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button 
            onClick={goToPrevious}
            className="absolute left-4 md:left-8 text-vista-light hover:text-vista-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="relative w-full max-w-4xl h-[80vh] p-4 flex items-center justify-center">
            <OptimizedImage
              src={images[currentImageIndex].src}
              alt={images[currentImageIndex].alt}
              fill
              objectFit="contain"
              sizes="(max-width: 768px) 95vw, 90vw"
              quality={90}
              priority
            />
          </div>
          
          <button 
            onClick={goToNext}
            className="absolute right-4 md:right-8 text-vista-light hover:text-vista-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
} 

export default memo(Gallery);
