import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить все категории упражнений
export async function GET() {
  try {
    const categories = await prisma.exerciseCategory.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('Error fetching exercise categories:', error);
    return NextResponse.json({ error: 'Ошибка получения списка категорий' }, { status: 500 });
  }
}

// POST - создать новую категорию
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 });
    }

    const category = await prisma.exerciseCategory.create({
      data: {
        name: data.name.trim(),
        description: data.description || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating exercise category:', error);
    return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 });
  }
}

// PUT - обновить категорию
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.id) {
      return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 });
    }

    const category = await prisma.exerciseCategory.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        description: data.description || null,
      },
    });

    return NextResponse.json(category, { status: 200 });
  } catch (error) {
    console.error('Error updating exercise category:', error);
    return NextResponse.json({ error: 'Ошибка обновления категории' }, { status: 500 });
  }
}

// DELETE - удалить категорию
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
    }

    await prisma.exerciseCategory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting exercise category:', error);
    return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 });
  }
}
