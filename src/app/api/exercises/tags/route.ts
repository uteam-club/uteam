import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/exercises/tags - получить все теги упражнений
export async function GET() {
  try {
    const tags = await prisma.exerciseTag.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        exerciseCategoryId: true,
      },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Ошибка при получении тегов упражнений:', error);
    return NextResponse.json(
      { error: 'Не удалось получить теги упражнений' },
      { status: 500 }
    );
  }
} 