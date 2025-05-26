import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';

// Функция для получения токена
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
 * GET /api/trainings/[id]/attendance
 * Получение данных посещаемости для тренировки
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('GET /attendance: Получение данных посещаемости для тренировки:', params.id);
    
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    
    // Получаем ID тренировки из параметров
    const trainingId = params.id;
    
    // Получаем информацию о тренировке
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: { team: true }
    });
    
    if (!training) {
      console.log('Тренировка не найдена:', trainingId);
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Проверяем, что тренировка принадлежит к тому же клубу
    if (training.clubId !== clubId) {
      console.log('Попытка доступа к тренировке из другого клуба');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Получаем всех игроков команды
    const players = await prisma.player.findMany({
      where: { teamId: training.teamId },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });
    
    // Получаем данные посещаемости для этой тренировки
    const attendance = await prisma.playerAttendance.findMany({
      where: { trainingId },
    });
    
    // Формируем полный список игроков с их статусами посещаемости
    const result = players.map(player => {
      const playerAttendance = attendance.find(a => a.playerId === player.id);
      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        number: player.number || '',
        positionInTeam: player.position || '',
        imageUrl: player.imageUrl || null,
        // Статус посещаемости (если есть) или TRAINED по умолчанию
        attendance: playerAttendance 
          ? {
              id: playerAttendance.id,
              status: playerAttendance.status,
              comment: playerAttendance.comment || ''
            }
          : { status: 'TRAINED', comment: '' }
      };
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Ошибка при получении данных посещаемости:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch attendance data',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/trainings/[id]/attendance
 * Сохранение данных посещаемости для тренировки
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('POST /attendance: Сохранение данных посещаемости для тренировки:', params.id);
    
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) {
      console.log('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clubId = token.clubId as string;
    
    // Получаем ID тренировки из параметров
    const trainingId = params.id;
    
    // Получаем информацию о тренировке
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
    });
    
    if (!training) {
      console.log('Тренировка не найдена:', trainingId);
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Проверяем, что тренировка принадлежит к тому же клубу
    if (training.clubId !== clubId) {
      console.log('Попытка доступа к тренировке из другого клуба');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Получаем данные о посещаемости из запроса
    const data = await request.json();
    
    if (!Array.isArray(data)) {
      console.log('Неверный формат данных');
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }
    
    // Массив для хранения результатов сохранения
    const results = [];
    
    // Обновляем данные посещаемости для каждого игрока
    for (const item of data) {
      if (!item.playerId || !item.status) {
        console.log('Отсутствуют обязательные поля для игрока');
        continue;
      }
      
      // Проверяем, существует ли уже запись о посещаемости
      const existingAttendance = await prisma.playerAttendance.findUnique({
        where: {
          playerId_trainingId: {
            playerId: item.playerId,
            trainingId
          }
        }
      });
      
      let result;
      
      if (existingAttendance) {
        // Обновляем существующую запись
        result = await prisma.playerAttendance.update({
          where: { id: existingAttendance.id },
          data: {
            status: item.status,
            comment: item.comment || null
          }
        });
      } else {
        // Создаем новую запись
        result = await prisma.playerAttendance.create({
          data: {
            playerId: item.playerId,
            trainingId,
            status: item.status,
            comment: item.comment || null
          }
        });
      }
      
      results.push(result);
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Attendance data saved successfully',
      results
    });
  } catch (error: any) {
    console.error('Ошибка при сохранении данных посещаемости:', error);
    return NextResponse.json({ 
      error: 'Failed to save attendance data',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
} 