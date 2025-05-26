import { NextResponse } from 'next/server';

// Типы для заголовков кеширования
type CacheHeaders = {
  'Cache-Control': string;
  'CDN-Cache-Control'?: string;
  'Pragma'?: string;
  'Expires'?: string;
  'Surrogate-Control'?: string;
};

// Базовые заголовки для всех API ответов
export const baseHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
};

// Функция для создания ответа с правильными заголовками
export function createApiResponse(
  data: any,
  status: number = 200,
  headers: Partial<CacheHeaders> = { 'Cache-Control': 'no-store' }
) {
  const finalHeaders: Record<string, string> = {
    ...baseHeaders,
  };

  // Добавляем только определенные заголовки
  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) {
      finalHeaders[key] = value;
    }
  });

  return NextResponse.json(data, {
    status,
    headers: finalHeaders,
  });
}

// Конфигурация для динамических роутов
export const dynamicConfig = {
  dynamic: 'force-dynamic',
  revalidate: 0,
}; 