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
 * GET /api/trainings
 * Получение списка тренировок клуба
 */
export async function GET(request: NextRequest) {
  try {
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const role = token.role as string;
    const clubId = token.clubId as string;
    
    // Получаем параметры запроса
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    
    // Формируем условие фильтрации
    const whereCondition: any = { clubId };
    
    // Если указан ID команды, добавляем фильтр по команде
    if (teamId) {
      whereCondition.teamId = teamId;
    }
    
    // Если указаны даты, добавляем фильтр по диапазону дат
    if (fromDate || toDate) {
      whereCondition.date = {};
      
      if (fromDate) {
        whereCondition.date.gte = new Date(fromDate);
      }
      
      if (toDate) {
        // Устанавливаем конец дня для включения всех тренировок в указанный день
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        whereCondition.date.lte = endDate;
      }
    }
    
    // Получаем тренировки клуба с фильтрацией
    const trainings = await prisma.training.findMany({
      where: whereCondition,
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
      orderBy: {
        date: 'desc',
      },
    });
    
    // Преобразуем данные в формат, ожидаемый клиентом
    const formattedTrainings = trainings.map(training => ({
      id: training.id,
      title: training.title,
      teamId: training.teamId,
      team: training.team.name,
      date: training.date.toISOString().split('T')[0],
      time: training.time,
      categoryId: training.categoryId,
      category: training.category.name,
      status: training.status || 'SCHEDULED',
      type: training.type || 'TRAINING',
      createdAt: training.createdAt,
      updatedAt: training.updatedAt
    }));
    
    return NextResponse.json(formattedTrainings);
  } catch (error: any) {
    console.error('Error fetching trainings:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch trainings',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/trainings
 * Создание новой тренировки
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Начало обработки запроса на создание тренировки');
    
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const role = token.role as string;
    const clubId = token.clubId as string;
    const userId = token.id as string;
    
    // Проверяем права (только админ, суперадмин или тренер)
    if (!allowedRoles.includes(role)) {
      console.log('Ошибка доступа: у пользователя недостаточно прав');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Парсим тело запроса
    const data = await request.json();
    console.log('Получены данные для создания тренировки:', data);
    
    // Проверка наличия необходимых полей
    if (!data.title || !data.title.trim()) {
      console.log('Отсутствует обязательное поле: title');
      return NextResponse.json({ 
        error: 'Missing required field: title' 
      }, { status: 400 });
    }
    
    if (!data.teamId) {
      console.log('Отсутствует обязательное поле: teamId');
      return NextResponse.json({ 
        error: 'Missing required field: teamId' 
      }, { status: 400 });
    }
    
    if (!data.date) {
      console.log('Отсутствует обязательное поле: date');
      return NextResponse.json({ 
        error: 'Missing required field: date' 
      }, { status: 400 });
    }
    
    if (!data.categoryId) {
      console.log('Отсутствует обязательное поле: categoryId');
      return NextResponse.json({ 
        error: 'Missing required field: categoryId' 
      }, { status: 400 });
    }
    
    // Создаем объект с данными для создания тренировки
    const trainingData = {
      title: data.title.trim(),
      description: data.description || null,
      teamId: data.teamId,
      date: new Date(data.date),
      time: data.time,
      location: data.location || null,
      notes: data.notes || null,
      categoryId: data.categoryId,
      clubId: clubId,
      createdById: userId,
      status: data.status || 'SCHEDULED',
      type: data.type || 'TRAINING',
    };
    
    // Создаем тренировку
    const training = await prisma.training.create({
      data: trainingData,
      include: {
        team: true,
        category: true,
      }
    });
    
    console.log('Тренировка успешно создана:', training.id);
    
    // Форматируем данные для ответа клиенту
    const formattedTraining = {
      id: training.id,
      title: training.title,
      teamId: training.teamId,
      team: training.team.name,
      date: training.date.toISOString().split('T')[0],
      time: training.time,
      categoryId: training.categoryId,
      category: training.category.name,
      status: training.status || 'SCHEDULED',
      type: training.type || 'TRAINING',
      createdAt: training.createdAt,
      updatedAt: training.updatedAt
    };
    
    return NextResponse.json(formattedTraining);
  } catch (error: any) {
    console.error('Необработанная ошибка при создании тренировки:', error);
    
    return NextResponse.json({ 
      error: 'Failed to create training', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}

// Вспомогательная функция для получения названия команды
async function fetchTeamName(teamId: string): Promise<string> {
  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true }
    });
    return team?.name || 'Неизвестная команда';
  } catch (error) {
    console.error('Ошибка при получении имени команды:', error);
    return 'Неизвестная команда';
  }
}

// Вспомогательная функция для получения названия категории
async function fetchCategoryName(categoryId: string): Promise<string> {
  try {
    const category = await prisma.trainingCategory.findUnique({
      where: { id: categoryId },
      select: { name: true }
    });
    return category?.name || 'Неизвестная категория';
  } catch (error) {
    console.error('Ошибка при получении имени категории:', error);
    return 'Неизвестная категория';
  }
} 