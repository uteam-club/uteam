import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';

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
 * GET /api/teams
 * Получение списка команд клуба
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
    
    // Получаем команды клуба
    const teams = await prisma.team.findMany({
      where: {
        clubId,
      },
      orderBy: [
        { order: 'asc' },  // Сначала сортируем по полю order
        { name: 'asc' }    // Затем по имени (если order одинаковый)
      ],
    });
    
    return NextResponse.json(teams);
  } catch (error: any) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch teams',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/teams
 * Создание новой команды
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Начало обработки запроса на создание команды');
    
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
    console.log('Получены данные для создания команды:', data);
    
    // Проверка наличия необходимых полей
    if (!data.name || !data.name.trim()) {
      console.log('Отсутствует обязательное поле: name');
      return NextResponse.json({ 
        error: 'Missing required field: name' 
      }, { status: 400 });
    }
    
    // Создаем объект с данными для создания команды
    const teamData: { name: string; clubId: string; order?: number } = {
      name: data.name.trim(),
      clubId,
    };
    
    // Находим максимальный порядок среди существующих команд
    const maxOrderTeam = await prisma.team.findFirst({
      where: { clubId },
      orderBy: { order: 'desc' },
    });
    
    // Устанавливаем порядок для новой команды
    if (maxOrderTeam) {
      teamData.order = maxOrderTeam.order + 1;
    } else {
      teamData.order = 1;
    }
    
    // Создаем команду
    const team = await prisma.team.create({
      data: teamData,
    });
    
    console.log('Команда успешно создана:', team.id);
    
    return NextResponse.json(team);
  } catch (error: any) {
    console.error('Необработанная ошибка при создании команды:', error);
    
    return NextResponse.json({ 
      error: 'Failed to create team', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
} 