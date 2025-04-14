import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/exercises/categories/[categoryId] - получить категорию по ID
export async function GET(
  request: Request,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { categoryId } = params;

    // Получаем категорию с количеством упражнений и тегов
    const category = await prisma.exerciseCategory.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { 
            exercises: true,
            tags: true,
          },
        },
        // Получаем все упражнения этой категории
        exercises: {
          orderBy: { name: 'asc' },
          include: {
            tags: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        // Получаем все теги этой категории
        tags: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Ошибка при получении категории:', error);
    return NextResponse.json(
      { error: 'Не удалось получить категорию' },
      { status: 500 }
    );
  }
} 