import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';
import * as jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { trainingCategory } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
export const dynamic = 'force-dynamic';
export const revalidate = 0;




// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  // Глобальный SUPER_ADMIN имеет доступ ко всем клубам
  if (token.role === 'SUPER_ADMIN' && token.clubId === '00000000-0000-0000-0000-000000000000') {
    return true;
  }
  return token.clubId === club.id;
}

/**
 * GET /api/training-categories
 * Получение списка категорий тренировок клуба
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Starting GET /api/training-categories request');
    
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    console.log('Token received:', token ? 'Yes' : 'No');
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'trainings.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const hasAccess = await checkClubAccess(request, token);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
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
  } catch (error: any) {
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
export async function POST(request: NextRequest) {
  try {
    console.log('Начало обработки запроса на создание категории тренировок');
    
    // Получаем токен пользователя
    const token = await getTokenFromRequest(request);
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'trainings.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
    
    const role = token.role as string;
    const clubId = token.clubId as string;
    
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
    
    console.log('Категория тренировок успешно создана:', category?.id);
    
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('Необработанная ошибка при создании категории тренировок:', error);
    
    return NextResponse.json({ 
      error: 'Failed to create training category', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
} 