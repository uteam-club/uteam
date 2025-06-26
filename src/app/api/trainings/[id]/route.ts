import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { training, team, trainingCategory } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
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

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
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
    
    const hasAccess = await checkClubAccess(request, token);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
    }
    
    const clubId = token.clubId as string;
    
    // Получаем тренировку с join
    const [row] = await db.select({
      id: training.id,
      title: training.title,
      description: training.description,
      teamId: training.teamId,
      date: training.date,
      location: training.location,
      notes: training.notes,
      categoryId: training.categoryId,
      status: training.status,
      createdAt: training.createdAt,
      updatedAt: training.updatedAt,
      teamName: team.name,
      categoryName: trainingCategory.name,
    })
      .from(training)
      .leftJoin(team, eq(training.teamId, team.id))
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(and(eq(training.id, trainingId), eq(training.clubId, clubId)));
    
    if (!row) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Форматируем данные для ответа клиенту
    const formattedTraining = {
      id: row.id,
      title: row.title,
      description: row.description,
      teamId: row.teamId,
      team: row.teamName,
      date: row.date?.toISOString(),
      location: row.location,
      notes: row.notes,
      categoryId: row.categoryId,
      category: row.categoryName,
      status: row.status || 'SCHEDULED',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
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
    const [existing] = await db.select().from(training).where(and(eq(training.id, trainingId), eq(training.clubId, clubId)));
    
    if (!existing) {
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
    if ('location' in data) trainingData.location = data.location;
    if ('notes' in data) trainingData.notes = data.notes;
    if ('categoryId' in data) trainingData.categoryId = data.categoryId;
    if ('status' in data) trainingData.status = data.status;
    
    // Обновляем тренировку
    const [updated] = await db.update(training)
      .set(trainingData)
      .where(eq(training.id, trainingId))
      .returning();
    
    console.log('Тренировка успешно обновлена:', updated.id);
    
    // Получаем team и category для ответа
    const [teamRow] = await db.select({ name: team.name }).from(team).where(eq(team.id, updated.teamId));
    const [catRow] = await db.select({ name: trainingCategory.name }).from(trainingCategory).where(eq(trainingCategory.id, updated.categoryId));
    
    // Форматируем данные для ответа клиенту
    const formattedTraining = {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      teamId: updated.teamId,
      team: teamRow?.name || '',
      date: updated.date?.toISOString(),
      location: updated.location,
      notes: updated.notes,
      categoryId: updated.categoryId,
      category: catRow?.name || '',
      status: updated.status || 'SCHEDULED',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
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
    const [existing] = await db.select().from(training).where(and(eq(training.id, trainingId), eq(training.clubId, clubId)));
    
    if (!existing) {
      console.log('Тренировка не найдена или принадлежит другому клубу');
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    
    // Удаляем тренировку
    await db.delete(training).where(eq(training.id, trainingId));
    
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