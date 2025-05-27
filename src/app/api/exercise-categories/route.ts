import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Массив ролей, которым разрешено создавать категории
const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'COACH'];

// Функция для чтения токена из заголовка Authorization
async function getTokenFromRequest(request: NextRequest) {
  // Сначала пробуем стандартный способ NextAuth
  const token = await getToken({ req: request });
  
  if (token) return token;
  
  // Если нет токена NextAuth, проверяем заголовок Authorization
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  try {
    // Извлекаем токен из заголовка
    const bearerToken = authHeader.replace('Bearer ', '');
    
    // Верифицируем JWT токен
    const decodedToken = jwt.verify(
      bearerToken, 
      (() => {
        if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET не задан в .env');
        return process.env.NEXTAUTH_SECRET;
      })()
    ) as any;
    
    // Возвращаем декодированный токен в том же формате, что и NextAuth
    return {
      id: decodedToken.id,
      email: decodedToken.email,
      name: decodedToken.name,
      role: decodedToken.role,
      clubId: decodedToken.clubId,
    };
  } catch (error) {
    console.error('Ошибка при декодировании токена:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('Начало обработки GET-запроса для категорий упражнений');
    
    // Получаем токен пользователя
    const token = await getTokenFromRequest(req);
    
    // Проверяем аутентификацию
    if (!token) {
      console.error('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Получаем ID клуба из токена
    const clubId = token.clubId;
    
    if (!clubId) {
      console.error('Ошибка: отсутствует ID клуба в токене');
      return NextResponse.json({ error: 'Отсутствует ID клуба' }, { status: 400 });
    }
    
    console.log('Получение категорий для клуба:', clubId);
    
    // Формируем запрос на получение категорий упражнений для данного клуба
    const categories = await prisma.exerciseCategory.findMany({
      where: {
        clubId,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    console.log(`Найдено ${categories.length} категорий`);
    
    // Возвращаем список категорий упражнений
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Ошибка при получении категорий упражнений:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка при получении категорий упражнений',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exercise-categories
 * Создание новой категории упражнений
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Начало обработки запроса на создание категории упражнений');
    
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const role = token.role as string;
    const clubId = token.clubId as string;
    
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
    };
    
    // Создаем категорию
    const category = await prisma.exerciseCategory.create({
      data: categoryData,
    });
    
    console.log('Категория упражнений успешно создана:', category.id);
    
    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Необработанная ошибка при создании категории упражнений:', error);
    
    return NextResponse.json({ 
      error: 'Failed to create exercise category', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
} 