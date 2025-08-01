import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { exerciseTag, exerciseCategory } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Добавляю тип Token
type Token = { clubId: string; [key: string]: any };

// Проверка и получение ID из параметров
interface RouteParams {
  params: {
    id: string;
  };
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

// Обработчик PUT-запроса для обновления тега упражнений
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const token = await getToken({ req: req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'exercises.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { id } = params;
    
    // Проверяем права доступа
    if (token.role !== 'ADMIN' && token.role !== 'SUPER_ADMIN' && token.role !== 'COACH') {
      return NextResponse.json({ error: 'Нет прав доступа' }, { status: 403 });
    }
    
    // Получаем ID клуба из токена
    const clubId = token.clubId;
    
    // Получаем данные из запроса
    const data = await req.json();
    
    // Проверяем обязательные поля
    if (!data.name || !data.exerciseCategoryId) {
      return NextResponse.json(
        { error: 'Название и категория обязательны' },
        { status: 400 }
      );
    }
    
    // Проверяем существование тега и принадлежность к клубу
    const [foundTag]: any = await db.select().from(exerciseTag)
      .where(and(eq(exerciseTag.id, id), eq(exerciseTag.clubId, clubId)));
    if (!foundTag) {
      return NextResponse.json(
        { error: 'Тег не найден' },
        { status: 404 }
      );
    }
    
    // Проверяем существование категории и принадлежность к клубу
    const [category]: any = await db.select().from(exerciseCategory)
      .where(and(eq(exerciseCategory.id, data.exerciseCategoryId), eq(exerciseCategory.clubId, clubId)));
    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 400 }
      );
    }
    
    // Обновляем тег упражнений
    const [updatedTag]: any = await db.update(exerciseTag)
      .set({
        name: data.name,
        exerciseCategoryId: data.exerciseCategoryId,
      })
      .where(eq(exerciseTag.id, id))
      .returning();
    
    // Возвращаем обновленный тег
    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('Ошибка при обновлении тега упражнений:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении тега упражнений' },
      { status: 500 }
    );
  }
}

// Обработчик DELETE-запроса для удаления тега упражнений
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const token = await getToken({ req: req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'exercises.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { id } = params;
    
    // Проверяем права доступа
    if (token.role !== 'ADMIN' && token.role !== 'SUPER_ADMIN' && token.role !== 'COACH') {
      return NextResponse.json({ error: 'Нет прав доступа' }, { status: 403 });
    }
    
    // Получаем ID клуба из токена
    const clubId = token.clubId;
    
    // Проверяем существование тега и принадлежность к клубу
    const [tagToDelete]: any = await db.select().from(exerciseTag)
      .where(and(eq(exerciseTag.id, id), eq(exerciseTag.clubId, clubId)));
    if (!tagToDelete) {
      return NextResponse.json(
        { error: 'Тег не найден' },
        { status: 404 }
      );
    }
    
    // Удаляем тег упражнений
    const [deletedTag]: any = await db.delete(exerciseTag)
      .where(eq(exerciseTag.id, id))
      .returning();
    
    // Возвращаем успешный ответ
    return NextResponse.json(
      { message: 'Тег упражнений успешно удален', deletedTag }
    );
  } catch (error) {
    console.error('Ошибка при удалении тега упражнений:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении тега упражнений' },
      { status: 500 }
    );
  }
}

// В каждом обработчике (пример для GET):
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'exercises.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  // ... остальной код ...
} 