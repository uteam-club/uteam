'use client';

import { useState, useEffect } from 'react';

type ImageStatus = 'loading' | 'loaded' | 'error';
type ImageMap = Record<string, ImageStatus>;

/**
 * Хук для предварительной загрузки изображений
 * @param urls Массив URL изображений для предзагрузки
 * @returns Объект с состоянием загрузки каждого изображения и общим прогрессом
 */
export function useImagePreloader(urls: string[]) {
  const [imagesStatus, setImagesStatus] = useState<ImageMap>({});
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Предзагрузка изображений
  useEffect(() => {
    if (!urls.length) {
      setIsComplete(true);
      setProgress(100);
      return;
    }

    // Инициализация статуса для всех изображений
    const initialStatus: ImageMap = {};
    urls.forEach(url => {
      initialStatus[url] = 'loading';
    });
    setImagesStatus(initialStatus);
    setIsComplete(false);
    setProgress(0);

    // Загрузка каждого изображения
    let loadedCount = 0;
    const totalCount = urls.length;

    const updateProgress = () => {
      loadedCount++;
      const newProgress = Math.round((loadedCount / totalCount) * 100);
      setProgress(newProgress);
      
      if (loadedCount === totalCount) {
        setIsComplete(true);
      }
    };

    urls.forEach(url => {
      const img = new Image();
      
      img.onload = () => {
        setImagesStatus(prev => ({ ...prev, [url]: 'loaded' }));
        updateProgress();
      };
      
      img.onerror = () => {
        setImagesStatus(prev => ({ ...prev, [url]: 'error' }));
        updateProgress();
      };

      img.src = url;
    });

    // Очистка при размонтировании
    return () => {
      urls.forEach(url => {
        const img = new Image();
        img.src = '';
      });
    };
  }, [urls]);

  return { imagesStatus, progress, isComplete };
}

/**
 * Функция для предварительной загрузки отдельного изображения
 * @param url URL изображения для предзагрузки
 * @returns Promise, который разрешается после загрузки изображения
 */
export function preloadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Ошибка загрузки изображения: ${url}`));
    img.src = url;
  });
} 