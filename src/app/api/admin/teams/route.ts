import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Создаем выделенный экземпляр PrismaClient для этого файла
const prisma = new PrismaClient();

// GET - получить все команды
export async function GET() {
  try {
    console.log('GET: Fetching teams');
    
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
    });
    
    console.log(`GET: Found ${teams.length} teams`);
    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Ошибка получения списка команд' }, { status: 500 });
  }
}

// POST - создать новую команду
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('POST: Creating team with data:', data);

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'Название команды обязательно' }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        name: data.name.trim(),
        description: data.description || null,
      },
    });

    console.log('POST: Created team:', team);
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Ошибка создания команды' }, { status: 500 });
  }
}

// PUT - обновить команду
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('PUT: Updating team:', data);

    if (!data.id) {
      return NextResponse.json({ error: 'ID команды обязателен' }, { status: 400 });
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'Название команды обязательно' }, { status: 400 });
    }

    const team = await prisma.team.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        description: data.description || null,
      },
    });

    console.log('PUT: Updated team:', team);
    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Ошибка обновления команды' }, { status: 500 });
  }
}

// DELETE - удалить команду
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    console.log('DELETE: Deleting team with ID:', id);

    if (!id) {
      return NextResponse.json({ error: 'ID команды обязателен' }, { status: 400 });
    }

    await prisma.team.delete({
      where: { id },
    });

    console.log('DELETE: Deleted team with ID:', id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Ошибка удаления команды' }, { status: 500 });
  }
}
