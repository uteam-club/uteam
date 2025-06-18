import { NextResponse } from 'next/server';
// Базовые заголовки для всех API ответов
export const baseHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
};
// Функция для создания ответа с правильными заголовками
export function createApiResponse(data, status = 200, headers = { 'Cache-Control': 'no-store' }) {
    const finalHeaders = Object.assign({}, baseHeaders);
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
