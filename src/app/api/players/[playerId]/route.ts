import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить информацию об игроке
export async function GET(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const { playerId } = params;
    
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (!player) {
      return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
    }
    
    return NextResponse.json(player, { status: 200 });
  } catch (error) {
    console.error('Ошибка при получении информации об игроке:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PUT - обновить информацию об игроке
export async function PUT(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const { playerId } = params;
    const data = await req.json();
    
    // Проверяем существование игрока
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
    });
    
    if (!existingPlayer) {
      return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
    }
    
    // Разрешенные поля для обновления
    const {
      firstName,
      lastName,
      middleName,
      nationality,
      position,
      number,
      foot,
      academyJoinDate,
      birthDate,
      bio,
      photoUrl,
    } = data;
    
    // Обновляем игрока
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        middleName: middleName || undefined,
        nationality: nationality || undefined,
        position: position || undefined,
        number: number !== undefined ? Number(number) : undefined,
        foot: foot || undefined,
        academyJoinDate: academyJoinDate ? new Date(academyJoinDate) : undefined,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        bio: bio || undefined,
        photoUrl: photoUrl || undefined,
      },
    });
    
    return NextResponse.json(updatedPlayer, { status: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении информации об игроке:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
} 