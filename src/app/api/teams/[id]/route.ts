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
 * GET /api/teams/[id]
 * Получение информации о конкретной команде
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
    
    const teamId = params.id;
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    // Проверяем, что команда принадлежит к тому же клубу
    if (team.clubId !== clubId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json(team);
  } catch (error: any) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch team',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/teams/[id]
 * Обновление данных команды
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Начало обработки запроса на обновление команды');
    
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
    
    const teamId = params.id;
    
    // Получаем текущую команду
    const currentTeam = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });
    
    if (!currentTeam) {
      console.log('Команда не найдена:', teamId);
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    // Проверяем, что команда принадлежит к тому же клубу
    if (currentTeam.clubId !== clubId) {
      console.log('Попытка редактирования команды из другого клуба');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Парсим тело запроса
    const data = await request.json();
    console.log('Получены данные для обновления:', data);
    
    // Проверка наличия необходимых полей
    if (!data.name && data.order === undefined) {
      console.log('Отсутствуют поля для обновления');
      return NextResponse.json({ 
        error: 'No fields to update' 
      }, { status: 400 });
    }
    
    // Создаем объект с данными для обновления
    const updateData: any = {};
    
    if (data.name) {
      updateData.name = data.name.trim();
    }
    
    if (data.order !== undefined) {
      updateData.order = data.order;
    }
    
    // Обновляем команду
    const team = await prisma.team.update({
      where: {
        id: teamId,
      },
      data: updateData,
    });
    
    console.log('Команда успешно обновлена:', team.id);
    
    return NextResponse.json(team);
  } catch (error: any) {
    console.error('Необработанная ошибка при обновлении команды:', error);
    
    return NextResponse.json({ 
      error: 'Failed to update team', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/[id]
 * Удаление команды
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Начало обработки запроса на удаление команды');
    
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
    
    const teamId = params.id;
    
    // Получаем текущую команду
    const currentTeam = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    });
    
    if (!currentTeam) {
      console.log('Команда не найдена:', teamId);
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    // Проверяем, что команда принадлежит к тому же клубу
    if (currentTeam.clubId !== clubId) {
      console.log('Попытка удаления команды из другого клуба');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Удаляем команду
    await prisma.team.delete({
      where: {
        id: teamId,
      },
    });
    
    console.log('Команда успешно удалена:', teamId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Team deleted successfully' 
    });
  } catch (error: any) {
    console.error('Необработанная ошибка при удалении команды:', error);
    
    return NextResponse.json({ 
      error: 'Failed to delete team', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
} 