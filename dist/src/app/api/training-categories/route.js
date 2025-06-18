import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { trainingCategory } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
// Вспомогательная функция для получения токена из запроса
async function getTokenFromRequest(request) {
    try {
        const token = await getToken({ req: request });
        if (!token) {
            return null;
        }
        return token;
    }
    catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
}
/**
 * GET /api/training-categories
 * Получение списка категорий тренировок клуба
 */
export async function GET(request) {
    try {
        console.log('Starting GET /api/training-categories request');
        // Получаем токен пользователя
        const token = await getTokenFromRequest(request);
        console.log('Token received:', token ? 'Yes' : 'No');
        if (!token) {
            console.log('No token found, returning 401');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const clubId = token.clubId;
        console.log('Club ID from token:', clubId);
        if (!clubId || typeof clubId !== 'string') {
            console.log('Invalid club ID:', clubId);
            return NextResponse.json({
                error: 'Invalid club ID',
                details: 'Club ID is missing or invalid in the token'
            }, { status: 400 });
        }
        // Получаем категории тренировок клуба
        console.log('Fetching categories for club:', clubId);
        const categories = await db.select().from(trainingCategory).where(eq(trainingCategory.clubId, clubId)).orderBy(asc(trainingCategory.name));
        console.log('Found categories:', categories.length);
        return NextResponse.json(categories);
    }
    catch (error) {
        console.error('Error in GET /api/training-categories:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json({
            error: 'Failed to fetch training categories',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
/**
 * POST /api/training-categories
 * Создание новой категории тренировок
 */
export async function POST(request) {
    try {
        console.log('Начало обработки запроса на создание категории тренировок');
        // Получаем токен пользователя
        const token = await getTokenFromRequest(request);
        if (!token) {
            console.log('Ошибка аутентификации: пользователь не авторизован');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const role = token.role;
        const clubId = token.clubId;
        // Проверяем права (только админ или суперадмин)
        if (!allowedRoles.includes(role)) {
            console.log('Ошибка доступа: у пользователя недостаточно прав');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // Парсим тело запроса
        const data = await request.json();
        console.log('Получены данные для создания категории:', data);
        // Проверка наличия необходимых полей
        if (!data.name || !data.name.trim()) {
            console.log('Отсутствует обязательное поле: name');
            return NextResponse.json({
                error: 'Missing required field: name'
            }, { status: 400 });
        }
        // Создаем объект с данными для создания категории
        const categoryData = {
            name: data.name.trim(),
            clubId,
            id: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Создаем категорию
        const categoryArr = await db.insert(trainingCategory).values(categoryData).returning({ id: trainingCategory.id });
        const category = categoryArr[0];
        console.log('Категория тренировок успешно создана:', category === null || category === void 0 ? void 0 : category.id);
        return NextResponse.json(category, { status: 201 });
    }
    catch (error) {
        console.error('Необработанная ошибка при создании категории тренировок:', error);
        return NextResponse.json({
            error: 'Failed to create training category',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
