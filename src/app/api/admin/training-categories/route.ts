import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить все категории тренировок
export async function GET() {
  try {
    console.log('GET: Fetching training categories');
    
    const categories = await prisma.trainingCategory.findMany({
      orderBy: { name: 'asc' },
    });
    
    console.log(`GET: Found ${categories.length} training categories`);
    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('Error fetching training categories:', error);
    return NextResponse.json({ error: 'Ошибка получения списка категорий' }, { status: 500 });
  }
}

// POST - создать новую категорию
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('POST: Creating training category with data:', data);

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 });
    }

    const category = await prisma.trainingCategory.create({
      data: {
        name: data.name.trim(),
        description: data.description || null,
      },
    });

    console.log('POST: Created training category:', category);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating training category:', error);
    return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 });
  }
}

// PUT - обновить категорию
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('PUT: Updating training category:', data);

    if (!data.id) {
      return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 });
    }

    const category = await prisma.trainingCategory.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        description: data.description || null,
      },
    });

    console.log('PUT: Updated training category:', category);
    return NextResponse.json(category, { status: 200 });
  } catch (error) {
    console.error('Error updating training category:', error);
    return NextResponse.json({ error: 'Ошибка обновления категории' }, { status: 500 });
  }
}

// DELETE - удалить категорию
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    console.log('DELETE: Deleting training category with ID:', id);

    if (!id) {
      return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
    }

    await prisma.trainingCategory.delete({
      where: { id },
    });

    console.log('DELETE: Deleted training category with ID:', id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting training category:', error);
    return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 });
  }
}
