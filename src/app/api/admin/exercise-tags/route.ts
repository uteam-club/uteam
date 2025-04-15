import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить все теги упражнений
export async function GET() {
  try {
    const tags = await prisma.exerciseTag.findMany({
      orderBy: { name: 'asc' },
      include: {
        exerciseCategory: true
      }
    });
    
    // Преобразуем exerciseCategoryId в categoryId для совместимости с фронтендом
    const transformedTags = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      categoryId: tag.exerciseCategoryId,
      category: tag.exerciseCategory
    }));
    
    return NextResponse.json(transformedTags, { status: 200 });
  } catch (error) {
    console.error('Error fetching exercise tags:', error);
    return NextResponse.json({ error: 'Ошибка получения списка тегов' }, { status: 500 });
  }
}

// POST - создать новый тег
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'Название тега обязательно' }, { status: 400 });
    }

    if (!data.categoryId) {
      return NextResponse.json({ error: 'Категория тега обязательна' }, { status: 400 });
    }

    // Проверка существования категории
    const categoryExists = await prisma.exerciseCategory.findUnique({
      where: { id: data.categoryId }
    });

    if (!categoryExists) {
      return NextResponse.json({ error: 'Указанная категория не существует' }, { status: 400 });
    }

    const tag = await prisma.exerciseTag.create({
      data: {
        name: data.name.trim(),
        exerciseCategoryId: data.categoryId, // Используем правильное имя поля
      },
      include: {
        exerciseCategory: true
      }
    });

    // Преобразуем для совместимости с фронтендом
    const transformedTag = {
      id: tag.id,
      name: tag.name,
      categoryId: tag.exerciseCategoryId,
      category: tag.exerciseCategory
    };

    return NextResponse.json(transformedTag, { status: 201 });
  } catch (error) {
    console.error('Error creating exercise tag:', error);
    return NextResponse.json({ error: 'Ошибка создания тега' }, { status: 500 });
  }
}

// PUT - обновить тег
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.id) {
      return NextResponse.json({ error: 'ID тега обязателен' }, { status: 400 });
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'Название тега обязательно' }, { status: 400 });
    }

    if (!data.categoryId) {
      return NextResponse.json({ error: 'Категория тега обязательна' }, { status: 400 });
    }

    // Проверка существования категории
    const categoryExists = await prisma.exerciseCategory.findUnique({
      where: { id: data.categoryId }
    });

    if (!categoryExists) {
      return NextResponse.json({ error: 'Указанная категория не существует' }, { status: 400 });
    }

    const tag = await prisma.exerciseTag.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        exerciseCategoryId: data.categoryId, // Используем правильное имя поля
      },
      include: {
        exerciseCategory: true
      }
    });

    // Преобразуем для совместимости с фронтендом
    const transformedTag = {
      id: tag.id,
      name: tag.name,
      categoryId: tag.exerciseCategoryId,
      category: tag.exerciseCategory
    };

    return NextResponse.json(transformedTag, { status: 200 });
  } catch (error) {
    console.error('Error updating exercise tag:', error);
    return NextResponse.json({ error: 'Ошибка обновления тега' }, { status: 500 });
  }
}

// DELETE - удалить тег
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID тега обязателен' }, { status: 400 });
    }

    await prisma.exerciseTag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting exercise tag:', error);
    return NextResponse.json({ error: 'Ошибка удаления тега' }, { status: 500 });
  }
}
