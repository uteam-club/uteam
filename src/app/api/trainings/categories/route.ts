import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/trainings/categories - получить все категории тренировок
export async function GET() {
  try {
    const categories = await prisma.trainingCategory.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Ошибка при получении категорий тренировок:', error);
    return NextResponse.json(
      { error: 'Не удалось получить категории тренировок' },
      { status: 500 }
    );
  }
}

// POST /api/trainings/categories - создать новую категорию тренировок
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Проверка обязательных полей
    if (!data.name) {
      return NextResponse.json(
        { error: 'Название категории обязательно' },
        { status: 400 }
      );
    }
    
    // Проверка на дубликат
    const existingCategory = await prisma.trainingCategory.findUnique({
      where: {
        name: data.name
      }
    });
    
    if (existingCategory) {
      return NextResponse.json(
        { error: 'Категория с таким названием уже существует' },
        { status: 400 }
      );
    }
    
    // Создание новой категории
    const category = await prisma.trainingCategory.create({
      data: {
        name: data.name,
        description: data.description
      }
    });
    
    return NextResponse.json(category);
  } catch (error) {
    console.error('Ошибка при создании категории тренировок:', error);
    return NextResponse.json(
      { error: 'Не удалось создать категорию тренировок' },
      { status: 500 }
    );
  }
} 