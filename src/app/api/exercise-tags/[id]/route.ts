import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { exerciseTag, exerciseCategory } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Проверка и получение ID из параметров
interface RouteParams {
  params: {
    id: string;
  };
}

// Обработчик PUT-запроса для обновления тега упражнений
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию и права доступа
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Нет прав доступа' }, { status: 403 });
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
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
  try {
    const { id } = params;
    
    // Получаем данные сессии пользователя
    const session = await getServerSession(authOptions);
    
    // Проверяем аутентификацию и права доступа
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Нет прав доступа' }, { status: 403 });
    }
    
    // Получаем ID клуба из сессии пользователя
    const clubId = session.user.clubId;
    
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