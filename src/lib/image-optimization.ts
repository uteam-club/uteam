import sharp from 'sharp';

export interface ImageOptimizationOptions {
  quality?: number;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export async function optimizeImage(
  buffer: Buffer,
  options: ImageOptimizationOptions = {}
): Promise<Buffer> {
  const {
    quality = 75,
    width,
    height,
    format = 'jpeg',
    fit = 'cover'
  } = options;

  let sharpInstance = sharp(buffer);

  // Изменяем размер если указаны width или height
  if (width || height) {
    sharpInstance = sharpInstance.resize(width, height, { fit });
  }

  // Конвертируем в нужный формат
  switch (format) {
    case 'jpeg':
      sharpInstance = sharpInstance.jpeg({ quality });
      break;
    case 'png':
      sharpInstance = sharpInstance.png({ quality });
      break;
    case 'webp':
      sharpInstance = sharpInstance.webp({ quality });
      break;
    case 'avif':
      sharpInstance = sharpInstance.avif({ quality });
      break;
  }

  return await sharpInstance.toBuffer();
}

export async function generateThumbnail(
  buffer: Buffer,
  width: number = 300,
  height: number = 200
): Promise<Buffer> {
  return optimizeImage(buffer, {
    width,
    height,
    quality: 60,
    format: 'jpeg',
    fit: 'cover'
  });
}

export async function generatePreview(
  buffer: Buffer,
  width: number = 800,
  height: number = 600
): Promise<Buffer> {
  return optimizeImage(buffer, {
    width,
    height,
    quality: 70,
    format: 'jpeg',
    fit: 'contain'
  });
}

// Функция для определения оптимального формата на основе браузера
export function getOptimalFormat(userAgent?: string): 'jpeg' | 'png' | 'webp' | 'avif' {
  if (!userAgent) return 'jpeg';
  
  const ua = userAgent.toLowerCase();
  
  // Проверяем поддержку AVIF
  if (ua.includes('chrome/') && parseInt(ua.match(/chrome\/(\d+)/)?.[1] || '0') >= 85) {
    return 'avif';
  }
  
  // Проверяем поддержку WebP
  if (ua.includes('chrome/') || ua.includes('firefox/') || ua.includes('safari/')) {
    return 'webp';
  }
  
  return 'jpeg';
}

// Функция для создания responsive sizes
export function getResponsiveSizes(containerWidth: number): string {
  if (containerWidth <= 640) {
    return '100vw';
  } else if (containerWidth <= 1024) {
    return '50vw';
  } else {
    return '33vw';
  }
} 