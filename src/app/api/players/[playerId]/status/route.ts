import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PlayerStatus } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const { playerId } = params;
    const { status } = await request.json();

    // Проверка валидности статуса
    const validStatuses = Object.values(PlayerStatus);
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Недопустимый статус игрока. Допустимые значения: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Обновление статуса игрока
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { status },
    });

    return NextResponse.json(updatedPlayer, { status: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении статуса игрока:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при обновлении статуса игрока' },
      { status: 500 }
    );
  }
} 