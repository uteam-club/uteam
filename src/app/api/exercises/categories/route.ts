import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/exercises/categories - получить все категории упражнений
export async function GET() {
  try {
    const categories = await prisma.exerciseCategory.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            exercises: true,
            tags: true,
          },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Ошибка при получении категорий упражнений:', error);
    return NextResponse.json(
      { error: 'Не удалось получить категории упражнений' },
      { status: 500 }
    );
  }
}

// POST /api/exercises/categories - создать новую категорию упражнений
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Проверка обязательных полей
    if (!body.name) {
      return NextResponse.json(
        { error: 'Название категории обязательно' },
        { status: 400 }
      );
    }

    // Проверка на уникальность имени
    const existingCategory = await prisma.exerciseCategory.findUnique({
      where: { name: body.name },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Категория с таким названием уже существует' },
        { status: 400 }
      );
    }

    // Создание новой категории
    const newCategory = await prisma.exerciseCategory.create({
      data: {
        name: body.name,
        description: body.description,
      },
      include: {
        _count: {
          select: {
            exercises: true,
            tags: true,
          },
        },
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании категории упражнений:', error);
    return NextResponse.json(
      { error: 'Не удалось создать категорию упражнений' },
      { status: 500 }
    );
  }
} 