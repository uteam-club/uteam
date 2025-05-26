import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateClub, deleteClub } from '@/services/club.service';

// Получение клуба по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const club = await prisma.club.findUnique({
      where: { id: params.id },
    });

    if (!club) {
      return NextResponse.json(
        { error: 'Клуб не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json(club);
  } catch (error) {
    console.error('Ошибка при получении данных клуба:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

// Обновление клуба
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const data = await request.json();
    
    // Проверяем, что клуб существует
    const existingClub = await prisma.club.findUnique({
      where: { id },
    });

    if (!existingClub) {
      return NextResponse.json(
        { error: 'Клуб не найден' },
        { status: 404 }
      );
    }

    // Обновляем клуб
    const club = await updateClub(id, {
      name: data.name,
      logoUrl: data.logoUrl,
    });

    if (!club) {
      return NextResponse.json(
        { error: 'Не удалось обновить клуб' },
        { status: 500 }
      );
    }

    return NextResponse.json(club);
  } catch (error) {
    console.error('Error updating club:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при обновлении клуба' },
      { status: 500 }
    );
  }
}

// Удаление клуба
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Проверяем, что клуб существует
    const existingClub = await prisma.club.findUnique({
      where: { id },
    });

    if (!existingClub) {
      return NextResponse.json(
        { error: 'Клуб не найден' },
        { status: 404 }
      );
    }

    // Удаляем клуб
    const success = await deleteClub(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Не удалось удалить клуб' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting club:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при удалении клуба' },
      { status: 500 }
    );
  }
} 