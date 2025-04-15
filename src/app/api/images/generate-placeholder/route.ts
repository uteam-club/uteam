import { NextRequest, NextResponse } from 'next/server';
import { getPlaiceholder } from 'plaiceholder';

export async function POST(req: NextRequest) {
  try {
    const { src } = await req.json();
    
    if (!src) {
      return NextResponse.json(
        { error: 'Необходимо указать URL изображения (src)' },
        { status: 400 }
      );
    }
    
    // Проверяем, является ли источник внешним URL
    const isExternal = src.startsWith('http');
    let buffer: Buffer;
    
    if (isExternal) {
      // Для внешних URL используем fetch
      const res = await fetch(src);
      
      if (!res.ok) {
        throw new Error(`Ошибка при загрузке изображения: ${res.status} ${res.statusText}`);
      }
      
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Для локальных изображений используем fs
      const fs = require('fs').promises;
      const path = require('path');
      
      // Если путь начинается с /, обрабатываем его как относительный к public
      const filePath = src.startsWith('/') 
        ? path.join(process.cwd(), 'public', src) 
        : src;
      
      buffer = await fs.readFile(filePath);
    }
    
    // Генерируем плейсхолдер с помощью plaiceholder
    const { base64, img } = await getPlaiceholder(buffer, { size: 10 });
    
    return NextResponse.json({ base64, img });
  } catch (error: any) {
    console.error('Ошибка при генерации плейсхолдера:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка при генерации плейсхолдера' },
      { status: 500 }
    );
  }
}

// Опционально: Маршрут GET для получения плейсхолдера по URL параметру
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const src = url.searchParams.get('src');
    
    if (!src) {
      return NextResponse.json(
        { error: 'Необходимо указать URL изображения (src)' },
        { status: 400 }
      );
    }
    
    // Проверяем, является ли источник внешним URL
    const isExternal = src.startsWith('http');
    let buffer: Buffer;
    
    if (isExternal) {
      // Для внешних URL используем fetch
      const res = await fetch(src);
      
      if (!res.ok) {
        throw new Error(`Ошибка при загрузке изображения: ${res.status} ${res.statusText}`);
      }
      
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Для локальных изображений используем fs
      const fs = require('fs').promises;
      const path = require('path');
      
      // Если путь начинается с /, обрабатываем его как относительный к public
      const filePath = src.startsWith('/') 
        ? path.join(process.cwd(), 'public', src) 
        : src;
      
      buffer = await fs.readFile(filePath);
    }
    
    // Генерируем плейсхолдер с помощью plaiceholder
    const { base64, img } = await getPlaiceholder(buffer, { size: 10 });
    
    return NextResponse.json({ base64, img });
  } catch (error: any) {
    console.error('Ошибка при генерации плейсхолдера:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка при генерации плейсхолдера' },
      { status: 500 }
    );
  }
} 