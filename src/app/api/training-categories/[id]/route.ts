import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];

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
      process.env.NEXTAUTH_SECRET || 'fdcvista-default-secret-key-change-me'
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

/**
 * GET /api/training-categories/[id]
 * Получение информации о конкретной категории тренировок
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    
    const categoryId = params.id;
    const category = await prisma.trainingCategory.findUnique({
      where: {
        id: categoryId,
      },
    });
    
    if (!category) {
      return NextResponse.json({ error: 'Training category not found' }, { status: 404 });
    }
    
    // Проверяем, что категория принадлежит к тому же клубу
    if (category.clubId !== clubId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Error fetching training category:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch training category',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/training-categories/[id]
 * Обновление данных категории тренировок
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Начало обработки запроса на обновление категории тренировок');
    
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
    
    const categoryId = params.id;
    
    // Получаем текущую категорию
    const currentCategory = await prisma.trainingCategory.findUnique({
      where: {
        id: categoryId,
      },
    });
    
    if (!currentCategory) {
      console.log('Категория не найдена:', categoryId);
      return NextResponse.json({ error: 'Training category not found' }, { status: 404 });
    }
    
    // Проверяем, что категория принадлежит к тому же клубу
    if (currentCategory.clubId !== clubId) {
      console.log('Попытка редактирования категории из другого клуба');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Парсим тело запроса
    const data = await request.json();
    console.log('Получены данные для обновления:', data);
    
    // Проверка наличия необходимых полей
    if (!data.name || !data.name.trim()) {
      console.log('Отсутствует обязательное поле: name');
      return NextResponse.json({ 
        error: 'Missing required field: name' 
      }, { status: 400 });
    }
    
    // Создаем объект с данными для обновления
    const updateData = {
      name: data.name.trim(),
    };
    
    // Обновляем категорию
    const updatedCategory = await prisma.trainingCategory.update({
      where: {
        id: categoryId,
      },
      data: updateData,
    });
    
    console.log('Категория тренировок успешно обновлена:', updatedCategory.id);
    
    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error('Необработанная ошибка при обновлении категории тренировок:', error);
    
    return NextResponse.json({ 
      error: 'Failed to update training category', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/training-categories/[id]
 * Удаление категории тренировок
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Начало обработки запроса на удаление категории тренировок');
    
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
    
    const categoryId = params.id;
    
    // Получаем текущую категорию
    const currentCategory = await prisma.trainingCategory.findUnique({
      where: {
        id: categoryId,
      },
    });
    
    if (!currentCategory) {
      console.log('Категория не найдена:', categoryId);
      return NextResponse.json({ error: 'Training category not found' }, { status: 404 });
    }
    
    // Проверяем, что категория принадлежит к тому же клубу
    if (currentCategory.clubId !== clubId) {
      console.log('Попытка удаления категории из другого клуба');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Удаляем категорию
    await prisma.trainingCategory.delete({
      where: {
        id: categoryId,
      },
    });
    
    console.log('Категория тренировок успешно удалена:', categoryId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Training category deleted successfully' 
    });
  } catch (error: any) {
    console.error('Необработанная ошибка при удалении категории тренировок:', error);
    
    return NextResponse.json({ 
      error: 'Failed to delete training category', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
} 