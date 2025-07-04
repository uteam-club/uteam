import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { exerciseTag, exerciseCategory } from '@/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Добавляю тип Token
type Token = { clubId: string; [key: string]: any };

// Функция для чтения токена из заголовка Authorization
async function getTokenFromRequest(request: NextRequest) {
  // ... existing code ...
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

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

// Обработчик GET-запроса для получения всех тегов упражнений
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(req, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  try {
    console.log('Начало обработки GET-запроса для тегов упражнений');
    
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    console.log('Данные сессии:', { 
      authenticated: !!session, 
      userId: session?.user?.id,
      clubId: session?.user?.clubId 
    });
    
    // Проверяем аутентификацию
    if (!session || !session.user) {
      console.error('Ошибка аутентификации: пользователь не авторизован');
      return new NextResponse(
        JSON.stringify({ error: 'Не авторизован' }), 
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
    if (!clubId) {
      console.error('Ошибка: отсутствует ID клуба в сессии пользователя');
      return new NextResponse(
        JSON.stringify({ error: 'Отсутствует ID клуба' }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }
    
    // Получаем список тегов упражнений для клуба пользователя
    const exerciseTags = await db.select({
      id: exerciseTag.id,
      name: exerciseTag.name,
      clubId: exerciseTag.clubId,
      exerciseCategoryId: exerciseTag.exerciseCategoryId,
      exerciseCategoryName: exerciseCategory.name
    })
      .from(exerciseTag)
      .leftJoin(exerciseCategory, eq(exerciseTag.exerciseCategoryId, exerciseCategory.id))
      .where(eq(exerciseTag.clubId, clubId))
      .orderBy(asc(exerciseTag.name));
    
    console.log(`Найдено ${exerciseTags.length} тегов для клуба ${clubId}`);
    
    // Преобразуем к нужному виду:
    const tagsWithCategoryObj = exerciseTags.map(tag => ({
      ...tag,
      exerciseCategory: tag.exerciseCategoryName ? { name: tag.exerciseCategoryName } : undefined,
    }));
    
    // Возвращаем список тегов
    return new NextResponse(
      JSON.stringify(tagsWithCategoryObj),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Ошибка при получении тегов упражнений:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Ошибка при получении тегов упражнений',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

// Обработчик POST-запроса для создания нового тега упражнений
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(req, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  try {
    console.log('Начало обработки POST-запроса для создания тега упражнений');
    
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    console.log('Данные сессии:', {
      authenticated: !!session,
      userId: session?.user?.id,
      clubId: session?.user?.clubId,
      role: session?.user?.role
    });
    
    // Проверяем аутентификацию и права доступа
    if (!session || !session.user) {
      console.error('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'COACH') {
      console.error('Ошибка прав доступа:', { userRole: session.user.role });
      return NextResponse.json({ error: 'Нет прав доступа' }, { status: 403 });
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
    // Получаем данные из запроса
    const data = await req.json();
    console.log('Полученные данные:', data);
    
    // Проверяем обязательные поля
    if (!data.name || !data.exerciseCategoryId) {
      console.error('Ошибка валидации: отсутствуют обязательные поля');
      return NextResponse.json(
        { error: 'Название и категория обязательны' },
        { status: 400 }
      );
    }
    
    // Проверяем существование категории и принадлежность к клубу
    const [category] = await db.select().from(exerciseCategory)
      .where(and(eq(exerciseCategory.id, data.exerciseCategoryId), eq(exerciseCategory.clubId, clubId)));
    
    if (!category) {
      console.error('Ошибка: категория не найдена или принадлежит другому клубу');
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 400 }
      );
    }
    
    // Создаем новый тег упражнений
    const [createdTag] = await db.insert(exerciseTag).values({
      name: data.name,
      clubId,
      exerciseCategoryId: data.exerciseCategoryId,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    // Получаем тег с названием категории
    const [tagWithCategory] = await db.select({
      id: exerciseTag.id,
      name: exerciseTag.name,
      clubId: exerciseTag.clubId,
      exerciseCategoryId: exerciseTag.exerciseCategoryId,
      exerciseCategoryName: exerciseCategory.name,
    })
      .from(exerciseTag)
      .leftJoin(exerciseCategory, eq(exerciseTag.exerciseCategoryId, exerciseCategory.id))
      .where(eq(exerciseTag.id, createdTag.id));
    
    return NextResponse.json({
      ...tagWithCategory,
      exerciseCategory: tagWithCategory.exerciseCategoryName ? { name: tagWithCategory.exerciseCategoryName } : undefined,
    });
  } catch (error) {
    console.error('Ошибка при создании тега упражнений:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании тега упражнений' },
      { status: 500 }
    );
  }
} 