import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH'];

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

/**
 * GET /api/trainings/[id]
 * Получение информации о конкретной тренировке
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trainingId = params.id;
    
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    
    // Получаем данные тренировки
    const training = await prisma.training.findUnique({
      where: {
        id: trainingId,
        clubId, // Важная часть мультитенантности - проверка принадлежности тренировки к клубу пользователя
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
      },
    });
    
    if (!training) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Форматируем данные для ответа клиенту
    const formattedTraining = {
      id: training.id,
      title: training.title,
      description: training.description,
      teamId: training.teamId,
      team: training.team.name,
      date: training.date.toISOString().split('T')[0],
      time: training.time,
      location: training.location,
      notes: training.notes,
      categoryId: training.categoryId,
      category: training.category.name,
      status: training.status || 'SCHEDULED',
      createdAt: training.createdAt,
      updatedAt: training.updatedAt
    };
    
    return NextResponse.json(formattedTraining);
  } catch (error: any) {
    console.error('Error fetching training:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch training',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/trainings/[id]
 * Обновление существующей тренировки
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trainingId = params.id;
    console.log('Начало обработки запроса на обновление тренировки:', trainingId);
    
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const role = token.role as string;
    const clubId = token.clubId as string;
    
    // Проверяем права (только админ, суперадмин или тренер)
    if (!allowedRoles.includes(role)) {
      console.log('Ошибка доступа: у пользователя недостаточно прав');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Проверяем существование тренировки и принадлежность к клубу
    const existingTraining = await prisma.training.findUnique({
      where: {
        id: trainingId,
        clubId, // Важная часть мультитенантности - проверка принадлежности тренировки к клубу пользователя
      },
    });
    
    if (!existingTraining) {
      console.log('Тренировка не найдена или принадлежит другому клубу');
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Парсим тело запроса
    const data = await request.json();
    console.log('Получены данные для обновления тренировки:', data);
    
    // Создаем объект с данными для обновления тренировки
    const trainingData: any = {};
    
    if ('title' in data && data.title) trainingData.title = data.title.trim();
    if ('description' in data) trainingData.description = data.description;
    if ('teamId' in data) trainingData.teamId = data.teamId;
    if ('date' in data) trainingData.date = new Date(data.date);
    if ('time' in data) trainingData.time = data.time;
    if ('location' in data) trainingData.location = data.location;
    if ('notes' in data) trainingData.notes = data.notes;
    if ('categoryId' in data) trainingData.categoryId = data.categoryId;
    if ('status' in data) trainingData.status = data.status;
    
    // Обновляем тренировку
    const updatedTraining = await prisma.training.update({
      where: {
        id: trainingId,
      },
      data: trainingData,
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
      },
    });
    
    console.log('Тренировка успешно обновлена:', updatedTraining.id);
    
    // Форматируем данные для ответа клиенту
    const formattedTraining = {
      id: updatedTraining.id,
      title: updatedTraining.title,
      description: updatedTraining.description,
      teamId: updatedTraining.teamId,
      team: updatedTraining.team.name,
      date: updatedTraining.date.toISOString().split('T')[0],
      time: updatedTraining.time,
      location: updatedTraining.location,
      notes: updatedTraining.notes,
      categoryId: updatedTraining.categoryId,
      category: updatedTraining.category.name,
      status: updatedTraining.status || 'SCHEDULED',
      createdAt: updatedTraining.createdAt,
      updatedAt: updatedTraining.updatedAt
    };
    
    return NextResponse.json(formattedTraining);
  } catch (error: any) {
    console.error('Необработанная ошибка при обновлении тренировки:', error);
    
    return NextResponse.json({ 
      error: 'Failed to update training', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/trainings/[id]
 * Удаление тренировки
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trainingId = params.id;
    console.log('Начало обработки запроса на удаление тренировки:', trainingId);
    
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const role = token.role as string;
    const clubId = token.clubId as string;
    
    // Проверяем права (только админ, суперадмин или тренер)
    if (!allowedRoles.includes(role)) {
      console.log('Ошибка доступа: у пользователя недостаточно прав');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Проверяем существование тренировки и принадлежность к клубу
    const existingTraining = await prisma.training.findUnique({
      where: {
        id: trainingId,
        clubId, // Важная часть мультитенантности - проверка принадлежности тренировки к клубу пользователя
      },
    });
    
    if (!existingTraining) {
      console.log('Тренировка не найдена или принадлежит другому клубу');
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Удаляем тренировку
    await prisma.training.delete({
      where: {
        id: trainingId,
      },
    });
    
    console.log('Тренировка успешно удалена:', trainingId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Необработанная ошибка при удалении тренировки:', error);
    
    return NextResponse.json({ 
      error: 'Failed to delete training', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
} 