/**
 * Функции для оптимизации изображений и улучшения производительности
 */

/**
 * Определяет оптимальное значение параметра quality для изображений
 * в зависимости от типа изображения и его контекста
 */
export function getOptimalQuality(
  imageType: string, 
  context: 'thumbnail' | 'profile' | 'banner' | 'content' | 'logo' | 'icon' = 'content'
): number {
  // Базовые настройки качества по контексту
  const baseQuality = {
    thumbnail: 65,
    profile: 80,
    banner: 75,
    content: 85,
    logo: 90,
    icon: 95,
  };

  // Учитываем тип изображения
  const qualityAdjustments = {
    'image/jpeg': 0,
    'image/jpg': 0,
    'image/png': +5,  // PNG обычно требуют немного большего качества
    'image/webp': -5, // WebP требует меньшее значение quality для того же визуального качества
    'image/avif': -10, // AVIF еще более эффективен
  };

  // Выбираем базовое качество по контексту
  let quality = baseQuality[context];
  
  // Применяем корректировки в зависимости от типа
  const imageTypeLower = imageType.toLowerCase();
  
  // Если есть коррекция для данного типа
  for (const [type, adjustment] of Object.entries(qualityAdjustments)) {
    if (imageTypeLower.includes(type)) {
      quality += adjustment;
      break;
    }
  }

  // Ограничиваем диапазон quality от 30 до 100
  return Math.min(Math.max(30, quality), 100);
}

/**
 * Определяет оптимальное значение для параметра sizes в зависимости от контекста изображения
 */
export type ImageContextType = 'thumbnail' | 'profile' | 'banner' | 'content' | 'logo' | 'icon' | 'slider' | 'gallery' | 'list';

export function getResponsiveSizes(context: ImageContextType): string {
  switch (context) {
    case 'thumbnail':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
    case 'profile':
      return '(max-width: 640px) 50vw, 180px';
    case 'banner':
      return '100vw';
    case 'content':
      return '(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw';
    case 'logo':
      return '(max-width: 640px) 60px, 120px';
    case 'icon':
      return '24px';
    case 'slider':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 66vw';
    case 'gallery':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
    case 'list':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
    default:
      return '100vw';
  }
}

/**
 * Функция для определения, нужен ли приоритет загрузки для изображения
 * в зависимости от его расположения и видимости на странице
 */
export function shouldPrioritize(context: ImageContextType, index: number): boolean {
  // Первые изображения в слайдерах, галереях и баннеры должны быть приоритетными
  if (context === 'banner') return true;
  if ((context === 'slider' || context === 'gallery' || context === 'list') && index < 3) return true;
  
  return false;
}

// Расчет качества изображения в зависимости от контекста
export function getImageQuality(context: ImageContextType): number {
  switch (context) {
    case 'banner':
    case 'content':
      return 85; // Высокое качество для важного контента
    case 'gallery':
    case 'slider':
    case 'list':
      return 80; // Хорошее качество для галерей
    case 'profile':
    case 'thumbnail':
      return 75; // Среднее качество для thumbnails
    case 'logo':
    case 'icon':
      return 90; // Высокое качество для логотипов и иконок
    default:
      return 75; // Стандартное качество
  }
}

// Функция для получения правильного формата изображения (webp или исходный)
export function getOptimalImageFormat(src: string): 'webp' | undefined {
  // Если это SVG, GIF или уже WebP, не конвертируем
  if (/\.(svg|gif|webp)$/i.test(src)) {
    return undefined;
  }
  
  // В остальных случаях используем webp
  return 'webp';
} 