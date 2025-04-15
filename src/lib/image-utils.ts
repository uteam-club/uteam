import { getPlaiceholder } from 'plaiceholder';
import { ImageProps } from 'next/image';

/**
 * Генерирует base64-заполнитель для изображения по URL
 * @param src URL изображения
 * @returns Объект с base64 строкой изображения низкого качества
 */
export async function getImagePlaceholder(src: string): Promise<{ 
  base64: string; 
  img: { width: number; height: number } 
}> {
  try {
    // Обрабатываем внешние URL и локальные изображения
    const isExternal = src.startsWith('http');
    
    if (isExternal) {
      // Для внешних URL используем fetch для получения буфера
      const res = await fetch(src);
      const buffer = await res.arrayBuffer();
      const { base64, img } = await getPlaiceholder(Buffer.from(buffer));
      return { base64, img };
    } else {
      // Для локальных изображений используем fs
      const fs = require('fs').promises;
      const path = require('path');
      
      // Если путь начинается с /, обрабатываем его как относительный к public
      const filePath = src.startsWith('/') 
        ? path.join(process.cwd(), 'public', src) 
        : src;
      
      const buffer = await fs.readFile(filePath);
      const { base64, img } = await getPlaiceholder(buffer);
      return { base64, img };
    }
  } catch (error) {
    console.error('Ошибка при генерации плейсхолдера:', error);
    // Возвращаем заглушку в случае ошибки
    return { 
      base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 
      img: { width: 10, height: 10 } 
    };
  }
}

/**
 * Улучшает доступность изображений, добавляя необходимые атрибуты alt и aria
 * @param props Свойства изображения
 * @returns Объект с дополненными свойствами для доступности
 */
export function getAccessibleImageProps(props: Partial<ImageProps>): Partial<ImageProps> {
  const { alt, ...rest } = props;
  
  return {
    ...rest,
    alt: alt || '', // обеспечиваем наличие alt
    ...((!alt || alt === '') && { 
      'aria-hidden': true,
      role: 'presentation'
    }),
  };
} 