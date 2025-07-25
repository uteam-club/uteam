import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { exerciseCategory } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
export const dynamic = 'force-dynamic';
export const revalidate = 0;


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
  return token.clubId === club.id;
}

/**
 * GET /api/exercise-categories/[id]
 * Получение информации о конкретной категории упражнений
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'exerciseCategories.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    // Получаем токен пользователя
    const token = (await getTokenFromRequest(request) as unknown) as Token | null;
    
    if (!token || typeof token.clubId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await checkClubAccess(request, token);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
    }
    
    const clubId = token.clubId as string;
    
    const categoryId = params.id;
    const [foundCategory]: any = await db.select().from(exerciseCategory).where(eq(exerciseCategory.id, categoryId)).limit(1);
    if (!foundCategory) {
      return NextResponse.json({ error: 'Exercise category not found' }, { status: 404 });
    }
    
    // Проверяем, что категория принадлежит к тому же клубу
    if (foundCategory.clubId !== clubId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json(foundCategory);
  } catch (error: any) {
    console.error('Error fetching exercise category:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch exercise category',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/exercise-categories/[id]
 * Обновление данных категории упражнений
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'exerciseCategories.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    console.log('Начало обработки запроса на обновление категории упражнений');
    
    // Получаем токен пользователя
    const token = (await getTokenFromRequest(request) as unknown) as Token | null;
    
    if (!token || typeof token.clubId !== 'string') {
      console.log('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await checkClubAccess(request, token);
    if (!hasAccess) {
      console.log('Ошибка доступа: у пользователя недостаточно прав');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const clubId = token.clubId as string;
    const categoryId = params.id;
    
    // Получаем текущую категорию
    const [currentCategory]: any = await db.select().from(exerciseCategory).where(eq(exerciseCategory.id, categoryId)).limit(1);
    if (!currentCategory) {
      console.log('Категория не найдена:', categoryId);
      return NextResponse.json({ error: 'Exercise category not found' }, { status: 404 });
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
    const [updatedCategory]: any = await db.update(exerciseCategory).set(updateData).where(eq(exerciseCategory.id, categoryId)).returning();
    console.log('Категория упражнений успешно обновлена:', updatedCategory?.id);
    
    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error('Необработанная ошибка при обновлении категории упражнений:', error);
    
    return NextResponse.json({ 
      error: 'Failed to update exercise category', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/exercise-categories/[id]
 * Удаление категории упражнений
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'exerciseCategories.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    console.log('Начало обработки запроса на удаление категории упражнений');
    
    // Получаем токен пользователя
    const token = (await getTokenFromRequest(request) as unknown) as Token | null;
    
    if (!token || typeof token.clubId !== 'string') {
      console.log('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await checkClubAccess(request, token);
    if (!hasAccess) {
      console.log('Ошибка доступа: у пользователя недостаточно прав');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const clubId = token.clubId as string;
    const categoryId = params.id;
    
    // Получаем текущую категорию
    const [categoryToDelete]: any = await db.select().from(exerciseCategory).where(eq(exerciseCategory.id, categoryId)).limit(1);
    if (!categoryToDelete) {
      console.log('Категория не найдена:', categoryId);
      return NextResponse.json({ error: 'Exercise category not found' }, { status: 404 });
    }
    
    // Проверяем, что категория принадлежит к тому же клубу
    if (categoryToDelete.clubId !== clubId) {
      console.log('Попытка удаления категории из другого клуба');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Удаляем категорию
    const [deletedCategory]: any = await db.delete(exerciseCategory).where(eq(exerciseCategory.id, categoryId)).returning();
    
    console.log('Категория упражнений успешно удалена:', categoryId);
    
    return NextResponse.json(deletedCategory);
  } catch (error: any) {
    console.error('Необработанная ошибка при удалении категории упражнений:', error);
    
    return NextResponse.json({ 
      error: 'Failed to delete exercise category', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
} 