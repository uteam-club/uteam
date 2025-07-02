import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { exerciseCategory } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';

// Массив ролей, которым разрешено создавать категории
const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

// Добавляю тип Token
type Token = { clubId: string; [key: string]: any };

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
  // Глобальный SUPER_ADMIN имеет доступ ко всем клубам
  if (token.role === 'SUPER_ADMIN' && token.clubId === '00000000-0000-0000-0000-000000000000') {
    return true;
  }
  return token.clubId === club.id;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    console.log('Начало обработки GET-запроса для категорий упражнений');
    
    // Получаем токен пользователя
    const token = (await getTokenFromRequest(req) as unknown) as Token | null;
    
    if (!token || typeof token.clubId !== 'string') {
      console.error('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Проверяем доступ к клубу
    const hasAccess = await checkClubAccess(req, token);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
    }
    
    // Получаем ID клуба из токена
    const clubId = token.clubId;
    
    if (!clubId) {
      console.error('Ошибка: отсутствует ID клуба в токене');
      return NextResponse.json({ error: 'Отсутствует ID клуба' }, { status: 400 });
    }
    
    console.log('Получение категорий для клуба:', clubId);
    
    // Формируем запрос на получение категорий упражнений для данного клуба
    const categories = await db.select().from(exerciseCategory)
      .where(eq(exerciseCategory.clubId, clubId))
      .orderBy(asc(exerciseCategory.name));
    
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
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    console.log('Начало обработки запроса на создание категории упражнений');
    
    // Получаем токен пользователя
    const token = (await getTokenFromRequest(request) as unknown) as Token | null;
    
    if (!token || typeof token.clubId !== 'string') {
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
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Создаем категорию
    const [category] = await db.insert(exerciseCategory).values(categoryData).returning();
    
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