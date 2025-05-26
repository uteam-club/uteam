import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/auth-options';
import { prisma } from '@/lib/prisma';
import { initializeStorage } from '@/lib/storage';
import { JwtPayload, verify } from 'jsonwebtoken';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Массив ролей, которым разрешено создавать категории
const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'COACH'];

// Инициализируем хранилище при первом запросе (только один раз)
let storageInitialized = false;

// Функция для получения и проверки токена из запроса
async function getTokenFromRequest(request: NextRequest): Promise<JwtPayload | null> {
  try {
    // Получаем данные сессии пользователя через getServerSession
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию
    if (!session || !session.user) {
      return null;
    }
    
    // Возвращаем данные пользователя из сессии
    return {
      id: session.user.id,
      clubId: session.user.clubId,
      role: session.user.role
    } as JwtPayload;
  } catch (error) {
    console.error('Ошибка при получении токена:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Инициализация хранилища при первом запросе к API
    if (!storageInitialized) {
      initializeStorage();
      storageInitialized = true;
    }
    
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
    // Формируем запрос на получение категорий упражнений для данного клуба
    const categories = await prisma.exerciseCategory.findMany({
      where: {
        clubId,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    // Возвращаем список категорий упражнений
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Ошибка при получении категорий упражнений:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении категорий упражнений' },
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